-- Optional photo attached to a meal report. The image reuses the private
-- document storage and is linked to exactly one meal_logs row. Nothing here
-- reads the pixels: no calories, no classification, no advice.
--
-- The upload path (supabase/functions/private-documents) only accepts the
-- categories 'exam' and 'clinical_document' and is not deployed by this
-- migration, so the photo is reserved as a shared clinical document and marked
-- here as belonging to a meal. The mark keeps it out of the document library
-- and gives the link an explicit, queryable owner.

alter table public.patient_documents
  add column attached_to text not null default 'documents'
  check (attached_to in ('documents', 'meal_log'));
create index patient_documents_library
  on public.patient_documents(tenant_id, status, attached_to, created_at desc, id);

alter table public.patient_meal_logs
  add column photo_document_id uuid;
alter table public.patient_meal_logs
  add constraint patient_meal_logs_photo_document_fkey
  foreign key (tenant_id, photo_document_id)
  references public.patient_documents(tenant_id, id);
-- One photo belongs to one meal and one meal to one photo.
alter table public.patient_meal_logs
  add constraint patient_meal_logs_photo_document_unique
  unique (tenant_id, photo_document_id);

-- The photo argument changes the signature, so the five-argument versions are
-- dropped instead of left as a second overload.
drop function if exists public.record_patient_meal(uuid, uuid, text, timestamptz, text);
drop function if exists private.record_patient_meal(uuid, uuid, text, timestamptz, text);

create function private.record_patient_meal(
  target_tenant uuid,
  request_key uuid,
  type_text text,
  happened_at timestamptz,
  note_text text,
  photo_document uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  target_patient uuid;
  stored public.patient_meal_logs;
  result uuid;
begin
  if request_key is null or not private.has_tenant_role(target_tenant, array['patient']) then
    raise exception 'Active patient access required' using errcode = '42501';
  end if;
  if type_text not in ('breakfast','lunch','dinner','snack','other')
    or happened_at is null or happened_at > clock_timestamp() + interval '15 minutes'
    or note_text is null or char_length(note_text) not between 1 and 2000
    or note_text ~ '^[[:space:]]*$' then
    raise exception 'Valid meal details required' using errcode = '23514';
  end if;
  select patient_id into target_patient
  from public.patient_accounts
  where tenant_id = target_tenant and user_id = auth.uid();
  if target_patient is null then
    raise exception 'Patient account required' using errcode = '42501';
  end if;

  -- Idempotency is strict: the same key with the same report returns the same
  -- row; the same key with any other content or photo is refused instead of
  -- silently answering with an unrelated meal.
  select * into stored from public.patient_meal_logs
  where tenant_id = target_tenant and actor_user_id = auth.uid()
    and client_request_id = request_key;
  if stored.id is not null then
    if stored.meal_type = type_text
      and stored.eaten_at = happened_at
      and stored.description = note_text
      and stored.photo_document_id is not distinct from photo_document then
      return stored.id;
    end if;
    raise exception 'Request key already used with different content'
      using errcode = '23505', detail = 'meal_request_key_reused';
  end if;

  if photo_document is not null then
    if not exists (
      select 1 from public.patient_documents document
      where document.tenant_id = target_tenant
        and document.id = photo_document
        and document.patient_id = target_patient
        and document.uploaded_by = auth.uid()
        and document.status = 'available'
        and document.content_type in ('image/jpeg','image/png')
    ) then
      raise exception 'Available meal photo required' using errcode = '23514';
    end if;
    update public.patient_documents set attached_to = 'meal_log'
    where tenant_id = target_tenant and id = photo_document;
  end if;

  insert into public.patient_meal_logs(
    tenant_id, patient_id, actor_user_id, meal_type, eaten_at, description,
    client_request_id, photo_document_id
  ) values (
    target_tenant, target_patient, auth.uid(), type_text, happened_at, note_text,
    request_key, photo_document
  ) returning id into result;
  return result;
end;
$$;
revoke all on function private.record_patient_meal(uuid,uuid,text,timestamptz,text,uuid)
  from public, anon, authenticated;
grant execute on function private.record_patient_meal(uuid,uuid,text,timestamptz,text,uuid)
  to authenticated;

create function public.record_patient_meal(
  target_tenant uuid,
  request_key uuid,
  type_text text,
  happened_at timestamptz,
  note_text text,
  photo_document uuid default null
) returns uuid
language sql security invoker set search_path = '' as $$
  select private.record_patient_meal(
    target_tenant, request_key, type_text, happened_at, note_text, photo_document);
$$;
revoke all on function public.record_patient_meal(uuid,uuid,text,timestamptz,text,uuid)
  from public, anon, authenticated;
grant execute on function public.record_patient_meal(uuid,uuid,text,timestamptz,text,uuid)
  to authenticated;
