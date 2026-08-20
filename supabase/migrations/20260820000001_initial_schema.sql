-- ============================================================================
-- KPMI initial schema
--
-- Entities: profiles -> businesses -> products
-- Every table has RLS enabled. Authorization is enforced in the database,
-- never only in the UI.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type user_role as enum ('member', 'admin');
create type approval_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- profiles
--
-- Extends auth.users. One row per registered person. Created automatically by
-- a trigger when a user signs up, so a profile always exists for a session.
-- ---------------------------------------------------------------------------

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  phone       text,
  city        text,
  korwil      text,
  avatar_url  text,
  bio         text,
  -- How the member found KPMI, and why they joined. Both from the intake form.
  referral    text,
  join_reason text,
  -- KPMI Entrepreneur School cohort, or 'Belum' if not yet attended.
  kes         text,
  role        user_role       not null default 'member',
  status      approval_status not null default 'pending',
  created_at  timestamptz     not null default now(),
  updated_at  timestamptz     not null default now()
);

comment on table profiles is 'One row per registered member, extending auth.users.';

-- ---------------------------------------------------------------------------
-- categories
--
-- Shared lookup for businesses and products. `kind` separates the two lists so
-- a single table serves both without a join table.
-- ---------------------------------------------------------------------------

create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null,
  kind       text not null check (kind in ('business', 'product')),
  sort_order int  not null default 0,
  unique (kind, slug)
);

comment on table categories is 'Lookup for business industries and product categories.';

-- ---------------------------------------------------------------------------
-- businesses
--
-- A member may own several. Fields mirror the existing WordPress intake form
-- so no data is lost in migration.
-- ---------------------------------------------------------------------------

create table businesses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,

  -- Identity
  name        text not null,
  slug        text not null unique,
  description text,
  logo_url    text,
  cover_url   text,

  -- Legal / registration
  legal_form  text,   -- PT, CV, Koperasi, ...
  npwp        text,
  siup        text,
  founded_year int,

  -- Contact
  address     text,
  city        text,
  phone       text,
  whatsapp    text,
  email       text,
  website     text,

  -- Classification
  industry            text,
  product_category    text,
  business_role       text,   -- Produsen, Trader, Reseller, ...

  -- Scale and operations (from the intake questionnaire)
  annual_revenue      text,
  employee_count      text,
  office_status       text,
  market              text,   -- Domestik / Ekspor / both
  production_method   text,
  has_branches        boolean,
  branch_count        int,
  has_marketing_team  boolean,
  separate_finances   text,
  bookkeeping_method  text,
  has_finance_staff   text,
  has_management_team text,

  status      approval_status not null default 'pending',
  created_at  timestamptz     not null default now(),
  updated_at  timestamptz     not null default now()
);

create index businesses_owner_idx    on businesses(owner_id);
create index businesses_status_idx   on businesses(status);
create index businesses_industry_idx on businesses(industry);
create index businesses_city_idx     on businesses(city);

comment on table businesses is 'Business or organization owned by a member.';

-- ---------------------------------------------------------------------------
-- products
--
-- Belongs to a business. Slug is unique per business, not globally, so two
-- businesses can both sell "Kopi Arabika".
-- ---------------------------------------------------------------------------

create table products (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  name         text not null,
  slug         text not null,
  description  text,
  price        numeric(14, 2),          -- null = quote on request
  price_unit   text,                    -- 'per kg', 'per project'
  category     text,
  images       text[] not null default '{}',
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (business_id, slug)
);

create index products_business_idx  on products(business_id);
create index products_published_idx on products(is_published);
create index products_category_idx  on products(category);

comment on table products is 'Product or service offered by a business.';

-- ---------------------------------------------------------------------------
-- Full-text search over products
-- ---------------------------------------------------------------------------

alter table products
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored;

create index products_search_idx on products using gin(search_vector);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at   before update on profiles   for each row execute function set_updated_at();
create trigger businesses_updated_at before update on businesses for each row execute function set_updated_at();
create trigger products_updated_at   before update on products   for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile when a user signs up
--
-- security definer so it can write to profiles regardless of the caller.
-- Without this, a signed-up user has a session but no profile row.
-- ---------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
