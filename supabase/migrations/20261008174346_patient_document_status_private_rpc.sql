-- Keep the privileged patient-safe projection outside the exposed API schema.
-- The public RPC remains an invoker-only entrypoint for authenticated patients.
create function private.get_own_patient_document_status(
  target_tenant uuid,
  target_document uuid
) returns table(document_id uuid, operational_status text)
language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  owned_document uuid;
begin
  if actor is null
    or not private.has_live_session()
    or not private.has_tenant_role(target_tenant, array['patient'])
  then
    raise exception 'Active patient access required' using errcode = '42501';
  end if;

  select document.id into owned_document
  from public.patient_documents document
  join public.patient_accounts account
    on account.tenant_id = document.tenant_id
   and account.patient_id = document.patient_id
   and account.user_id = actor
  where document.tenant_id = target_tenant
    and document.id = target_document
    and document.status = 'available'
    and document.visibility = 'shared'
    and document.attached_to = 'documents';

  if owned_document is null then
    raise exception 'Available patient document required' using errcode = '42501';
  end if;

  return query
  select owned_document,
    case when exists (
      select 1
      from public.patient_document_reviews review
      where review.tenant_id = target_tenant
        and review.document_id = owned_document
    ) then 'review_recorded'::text else 'received'::text end;
end;
$$;
revoke all on function private.get_own_patient_document_status(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.get_own_patient_document_status(uuid, uuid)
  to authenticated;

create or replace function public.get_own_patient_document_status(
  target_tenant uuid,
  target_document uuid
) returns table(document_id uuid, operational_status text)
language sql stable security invoker set search_path = '' as $$
  select * from private.get_own_patient_document_status(
    target_tenant,
    target_document
  );
$$;
