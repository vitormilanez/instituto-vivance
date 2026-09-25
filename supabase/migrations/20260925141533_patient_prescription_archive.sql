-- Previous prescriptions are archived references only. This schema does not
-- issue, sign, validate, interpret or renew a prescription.
create table public.patient_prescriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  created_by uuid not null,
  client_request_id uuid not null,
  title text not null check (
    char_length(btrim(title)) between 1 and 160
    and title !~ '[[:cntrl:]]'
  ),
  prescribed_on date not null check (
    prescribed_on between date '1900-01-01' and current_date
  ),
  source_type text not null check (source_type in ('document', 'memed')),
  document_id uuid,
  memed_url text,
  visibility text not null default 'shared'
    check (visibility in ('internal', 'shared')),
  patient_consented_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, id),
  unique (tenant_id, created_by, client_request_id),
  foreign key (tenant_id, patient_id)
    references public.patients(tenant_id, id),
  foreign key (tenant_id, created_by)
    references public.memberships(tenant_id, user_id),
  foreign key (tenant_id, document_id, patient_id)
    references public.patient_documents(tenant_id, id, patient_id),
  check (
    (source_type = 'document' and document_id is not null and memed_url is null)
    or
    (source_type = 'memed' and document_id is null and memed_url is not null)
  ),
  check (
    memed_url is null or (
      char_length(memed_url) between 1 and 2048
      and memed_url !~ '[[:space:][:cntrl:]]'
      and memed_url ~* '^https://([a-z0-9-]+\.)*memed\.com\.br(:443)?([/?#]|$)'
    )
  )
);
create index patient_prescriptions_timeline
  on public.patient_prescriptions(
    tenant_id, patient_id, prescribed_on desc, created_at desc, id desc
  );
create index patient_prescriptions_document_fk
  on public.patient_prescriptions(tenant_id, document_id, patient_id)
  where document_id is not null;

create trigger patient_prescriptions_audit
  after insert on public.patient_prescriptions
  for each row execute function private.audit_change();

alter table public.patient_prescriptions enable row level security;
revoke all on public.patient_prescriptions from public, anon, authenticated;
grant select on public.patient_prescriptions to authenticated;

create policy patient_prescriptions_patient_read
  on public.patient_prescriptions for select to authenticated using (
    visibility = 'shared'
    and private.has_tenant_role(tenant_id, array['patient'])
    and exists (
      select 1 from public.patient_accounts account
      where account.tenant_id = patient_prescriptions.tenant_id
        and account.patient_id = patient_prescriptions.patient_id
        and account.user_id = (select auth.uid())
    )
    and (
      source_type = 'memed'
      or exists (
        select 1 from public.patient_documents document
        where document.tenant_id = patient_prescriptions.tenant_id
          and document.patient_id = patient_prescriptions.patient_id
          and document.id = patient_prescriptions.document_id
          and document.status = 'available'
          and document.visibility = 'shared'
          and document.category = 'clinical_document'
          and document.attached_to = 'documents'
          and document.content_type in ('application/pdf', 'image/jpeg')
      )
    )
  );
create policy patient_prescriptions_care_read
  on public.patient_prescriptions for select to authenticated using (
    private.has_tenant_role(tenant_id, array['doctor', 'nurse'])
    and private.has_care_access(tenant_id, patient_id)
  );

create function private.record_patient_prescription(
  target_tenant uuid,
  target_patient uuid,
  request_key uuid,
  title_text text,
  prescription_date date,
  source_kind text,
  source_document uuid,
  source_url text,
  input_visibility text,
  explicit_patient_consent boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  result public.patient_prescriptions;
  source public.patient_documents;
  actor_is_patient boolean;
begin
  actor_is_patient := private.has_tenant_role(target_tenant, array['patient']);
  if request_key is null or target_patient is null or not (
    private.has_care_access(target_tenant, target_patient)
    or (
      actor_is_patient
      and exists (
        select 1 from public.patient_accounts account
        where account.tenant_id = target_tenant
          and account.patient_id = target_patient
          and account.user_id = auth.uid()
      )
    )
  ) then
    raise exception 'Active prescription archive access required'
      using errcode = '42501';
  end if;
  if actor_is_patient and input_visibility <> 'shared' then
    raise exception 'Patients may only share their own prescription history'
      using errcode = '42501';
  end if;
  if title_text is null
    or char_length(btrim(title_text)) not between 1 and 160
    or title_text ~ '[[:cntrl:]]'
    or prescription_date is null
    or prescription_date not between date '1900-01-01' and current_date
    or source_kind is null
    or source_kind not in ('document', 'memed')
    or input_visibility is null
    or input_visibility not in ('internal', 'shared') then
    raise exception 'Valid prescription history metadata required'
      using errcode = '23514';
  end if;

  if source_kind = 'document' then
    if source_document is null or source_url is not null then
      raise exception 'One prescription source is required' using errcode = '23514';
    end if;
    select * into source
    from public.patient_documents document
    where document.tenant_id = target_tenant
      and document.patient_id = target_patient
      and document.id = source_document
      and document.status = 'available'
      and document.category = 'clinical_document'
      and document.attached_to = 'documents'
      and document.content_type in ('application/pdf', 'image/jpeg');
    if not found
      or (input_visibility = 'shared' and source.visibility <> 'shared') then
      raise exception 'Available PDF or JPG prescription document required'
        using errcode = '23514';
    end if;
  elsif source_document is not null
    or source_url is null
    or char_length(source_url) not between 1 and 2048
    or source_url ~ '[[:space:][:cntrl:]]'
    or source_url !~* '^https://([a-z0-9-]+\.)*memed\.com\.br(:443)?([/?#]|$)' then
    raise exception 'Valid HTTPS Memed source required' using errcode = '23514';
  end if;
  if actor_is_patient and explicit_patient_consent is distinct from true then
    raise exception 'Explicit patient sharing consent required'
      using errcode = '23514';
  end if;

  insert into public.patient_prescriptions(
    tenant_id, patient_id, created_by, client_request_id, title,
    prescribed_on, source_type, document_id, memed_url, visibility,
    patient_consented_at
  ) values (
    target_tenant, target_patient, auth.uid(), request_key, btrim(title_text),
    prescription_date, source_kind, source_document, source_url,
    input_visibility,
    case when actor_is_patient
      then clock_timestamp() else null end
  ) on conflict (tenant_id, created_by, client_request_id) do nothing
  returning * into result;
  if found then return result.id; end if;

  -- A concurrent retry can win the unique key between validation and insert.
  -- Return it only when it carries the same intent; key reuse for different
  -- metadata remains a conflict.
  select * into result from public.patient_prescriptions prescription
  where prescription.tenant_id = target_tenant
    and prescription.created_by = auth.uid()
    and prescription.client_request_id = request_key;
  if result.patient_id = target_patient
    and result.title = btrim(title_text)
    and result.prescribed_on = prescription_date
    and result.source_type = source_kind
    and result.document_id is not distinct from source_document
    and result.memed_url is not distinct from source_url
    and result.visibility = input_visibility then
    return result.id;
  end if;
  raise exception 'Request key was already used for different prescription metadata'
    using errcode = '23505';
end;
$$;
revoke all on function private.record_patient_prescription(
  uuid, uuid, uuid, text, date, text, uuid, text, text, boolean
) from public, anon;
grant execute on function private.record_patient_prescription(
  uuid, uuid, uuid, text, date, text, uuid, text, text, boolean
) to authenticated;

create function public.record_patient_prescription(
  target_tenant uuid,
  target_patient uuid,
  request_key uuid,
  title_text text,
  prescription_date date,
  source_kind text,
  source_document uuid,
  source_url text,
  input_visibility text,
  explicit_patient_consent boolean
) returns uuid
language sql security invoker set search_path = '' as $$
  select private.record_patient_prescription(
    target_tenant, target_patient, request_key, title_text,
    prescription_date, source_kind, source_document, source_url,
    input_visibility, explicit_patient_consent
  );
$$;
revoke all on function public.record_patient_prescription(
  uuid, uuid, uuid, text, date, text, uuid, text, text, boolean
) from public, anon;
grant execute on function public.record_patient_prescription(
  uuid, uuid, uuid, text, date, text, uuid, text, text, boolean
) to authenticated;

-- Stable keyset pagination keeps older history reachable even when a newer
-- recipe is added between requests. RLS remains authoritative because this
-- helper runs with the caller's privileges.
create function public.list_patient_prescriptions_page(
  target_tenant uuid,
  target_patient uuid,
  before_prescribed_on date,
  before_created_at timestamptz,
  before_id uuid,
  page_limit integer default 21
) returns table(
  id uuid,
  title text,
  prescribed_on date,
  source_type text,
  document_id uuid,
  memed_url text,
  visibility text,
  created_at timestamptz
)
language sql stable security invoker set search_path = '' as $$
  select prescription.id, prescription.title, prescription.prescribed_on,
    prescription.source_type, prescription.document_id, prescription.memed_url,
    prescription.visibility, prescription.created_at
  from public.patient_prescriptions prescription
  where prescription.tenant_id = target_tenant
    and prescription.patient_id = target_patient
    and (
      before_prescribed_on is null
      or (prescription.prescribed_on, prescription.created_at, prescription.id)
        < (before_prescribed_on, before_created_at, before_id)
    )
  order by prescription.prescribed_on desc,
    prescription.created_at desc,
    prescription.id desc
  limit least(greatest(coalesce(page_limit, 21), 1), 51);
$$;
revoke all on function public.list_patient_prescriptions_page(
  uuid, uuid, date, timestamptz, uuid, integer
) from public, anon;
grant execute on function public.list_patient_prescriptions_page(
  uuid, uuid, date, timestamptz, uuid, integer
) to authenticated;
