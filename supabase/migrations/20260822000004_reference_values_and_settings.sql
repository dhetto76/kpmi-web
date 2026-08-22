-- ============================================================================
-- Editable reference data and site settings
--
-- Korwil, product categories, and industries were hard-coded in
-- src/lib/reference-data.ts. Administrators need to add a new korwil or retire
-- a category without a deploy, so the lists move into the database here.
--
-- The seed below is the EXACT contents of those arrays as of 2026-08-22.
-- Existing member and business rows store these values as free text, so the
-- labels must match character-for-character or existing records are orphaned.
--
-- reference-data.ts is deliberately kept as the seed of record and as the
-- compile-time type source; the database is the runtime authority.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- reference_values
--
-- One table for all three lists rather than three near-identical tables:
-- they share every column, and a single admin UI can then serve all of them.
-- ---------------------------------------------------------------------------

create table if not exists reference_values (
  id          uuid primary key default gen_random_uuid(),
  -- 'korwil' | 'product_category' | 'industry'
  kind        text not null check (kind in ('korwil', 'product_category', 'industry')),
  -- The stored value. This is what businesses.industry / profiles.korwil hold,
  -- so renaming it is a data migration, not a cosmetic edit.
  name        text not null,
  slug        text not null,
  -- Retired entries stay readable (existing rows still reference them) but are
  -- hidden from the pickers new records are created with.
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (kind, name)
);

create index if not exists reference_values_kind_idx
  on reference_values(kind, sort_order);

comment on table reference_values is
  'Editable lookup lists (korwil, product categories, industries) that were previously hard-coded.';

drop trigger if exists reference_values_updated_at on reference_values;
create trigger reference_values_updated_at
  before update on reference_values
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- site_settings
--
-- Key/value rather than a one-row table with a column per setting: adding a
-- setting is then an insert, not a migration.
-- ---------------------------------------------------------------------------

create table if not exists site_settings (
  key         text primary key,
  value       text not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references profiles(id) on delete set null
);

comment on table site_settings is
  'Editable site-wide settings (contact details, registration toggles).';

drop trigger if exists site_settings_updated_at on site_settings;
create trigger site_settings_updated_at
  before update on site_settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
--
-- Both tables are readable by everyone: the public site renders the korwil
-- list and the contact details. Writes are super-admin only — a korwil admin
-- editing the korwil list could invent a region and widen their own scope.
-- ---------------------------------------------------------------------------

alter table reference_values enable row level security;
alter table site_settings    enable row level security;

drop policy if exists "reference values are public" on reference_values;
create policy "reference values are public"
  on reference_values for select
  using (true);

drop policy if exists "super admins manage reference values" on reference_values;
create policy "super admins manage reference values"
  on reference_values for all
  using (is_super_admin())
  with check (is_super_admin());

drop policy if exists "site settings are public" on site_settings;
create policy "site settings are public"
  on site_settings for select
  using (true);

drop policy if exists "super admins manage site settings" on site_settings;
create policy "super admins manage site settings"
  on site_settings for all
  using (is_super_admin())
  with check (is_super_admin());

-- ---------------------------------------------------------------------------
-- Seed: verbatim from src/lib/reference-data.ts (2026-08-22).
--
-- on conflict do nothing makes this idempotent and, more importantly, makes it
-- safe to re-run after an administrator has edited a name in the UI: the seed
-- never overwrites a deliberate change.
--
-- sort_order is spaced by 10 so a new entry can be slotted between two others
-- without renumbering the whole list.
-- ---------------------------------------------------------------------------

insert into reference_values (kind, name, slug, sort_order) values
  ('korwil', 'Aceh', 'aceh', 10),
  ('korwil', 'Balikpapan', 'balikpapan', 20),
  ('korwil', 'Bandung', 'bandung', 30),
  ('korwil', 'Banjarmasin', 'banjarmasin', 40),
  ('korwil', 'Batam', 'batam', 50),
  ('korwil', 'Bekasi', 'bekasi', 60),
  ('korwil', 'Blitar', 'blitar', 70),
  ('korwil', 'Blora', 'blora', 80),
  ('korwil', 'Bogor', 'bogor', 90),
  ('korwil', 'Cianjur', 'cianjur', 100),
  ('korwil', 'Ciayumaja', 'ciayumaja', 110),
  ('korwil', 'Cilacap', 'cilacap', 120),
  ('korwil', 'Depok', 'depok', 130),
  ('korwil', 'Doha', 'doha', 140),
  ('korwil', 'Jakarta', 'jakarta', 150),
  ('korwil', 'Jambi', 'jambi', 160),
  ('korwil', 'Jeddah', 'jeddah', 170),
  ('korwil', 'Kairo', 'kairo', 180),
  ('korwil', 'Karawang', 'karawang', 190),
  ('korwil', 'Kediri', 'kediri', 200),
  ('korwil', 'Kuningan', 'kuningan', 210),
  ('korwil', 'Lombok', 'lombok', 220),
  ('korwil', 'Lubuk Linggau', 'lubuk-linggau', 230),
  ('korwil', 'Madiun', 'madiun', 240),
  ('korwil', 'Makassar', 'makassar', 250),
  ('korwil', 'Malang', 'malang', 260),
  ('korwil', 'Medan', 'medan', 270),
  ('korwil', 'Merauke', 'merauke', 280),
  ('korwil', 'Palangkaraya', 'palangkaraya', 290),
  ('korwil', 'Palembang', 'palembang', 300),
  ('korwil', 'Pekalongan', 'pekalongan', 310),
  ('korwil', 'Pekanbaru', 'pekanbaru', 320),
  ('korwil', 'Pontianak', 'pontianak', 330),
  ('korwil', 'Priangan Timur', 'priangan-timur', 340),
  ('korwil', 'Purwokerto', 'purwokerto', 350),
  ('korwil', 'Rokan Hilir', 'rokan-hilir', 360),
  ('korwil', 'Sampit', 'sampit', 370),
  ('korwil', 'Semarang', 'semarang', 380),
  ('korwil', 'Solo raya', 'solo-raya', 390),
  ('korwil', 'Sumatera Barat', 'sumatera-barat', 400),
  ('korwil', 'Sumbawa', 'sumbawa', 410),
  ('korwil', 'Surabaya', 'surabaya', 420),
  ('korwil', 'Tangerang', 'tangerang', 430),
  ('korwil', 'Tulungagung', 'tulungagung', 440),
  ('korwil', 'Yogyakarta', 'yogyakarta', 450),
  ('product_category', 'Agriculture And Fresh Product', 'agriculture-and-fresh-product', 10),
  ('product_category', 'Automotive, Spare Parts and Accessories', 'automotive-spare-parts-and-accessories', 20),
  ('product_category', 'Beauty And Personal Care', 'beauty-and-personal-care', 30),
  ('product_category', 'Energy And Mineral', 'energy-and-mineral', 40),
  ('product_category', 'Fashion', 'fashion', 50),
  ('product_category', 'Fisheries', 'fisheries', 60),
  ('product_category', 'Flower and ornamental plant', 'flower-and-ornamental-plant', 70),
  ('product_category', 'Food and Beverages', 'food-and-beverages', 80),
  ('product_category', 'Handy Craft', 'handy-craft', 90),
  ('product_category', 'Health & Medical', 'health-dan-medical', 100),
  ('product_category', 'Home Appliance', 'home-appliance', 110),
  ('product_category', 'Jewellery And Watches', 'jewellery-and-watches', 120),
  ('product_category', 'Mechanicals', 'mechanicals', 130),
  ('industry', 'Agribisnis', 'agribisnis', 10),
  ('industry', 'Jasa Pariwisata', 'jasa-pariwisata', 20),
  ('industry', 'Kima Petrokimia', 'kima-petrokimia', 30),
  ('industry', 'Kuliner', 'kuliner', 40),
  ('industry', 'Lembaga Keuangan', 'lembaga-keuangan', 50),
  ('industry', 'Pertambangan', 'pertambangan', 60),
  ('industry', 'Pharmacy Herbal', 'pharmacy-herbal', 70),
  ('industry', 'Properti Kontraktor', 'properti-kontraktor', 80),
  ('industry', 'Retail', 'retail', 90),
  ('industry', 'Telekomunikasi IT', 'telekomunikasi-it', 100),
  ('industry', 'Tour Travel', 'tour-travel', 110),
  ('industry', 'Trading', 'trading', 120),
  ('industry', 'Other', 'other', 130)
on conflict (kind, name) do nothing;

-- ---------------------------------------------------------------------------
-- Seed: default settings. Values mirror ORG in src/content/site.ts so the
-- admin form opens with what the site already shows rather than blanks.
-- ---------------------------------------------------------------------------

insert into site_settings (key, value) values
  ('org_email',            'sekretariat@kpmi.or.id'),
  ('org_phone',            '+62 21 0000 0000'),
  ('org_address',          'Jakarta, Indonesia'),
  ('org_tagline',          'Bersama membangun ekosistem bisnis Islam yang kuat, halal, dan berkah.'),
  ('registration_open',    'true'),
  ('auto_approve_members', 'false'),
  ('announcement',         '')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- auto_approve_new_member
--
-- Applies the auto_approve_members setting to a just-created account.
--
-- The escalation guard deliberately refuses a member setting their own status,
-- so this runs security definer. It is written to be useless as an attack
-- tool: it approves only the caller's OWN profile, only while it is still
-- 'pending', only for role = 'member', and only while the setting is on. A
-- member who is already rejected cannot use it to reinstate themselves,
-- because the update requires the current status to be 'pending'.
-- ---------------------------------------------------------------------------

create or replace function public.auto_approve_new_member(target_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  approved_count integer := 0;
begin
  -- Only the account holder, and only for themselves.
  if auth.uid() is null or auth.uid() <> target_id then
    return false;
  end if;

  if not exists (
    select 1 from site_settings
    where key = 'auto_approve_members' and value = 'true'
  ) then
    return false;
  end if;

  -- security definer is not enough on its own: the escalation guard fires as
  -- the member and refuses a member changing their own status, which is the
  -- rule that must stay in force everywhere else. Suppress user triggers for
  -- this one statement, exactly as the super-admin bootstrap migration does.
  -- `set local` confines it to this transaction, and the WHERE clause above
  -- has already established that this is the caller's own pending profile.
  set local session_replication_role = replica;

  update profiles
     set status = 'approved'
   where id = target_id
     and role = 'member'
     and status = 'pending';

  get diagnostics approved_count = row_count;

  set local session_replication_role = origin;

  return approved_count > 0;
end;
$$;

revoke all on function public.auto_approve_new_member(uuid) from public;
grant execute on function public.auto_approve_new_member(uuid) to authenticated;

comment on function public.auto_approve_new_member(uuid) is
  'Approves the caller''s own pending member profile when auto-approval is enabled.';
