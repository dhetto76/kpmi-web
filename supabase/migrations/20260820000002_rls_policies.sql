-- ============================================================================
-- Row Level Security
--
-- The authorization model, enforced in the database:
--   public   -> reads approved content only
--   member   -> full control of rows they own
--   admin    -> full control of everything
--
-- Nothing here can be bypassed by a client, an API route, or a UI bug.
-- ============================================================================

alter table profiles   enable row level security;
alter table businesses enable row level security;
alter table products   enable row level security;
alter table categories enable row level security;

-- ---------------------------------------------------------------------------
-- is_admin()
--
-- security definer so the function itself can read profiles without invoking
-- the profiles policies. Without this, an admin policy that queries profiles
-- would recurse into the policy that calls it — a well-known Supabase footgun.
-- ---------------------------------------------------------------------------

create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- categories — public read, admin write
-- ---------------------------------------------------------------------------

create policy "categories are public"
  on categories for select
  using (true);

create policy "admins manage categories"
  on categories for all
  using (is_admin())
  with check (is_admin());

-- ---------------------------------------------------------------------------
-- profiles
--
-- A member always reads and edits their own row, whatever their status.
-- Approved profiles are publicly visible so the member directory works.
-- Note: role and status are deliberately NOT self-editable — see the trigger
-- below, which blocks privilege escalation.
-- ---------------------------------------------------------------------------

create policy "approved profiles are public"
  on profiles for select
  using (status = 'approved');

create policy "members read own profile"
  on profiles for select
  using (id = auth.uid());

create policy "members update own profile"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "admins read all profiles"
  on profiles for select
  using (is_admin());

create policy "admins update any profile"
  on profiles for update
  using (is_admin())
  with check (is_admin());

-- Stop a member promoting themselves to admin or self-approving.
-- The UPDATE policy above cannot express "these two columns are off limits",
-- so a trigger enforces it.
create or replace function prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role then
    raise exception 'role cannot be changed';
  end if;
  if new.status is distinct from old.status then
    raise exception 'status cannot be changed';
  end if;
  return new;
end;
$$;

create trigger profiles_no_escalation
  before update on profiles
  for each row execute function prevent_profile_privilege_escalation();

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------

create policy "approved businesses are public"
  on businesses for select
  using (status = 'approved');

create policy "owners read own businesses"
  on businesses for select
  using (owner_id = auth.uid());

create policy "owners create own businesses"
  on businesses for insert
  with check (owner_id = auth.uid());

create policy "owners update own businesses"
  on businesses for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners delete own businesses"
  on businesses for delete
  using (owner_id = auth.uid());

create policy "admins manage all businesses"
  on businesses for all
  using (is_admin())
  with check (is_admin());

-- A member must not approve their own business.
create or replace function prevent_business_self_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() then
    return new;
  end if;
  if new.status is distinct from old.status then
    raise exception 'status is set by administrators';
  end if;
  return new;
end;
$$;

create trigger businesses_no_self_approval
  before update on businesses
  for each row execute function prevent_business_self_approval();

-- ---------------------------------------------------------------------------
-- products
--
-- Ownership is derived through the parent business. This is the join-in-policy
-- that makes Postgres the right choice here: no owner_id duplicated onto
-- products, no extra read to evaluate.
-- ---------------------------------------------------------------------------

create policy "published products of approved businesses are public"
  on products for select
  using (
    is_published
    and exists (
      select 1 from businesses b
      where b.id = products.business_id
        and b.status = 'approved'
    )
  );

create policy "owners read own products"
  on products for select
  using (
    exists (
      select 1 from businesses b
      where b.id = products.business_id
        and b.owner_id = auth.uid()
    )
  );

create policy "owners manage own products"
  on products for all
  using (
    exists (
      select 1 from businesses b
      where b.id = products.business_id
        and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from businesses b
      where b.id = products.business_id
        and b.owner_id = auth.uid()
    )
  );

create policy "admins manage all products"
  on products for all
  using (is_admin())
  with check (is_admin());
