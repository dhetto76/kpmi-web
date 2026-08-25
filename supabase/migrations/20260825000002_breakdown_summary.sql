-- Industry and product-category rollups for the admin overview dashboard.
--
-- Companion to korwil_summary(): the dashboard's remaining two breakdowns
-- ("Usaha per Industri" and "Produk per Kategori") were still splitting a
-- single total across hardcoded weights, under labels that mostly did not
-- exist in JENIS_USAHA / PRODUCT_CATEGORY. These group the real columns.
--
-- Both are scoped to the caller's administrative region the same way
-- korwil_summary is, so a korwil admin sees only their own region's rows.

create or replace function public.industry_summary(
  date_from timestamptz default null,
  date_to timestamptz default null,
  region text default null
)
returns table (industry text, businesses bigint, approved_businesses bigint)
language sql
security definer
stable
set search_path = public
as $$
  with scope as (
    select
      public.is_super_admin() as all_regions,
      public.admin_korwil_region() as admin_region
  )
  select
    coalesce(business.industry, 'Lainnya') as industry,
    count(*) as businesses,
    count(*) filter (where business.status = 'approved') as approved_businesses
  from businesses as business
  join profiles as owner on owner.id = business.owner_id,
  scope
  where public.is_admin()
    and (scope.all_regions or owner.korwil = scope.admin_region)
    and (region is null or owner.korwil = region)
    and (date_from is null or business.created_at >= date_from)
    and (date_to is null or business.created_at <= date_to)
  group by coalesce(business.industry, 'Lainnya')
  order by count(*) desc, 1;
$$;

create or replace function public.product_category_summary(
  date_from timestamptz default null,
  date_to timestamptz default null,
  region text default null
)
returns table (category text, products bigint, published_products bigint)
language sql
security definer
stable
set search_path = public
as $$
  with scope as (
    select
      public.is_super_admin() as all_regions,
      public.admin_korwil_region() as admin_region
  )
  select
    coalesce(product.category, 'Lainnya') as category,
    count(*) as products,
    count(*) filter (where product.is_published) as published_products
  from products as product
  join businesses as business on business.id = product.business_id
  join profiles as owner on owner.id = business.owner_id,
  scope
  where public.is_admin()
    and (scope.all_regions or owner.korwil = scope.admin_region)
    and (region is null or owner.korwil = region)
    and (date_from is null or product.created_at >= date_from)
    and (date_to is null or product.created_at <= date_to)
  group by coalesce(product.category, 'Lainnya')
  order by count(*) desc, 1;
$$;

revoke all on function public.industry_summary(timestamptz, timestamptz, text) from public;
revoke all on function public.product_category_summary(timestamptz, timestamptz, text) from public;
grant execute on function public.industry_summary(timestamptz, timestamptz, text) to authenticated;
grant execute on function public.product_category_summary(timestamptz, timestamptz, text) to authenticated;

comment on function public.industry_summary(timestamptz, timestamptz, text) is
  'Business counts grouped by industry for the admin dashboard, scoped to the caller admin region.';
comment on function public.product_category_summary(timestamptz, timestamptz, text) is
  'Product counts grouped by category for the admin dashboard, scoped to the caller admin region.';
