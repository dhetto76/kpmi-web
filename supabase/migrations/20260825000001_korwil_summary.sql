-- Per-korwil rollup for the admin overview dashboard.
--
-- The dashboard previously derived its per-korwil breakdown by splitting a
-- single total across hardcoded weights, so every regional figure it showed
-- was invented. This aggregates the real rows in one round trip instead.
--
-- Counting happens in three separate passes rather than one join chain
-- because joining profiles -> businesses -> products multiplies member rows by
-- the number of businesses they own (and business rows by their products),
-- which would inflate every count above it.
create or replace function public.korwil_summary(
  date_from timestamptz default null,
  date_to timestamptz default null
)
returns table (
  korwil text,
  members bigint,
  approved_members bigint,
  pending_members bigint,
  rejected_members bigint,
  businesses bigint,
  approved_businesses bigint,
  products bigint,
  published_products bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with scope as (
    select
      public.is_super_admin() as all_regions,
      public.admin_korwil_region() as region
  ),
  member_counts as (
    select
      profile.korwil as korwil,
      count(*) as members,
      count(*) filter (where profile.status = 'approved') as approved_members,
      count(*) filter (where profile.status = 'pending') as pending_members,
      count(*) filter (where profile.status = 'rejected') as rejected_members
    from profiles as profile, scope
    where profile.korwil is not null
      and (scope.all_regions or profile.korwil = scope.region)
      and (date_from is null or profile.created_at >= date_from)
      and (date_to is null or profile.created_at <= date_to)
    group by profile.korwil
  ),
  business_counts as (
    select
      owner.korwil as korwil,
      count(*) as businesses,
      count(*) filter (where business.status = 'approved') as approved_businesses
    from businesses as business
    join profiles as owner on owner.id = business.owner_id,
    scope
    where owner.korwil is not null
      and (scope.all_regions or owner.korwil = scope.region)
      and (date_from is null or business.created_at >= date_from)
      and (date_to is null or business.created_at <= date_to)
    group by owner.korwil
  ),
  product_counts as (
    select
      owner.korwil as korwil,
      count(*) as products,
      count(*) filter (where product.is_published) as published_products
    from products as product
    join businesses as business on business.id = product.business_id
    join profiles as owner on owner.id = business.owner_id,
    scope
    where owner.korwil is not null
      and (scope.all_regions or owner.korwil = scope.region)
      and (date_from is null or product.created_at >= date_from)
      and (date_to is null or product.created_at <= date_to)
    group by owner.korwil
  )
  select
    region.korwil,
    coalesce(member_counts.members, 0),
    coalesce(member_counts.approved_members, 0),
    coalesce(member_counts.pending_members, 0),
    coalesce(member_counts.rejected_members, 0),
    coalesce(business_counts.businesses, 0),
    coalesce(business_counts.approved_businesses, 0),
    coalesce(product_counts.products, 0),
    coalesce(product_counts.published_products, 0)
  from (
    select korwil from member_counts
    union
    select korwil from business_counts
    union
    select korwil from product_counts
  ) as region
  left join member_counts on member_counts.korwil = region.korwil
  left join business_counts on business_counts.korwil = region.korwil
  left join product_counts on product_counts.korwil = region.korwil
  where public.is_admin()
  order by coalesce(member_counts.members, 0) desc, region.korwil;
$$;

revoke all on function public.korwil_summary(timestamptz, timestamptz) from public;
grant execute on function public.korwil_summary(timestamptz, timestamptz) to authenticated;

comment on function public.korwil_summary(timestamptz, timestamptz) is
  'Per-korwil member/business/product rollup for the admin dashboard, scoped to the caller admin region.';
