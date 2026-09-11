-- Slice 5A: private patient documents. Files live in a non-public Storage
-- bucket and are not visible until the application has validated their type,
-- size and binary signature. The file path intentionally carries no patient
-- or clinic identifier.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'vivance-documents',
  'vivance-documents',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.patient_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  uploaded_by uuid not null,
  original_filename text not null check (length(btrim(original_filename)) between 1 and 160),
  storage_path text not null unique,
  content_type text not null check (content_type in ('application/pdf', 'image/jpeg', 'image/png')),
  byte_size bigint not null check (byte_size between 1 and 5242880),
  category text not null check (category in ('exam', 'clinical_document')),
  visibility text not null check (visibility in ('internal', 'shared')),
  status text not null default 'reserved' check (status in ('reserved', 'available', 'rejected')),
  created_at timestamptz not null default clock_timestamp(),
  available_at timestamptz,
  rejected_at timestamptz,
  unique (tenant_id, id),
  foreign key (tenant_id, patient_id) references public.patients(tenant_id, id),
  foreign key (tenant_id, uploaded_by) references public.memberships(tenant_id, user_id),
  check (
    (status = 'reserved' and available_at is null and rejected_at is null)
    or (status = 'available' and available_at is not null and rejected_at is null)
    or (status = 'rejected' and available_at is null and rejected_at is not null)
  )
);
create index patient_documents_staff_list
  on public.patient_documents(tenant_id, patient_id, status, created_at desc, id);
create index patient_documents_uploader_pending
  on public.patient_documents(tenant_id, uploaded_by, status, created_at desc, id);

alter table public.patient_documents enable row level security;
revoke all on public.patient_documents from public, anon, authenticated;
grant select on public.patient_documents to authenticated;

-- The uploader may recover an unfinished reservation, but neither a patient
-- nor a clinician can expose it to another party before final validation.
create function private.patient_document_uploader_has_access(
  target_tenant uuid,
  target_patient uuid,
  target_uploader uuid,
  target_visibility text
) returns boolean
language sql stable security definer set search_path = '' as $$
  select target_uploader = auth.uid()
    and auth.uid() is not null
    and private.has_live_session()
    and (
      private.has_care_access(target_tenant, target_patient)
      or (
        target_visibility = 'shared'
        and private.has_tenant_role(target_tenant, array['patient'])
        and exists (
          select 1 from public.patient_accounts account
          where account.tenant_id = target_tenant
            and account.patient_id = target_patient
            and account.user_id = auth.uid()
        )
      )
    );
$$;
revoke all on function private.patient_document_uploader_has_access(uuid, uuid, uuid, text)
  from public, anon;
grant execute on function private.patient_document_uploader_has_access(uuid, uuid, uuid, text)
  to authenticated;

create policy patient_documents_staff_read on public.patient_documents
  for select to authenticated
  using (status = 'available' and private.has_care_access(tenant_id, patient_id));
create policy patient_documents_patient_read_shared on public.patient_documents
  for select to authenticated
  using (
    status = 'available'
    and visibility = 'shared'
    and private.has_tenant_role(tenant_id, array['patient'])
    and exists (
      select 1 from public.patient_accounts account
      where account.tenant_id = patient_documents.tenant_id
        and account.patient_id = patient_documents.patient_id
        and account.user_id = auth.uid()
    )
  );
create policy patient_documents_uploader_read_pending on public.patient_documents
  for select to authenticated
  using (
    status in ('reserved', 'rejected')
    and private.patient_document_uploader_has_access(
      tenant_id,
      patient_id,
      uploaded_by,
      visibility
    )
  );

create trigger patient_documents_audit after insert or update on public.patient_documents
  for each row execute function private.audit_change();

grant usage on schema private to service_role;

-- Only the authenticated Edge Function may reserve or complete a document.
-- The function has already revalidated the user's JWT; this helper repeats the
-- membership and care boundary using the explicit actor it obtained from that
-- verified session. It deliberately does not trust an actor supplied by a
-- browser-accessible database RPC.
create function private.document_actor_has_access(
  target_tenant uuid,
  target_patient uuid,
  target_actor uuid,
  target_visibility text
) returns boolean
language sql stable security definer set search_path = '' as $$
  select target_actor is not null and exists (
    select 1
    from public.memberships membership
    where membership.tenant_id = target_tenant
      and membership.user_id = target_actor
      and membership.status = 'active'
      and (
        (
          membership.role in ('doctor', 'nurse')
          and exists (
            select 1
            from public.care_relationships relationship
            where relationship.tenant_id = target_tenant
              and relationship.patient_id = target_patient
              and relationship.professional_id = target_actor
              and relationship.status = 'active'
          )
        )
        or (
          membership.role = 'patient'
          and target_visibility = 'shared'
          and exists (
            select 1
            from public.patient_accounts account
            where account.tenant_id = target_tenant
              and account.patient_id = target_patient
              and account.user_id = target_actor
          )
        )
      )
  );
$$;
revoke all on function private.document_actor_has_access(uuid, uuid, uuid, text)
  from public, anon;
grant execute on function private.document_actor_has_access(uuid, uuid, uuid, text)
  to service_role;

create function private.reserve_patient_document(
  target_tenant uuid,
  target_patient uuid,
  target_uploader uuid,
  input_filename text,
  input_content_type text,
  input_byte_size bigint,
  input_category text,
  input_visibility text
) returns table(document_id uuid, storage_path text)
language plpgsql security definer set search_path = '' as $$
declare
  document_uuid uuid := gen_random_uuid();
  object_path text := 'patient-documents/' || document_uuid::text;
  filename text := btrim(input_filename);
begin
  if not private.document_actor_has_access(
    target_tenant,
    target_patient,
    target_uploader,
    input_visibility
  ) then
    raise exception 'Active document access required' using errcode = '42501';
  end if;
  if filename is null
    or length(filename) not between 1 and 160
    or filename ~ '[[:cntrl:]]'
    or position('/' in filename) > 0
    or position(chr(92) in filename) > 0
    or input_content_type not in ('application/pdf', 'image/jpeg', 'image/png')
    or input_byte_size not between 1 and 5242880
    or input_category not in ('exam', 'clinical_document')
    or input_visibility not in ('internal', 'shared')
    or not (
      (input_content_type = 'application/pdf' and lower(filename) like '%.pdf')
      or (input_content_type = 'image/jpeg' and (lower(filename) like '%.jpg' or lower(filename) like '%.jpeg'))
      or (input_content_type = 'image/png' and lower(filename) like '%.png')
    ) then
    raise exception 'Valid private document metadata required' using errcode = '23514';
  end if;
  insert into public.patient_documents(
    id,
    tenant_id,
    patient_id,
    uploaded_by,
    original_filename,
    storage_path,
    content_type,
    byte_size,
    category,
    visibility
  ) values (
    document_uuid,
    target_tenant,
    target_patient,
    target_uploader,
    filename,
    object_path,
    input_content_type,
    input_byte_size,
    input_category,
    input_visibility
  );
  return query select document_uuid, object_path;
end;
$$;

create function private.complete_patient_document(
  target_tenant uuid,
  target_document uuid,
  target_actor uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  document_row public.patient_documents;
begin
  select * into document_row
    from public.patient_documents
    where tenant_id = target_tenant and id = target_document
    for update;
  if not found
    or document_row.uploaded_by <> target_actor
    or not private.document_actor_has_access(
      document_row.tenant_id,
      document_row.patient_id,
      target_actor,
      document_row.visibility
    ) then
    raise exception 'Private document reservation required' using errcode = '42501';
  end if;
  if document_row.status = 'available' then return document_row.id; end if;
  if document_row.status <> 'reserved' then
    raise exception 'Document cannot be completed' using errcode = '23514';
  end if;
  if not exists (
    select 1 from storage.objects object
    where object.bucket_id = 'vivance-documents'
      and object.name = document_row.storage_path
  ) then
    raise exception 'Private file was not uploaded' using errcode = '23514';
  end if;
  update public.patient_documents
    set status = 'available', available_at = clock_timestamp()
    where id = document_row.id;
  return document_row.id;
end;
$$;

create function private.reject_patient_document(
  target_tenant uuid,
  target_document uuid,
  target_actor uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  document_row public.patient_documents;
begin
  select * into document_row
    from public.patient_documents
    where tenant_id = target_tenant and id = target_document
    for update;
  if not found
    or document_row.uploaded_by <> target_actor
    or not private.document_actor_has_access(
      document_row.tenant_id,
      document_row.patient_id,
      target_actor,
      document_row.visibility
    ) then
    raise exception 'Private document reservation required' using errcode = '42501';
  end if;
  if document_row.status = 'rejected' then return document_row.id; end if;
  if document_row.status <> 'reserved' then
    raise exception 'Document cannot be rejected' using errcode = '23514';
  end if;
  update public.patient_documents
    set status = 'rejected', rejected_at = clock_timestamp()
    where id = document_row.id;
  return document_row.id;
end;
$$;

revoke all on function private.reserve_patient_document(uuid, uuid, uuid, text, text, bigint, text, text),
  private.complete_patient_document(uuid, uuid, uuid),
  private.reject_patient_document(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function private.reserve_patient_document(uuid, uuid, uuid, text, text, bigint, text, text),
  private.complete_patient_document(uuid, uuid, uuid),
  private.reject_patient_document(uuid, uuid, uuid) to service_role;

create function public.reserve_patient_document(
  target_tenant uuid,
  target_patient uuid,
  target_uploader uuid,
  input_filename text,
  input_content_type text,
  input_byte_size bigint,
  input_category text,
  input_visibility text
) returns table(document_id uuid, storage_path text)
language sql security invoker set search_path = '' as $$
  select * from private.reserve_patient_document(
    target_tenant,
    target_patient,
    target_uploader,
    input_filename,
    input_content_type,
    input_byte_size,
    input_category,
    input_visibility
  );
$$;
create function public.complete_patient_document(
  target_tenant uuid,
  target_document uuid,
  target_actor uuid
) returns uuid
language sql security invoker set search_path = '' as $$
  select private.complete_patient_document(target_tenant, target_document, target_actor);
$$;
create function public.reject_patient_document(
  target_tenant uuid,
  target_document uuid,
  target_actor uuid
) returns uuid
language sql security invoker set search_path = '' as $$
  select private.reject_patient_document(target_tenant, target_document, target_actor);
$$;
revoke all on function public.reserve_patient_document(uuid, uuid, uuid, text, text, bigint, text, text),
  public.complete_patient_document(uuid, uuid, uuid),
  public.reject_patient_document(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_patient_document(uuid, uuid, uuid, text, text, bigint, text, text),
  public.complete_patient_document(uuid, uuid, uuid),
  public.reject_patient_document(uuid, uuid, uuid) to service_role;

-- Storage RLS ties every object to a server-created reservation. A caller
-- cannot upload an arbitrary path, list the bucket, or read another patient's
-- document by guessing an object name.
create function private.can_upload_patient_document_object(object_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and private.has_live_session() and exists (
    select 1 from public.patient_documents document
    where document.storage_path = object_path
      and document.status = 'reserved'
      and private.patient_document_uploader_has_access(
        document.tenant_id,
        document.patient_id,
        document.uploaded_by,
        document.visibility
      )
  );
$$;
create function private.can_read_patient_document_object(object_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and private.has_live_session() and exists (
    select 1 from public.patient_documents document
    where document.storage_path = object_path
      and (
        (
          document.status = 'reserved'
          and private.patient_document_uploader_has_access(
            document.tenant_id,
            document.patient_id,
            document.uploaded_by,
            document.visibility
          )
        )
        or (
          document.status = 'available'
          and (
            private.has_care_access(document.tenant_id, document.patient_id)
            or (
              document.visibility = 'shared'
              and private.has_tenant_role(document.tenant_id, array['patient'])
              and exists (
                select 1 from public.patient_accounts account
                where account.tenant_id = document.tenant_id
                  and account.patient_id = document.patient_id
                  and account.user_id = auth.uid()
              )
            )
          )
        )
      )
  );
$$;
create function private.can_delete_patient_document_object(object_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and private.has_live_session() and exists (
    select 1 from public.patient_documents document
    where document.storage_path = object_path
      and document.status = 'reserved'
      and private.patient_document_uploader_has_access(
        document.tenant_id,
        document.patient_id,
        document.uploaded_by,
        document.visibility
      )
  );
$$;
revoke all on function private.can_upload_patient_document_object(text),
  private.can_read_patient_document_object(text),
  private.can_delete_patient_document_object(text) from public, anon;
grant execute on function private.can_upload_patient_document_object(text),
  private.can_read_patient_document_object(text),
  private.can_delete_patient_document_object(text) to authenticated;

create policy vivance_documents_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vivance-documents'
    and private.can_upload_patient_document_object(name)
  );
create policy vivance_documents_read on storage.objects for select to authenticated
  using (
    bucket_id = 'vivance-documents'
    and private.can_read_patient_document_object(name)
  );
create policy vivance_documents_delete_reserved on storage.objects for delete to authenticated
  using (
    bucket_id = 'vivance-documents'
    and private.can_delete_patient_document_object(name)
  );
