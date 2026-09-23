-- Refeição só com foto: a descrição passa a ser opcional quando há foto.
-- Sem foto, o relato continua exigindo texto. O texto, quando existe, segue
-- guardado exatamente como a pessoa escreveu.

alter table public.patient_meal_logs
  alter column description drop not null;
alter table public.patient_meal_logs
  drop constraint if exists patient_meal_logs_description_check;
alter table public.patient_meal_logs
  add constraint patient_meal_logs_description_check check (
    description is null
    or (char_length(description) between 1 and 2000 and description !~ '^[[:space:]]*$'));
alter table public.patient_meal_logs
  add constraint patient_meal_logs_text_or_photo check (
    description is not null or photo_document_id is not null);

create or replace function private.record_patient_meal(
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
    or (note_text is null and photo_document is null)
    or (note_text is not null and (char_length(note_text) not between 1 and 2000
      or note_text ~ '^[[:space:]]*$')) then
    raise exception 'Valid meal details required' using errcode = '23514';
  end if;
  select patient_id into target_patient
  from public.patient_accounts
  where tenant_id = target_tenant and user_id = auth.uid();
  if target_patient is null then
    raise exception 'Patient account required' using errcode = '42501';
  end if;

  select * into stored from public.patient_meal_logs
  where tenant_id = target_tenant and actor_user_id = auth.uid()
    and client_request_id = request_key;
  if stored.id is not null then
    if stored.meal_type = type_text
      and stored.eaten_at = happened_at
      and stored.description is not distinct from note_text
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
