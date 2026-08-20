-- ============================================================================
-- Storage buckets
--
-- Files are public to read (they appear on the public site) but writes are
-- restricted to the owning member. Path convention: <bucket>/<user_id>/<file>
-- so ownership can be checked from the path itself.
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('avatars',   'avatars',   true),
  ('businesses','businesses',true),
  ('products',  'products',  true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Anyone may read. These images render on public pages.
-- ---------------------------------------------------------------------------

create policy "public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "public read business images"
  on storage.objects for select
  using (bucket_id = 'businesses');

create policy "public read product images"
  on storage.objects for select
  using (bucket_id = 'products');

-- ---------------------------------------------------------------------------
-- Writes: the first path segment must be the caller's user id.
-- storage.foldername() returns the path split into segments.
-- ---------------------------------------------------------------------------

create policy "members upload own files"
  on storage.objects for insert
  with check (
    bucket_id in ('avatars', 'businesses', 'products')
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "members update own files"
  on storage.objects for update
  using (
    bucket_id in ('avatars', 'businesses', 'products')
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "members delete own files"
  on storage.objects for delete
  using (
    bucket_id in ('avatars', 'businesses', 'products')
    and auth.uid()::text = (storage.foldername(name))[1]
  );
