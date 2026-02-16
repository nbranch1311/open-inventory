-- T-008.8-API remediation: make 5-space/user limit unbypassable.
-- Enforce max household memberships at the table layer, not only onboarding RPC.

create or replace function public.enforce_household_membership_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  membership_count integer;
begin
  select count(*)::integer into membership_count
  from public.household_members
  where user_id = new.user_id;

  if membership_count >= 5 then
    raise exception 'household_limit_reached'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_household_membership_limit_before_insert on public.household_members;
create trigger enforce_household_membership_limit_before_insert
before insert on public.household_members
for each row execute procedure public.enforce_household_membership_limit();

-- Remove direct authenticated insert path so household creation goes through
-- create_household_with_owner, keeping the membership-limit check atomic.
drop policy if exists "Users can create households" on public.households;
