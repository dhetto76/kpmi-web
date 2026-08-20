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
| Framework  | Next.js 16 (App Router)   |
| Language   | TypeScript (strict)       |
| Styling    | Tailwind CSS v4           |
| Database   | Supabase (PostgreSQL)     |
| Auth       | Supabase Auth             |
| Files      | Supabase Storage          |
| Icons      | lucide-react              |
| Validation | Zod                       |
| Hosting    | Vercel                    |

No client state library, no ORM, no API layer. Server Components read data
directly; Server Actions write it.

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
supabase/seed.sql
```

Or with the Supabase CLI:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in from **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Only the anon key is needed. There is no service-role key in this app —
every query runs as the signed-in user and is filtered by RLS.

### 4. Run

```bash
npm install
npm run dev        # http://localhost:3000
```

### 5. Make yourself an admin

Register through the UI, then in the Supabase SQL Editor:

```sql
update profiles set role = 'admin', status = 'approved'
where id = (select id from auth.users where email = 'you@example.com');
```

---

## Repository layout

```
src/
├── app/
│   ├── (public)/           Marketing site + public browse
│   │   ├── page.tsx              Home
│   │   ├── profil/               About, vision, structure
│   │   ├── bisnis/               Directory + [slug] detail
│   │   ├── produk/               Product catalog
│   │   └── kontak/
│   ├── (auth)/             Sign in, register, password reset
│   ├── (member)/dashboard/ Member area — profile, businesses, products
│   ├── (admin)/admin/      Admin — verification queues
│   └── auth/callback/      Email confirmation + reset handler
├── components/
│   ├── ui/                 Button, Card, Field, Input, Badge…
│   └── layout/             Header, footer, dashboard nav
├── lib/
│   ├── supabase/           client / server / middleware helpers
│   ├── reference-data.ts   Korwil, industries, categories (see below)
│   ├── validations.ts      Zod schemas, shared client + server
│   └── utils.ts            cn, slugify, formatPrice, formatDate
├── content/site.ts         Org details, navigation, static copy
├── types/database.ts       Database types
└── proxy.ts                Session refresh + route guards

supabase/
├── migrations/             Version-controlled schema
└── seed.sql                Category seed data
```

Route groups mirror the authorization model, so the security boundary is
visible in the directory tree.

---

## How authorization works

Three layers, in order of authority:

1. **RLS policies** (`supabase/migrations/…_rls_policies.sql`) — the real
   boundary. Enforced by PostgreSQL on every query, regardless of caller.
2. **Server Actions** re-check ownership to return clear error messages.
3. **`src/proxy.ts`** redirects unauthenticated visitors for a good UX.

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
- Admins manage everything, via a `security definer` `is_admin()` helper that
  avoids RLS recursion.

---

## Reference data

`src/lib/reference-data.ts` holds option lists extracted **verbatim** from the
live WordPress registration form: 45 korwil regions (including Doha, Jeddah,
Kairo), 13 industries, 13 product categories, turnover and headcount bands, and
11 KES cohorts.

**Do not rename these values casually.** They are stored as text on existing
records; changing a label orphans data.

---

## Common tasks

**Add a public page** — create `src/app/(public)/<path>/page.tsx`. It inherits
the header and footer automatically. Add it to `NAV` in `src/content/site.ts`.

**Add a field to businesses** — add a column in a new migration under
`supabase/migrations/`, add it to `Business` in `src/types/database.ts`, to
`businessSchema` in `src/lib/validations.ts`, then to the form in
`src/app/(member)/dashboard/bisnis/business-form.tsx`.

**Change site copy** — `src/content/site.ts`. No component changes needed.

**Regenerate database types** once the project is live:

```bash
npx supabase gen types typescript --project-id <id> > src/types/database.ts
```

---

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # serve the build
npm run lint     # eslint
npx tsc --noEmit # typecheck
```

---

## Deploying

Push to GitHub, import the repo on Vercel, and set the two
`NEXT_PUBLIC_SUPABASE_*` variables. No other configuration is required.

In Supabase → Authentication → URL Configuration, add your production domain
to the redirect allow-list so email confirmation and password reset links work.

---

## Deliberately not built

Kept out of V1 to stay small. Each is additive, none needs a rewrite:

- News/events (schema designed; add MDX files or a table when needed)
- Image uploads through the UI (Storage buckets and policies already exist)
- Member-to-member messaging
- Business matchmaking
- Google OAuth
- Payments / membership dues
