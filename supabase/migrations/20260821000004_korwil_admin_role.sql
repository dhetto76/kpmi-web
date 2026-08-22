-- ============================================================================
-- Three-tier roles: super_admin > admin_korwil > member
--
-- 'admin' becomes 'super_admin' (platform-wide), and a new 'admin_korwil'
-- administers a single region. The region administered is deliberately NOT
-- profiles.korwil — that column is the member's own region, and an admin may
-- oversee a region they do not personally belong to. managed_korwil holds the
-- administered region and is meaningful only for admin_korwil.
--
-- Only a super_admin may change roles, managed_korwil, or approve anything
-- outside their own region.
-- ============================================================================

-- Prerequisite: 20260821000003_user_role_enum.sql must already have run, in a
-- separate transaction. Postgres cannot use a new enum value in the same
-- transaction that adds it.

-- ---------------------------------------------------------------------------
-- profiles.managed_korwil
-- ---------------------------------------------------------------------------

alter table profiles add column if not exists managed_korwil text;

comment on column profiles.korwil is
  'The region the member personally belongs to.';
comment on column profiles.managed_korwil is
  'The region this profile ADMINISTERS. Only meaningful for role = admin_korwil.';

-- An admin_korwil must have a region; nobody else may have one. Without this a
-- korwil admin with a null region would silently administer nothing, and a
-- demoted admin would keep a stale region that a future promotion re-activates.
alter table profiles drop constraint if exists profiles_managed_korwil_check;
alter table profiles add constraint profiles_managed_korwil_check check (
  (role = 'admin_korwil' and managed_korwil is not null)
  or (role <> 'admin_korwil' and managed_korwil is null)
);

create index if not exists profiles_managed_korwil_idx
  on profiles(managed_korwil) where managed_korwil is not null;

-- ---------------------------------------------------------------------------
-- Role predicates
--
-- All security definer + stable: they read profiles from inside profiles
-- policies, which would otherwise recurse.
-- ---------------------------------------------------------------------------

create or replace function is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

/** The region the caller administers, or null if they are not a korwil admin. */
create or replace function admin_korwil_region()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select managed_korwil from profiles
  where id = auth.uid() and role = 'admin_korwil';
$$;

-- Kept for backward compatibility: existing policies call is_admin(), and it
-- now means "has any administrative role".
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('super_admin', 'admin_korwil')
  );
$$;

/** True when the caller may administer a member/business in this region. */
create or replace function can_admin_korwil(target_korwil text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select is_super_admin()
      or (target_korwil is not null and target_korwil = admin_korwil_region());
$$;

-- ---------------------------------------------------------------------------
-- profiles policies
-- ---------------------------------------------------------------------------

drop policy if exists "admins read all profiles"  on profiles;
drop policy if exists "admins update any profile" on profiles;

create policy "super admins read all profiles"
  on profiles for select
  using (is_super_admin());

create policy "korwil admins read profiles in their region"
  on profiles for select
  using (korwil is not null and korwil = admin_korwil_region());

create policy "super admins update any profile"
  on profiles for update
  using (is_super_admin())
  with check (is_super_admin());

create policy "korwil admins update profiles in their region"
  on profiles for update
  using (korwil is not null and korwil = admin_korwil_region())
  with check (korwil is not null and korwil = admin_korwil_region());

-- ---------------------------------------------------------------------------
-- Escalation guard
--
-- Replaces the member-only version. Now also stops a korwil admin from
-- granting roles, moving someone out of their region, or self-promoting.
-- ---------------------------------------------------------------------------

create or replace function prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Super admins may change anything.
  if is_super_admin() then
    return new;
  end if;

  -- Role and managed_korwil are super-admin-only, for everyone else.
  if new.role is distinct from old.role then
    raise exception 'role cannot be changed';
  end if;
  if new.managed_korwil is distinct from old.managed_korwil then
    raise exception 'managed_korwil is set by super administrators';
  end if;

  -- A korwil admin may approve members inside their own region, but must not
  -- move a member into or out of it — that would let them widen their scope.
  if admin_korwil_region() is not null
     and old.korwil is not distinct from admin_korwil_region() then
    if new.korwil is distinct from old.korwil then
      raise exception 'korwil is set by super administrators';
    end if;
    return new;
  end if;

  -- Plain members: status is set by administrators.
  if new.status is distinct from old.status then
    raise exception 'status cannot be changed';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- businesses
--
-- Scoped through the OWNER's korwil, not businesses.city — city is free text
-- and would not reliably match a korwil name.
-- ---------------------------------------------------------------------------

drop policy if exists "admins manage all businesses" on businesses;

create policy "super admins manage all businesses"
  on businesses for all
  using (is_super_admin())
  with check (is_super_admin());

create policy "korwil admins manage businesses in their region"
  on businesses for all
  using (
    exists (
      select 1 from profiles p
      where p.id = businesses.owner_id
        and p.korwil is not null
        and p.korwil = admin_korwil_region()
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.id = businesses.owner_id
        and p.korwil is not null
        and p.korwil = admin_korwil_region()
    )
  );

create or replace function prevent_business_self_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_korwil text;
begin
  if is_super_admin() then
    return new;
  end if;

  if new.status is distinct from old.status then
    select korwil into owner_korwil from profiles where id = new.owner_id;

    -- A korwil admin may approve businesses in their region — but never their
    -- own, which would be self-approval through the back door.
    if owner_korwil is null
       or owner_korwil is distinct from admin_korwil_region()
       or new.owner_id = auth.uid() then
      raise exception 'status is set by administrators';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------

drop policy if exists "admins manage all products" on products;

create policy "super admins manage all products"
  on products for all
  using (is_super_admin())
  with check (is_super_admin());

create policy "korwil admins manage products in their region"
  on products for all
  using (
    exists (
      select 1 from businesses b
      join profiles p on p.id = b.owner_id
      where b.id = products.business_id
        and p.korwil is not null
        and p.korwil = admin_korwil_region()
    )
  )
  with check (
    exists (
      select 1 from businesses b
      join profiles p on p.id = b.owner_id
      where b.id = products.business_id
        and p.korwil is not null
        and p.korwil = admin_korwil_region()
    )
  );

-- ---------------------------------------------------------------------------
-- categories — super admin only
-- ---------------------------------------------------------------------------

drop policy if exists "admins manage categories" on categories;

create policy "super admins manage categories"
  on categories for all
  using (is_super_admin())
  with check (is_super_admin());
