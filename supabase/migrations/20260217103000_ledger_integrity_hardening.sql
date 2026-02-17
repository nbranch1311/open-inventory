-- Ledger integrity hardening:
-- - Make SKU uniqueness usable with PostgREST upsert
-- - Enforce household consistency across product/item/movement links

-- 1) Normalize existing SKUs: trim and map blank -> NULL
update public.products
set sku = nullif(btrim(sku), '')
where sku is not null;

-- 2) Enforce "no blank sku" going forward
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_sku_not_blank_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_sku_not_blank_check
      check (sku is null or btrim(sku) <> '');
  end if;
end $$;

-- 3) Replace partial unique index with full unique index so PostgREST upsert can target (household_id, sku)
drop index if exists public.uniq_products_household_sku;
create unique index if not exists uniq_products_household_sku
  on public.products(household_id, sku);

-- 4) Enforce inventory_items.product_id belongs to same household
create or replace function public.enforce_inventory_items_product_household()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  product_household_id uuid;
begin
  if new.product_id is null then
    return new;
  end if;

  select household_id into product_household_id
  from public.products
  where id = new.product_id;

  if product_household_id is null then
    raise exception 'product_not_found'
      using errcode = '23503';
  end if;

  if product_household_id <> new.household_id then
    raise exception 'product_household_mismatch'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_inventory_items_product_household_before_write on public.inventory_items;
create trigger enforce_inventory_items_product_household_before_write
before insert or update of product_id, household_id on public.inventory_items
for each row execute procedure public.enforce_inventory_items_product_household();

-- 5) Enforce inventory_movements product/room links belong to same household
create or replace function public.enforce_inventory_movements_household_consistency()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  product_household_id uuid;
  room_household_id uuid;
begin
  select household_id into product_household_id
  from public.products
  where id = new.product_id;

  if product_household_id is null then
    raise exception 'product_not_found'
      using errcode = '23503';
  end if;

  if product_household_id <> new.household_id then
    raise exception 'movement_product_household_mismatch'
      using errcode = '23514';
  end if;

  if new.room_id is not null then
    select household_id into room_household_id
    from public.rooms
    where id = new.room_id;

    if room_household_id is null then
      raise exception 'room_not_found'
        using errcode = '23503';
    end if;

    if room_household_id <> new.household_id then
      raise exception 'movement_room_household_mismatch'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_inventory_movements_household_consistency_before_write on public.inventory_movements;
create trigger enforce_inventory_movements_household_consistency_before_write
before insert or update of household_id, product_id, room_id on public.inventory_movements
for each row execute procedure public.enforce_inventory_movements_household_consistency();

