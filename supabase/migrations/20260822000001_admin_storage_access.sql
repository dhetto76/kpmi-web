-- ============================================================================
-- Storage access for administrators
--
-- Administrators can now edit a member's usaha and produk from the admin
-- panel, which includes replacing a logo, cover, or product photo.
--
-- The existing policies key on the path convention <bucket>/<user_id>/<file>,
-- so a write only succeeds where the first segment is the caller's own id.
-- That is still true for an admin's *uploads*: the upload widget writes into
-- the uploader's own folder, and every bucket is publicly readable, so the
-- member's business renders the file regardless of whose folder holds it.
--
-- What the owner-only policies do block is an administrator REPLACING or
-- REMOVING a file that a member uploaded — the cleanup that happens when an
-- admin swaps out an inappropriate product photo. These policies add exactly
-- that, and no more: no new insert rights are needed, and read was already
-- public.
--
-- Scope mirrors the table policies: a super admin platform-wide, a korwil
-- admin only over members in the region they administer. Both are resolved
-- from the owning member's id in the first path segment.
-- ============================================================================

-- Prerequisite: 20260821000004_korwil_admin_role.sql, which defines
-- is_super_admin() and admin_korwil_region().

/**
 * True when the caller may administer the member who owns this storage path.
 * The path convention is <bucket>/<user_id>/<file>, so the first segment
 * identifies the owning member.
 */
create or replace function can_admin_storage_path(object_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  owner_id uuid;
begin
  if is_super_admin() then
    return true;
  end if;

  -- A korwil admin only: resolve the owning member's region.
  if admin_korwil_region() is null then
    return false;
  end if;

  -- The first segment is only a user id by convention; a malformed path must
  -- deny rather than raise.
  begin
    owner_id := ((storage.foldername(object_name))[1])::uuid;
  exception when others then
    return false;
  end;

  return exists (
    select 1 from profiles p
    where p.id = owner_id
      and p.korwil is not null
      and p.korwil = admin_korwil_region()
  );
end;
$$;

drop policy if exists "admins update member files" on storage.objects;
drop policy if exists "admins delete member files" on storage.objects;

create policy "admins update member files"
  on storage.objects for update
  using (
    bucket_id in ('avatars', 'businesses', 'products')
    and can_admin_storage_path(name)
  );

create policy "admins delete member files"
  on storage.objects for delete
  using (
    bucket_id in ('avatars', 'businesses', 'products')
    and can_admin_storage_path(name)
  );
