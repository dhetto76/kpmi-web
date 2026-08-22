# Implementation strategy: two Supabase projects, custom auth

Two decisions, written down before either is built:

1. **The temporary Supabase project is for development only.** A separate,
   real Supabase account serves production. Only *tables* migrate between
   them — no images, no uploaded media, no auth accounts.
2. **Supabase Authentication is not used at all.** Members live in a plain
   `public.users` table, exactly as in o-quiz and qnote. No `auth.users`, no
   GoTrue, no `@supabase/ssr` session cookies.

Decision 2 is the larger change. It removes the foundation the current code
is built on, so most of this document is about that.

---

## 1. What "no Supabase Auth" actually costs

The current app makes RLS the security boundary, and every policy is written
against `auth.uid()` — see [decisions.md](decisions.md) §2. `auth.uid()` reads
the JWT that GoTrue issued. **With Supabase Auth gone, `auth.uid()` returns
`null` on every request, and every existing policy silently denies (or, worse,
publicly allows) instead of authorizing.**

So this is not a swap of one login screen for another. It moves the security
boundary out of the database and into server-side application code. That is
the same trade o-quiz and qnote already made, and it works — but it must be
made deliberately, in one pass, not discovered halfway through.

**The rule that replaces RLS:** every database read and write goes through a
server-only module that has already resolved the current user from the session
cookie. Ownership is checked in SQL (`.eq("owner_id", session.userId)`) on
every query, not assumed from the UI.

This is the one place the plan is genuinely more dangerous than what exists
today. Section 5 is the mitigation; treat it as mandatory, not advisory.

---

## 2. Target architecture

```
Browser
  │  session cookie: kpmi_session=<HMAC-signed token>   (httpOnly, secure)
  ▼
Next.js server (Server Components + Server Actions)
  │  getSession() → { userId, role, status }   ← verifies HMAC, reads users row
  │  every query filtered by userId in SQL
  ▼
Supabase Postgres — accessed with the SERVICE ROLE key, server-side only
```

Key points:

- The service-role key lives **only** in server code, never in a
  `NEXT_PUBLIC_*` variable. If it reaches the browser, the entire database is
  open to anyone who views source.
- The browser never talks to Supabase directly. `src/lib/supabase/client.ts`
  (the browser client) goes away, and with it the direct-from-browser Storage
  upload in [image-upload.tsx](../src/components/ui/image-upload.tsx).
- KPMI has no separate Express backend the way o-quiz and qnote do. Server
  Actions and Route Handlers play that role. The auth *logic* ports over
  almost unchanged; the *transport* is Server Actions instead of REST.

### Why a cookie, not localStorage

o-quiz stores its JWT in `localStorage` because its frontend is a client-side
SPA. KPMI renders on the server, so the token must arrive with the initial
HTML request — that means an `httpOnly` cookie. This is also strictly safer:
`httpOnly` puts the token out of reach of XSS.

---

## 3. Schema changes

### 3.1 New `users` table, replacing `auth.users` + `profiles`

`profiles.id` currently references `auth.users(id)`. That reference must go.
Merge the two into one table — there is no longer a split to maintain:

```sql
create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,

  -- everything previously in profiles
  full_name   text not null default '',
  phone       text,
  city        text,
  korwil      text,
  avatar_url  text,
  bio         text,
  referral    text,
  join_reason text,
  kes         text,

  role   user_role       not null default 'member',
  status approval_status not null default 'pending',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_email_idx on users(lower(email));
```

Store the email lower-cased on write and look it up lower-cased, so
`Budi@example.com` and `budi@example.com` are one account.

### 3.2 Password hashing — use bcrypt, not SHA-256

o-quiz uses `sha256(password + JWT_SECRET)`. **Do not copy that here.** SHA-256
is designed to be fast, which is exactly wrong for passwords: commodity
hardware tests billions of candidates per second, so a leaked table of hashes
is effectively a leaked table of passwords. KPMI is starting from zero users —
there is no legacy hash format to stay compatible with, so there is no reason
to inherit the weakness.

Use `bcrypt` (cost 12) or `argon2`:

```ts
import bcrypt from "bcryptjs";
const hash = await bcrypt.hash(password, 12);
const ok   = await bcrypt.compare(password, user.password_hash);
```

`bcryptjs` is pure JS and needs no native build step, which keeps Vercel
deploys simple. Always `bcrypt.compare` — it is constant-time; a `===` on
hashes is not.

### 3.3 Everything downstream follows

- `businesses.owner_id` → `references users(id) on delete cascade`
  (was `profiles(id)`).
- Drop the `handle_new_user()` function and the `on_auth_user_created` trigger
  on `auth.users`. Registration now inserts the `users` row directly.
- Keep `set_updated_at()`, the enums, `categories`, `businesses`, `products`,
  the search vector, and all indexes exactly as they are. They do not depend
  on auth.

### 3.4 RLS: keep it on, make it deny-all

Do not simply `disable row level security`. Leave RLS **enabled** with no
permissive policies, so the anon key can read nothing. The service-role key
bypasses RLS by design, so server code still works. This way, if the anon key
ever leaks or someone re-adds a browser client, the failure mode is "no data"
rather than "all data".

Drop `is_admin()` and both privilege-escalation triggers — they call
`auth.uid()`. Their job moves to the server-side auth module (§4.3), which
must now be the thing that refuses to let a member set their own
`role` or `status`. **Do not lose this check in the port.** It is the single
most valuable line of the current schema.

---

## 4. Application changes

### 4.1 Files to delete

| File | Reason |
|---|---|
| [src/lib/supabase/client.ts](../src/lib/supabase/client.ts) | Browser must not reach Supabase |
| [src/lib/supabase/middleware.ts](../src/lib/supabase/middleware.ts) | Rewritten against the new session |
| [src/app/auth/callback/route.ts](../src/app/auth/callback/route.ts) | Only exists for GoTrue email links |

### 4.2 Files to rewrite

| File | Change |
|---|---|
| [src/lib/supabase/server.ts](../src/lib/supabase/server.ts) | Becomes `src/lib/db.ts`: one service-role client, `import "server-only"` at the top |
| [src/app/(auth)/actions.ts](<../src/app/(auth)/actions.ts>) | `signIn`/`signUp`/`signOut` against `users` + cookie |
| [src/proxy.ts](../src/proxy.ts) | Reads the new cookie instead of refreshing a GoTrue session |
| [src/components/ui/image-upload.tsx](../src/components/ui/image-upload.tsx) | Uploads to a Route Handler, which uploads to Storage server-side |
| [src/types/database.ts](../src/types/database.ts) | `Profile` → `User`; add `email`. Never expose `password_hash` in the type used by client components |

The 11 call sites of `supabase.auth.getUser()` (dashboard pages, admin pages,
layouts, actions) each become `await getSession()`. Mechanical, but every one
must be visited — a missed call site is an unauthenticated page.

### 4.3 New: `src/lib/auth.ts`

Server-only. The whole authorization surface of the app lives here.

```ts
import "server-only";

// createSession  — bcrypt-verify, mint HMAC token, set httpOnly cookie
// getSession     — verify cookie, re-read the users row, return null if absent
// requireUser    — getSession() or redirect("/masuk")
// requireAdmin   — requireUser() + role === "admin", or redirect("/dashboard")
// destroySession — clear the cookie
```

Port the token format from
`o-quiz/oquiz-main/backend/src/services/internalAuthService.js` — HMAC-SHA256
over `base64url(header).base64url(payload)`, `crypto.timingSafeEqual` on the
comparison. Carry over both of its good ideas:

- **`pwv` claim** — a short fingerprint of the password hash. Changing the
  password changes the fingerprint, which invalidates every previously issued
  token. Revocation without a session table.
- **Bounded sliding expiry** — renew on verify, but never past a hard ceiling
  measured from the original `auth_time`.

`getSession()` must re-read the `users` row on every call rather than trusting
the token's claims. An admin who demotes a member, or an admin who rejects a
member, has to take effect on the member's next request — not whenever their
token happens to expire.

Cookie: `httpOnly`, `secure` in production, `sameSite: "lax"`, `path: "/"`.

### 4.4 The `proxy.ts` caveat

`proxy.ts` runs in the Edge runtime, where `bcryptjs` and some of `node:crypto`
may not be available. Keep the proxy to a cheap check — cookie present and not
locally expired — and do the authoritative check in the page/action via
`requireUser()`. This mirrors what the current middleware already documents
about itself: it is a UX gate, not the security boundary.

Verify against `node_modules/next/dist/docs/` before writing it. This is
Next.js 16, where `middleware` was renamed `proxy`, and Edge runtime
constraints are the kind of thing that changed.

### 4.5 Features that disappear with GoTrue

Supabase Auth was providing three things for free. Each needs an explicit
decision:

| Feature | Status after the change |
|---|---|
| Email confirmation | Gone. Accounts are `status = 'pending'` until an admin approves — which is already the KPMI model, so this costs nothing. |
| Password reset email | **Gone, and there is no replacement in this plan.** Needs an email sender (Resend/SMTP) plus a `password_reset_tokens` table. Until then, `lupa-sandi` cannot work. |
| Rate limiting on login | Gone. Add a per-email + per-IP attempt counter, or brute-force is unmetered. |

The password-reset gap is the one to decide on now. Options: build it in the
same pass, or ship with admin-initiated password resets and add self-service
later. **This is worth an explicit call before starting** — shipping a login
form whose "forgot password" link goes nowhere is a bad first impression for
members.

---

## 5. Mandatory safeguards

Because RLS is no longer catching mistakes, these are not optional:

1. **`import "server-only"`** at the top of `src/lib/db.ts` and
   `src/lib/auth.ts`. This turns "the service-role key got imported into a
   client component" from a silent production leak into a build error.
2. **Never `NEXT_PUBLIC_` the service key.** Name it `SUPABASE_SERVICE_ROLE_KEY`.
   Add a CI grep for `NEXT_PUBLIC.*SERVICE` that fails the build.
3. **Every query filters by the session user.** `.eq("owner_id", user.id)` on
   member queries; only `requireAdmin()` paths may query unfiltered.
4. **Never select `password_hash`** outside `signIn`. Use explicit column lists,
   not `select("*")`, on anything that flows to a component.
5. **Role and status are never taken from user input.** The profile update
   action must build its payload from an allow-list of columns. This replaces
   the `profiles_no_escalation` trigger; without it, a crafted form post makes
   any member an admin.

Item 5 is the one that a careless port loses, and it is the one that matters
most.

---

## 6. Dev vs production projects

| | Development | Production |
|---|---|---|
| Project | The temporary one, created now | Real KPMI Supabase account |
| Data | Throwaway test data | Real members |
| Media | Test uploads, never migrated | Uploaded fresh by members |
| Schema source of truth | `supabase/migrations/*.sql` | Same files |

**Only tables migrate.** Concretely, that means: apply the same migration
files to production, then seed `categories`. Nothing else is copied. This is
the "no real data yet" fast path already written up in
[supabase-migration.md](supabase-migration.md) — with two edits now that auth
is custom:

- The `npx supabase db dump --schema auth` step is **deleted**. There is no
  auth schema to move.
- The re-grant-admin SQL becomes:

  ```sql
  update users set role = 'admin', status = 'approved'
  where email = 'you@example.com';
  ```

Storage buckets are still created by migration `...0003_storage.sql`, but its
policies reference `auth.uid()` and must be rewritten — with server-side-only
uploads, the simplest correct form is public read + no client write policies
at all, since the service role bypasses them anyway.

Because no media migrates, the entire "Copy storage files" section and the
URL-rewriting SQL in supabase-migration.md do not apply. Production starts
with empty buckets.

### Environment variables

```bash
# .env.local (dev) and Vercel (production) — different values, same names
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role key — SERVER ONLY, never NEXT_PUBLIC_>
AUTH_SECRET=<32+ random bytes, different per environment>
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is no longer needed by the app. `AUTH_SECRET`
must differ between dev and production — a shared secret means a dev-issued
token authenticates against production.

---

## 7. Order of work

Each step leaves the app in a state you can reason about. Do not start step 4
before step 3 compiles.

1. **Schema** — new migration creating `users`, repointing
   `businesses.owner_id`, dropping the `auth.users` trigger, replacing the
   RLS policies with deny-all, rewriting the storage policies. Since the dev
   database is disposable, prefer squashing the existing migrations into a
   clean set over layering a corrective migration on top.
2. **`src/lib/db.ts` + `src/lib/auth.ts`** — service-role client and the
   session module. Nothing calls them yet.
3. **Auth flows** — `signUp`, `signIn`, `signOut`; the `masuk` and `daftar`
   pages. Register and log in as one member. Decide the `lupa-sandi` question
   from §4.5 here.
4. **`proxy.ts`** — route gating on the new cookie.
5. **Port the 11 `getUser()` call sites** — dashboard, admin, layouts,
   actions. Apply §5 item 3 at each one.
6. **Image upload** — Route Handler that receives the file and uploads
   server-side.
7. **Admin panel** — `requireAdmin()`, approve/reject against `users`.
8. **Verify** (below), then apply the same migrations to the production
   project.

## 8. Verification

Functional:

- [ ] Register → log in → log out → log back in
- [ ] Session survives a full page reload and a server restart
- [ ] Member sees only their own businesses and products
- [ ] Admin can approve; a member cannot approve their own business
- [ ] Image upload works and the URL renders

Security — do these by hand, they are the point of the exercise:

- [ ] `grep -r "SERVICE_ROLE" .next/static/` returns nothing
- [ ] POST the profile form with `role=admin` appended → member stays a member
- [ ] POST the profile form with `status=approved` appended → stays pending
- [ ] Edit another member's business by guessing its id → denied
- [ ] `password_hash` appears in no server-rendered payload
      (`grep -i password_hash` over the page source)
- [ ] Changing a password invalidates the old session token (`pwv`)
- [ ] Tampering with one byte of the session cookie logs you out

---

## 9. Consequences for the existing docs

[decisions.md](decisions.md) §1 and §2 both become historically inaccurate the
moment this ships — §2 in particular states "there is no service-role key
anywhere in this app", which this plan deliberately reverses. Add a new
decision record explaining why (custom auth, consistency with o-quiz/qnote,
server-rendered so the key never leaves the server) rather than editing the
old one. The reasoning in §1 for choosing Postgres still holds; only the
authorization mechanism changes.
