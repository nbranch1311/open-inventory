-- Performance indexes for dashboard + search.
-- Safe to apply multiple times (IF NOT EXISTS).

create extension if not exists pg_trgm;

-- Inventory items: accelerate room-scoped lists and sorts.
create index if not exists inventory_items_household_room_created_at_idx
on public.inventory_items (household_id, room_id, created_at desc);

create index if not exists inventory_items_household_room_name_idx
on public.inventory_items (household_id, room_id, name);

create index if not exists inventory_items_household_room_expiry_idx
on public.inventory_items (household_id, room_id, expiry_date);

-- Inventory items: accelerate ILIKE %keyword% searches (trigram).
create index if not exists inventory_items_name_trgm_idx
on public.inventory_items using gin (name gin_trgm_ops);

create index if not exists inventory_items_description_trgm_idx
on public.inventory_items using gin (description gin_trgm_ops);

-- Products: accelerate business search (name / SKU / barcode).
create index if not exists products_name_trgm_idx
on public.products using gin (name gin_trgm_ops);

create index if not exists products_sku_trgm_idx
on public.products using gin (sku gin_trgm_ops);

create index if not exists products_barcode_trgm_idx
on public.products using gin (barcode gin_trgm_ops);

-- Reminders: accelerate dashboard upcoming reminders query.
create index if not exists item_reminders_household_upcoming_idx
on public.item_reminders (household_id, reminder_date)
where is_completed = false;

