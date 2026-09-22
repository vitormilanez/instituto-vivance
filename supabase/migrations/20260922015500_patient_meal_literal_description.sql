-- Correção do diário alimentar: o relato é armazenado literalmente.
--
-- Bancos criados a partir de 20260921191924_patient_meal_logs.sql já recebem o
-- estado final; este arquivo existe para os bancos onde aquela migration já foi
-- aplicada na versão que normalizava as extremidades do texto — ali a correção
-- não chega sozinha, porque o histórico considera a migration antiga aplicada.
--
-- Reexecutável de propósito: derruba o CHECK pelo nome, recria a função com
-- create or replace e reafirma os grants. Nenhum dado é reescrito; relatos já
-- gravados permanecem como estão.

alter table public.patient_meal_logs
  drop constraint if exists patient_meal_logs_description_check;
alter table public.patient_meal_logs
  add constraint patient_meal_logs_description_check check (
    char_length(description) between 1 and 2000
    and description !~ '^[[:space:]]*$');

create or replace function private.record_patient_meal(
  target_tenant uuid,
  request_key uuid,
  type_text text,
  happened_at timestamptz,
  note_text text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  target_patient uuid;
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
  select id into result from public.patient_meal_logs
  where tenant_id = target_tenant and actor_user_id = auth.uid()
    and client_request_id = request_key;
  if result is not null then return result; end if;
  insert into public.patient_meal_logs(
    tenant_id, patient_id, actor_user_id, meal_type, eaten_at, description, client_request_id
  ) values (
    target_tenant, target_patient, auth.uid(), type_text, happened_at, note_text, request_key
  ) returning id into result;
  return result;
end;
$$;
revoke all on function private.record_patient_meal(uuid,uuid,text,timestamptz,text)
  from public, anon, authenticated;
grant execute on function private.record_patient_meal(uuid,uuid,text,timestamptz,text)
  to authenticated;
