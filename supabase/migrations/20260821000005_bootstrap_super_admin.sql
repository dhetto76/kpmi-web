-- ============================================================================
-- Bootstrap the first super admin.
--
-- The escalation guard means no one can promote themselves, so the first
-- administrator has to be granted out-of-band. This migration is that grant.
--
-- It is idempotent and safe to re-run. If the account has not signed up yet it
-- does nothing and says so — sign up at /daftar first, then re-run.
--
-- Note: the grant is applied with the escalation trigger temporarily disabled
-- on this session. The trigger calls is_super_admin(), which reads auth.uid();
-- during a migration there is no JWT, so auth.uid() is null and the guard
-- correctly refuses the change. Disabling it for this one statement is the
-- narrowest way through, and it is restored immediately afterwards.
-- ============================================================================

do $$
declare
  target_email constant text := 'dhetto@gmail.com';
  target_id    uuid;
begin
  select id into target_id from auth.users where lower(email) = lower(target_email);

  if target_id is null then
    raise notice 'No auth user for % — sign up at /daftar first, then re-run.', target_email;
    return;
  end if;

  -- session_replication_role = replica suppresses user triggers for this
  -- transaction only. Preferred over `alter table ... disable trigger`, which
  -- takes an ACCESS EXCLUSIVE lock and persists if the transaction fails.
  set local session_replication_role = replica;

  -- The profile is created by the handle_new_user trigger, but insert
  -- defensively so a missing row cannot block the bootstrap.
  insert into public.profiles (id, full_name, role, status)
  values (target_id, '', 'super_admin', 'approved')
  on conflict (id) do update
    set role   = 'super_admin',
        status = 'approved',
        -- Enforced by profiles_managed_korwil_check: only admin_korwil holds one.
        managed_korwil = null;

  set local session_replication_role = origin;

  raise notice 'Granted super_admin to % (%)', target_email, target_id;
end $$;

-- Verify the grant actually landed. If the trigger or a constraint silently
-- blocked it, fail loudly here rather than leaving the platform with no admin.
do $$
declare
  granted boolean;
begin
  select exists (
    select 1 from public.profiles p
    join auth.users u on u.id = p.id
    where lower(u.email) = lower('dhetto@gmail.com')
      and p.role = 'super_admin'
      and p.status = 'approved'
  ) into granted;

  if not granted then
    -- Not an error when the account simply does not exist yet.
    if exists (select 1 from auth.users where lower(email) = lower('dhetto@gmail.com')) then
      raise exception 'Bootstrap did not take effect for dhetto@gmail.com';
    end if;
    raise notice 'Account not registered yet — re-run this migration after signing up.';
  else
    raise notice 'Verified: dhetto@gmail.com is super_admin.';
  end if;
end $$;
