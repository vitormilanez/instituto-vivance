-- Slice 5A.1: append-only human review history for private patient documents.
-- Reviews are clinician-internal and never alter the original file or visibility.
alter table public.patient_documents
  add constraint patient_documents_tenant_id_id_patient_id_key
  unique (tenant_id, id, patient_id);

create table public.patient_document_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  document_id uuid not null,
  patient_id uuid not null,
  reviewer_id uuid not null,
  decision text not null check (decision in ('approved', 'rejected', 'needs_follow_up')),
  internal_note text not null check (length(btrim(internal_note)) between 1 and 2000),
  reviewed_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, id),
  foreign key (tenant_id, document_id, patient_id)
    references public.patient_documents(tenant_id, id, patient_id),
  foreign key (tenant_id, reviewer_id)
    references public.memberships(tenant_id, user_id)
);

create index patient_document_reviews_history
  on public.patient_document_reviews(tenant_id, document_id, reviewed_at desc, id);
create index patient_document_reviews_patient
  on public.patient_document_reviews(tenant_id, patient_id, reviewed_at desc, id);

alter table public.patient_document_reviews enable row level security;
revoke all on public.patient_document_reviews from public, anon, authenticated;
grant select on public.patient_document_reviews to authenticated;

create policy patient_document_reviews_doctor_read
  on public.patient_document_reviews for select to authenticated
  using (
    private.has_tenant_role(tenant_id, array['doctor'])
    and exists (
      select 1
      from public.care_relationships relationship
      where relationship.tenant_id = patient_document_reviews.tenant_id
        and relationship.patient_id = patient_document_reviews.patient_id
        and relationship.professional_id = (select auth.uid())
        and relationship.status = 'active'
    )
  );

create function private.reject_patient_document_review_mutation() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'Patient document reviews are immutable' using errcode = '42501';
end;
$$;
revoke all on function private.reject_patient_document_review_mutation()
  from public, anon, authenticated;
create trigger patient_document_reviews_immutable
  before update or delete on public.patient_document_reviews
  for each row execute function private.reject_patient_document_review_mutation();

-- The generic audit trigger stores only action, entity id and changed column
-- names. It never copies the internal note or document metadata.
create trigger patient_document_reviews_audit
  after insert on public.patient_document_reviews
  for each row execute function private.audit_change();

create function private.review_patient_document(
  target_tenant uuid,
  target_document uuid,
  review_decision text,
  note_text text,
  confirmed boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  document_row public.patient_documents;
  result uuid;
begin
  if confirmed is distinct from true
    or not private.has_tenant_role(target_tenant, array['doctor']) then
    raise exception 'Doctor confirmation required' using errcode = '42501';
  end if;

  select * into document_row
  from public.patient_documents
  where tenant_id = target_tenant and id = target_document
  for share;

  if not found
    or document_row.status <> 'available'
    or not exists (
      select 1
      from public.care_relationships relationship
      where relationship.tenant_id = target_tenant
        and relationship.patient_id = document_row.patient_id
        and relationship.professional_id = auth.uid()
        and relationship.status = 'active'
    ) then
    raise exception 'Available document and active doctor relationship required'
      using errcode = '42501';
  end if;

  if review_decision is null
    or review_decision not in ('approved', 'rejected', 'needs_follow_up')
    or note_text is null
    or length(btrim(note_text)) not between 1 and 2000 then
    raise exception 'Valid review decision and internal note required'
      using errcode = '23514';
  end if;

  insert into public.patient_document_reviews(
    tenant_id,
    document_id,
    patient_id,
    reviewer_id,
    decision,
    internal_note
  ) values (
    target_tenant,
    target_document,
    document_row.patient_id,
    auth.uid(),
    review_decision,
    btrim(note_text)
  ) returning id into result;

  return result;
end;
$$;
revoke all on function private.review_patient_document(uuid, uuid, text, text, boolean)
  from public, anon, authenticated;
grant execute on function private.review_patient_document(uuid, uuid, text, text, boolean)
  to authenticated;

create function public.review_patient_document(
  target_tenant uuid,
  target_document uuid,
  review_decision text,
  internal_note text,
  confirmed boolean
) returns uuid
language sql security invoker set search_path = '' as $$
  select private.review_patient_document(
    target_tenant,
    target_document,
    review_decision,
    internal_note,
    confirmed
  );
$$;
revoke all on function public.review_patient_document(uuid, uuid, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.review_patient_document(uuid, uuid, text, text, boolean)
  to authenticated;
