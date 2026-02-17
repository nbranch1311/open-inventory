-- Fix: stock_on_hand view must use security_invoker so RLS applies.
-- Without this, the view runs as definer and bypasses RLS on inventory_movements,
-- allowing cross-household data exposure.
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

create or replace view public.stock_on_hand
with (security_invoker = true)
as
select
  household_id,
  product_id,
  room_id,
  coalesce(sum(quantity_delta), 0)::numeric as quantity_on_hand
from public.inventory_movements
group by household_id, product_id, room_id;
