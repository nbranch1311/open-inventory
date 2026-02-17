-- Business pivot bridge: optionally link personal inventory items to products/ledger.
-- Keeps existing item CRUD behavior but enables stock movement tracking.

alter table public.inventory_items
  add column if not exists product_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventory_items_product_id_fkey'
      and conrelid = 'public.inventory_items'::regclass
  ) then
    alter table public.inventory_items
      add constraint inventory_items_product_id_fkey
      foreign key (product_id)
      references public.products(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_inventory_items_product_id on public.inventory_items(product_id);

