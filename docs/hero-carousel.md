# Editing the homepage carousel

Sign in as a **Super Admin** and go to **Panel Admin → Pengaturan → Carousel
Beranda** (`/admin/carousel`). No code, no deploy.

Each banner is one card. Edit the fields on the left and the preview on the
right updates as you type.

---

### 1. Title, description, and the small label

- **Label atas** — the small gold line above the title. Optional.
- **Judul** — the headline. Keep it to two lines.
- **Deskripsi** — one sentence under the title.

### 2. Buttons

Each banner has two buttons. Type the button text, then pick where it goes
from the dropdown. Only pages that exist on this site are offered — that is
deliberate, so a banner can never point somewhere broken.

Leave the text empty to hide that button.

### 3. Background

Upload a wide, fairly dark photo (2400px+ wide, under 5 MB — JPG, PNG, or
WebP). White text sits on top of it, so check the preview before saving.

With no image, the banner uses **Gradasi warna** instead — a CSS gradient. The
default is the KPMI maroon; you rarely need to change it.

> The preview shows a newly uploaded image only after you press **Simpan
> banner**.

### 4. Show, hide, and reorder

Along the top of each card:

| Control | What it does |
| --- | --- |
| ▲ ▼ | Move the banner earlier or later in the rotation |
| 👁 | Show on the homepage / hide it |
| 🗑 | Delete permanently |

A new banner starts **hidden**, so you can finish writing it before anyone
sees it. Press 👁 when it is ready.

Active banners rotate every 6 seconds in the order shown. Keep 3–5 of them;
the page allows at most 8.

---

## Notes

**Nothing to publish.** Saving is live — reload the homepage to see it.

**If the list is empty**, the homepage falls back to the four built-in banners
in `app/content/site.ts`. The same happens if the database is briefly
unreachable, so the homepage never loads without a hero.

**Only a Super Admin can edit this.** An Admin Korwil can see the page but not
change it: the homepage is national, not regional.

**For developers.** The banners live in the `hero_slides` table (migration
`supabase/migrations/20260824000001_hero_slides.sql`), which is seeded from
`HERO_SLIDES` in `app/content/site.ts`. That array stays as the seed of record
and the fallback; the database is the runtime authority. Images go to the
`hero` storage bucket, which is publicly readable and writable by super admins
only.
