-- ============================================================================
-- Editable homepage carousel
--
-- HERO_SLIDES in app/content/site.ts was the only way to change the homepage
-- banner: docs/hero-carousel.md walked a non-developer through editing a
-- TypeScript array and redeploying. Super admins need to run a banner for an
-- event without that, so the slides move into the database here.
--
-- The seed below is the EXACT contents of that array as of 2026-08-24.
-- site.ts stays as the seed of record and the compile-time type source; the
-- database is the runtime authority. This mirrors reference_values exactly.
-- ============================================================================

create table if not exists hero_slides (
  id          uuid primary key default gen_random_uuid(),

  badge       text not null default '',
  title       text not null,
  subtitle    text not null default '',

  -- Optional. While null the slide falls back to `gradient`, which is why the
  -- carousel looked finished before any photography existed.
  image_url   text,
  gradient    text not null default 'linear-gradient(135deg, #3d0000 0%, #6b0000 45%, #a51c2c 100%)',

  primary_label     text not null default '',
  primary_href      text not null default '/',
  secondary_label   text not null default '',
  secondary_href    text not null default '/',

  -- Retired slides stay editable but are not rendered, so a seasonal banner
  -- can be switched off and brought back rather than retyped.
  is_active   boolean not null default true,
  sort_order  int not null default 0,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references profiles(id) on delete set null,

  -- A slide with no title renders an empty <h1>; the app validates this too,
  -- but the carousel is public-facing enough to be worth enforcing here.
  constraint hero_slides_title_not_blank check (length(btrim(title)) > 0)
);

create index if not exists hero_slides_active_idx
  on hero_slides(is_active, sort_order);

comment on table hero_slides is
  'Homepage carousel banners, previously hard-coded as HERO_SLIDES in app/content/site.ts.';

drop trigger if exists hero_slides_updated_at on hero_slides;
create trigger hero_slides_updated_at
  before update on hero_slides
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
--
-- Readable by everyone: this is the first thing the public homepage paints.
-- Writes are super-admin only. A korwil admin runs a region, not the national
-- homepage, and the carousel links anywhere on the site — so this is global
-- work by the same reasoning that made site_settings super-admin only.
-- ---------------------------------------------------------------------------

alter table hero_slides enable row level security;

drop policy if exists "hero slides are public" on hero_slides;
create policy "hero slides are public"
  on hero_slides for select
  using (true);

drop policy if exists "super admins manage hero slides" on hero_slides;
create policy "super admins manage hero slides"
  on hero_slides for all
  using (is_super_admin())
  with check (is_super_admin());

-- ---------------------------------------------------------------------------
-- Storage: a bucket for banner images.
--
-- The member buckets key writes on <bucket>/<user_id>/<file>, which works
-- because every file there belongs to one member. Hero images belong to the
-- organisation, so this bucket is instead writable by super admins only —
-- the same people the table policy admits — and publicly readable like the
-- others, since the images render on the homepage.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('hero', 'hero', true)
on conflict (id) do nothing;

drop policy if exists "public read hero images" on storage.objects;
create policy "public read hero images"
  on storage.objects for select
  using (bucket_id = 'hero');

drop policy if exists "super admins upload hero images" on storage.objects;
create policy "super admins upload hero images"
  on storage.objects for insert
  with check (bucket_id = 'hero' and is_super_admin());

drop policy if exists "super admins update hero images" on storage.objects;
create policy "super admins update hero images"
  on storage.objects for update
  using (bucket_id = 'hero' and is_super_admin());

drop policy if exists "super admins delete hero images" on storage.objects;
create policy "super admins delete hero images"
  on storage.objects for delete
  using (bucket_id = 'hero' and is_super_admin());

-- ---------------------------------------------------------------------------
-- Seed: verbatim from HERO_SLIDES in app/content/site.ts (2026-08-24).
--
-- Guarded on the table being empty rather than `on conflict do nothing`:
-- there is no natural key to conflict on, and a title is editable, so a
-- re-run must not re-insert four slides alongside the edited ones. An admin
-- who deletes every slide gets the gradient fallback, not this seed again.
-- ---------------------------------------------------------------------------

insert into hero_slides
  (badge, title, subtitle, image_url, gradient,
   primary_label, primary_href, secondary_label, secondary_href, sort_order)
select *
from (values
  ('Meeting dengan MUSIAD Turki',
   'Kolaborasi Bisnis Internasional',
   'KPMI memperkuat jejaring dan peluang kolaborasi dengan komunitas pengusaha Muslim internasional untuk mendorong kemitraan, pertukaran wawasan, dan pertumbuhan usaha yang berkelanjutan.',
   '/images/news/meet-up-musiad.png',
   'linear-gradient(135deg, #3d0000 0%, #6b0000 45%, #a51c2c 100%)',
   'Gabung Sekarang', '/daftar', 'Jelajahi Direktori', '/bisnis', 10),

  ('Sejak 2010 · Komunitas Pengusaha Muslim Indonesia',
   'Membangun Bisnis yang Halal & Berkah',
   'Bersama membangun ekosistem bisnis Islam yang kuat, halal, dan berkah.',
   null,
   'linear-gradient(135deg, #3d0000 0%, #6b0000 45%, #a51c2c 100%)',
   'Gabung Sekarang', '/daftar', 'Jelajahi Direktori', '/bisnis', 20),

  ('Pemberdayaan Ekonomi Syariah',
   'Ekosistem Pengusaha Muslim yang Amanah',
   'Membangun ekosistem pengusaha Muslim yang amanah, profesional, dan berdaya saing global.',
   null,
   'linear-gradient(135deg, #2a0000 0%, #8b0000 55%, #c9a227 140%)',
   'Gabung Anggota', '/daftar', 'Tentang KPMI', '/profil/tentang', 30),

  ('45 Koordinator Wilayah se-Indonesia',
   'Jaringan Pengusaha di Seluruh Nusantara',
   'Terhubung dengan sesama pengusaha Muslim dari Sabang sampai Merauke.',
   null,
   'linear-gradient(135deg, #3d0000 0%, #5a0000 40%, #a98a1f 130%)',
   'Lihat Produk', '/produk', 'Hubungi Kami', '/kontak', 40)
) as seed
where not exists (select 1 from hero_slides);
