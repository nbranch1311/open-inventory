revoke all on function public.create_household_with_owner(text) from public;
revoke execute on function public.create_household_with_owner(text) from anon;
grant execute on function public.create_household_with_owner(text) to authenticated;
