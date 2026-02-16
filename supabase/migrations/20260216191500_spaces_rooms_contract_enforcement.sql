-- T-008.8-API: spaces + rooms backend contract enforcement
-- Adds room model, room-required item placement, and server-side limits.

-- 1) Room model
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rooms_household_id on public.rooms(household_id);
create index if not exists idx_rooms_household_name on public.rooms(household_id, name);

drop trigger if exists handle_updated_at_rooms on public.rooms;
create trigger handle_updated_at_rooms
before update on public.rooms
for each row execute procedure extensions.moddatetime(updated_at);

-- 2) Room count limit: max 10 rooms per inventory space (household)
create or replace function public.enforce_room_limit_per_household()
returns trigger
language plpgsql
as $$
declare
  room_count integer;
begin
  select count(*)::integer into room_count
  from public.rooms
  where household_id = new.household_id;

  if room_count >= 10 then
    raise exception 'room_limit_reached'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_room_limit_before_insert on public.rooms;
create trigger enforce_room_limit_before_insert
before insert on public.rooms
for each row execute procedure public.enforce_room_limit_per_household();

-- 3) Add room_id to inventory_items and backfill existing rows safely
alter table public.inventory_items
  add column if not exists room_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventory_items_room_id_fkey'
      and conrelid = 'public.inventory_items'::regclass
  ) then
    alter table public.inventory_items
      add constraint inventory_items_room_id_fkey
      foreign key (room_id)
      references public.rooms(id)
      on delete restrict;
  end if;
end $$;

insert into public.rooms (household_id, name)
select distinct i.household_id, 'General'
from public.inventory_items i
left join public.rooms r
  on r.household_id = i.household_id
where i.room_id is null
  and r.id is null;

update public.inventory_items i
set room_id = r.id
from public.rooms r
where i.room_id is null
  and i.household_id = r.household_id;

alter table public.inventory_items
  alter column room_id set not null;

create index if not exists idx_inventory_items_room_id on public.inventory_items(room_id);

-- 4) RLS for rooms + inventory item room consistency
alter table public.rooms enable row level security;

drop policy if exists "View rooms" on public.rooms;
create policy "View rooms"
  on public.rooms for select
  using (household_id = any(public.get_my_household_ids()));

drop policy if exists "Manage rooms" on public.rooms;
create policy "Manage rooms"
  on public.rooms for all
  using (public.is_household_admin(household_id))
  with check (public.is_household_admin(household_id));

drop policy if exists "Manage items" on public.inventory_items;
create policy "Manage items"
  on public.inventory_items for all
  using (household_id = any(public.get_my_household_ids()))
  with check (
    household_id = any(public.get_my_household_ids())
    and exists (
      select 1
      from public.rooms r
      where r.id = room_id
        and r.household_id = inventory_items.household_id
    )
  );

-- 5) Space count limit: max 5 spaces per user in household-creation RPC
drop function if exists public.create_household_with_owner(text);

create or replace function public.create_household_with_owner(household_name text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household public.households;
  caller_user_id uuid;
  household_count integer;
begin
  caller_user_id := auth.uid();

  if caller_user_id is null then
    raise exception 'authenticated user required'
      using errcode = '42501';
  end if;

  if household_name is null or btrim(household_name) = '' then
    raise exception 'household name is required'
      using errcode = '23514';
  end if;

  select count(*)::integer into household_count
  from public.household_members
  where user_id = caller_user_id;

  if household_count >= 5 then
    raise exception 'household_limit_reached'
      using errcode = '23514';
  end if;

  insert into public.households (name)
  values (btrim(household_name))
  returning * into new_household;

  insert into public.household_members (user_id, household_id, role)
  values (caller_user_id, new_household.id, 'owner');

  return new_household;
end;
$$;

revoke all on function public.create_household_with_owner(text) from public;
revoke execute on function public.create_household_with_owner(text) from anon;
grant execute on function public.create_household_with_owner(text) to authenticated;
