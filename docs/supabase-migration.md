# Moving to a different Supabase project

The schema lives in `supabase/migrations/` as version-controlled SQL, so
moving accounts is mostly mechanical. Nothing in the application code
references a project ID — only the two `NEXT_PUBLIC_SUPABASE_*` variables.

**Do this before real members register.** With only test data it takes about
fifteen minutes. With live accounts and uploaded files it takes a careful hour
and needs a maintenance window.

---

## Before you start

Get both connection strings from **Project Settings → Database → Connection
string → URI** (the one starting `postgresql://postgres:...`).

```bash
OLD="postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres"
NEW="postgresql://postgres:[password]@db.yyyy.supabase.co:5432/postgres"
```

---

## If you have no real data yet

The fast path. Nothing to preserve.

```bash
# 1. Point the CLI at the new project
npx supabase link --project-ref <new-project-ref>

# 2. Apply the schema
npx supabase db push

# 3. Seed categories
psql "$NEW" -f supabase/seed.sql
```

Then update `.env.local` (and Vercel) with the new URL and anon key, register
again, and re-grant yourself admin:

```sql
update profiles set role = 'admin', status = 'approved'
where id = (select id from auth.users where email = 'you@example.com');
```

Done.

---

## If you have data to keep

### 1. Dump

```bash
# Application data
npx supabase db dump --db-url "$OLD" --data-only \
  --schema public > data.sql

# Auth accounts — password hashes, emails, confirmation state
npx supabase db dump --db-url "$OLD" --data-only \
  --schema auth > auth.sql
```

### 2. Apply schema to the new project

```bash
npx supabase link --project-ref <new-project-ref>
npx supabase db push
```

### 3. Restore, auth first

Order matters: `profiles.id` is a foreign key to `auth.users.id`, so accounts
must exist before profiles.

```bash
psql "$NEW" -f auth.sql
psql "$NEW" -f data.sql
```

If `data.sql` includes categories, skip `seed.sql` — the seed uses
`on conflict do nothing`, so running both is harmless either way.

### 4. Copy storage files

A database dump does **not** include Storage. Buckets are recreated by the
migration, but their contents are not.

```bash
# List what is there
npx supabase storage ls ss:///avatars --experimental --linked

# Download from old, upload to new (repeat per bucket:
# avatars, businesses, products)
npx supabase storage cp -r ss:///avatars ./tmp-avatars \
  --experimental --db-url "$OLD"
npx supabase storage cp -r ./tmp-avatars ss:///avatars \
  --experimental --linked
```

Stored URLs contain the project ref. If any are absolute, rewrite them:

```sql
update profiles
set avatar_url = replace(avatar_url, 'xxxx.supabase.co', 'yyyy.supabase.co')
where avatar_url like '%xxxx.supabase.co%';
```

The same applies to `businesses.logo_url`, `businesses.cover_url`, and each
entry in the `products.images` array.

### 5. Switch the app over

Update in `.env.local` and in Vercel → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Redeploy.

### 6. Re-add the redirect allow-list

**Authentication → URL Configuration** on the new project. Add the production
domain and `http://localhost:3000`. Email confirmation and password reset
links silently fail without this — an easy step to miss.

---

## Verify

- [ ] Sign in with an existing account
- [ ] Members, businesses, products all present
- [ ] Avatars and images load
- [ ] Register a new account end to end
- [ ] Password reset email arrives and works
- [ ] Admin panel reachable, approve/reject works
- [ ] A member cannot see another member's unapproved business

Keep the old project paused but not deleted for a couple of weeks.

---

## Free tier notes

- Two active projects maximum.
- Projects pause after 7 days without activity. Data is retained; un-pause from
  the dashboard.
- 500 MB database, 1 GB storage, 50,000 monthly active users.

A paused project still counts toward the two-project limit. To free a slot,
delete rather than pause — after dumping.
