-- Resolve first-household onboarding RLS failure by making creation atomic.
-- This function creates a household and owner membership in one transaction.

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

  insert into public.households (name)
  values (btrim(household_name))
  returning * into new_household;

  insert into public.household_members (user_id, household_id, role)
  values (caller_user_id, new_household.id, 'owner');

  return new_household;
end;
$$;

revoke all on function public.create_household_with_owner(text) from public;
grant execute on function public.create_household_with_owner(text) to authenticated;

drop policy if exists "Users can create households" on public.households;
create policy "Users can create households"
  on public.households
  for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Users can join households" on public.household_members;
create policy "Users can join households"
  on public.household_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      public.is_household_admin(household_id)
      or not exists (
        select 1
        from public.household_members existing_member
        where existing_member.household_id = household_members.household_id
      )
    )
  );
