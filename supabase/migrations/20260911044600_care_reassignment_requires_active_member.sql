-- A revoked relationship can return to pending only while the target remains
-- an active clinical professional in the same tenant.
create function private.validate_care_reassignment_target() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if old.status = 'revoked' and new.status = 'assigned' and not exists (
    select 1
    from public.memberships m
    where m.tenant_id = old.tenant_id
      and m.user_id = old.professional_id
      and m.role in ('doctor', 'nurse')
      and m.status = 'active'
  ) then
    raise exception 'Active care professional required' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_care_reassignment_target()
  from public, anon, authenticated;
create trigger care_relationships_reassignment_target
  before update of status on public.care_relationships
  for each row execute function private.validate_care_reassignment_target();
