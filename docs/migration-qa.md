# Migration QA checklist

Testing the React Router migration on
**https://kpmi-web-production.up.railway.app** before merging
`feat/migrate-react-router` into `main`.

> **This URL runs against the live Supabase project.** There is no staging
> database. The 3,722 member profiles, 4 businesses, and 8 products are real.
>
> Steps marked **SAFE** touch only data you create yourself. Steps marked
> **READ-ONLY** must not be followed by saving. Anything not listed here —
> bulk approve, bulk delete, role changes on real people, korwil renames — is
> **not** safe against this database and is listed at the bottom under
> *Do not test here*.

Environment as configured today: registration open, auto-approve off, email
sending disabled (`EMAIL_ENABLED = false`), signup returns a session
immediately so no confirmation link is needed.

---

## 1. Public site — SAFE

No sign-in. Use a phone for at least the first two.

- [ ] `/` loads; hero carousel rotates and the four stat tiles show non-zero
      numbers (expect roughly 763 / 3 / 7 / 45)
- [ ] Hero: dot indicators switch slides; swipe works on a phone
- [ ] Header goes solid on scroll; the mobile drawer opens, the Profil submenu
      expands, and the drawer closes after following a link
- [ ] `/bisnis` lists 3 businesses. Search a name, filter by industry, filter
      by city; the URL gains `?q=` / `?industry=` / `?city=` and **back
      returns to the previous result set**
- [ ] `/produk` lists 7 products; search and category filter behave the same
- [ ] Open a business from the directory — description, contacts, and its
      products render; the WhatsApp and website links point somewhere sensible
- [ ] `/berita` says "Belum ada berita". **This is correct** — the only
      article is `draft: true`, which is hidden in production by design
- [ ] `/kontak` shows the address, email, and phone from admin settings
- [ ] The three `/profil/*` pages render
- [ ] A bad URL (`/bisnis/tidak-ada`) shows the styled 404, not a stack trace
- [ ] Footer contact details match `/kontak`

---

## 2. Register and member area — SAFE

Register a throwaway account. It becomes a real `pending` profile; delete it
afterwards (see *Cleanup*).

- [ ] `/daftar` — register with a disposable address. Mismatched passwords and
      a password under 8 characters are both rejected with a clear message
- [ ] Registration lands you signed in (no confirmation email is sent)
- [ ] `/dashboard` greets you by name and shows status **Menunggu**
- [ ] The "Lengkapi profil Anda" prompt appears while korwil and phone are empty
- [ ] `/dashboard/profil` — fill in phone, korwil, city, KES, bio. Save. The
      success message appears **and the values survive a page reload**
- [ ] Upload a profile photo. It previews, and after saving it persists on reload
- [ ] `/dashboard/bisnis/baru` — create a business. Only the name is required
- [ ] Tick "Memiliki cabang", leave "Memiliki tim marketing" unticked, save,
      reopen: the first is on, the second off. *(Unchecked boxes submit
      nothing at all — this is the most common porting bug, worth a look.)*
- [ ] Upload a logo and a cover image; both persist
- [ ] Edit the business, change the city, save — the new value shows immediately
- [ ] `/dashboard/produk/baru` — add a product with a price, unit, and category
- [ ] Upload several product images; remove one before saving
- [ ] Tick "Tampilkan ke publik", save, and confirm the list shows **Publik**
- [ ] Edit the product, then delete it. The confirm step appears first
- [ ] Delete the business. You land back on the list and it is gone
- [ ] Sign out from the sidebar. `/dashboard` now redirects to `/masuk`
- [ ] Sign back in — you land on `/dashboard`, not the home page
- [ ] Visit `/dashboard/produk` while signed out: you are sent to
      `/masuk?next=/dashboard/produk`, and after signing in you arrive
      **at that page**, not the dashboard root

---

## 3. Admin as super_admin — READ-ONLY unless noted

Sign in with your own super_admin account.

- [ ] `/admin` renders; the badge reads "Super Admin". Change the korwil filter
      and the date range — the numbers respond
- [ ] `/admin/anggota` lists members and paginates (3,722 rows, 50 per page).
      **Next / Previous change the page and the URL**
- [ ] Search a member name; the URL gains `?q=`, and back works
- [ ] Filter by status and by korwil; Reset clears them
- [ ] **SAFE:** find your own throwaway account from section 2 and approve it
      with the green tick. Its badge becomes **Disetujui**. This is the only
      approval to perform here
- [ ] `/admin/bisnis` and `/admin/produk` list rows with owner names. Do not
      change any status
- [ ] Open a business from `/admin/bisnis` — the edit form loads with the
      member's data. **Do not save**
- [ ] `/admin/pengguna` lists the 4 administrators with correct role badges
- [ ] `/admin/korwil` lists 45 regions with usage counts. Type in the search
      box to filter. **Do not add, rename, retire, or delete**
- [ ] `/admin/kategori` and `/admin/industri` do the same
- [ ] `/admin/pengaturan` loads with current values. **Do not save**

---

## 4. Korwil scoping — READ-ONLY, and the important one

**This is the gap that has never been verified.** Everything else has been
exercised; regional scoping has not, because the database correctly refuses to
let a role be granted over the API.

Sign in as **Budi Santoso Wijaya** (Admin Korwil Surabaya). If you do not know
the password, set one from your super_admin account using the "Atur sandi"
button on `/admin/anggota` — that exercises a real feature too.

- [ ] The header badge reads "Admin Korwil Surabaya"
- [ ] `/admin/anggota` shows **only** Surabaya members — spot-check that no
      other korwil appears in the list
- [ ] The korwil filter is disabled and pinned to Surabaya
- [ ] There is **no Peran column** — korwil admins cannot grant roles
- [ ] `/admin/bisnis` shows only businesses whose owner is in Surabaya
- [ ] `/admin/produk` likewise
- [ ] `/admin/korwil` renders read-only, ending with "Hanya Super Admin yang
      dapat mengubah daftar ini" — no Add box, no row action buttons
- [ ] `/admin/pengaturan` renders with every field disabled and no Save button
- [ ] Sign out afterwards

If any of these show data outside Surabaya, **stop and report it** — that is a
scoping failure, and it is the one thing worth blocking the merge over.

---

## 5. Cleanup

- [ ] Delete the throwaway member account (Supabase dashboard →
      Authentication → Users, or ask and it can be scripted). Deleting the auth
      user cascades to the profile
- [ ] Confirm `/bisnis` is back to 3 businesses and `/produk` to 7 products
- [ ] If a password was set for Budi, decide whether to tell them or reset it

---

## Do not test here

These need a staging database. Against this project they change real records:

- Bulk approve or bulk delete on `/admin/anggota`
- Granting or revoking any role on a real account
- Approving or rejecting real members and businesses
- Renaming a korwil, category, or industry — **a rename rewrites every member,
  business, and product row using that label**
- Retiring a reference value that is still in use
- Saving `/admin/pengaturan` — `registration_open` and `auto_approve_members`
  change how the live site behaves for real visitors

---

## Known and expected

Not bugs; do not report these.

- `/berita` is empty — the only article is `draft: true`
- `/lupa-sandi` shows contact details instead of a form — `EMAIL_ENABLED` is
  `false`, so a reset email would never arrive
- Images are served at full size — `next/image` optimisation was not replaced.
  Supabase Storage can transform on request (`?width=…`) if this matters
- The public site header has no sign-out button — sign-out lives in the
  dashboard sidebar, as it did before the migration

---

## Before merging

- [ ] Add the Railway domain to Supabase → Authentication → URL Configuration,
      or confirmation and password-reset links will not resolve
- [ ] Check whether a Vercel project still tracks `main`. It will break when
      `main` stops being a Next.js app
- [ ] After merging, repoint Railway from `feat/migrate-react-router` to `main`
- [ ] `feat/rbac-role-privileges` is still unmerged and still Next.js-shaped;
      it will need porting
