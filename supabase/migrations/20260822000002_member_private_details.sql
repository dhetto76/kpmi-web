-- Private fields retained from the legacy WordPress member export.
--
-- These do not belong on profiles: approved profiles are publicly readable,
-- while street addresses and other import metadata must remain private.

create table member_private_details (
  profile_id           uuid primary key references profiles(id) on delete cascade,
  legacy_username      text,
  address               text,
  domicile_address      text,
  legacy_registered_at  timestamp without time zone,
  import_source         text not null,
  imported_at           timestamptz not null default now()
);

comment on table member_private_details is
  'Private legacy member data. Never publicly readable.';

alter table member_private_details enable row level security;

create policy "members read own private details"
  on member_private_details for select
  using (profile_id = auth.uid());

create policy "super admins manage all private details"
  on member_private_details for all
  using (is_super_admin())
  with check (is_super_admin());

create policy "korwil admins read private details in their region"
  on member_private_details for select
  using (
    exists (
      select 1
      from profiles p
      where p.id = member_private_details.profile_id
        and p.korwil is not null
        and p.korwil = admin_korwil_region()
    )
  );

