# KPMI — Member Platform

Website and member platform for **Komunitas Pengusaha Muslim Indonesia**.
Replaces the previous WordPress + Ultimate Member site.

Members register, manage their business profiles, and list products and
services. The public can browse an approved directory of businesses and a
catalog of products. Administrators verify members and businesses.

---

## Stack

| Concern    | Choice                    |
| ---------- | ------------------------- |
| Framework  | React Router 8 (framework) |
| Language   | TypeScript (strict)       |
| Styling    | Tailwind CSS v4           |
| Database   | Supabase (PostgreSQL)     |
| Auth       | Supabase Auth             |
| Files      | Supabase Storage          |
| Icons      | lucide-react              |
| Validation | Zod                       |
| Hosting    | Node server (`react-router-serve`) |

No client state library, no ORM, no API layer. Route loaders read data
directly; route actions write it.

---

## Getting started

### 1. Create a Supabase project

<https://supabase.com/dashboard> → New project.

### 2. Run the migrations

In the Supabase SQL Editor, run these in order:

```
supabase/migrations/20260820000001_initial_schema.sql
supabase/migrations/20260820000002_rls_policies.sql
supabase/migrations/20260820000003_storage.sql
supabase/migrations/20260821000003_user_role_enum.sql
supabase/migrations/20260821000004_korwil_admin_role.sql
supabase/migrations/20260821000005_bootstrap_super_admin.sql
supabase/seed.sql
```

Run each file as its own batch, not all pasted together. `20260821000003`
adds enum values, and Postgres cannot use a new enum value in the same
transaction that adds it — `20260821000004` references those values.

`20260821000005` grants Super Admin to a single hardcoded email. Edit
`target_email` in that file before running it on a new project.

Or with the Supabase CLI:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in from **Project Settings → API**:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

The service-role key is used only by the server-side administrator password
action. Keep it in `.env` (or your hosting provider's encrypted server
environment), never expose it with a `VITE_` prefix. All regular data
queries continue to run as the signed-in user and are filtered by RLS.

### 4. Run

```bash
npm install
npm run dev        # http://localhost:5173
```

### 5. Make yourself a Super Admin

Roles are `member`, `admin_korwil`, and `super_admin`. Nobody can promote
themselves — a database trigger blocks it — so the first Super Admin is granted
out-of-band. Register through the UI first so the profile row exists, then run
`20260821000005_bootstrap_super_admin.sql`, or directly:

```sql
update profiles set role = 'super_admin', status = 'approved', managed_korwil = null
where id = (select id from auth.users where email = 'you@example.com');
```

After that, appoint Admin Korwil accounts from **Panel Admin → Anggota** — no
SQL needed. Each one is scoped to a single region via `managed_korwil` and can
approve members, businesses, and products only within it.

---

## Repository layout

```
content/news/               News + event Markdown files
public/images/news/         Their images

app/
├── root.tsx                Document shell, global meta, ErrorBoundary
├── routes.ts               The route tree, declared explicitly
├── globals.css             Tailwind theme + design system
├── routes/
│   ├── public/             Marketing site + public browse
│   │   ├── layout.tsx            Header, footer, announcement banner
│   │   ├── home.tsx              Home
│   │   ├── profil.*.tsx          About, vision, structure
│   │   ├── bisnis._index.tsx     Directory
│   │   ├── bisnis.$slug.tsx      Business detail
│   │   ├── produk._index.tsx     Product catalog
│   │   ├── berita._index.tsx     News index
│   │   ├── berita.$slug.tsx      News detail
│   │   └── kontak.tsx
│   ├── auth/               Sign in, register, reset, sign out, callback
│   └── member/             Dashboard — profile, businesses, products
├── components/
│   ├── ui/                 Button, Card, Field, Input, Badge…
│   │   ├── image.tsx       next/image stand-in (plain <img>)
│   │   └── image-upload.tsx  Storage-backed upload widgets
│   ├── member/             Business and product forms
│   └── layout/             Header, footer, dashboard nav
├── lib/
│   ├── supabase/           env / browser client / server client / admin
│   ├── auth.server.ts      Route guards + role helpers
│   ├── member.server.ts    Slug, ownership, and form-value helpers
│   ├── redirect.ts         Validates ?next= against open redirects
│   ├── settings.server.ts  Site settings + editable reference lists
│   ├── news.server.ts      Reads content/news/*.md
│   ├── validations.ts      Zod schemas, shared client + server
│   ├── reference-data.ts   Korwil, industries, categories (see below)
│   └── utils.ts            cn, slugify, formatPrice, formatDate
├── content/site.ts         Org details, navigation, static copy
└── types/database.ts       Database types

supabase/
├── migrations/             Version-controlled schema
└── seed.sql                Category seed data
```

`routes.ts` is the authorization map: what Next.js expressed as `(public)` /
`(member)` / `(admin)` route-group folders is now nested `layout()` calls, so
the security boundary stays visible in one file instead of the directory tree.

A `.server.ts` suffix guarantees a module never reaches the browser — the
replacement for Next.js's `import "server-only"`.

---

## How authorization works

Three layers, in order of authority:

1. **RLS policies** (`supabase/migrations/…_rls_policies.sql`) — the real
   boundary. Enforced by PostgreSQL on every query, regardless of caller.
2. **Route actions** re-check ownership to return clear error messages.
3. **`app/lib/auth.server.ts`** guards redirect unauthenticated visitors for a good UX.

Layers 2 and 3 are convenience. **Layer 1 is the security.** Never add a
feature that depends only on 2 or 3.

The rules:

- Public reads approved profiles, approved businesses, and published products
  belonging to approved businesses.
- A member reads and writes only rows they own. Product ownership is derived
  through the parent business — no `owner_id` duplicated onto products.
- Members cannot change their own `role` or `status`, nor approve their own
  business. Database triggers block this, because an `UPDATE` policy cannot
  express "these columns are off limits".
- A **Super Admin** manages everything platform-wide.
- An **Admin Korwil** manages only their own region — members whose `korwil`
  matches their `managed_korwil`, those members' businesses, and those
  businesses' products. They cannot grant roles, move a member between regions,
  or approve their own business.
- Scoping runs through the *owner's* `korwil`, never `businesses.city`, which is
  free text and would not reliably match a region name.
- The helpers `is_super_admin()`, `admin_korwil_region()`, and `is_admin()` are
  all `security definer` to avoid RLS recursion.

---

## Reference data

`app/lib/reference-data.ts` holds option lists extracted **verbatim** from the
live WordPress registration form: 45 korwil regions (including Doha, Jeddah,
Kairo), 13 industries, 13 product categories, turnover and headcount bands, and
11 KES cohorts.

**Do not rename these values casually.** They are stored as text on existing
records; changing a label orphans data.

---

## Common tasks

**Add a public page** — create `app/routes/public/<name>.tsx`, then register it
under the public `layout()` in `app/routes.ts`. It inherits the header and
footer automatically. Add it to `NAV` in `app/content/site.ts`.

**Add a field to businesses** — add a column in a new migration under
`supabase/migrations/`, add it to `Business` in `app/types/database.ts`, to
`businessSchema` in `app/lib/validations.ts`, then to the business form
`app/components/member/business-form.tsx`.

**Add a news item or event** — put the image in `public/images/news/`, create a
`.md` file in `content/news/`, commit, push. See `content/news/README.md` for
the frontmatter format. Set `draft: true` to keep it visible in development but
hidden in production.

**Change site copy** — `app/content/site.ts`. No component changes needed.

**Regenerate database types** once the project is live:

```bash
npx supabase gen types typescript --project-id <id> > app/types/database.ts
```

---

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # serve the build
npm run typecheck # react-router typegen + tsc
npm run lint     # eslint
```

---

## Deploying

`npm run build` produces `build/client` (static assets) and `build/server`
(the SSR handler). `npm run start` serves both via `react-router-serve`.

This needs a host that runs a Node process — Fly, Railway, Render, or a
container. Vercel can host React Router too, but through its own adapter rather
than the Next.js build that used to be here.

Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` in the host's environment. The `VITE_` pair is
inlined at **build** time, so they must be present when `npm run build` runs,
not only at boot.

In Supabase → Authentication → URL Configuration, add your production domain
to the redirect allow-list so email confirmation and password reset links work.

---

---

## Migration status — Next.js → React Router

This branch replaces Next.js with React Router 8 in framework mode. The public
site, authentication, and the member dashboard are migrated and verified. The
admin panel is half done: the verification queues are migrated, the settings
pages are not.

| Section | Routes | State |
| --- | --- | --- |
| Public site | 9 | **Migrated** — verified against live data |
| Auth | 5 | **Migrated** — sign-in/out and session persistence verified |
| Member dashboard | 9 | **Migrated** — CRUD and ownership checks verified |
| Admin panel | 6 of 14 | **Partly migrated** — dashboard, anggota, bisnis, produk. Guards verified |

Recover any unmigrated route from git to port it:

```bash
git show origin/main:"src/app/(member)/dashboard/page.tsx"
git show feat/rbac-role-privileges:"src/app/(admin)/admin/page.tsx"
```

### What changed, and why

| Next.js | React Router | Note |
| --- | --- | --- |
| `page.tsx` async component | `loader` + default export | Data loading moved out of the component |
| Server Actions (`"use server"`) | route `action` + `<Form>` | Progressive enhancement by default |
| `src/proxy.ts` middleware | `app/lib/auth.server.ts` guards | **No middleware** — every protected loader must guard itself |
| `revalidatePath` | automatic after an action | Loaders re-run on the same page |
| `next/link` | `<Link to>` | `href` → `to` |
| `next/image` | `app/components/ui/image.tsx` | Plain `<img>`; no optimizer (see below) |
| `next/font/google` | `<link>` in `root.tsx` | Font is no longer self-hosted |
| `metadata` / `generateMetadata` | `meta` export | Reads `loaderData`, so detail pages query once, not twice |
| `notFound()` | `throw new Response(…, { status: 404 })` | Caught by the nearest `ErrorBoundary` |
| `import "server-only"` | `.server.ts` suffix | Enforced by the compiler |
| `NEXT_PUBLIC_*` | `VITE_*` | Both names still read, so an old `.env.local` keeps working |

### Auth notes

- **Sign-out is POST-only** (`/keluar`). As a GET it would fire from any
  third-party `<img src>`, logging visitors out unprompted, so the control has
  to be a `<Form method="post">` — not a link. A stray GET just redirects home.
- **`?next=` is validated** by `app/lib/redirect.ts` before any redirect.
  Next.js set that value itself inside middleware; here it round-trips through
  a public form field, so an unchecked `next=https://evil.example` would turn
  sign-in into an open redirect. Covered by `app/lib/redirect.test.ts`.
- **Sign-out lives in the dashboard nav**, as it did before — the public site
  header has no sign-out button. That matches the Next.js original; it is not
  something the migration dropped.

### Member area notes

- **Guards run per route, including on actions.** An action does not run its
  parent route's loader, so `requireUser` is called again inside every write
  path. The layout guard alone would leave `POST /dashboard/*` open.
- **`business_id` moved from an argument to a form field.** Next.js bound it
  server-side (`createProduct(businessId, formData)`), so the page had already
  proven ownership. A route action only receives the request, so the id is now
  caller-supplied and re-checked against `owner_id` before the insert.
- **Delete is an intent, not a separate route.** The delete button submits the
  same form with `name="intent" value="delete"`, which the action branches on.
  A nested `<Form>` is invalid HTML, and `formNoValidate` keeps the browser
  from blocking the delete on an empty required field.

### Admin notes

- **Still to migrate:** `korwil`, `kategori`, `industri` (the three reference
  lists), `pengguna`, and `pengaturan`. Their sidebar links 404 until then.
  Everything else — the dashboard and the anggota / bisnis / produk queues — is
  ported.
- **One action, several intents.** Next.js exported a Server Action per
  operation. A route has a single action, so the operation travels as an
  `intent` field and every branch re-checks the caller's role, because an
  action never runs the layout's loader.
- **Row controls use `useFetcher`, not `<Form>`.** Approve/reject, role, and
  password controls submit from inside a table row and must not navigate. Each
  row gets its own fetcher, so one row's pending state and error do not bleed
  into the others — what `useTransition` gave the Next.js version for free.
- **The member forms are reused verbatim.** `BusinessForm` and `ProductForm`
  take an optional `action` path; the admin routes render them pointed at
  themselves, so the two panels cannot drift apart.
- **Member search is a GET form, not a debounced `router.replace`.** Search now
  costs one submit instead of a request per keystroke, and the result is a
  shareable URL that works without JavaScript.

### Verification limits

Regional (`admin_korwil`) scoping is **not** verified end to end. Granting a
role requires SQL with `session_replication_role = replica` — the escalation
trigger refuses it over the REST API, which is the protection working as
designed — so a throwaway korwil admin could not be created from here.

What *was* verified: anonymous and plain-member callers are blocked from every
migrated admin route, on both GET and POST, and a member attempting to approve
themselves or grant themselves `super_admin` was rejected with no database
change. The korwil scoping code is ported line-for-line from the original and
RLS enforces the same rule underneath, but exercise it with a real Admin Korwil
account before relying on it.

### Known gaps

- **No image optimization.** `next/image` resized and re-encoded on the fly;
  the replacement is a plain `<img>`. Supabase Storage can transform on request
  (`?width=…`) where it matters — worth doing before launch if uploads are large.
- **Session refresh is per-route.** Middleware refreshed the token once per
  request; now each loader does it, and each must return its `headers` or the
  rotated refresh token is dropped. `createClient(request)` documents this.
- **`generateStaticParams` is gone.** News articles were pre-rendered at build
  time. They are server-rendered per request now; add `prerender` to
  `react-router.config.ts` to restore that if build-time output is wanted.

## Deliberately not built

Kept out to stay small. Each is additive, none needs a rewrite:

- Member-to-member messaging
- Business matchmaking
- Google OAuth
- Payments / membership dues
- Database-backed news with an editor UI (see `docs/decisions.md` §7)

---

## Further reading

- `docs/decisions.md` — why Supabase, why RLS is shaped this way, why news
  lives in files rather than the database
- `docs/supabase-migration.md` — moving to a different Supabase project
- `docs/hero-carousel.md` — adding, editing, and reordering the homepage banner
  slides, and swapping the gradients for real photographs
