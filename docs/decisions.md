# Architecture decisions

Short records of choices that are not obvious from the code, so a future
maintainer (human or AI) does not have to re-derive them.

---

## 1. Supabase over Firebase

**Decision:** PostgreSQL via Supabase.

**Why:** The data is relational — Members → Businesses → Products is a chain of
foreign keys, and every meaningful query joins across it.

The deciding factor was authorization, not storage. The rule *"a member may
edit a product if they own the business that owns the product"* is a plain join
inside an RLS policy:

```sql
using (
  exists (
    select 1 from businesses b
    where b.id = products.business_id and b.owner_id = auth.uid()
  )
)
```

In Firestore this needs either `owner_id` denormalised onto every product, or a
`get()` lookup costing a read per rule evaluation.

Secondary reasons: product search is `ilike`/`tsvector` rather than a bolted-on
Algolia; SQL reporting is native; migrations are version-controlled `.sql`
files; and there is far more Postgres than Firestore-rules material for AI
agents to draw on.

**Trade-off accepted:** Firebase is better for realtime and offline. Neither is
in V1. If chat arrives later, Supabase Realtime is adequate.

---

## 2. Authorization lives in the database

**Decision:** RLS is the security boundary. Server Actions and the proxy are
convenience layers.

**Why:** A UI check protects nothing — anyone can call the API directly. RLS is
enforced by PostgreSQL on every query, so a bug in a component cannot leak
another member's data.

**Consequence:** There is no service-role key anywhere in this app. Every query
runs as the signed-in user. Introducing a service-role key would bypass RLS and
silently remove the guarantee — do not add one without a very specific reason.

---

## 3. Triggers guard privilege escalation

**Decision:** Two `before update` triggers block members changing their own
`role`/`status`, and their own business `status`.

**Why:** An RLS `UPDATE` policy authorizes the row, not individual columns. The
policy that lets a member edit their profile would also let them set
`role = 'admin'`. The trigger closes that.

`is_admin()` is `security definer` so it reads `profiles` without invoking the
`profiles` policies — otherwise an admin policy querying `profiles` recurses
into the policy that called it. This is a known Supabase footgun.

---

## 4. Reference data extracted, not invented

**Decision:** `src/lib/reference-data.ts` holds option lists copied verbatim
from the live WordPress registration form.

**Why:** The old form collects 33 fields with specific option sets — 45 korwil
regions, 13 industries, 13 product categories, banded turnover and headcount,
11 KES cohorts. These are stored as text on member records. Renaming a value
orphans existing data.

Notable: korwil includes overseas chapters (Doha, Jeddah, Kairo), so anything
assuming Indonesia-only regions is wrong.

---

## 5. Registration is short; business details come later

**Decision:** Signup asks for four fields. Business data is captured afterwards
in the dashboard.

**Why:** The WordPress form asked all 33 questions up front, including NPWP and
SIUP numbers most people cannot produce on the spot. That is the worst part of
the current signup. Splitting it means nobody is blocked from creating an
account.

**Consequence:** A profile can exist with no business, and a business can be
half-complete. Only `businesses.name` is required.

---

## 6. Product images are a text[] column

**Decision:** `products.images` is an array, while business gallery images
would get their own table.

**Why:** Product images have no independent identity — no caption, no ordering
beyond array position, never queried on their own. A join table would be
ceremony. Business gallery images need ordering and captions, so they earn a
table when that feature is built.

---

## 7. No CMS for news

**Decision:** News/events are not in V1. When added, MDX files in the repo.

**Why:** Content changes monthly. If it lived in Postgres, a non-technical
editor would still need an admin UI to write it in — and that admin UI is a
CMS, which is the thing this rebuild exists to remove. Repo files give version
control, PR review, and fully static rendering.

The `news_events` table stays in the schema design so it can be introduced
later without restructuring.
