-- Delete member accounts from auth.users so every dependent public row is
-- removed by the existing ON DELETE CASCADE constraints.
--
-- The function is intentionally narrower than a generic admin delete:
-- administrators cannot delete themselves or another administrator, and a
-- korwil admin can only delete ordinary members in their managed region.
create or replace function public.delete_members(target_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_id uuid := auth.uid();
  deleted_count integer := 0;
begin
  if caller_id is null or not public.is_admin() then
    raise exception 'administrator access required';
  end if;

  if coalesce(cardinality(target_ids), 0) = 0 then
    return 0;
  end if;

  delete from auth.users as account
  using public.profiles as profile
  where account.id = profile.id
    and profile.id = any(target_ids)
    and profile.id <> caller_id
    and profile.role = 'member'
    and (
      public.is_super_admin()
      or (
        profile.korwil is not null
        and profile.korwil = public.admin_korwil_region()
      )
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.delete_members(uuid[]) from public;
grant execute on function public.delete_members(uuid[]) to authenticated;

comment on function public.delete_members(uuid[]) is
  'Permanently deletes ordinary member auth accounts within the caller admin scope.';
