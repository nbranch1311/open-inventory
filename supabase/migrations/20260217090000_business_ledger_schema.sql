-- Business pivot foundation: dual-mode workspaces + ledger-driven inventory
-- Adds workspace_type to households and introduces products + inventory_movements ledger.

-- 1) Dual-mode workspace type on households
alter table public.households
  add column if not exists workspace_type text not null default 'personal';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'households_workspace_type_check'
      and conrelid = 'public.households'::regclass
  ) then
    alter table public.households
      add constraint households_workspace_type_check
      check (workspace_type in ('personal', 'business'));
  end if;
end $$;

create index if not exists idx_households_workspace_type on public.households(workspace_type);

-- 2) Products (SKU) table (workspace-scoped)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  sku text,
  barcode text,
  name text not null,
  unit text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uniq_products_household_sku
  on public.products(household_id, sku)
  where sku is not null and btrim(sku) <> '';

create index if not exists idx_products_household_id on public.products(household_id);
create index if not exists idx_products_household_name on public.products(household_id, name);
create index if not exists idx_products_barcode on public.products(barcode);

drop trigger if exists handle_updated_at_products on public.products;
create trigger handle_updated_at_products
before update on public.products
for each row execute procedure extensions.moddatetime(updated_at);

-- 3) Inventory movements ledger (workspace-scoped)
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  room_id uuid references public.rooms(id) on delete restrict,
  movement_type text not null,
  quantity_delta numeric not null,
  source_type text,
  source_id text,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventory_movements_movement_type_check'
      and conrelid = 'public.inventory_movements'::regclass
  ) then
    alter table public.inventory_movements
      add constraint inventory_movements_movement_type_check
      check (movement_type in (
        'receive',
        'sale',
        'adjust',
        'init',
        'transfer_in',
        'transfer_out'
      ));
  end if;
end $$;

create index if not exists idx_inventory_movements_household_created
  on public.inventory_movements(household_id, created_at desc);
create index if not exists idx_inventory_movements_household_product
  on public.inventory_movements(household_id, product_id, created_at desc);
create index if not exists idx_inventory_movements_household_room
  on public.inventory_movements(household_id, room_id, created_at desc);

-- 4) Stock-on-hand view (derived)
create or replace view public.stock_on_hand as
select
  household_id,
  product_id,
  room_id,
  coalesce(sum(quantity_delta), 0)::numeric as quantity_on_hand
from public.inventory_movements
group by household_id, product_id, room_id;

-- 5) RLS for products and movements
alter table public.products enable row level security;
alter table public.inventory_movements enable row level security;

drop policy if exists "View products" on public.products;
create policy "View products"
  on public.products for select
  using (household_id = any(public.get_my_household_ids()));

drop policy if exists "Manage products" on public.products;
create policy "Manage products"
  on public.products for all
  using (public.is_household_admin(household_id))
  with check (public.is_household_admin(household_id));

drop policy if exists "View inventory movements" on public.inventory_movements;
create policy "View inventory movements"
  on public.inventory_movements for select
  using (household_id = any(public.get_my_household_ids()));

drop policy if exists "Manage inventory movements" on public.inventory_movements;
create policy "Manage inventory movements"
  on public.inventory_movements for all
  using (public.is_household_admin(household_id))
  with check (public.is_household_admin(household_id));

