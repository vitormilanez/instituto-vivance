-- Patient-owned meal notes support longitudinal context. They are original
-- self-reports: no nutritional inference, adherence score, or care decision.
-- The description is persisted exactly as the patient typed it, including edge
-- spaces, accents and line breaks; only a report made of whitespace alone is
-- rejected, and the 1–2.000 limit counts characters, not bytes.
create table public.patient_meal_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  actor_user_id uuid not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack','other')),
  eaten_at timestamptz not null,
  description text not null check (
    char_length(description) between 1 and 2000 and description !~ '^[[:space:]]*$'),
  client_request_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, id),
  unique (tenant_id, actor_user_id, client_request_id),
  foreign key (tenant_id, patient_id) references public.patients(tenant_id, id),
  foreign key (tenant_id, actor_user_id) references public.memberships(tenant_id, user_id)
);
create index patient_meal_logs_patient_timeline
  on public.patient_meal_logs(tenant_id, patient_id, eaten_at desc, id desc);
create trigger patient_meal_logs_audit after insert on public.patient_meal_logs
  for each row execute function private.audit_change();

alter table public.patient_meal_logs enable row level security;
revoke all on public.patient_meal_logs from public, anon, authenticated;
grant select on public.patient_meal_logs to authenticated;

create policy patient_meal_logs_patient_read on public.patient_meal_logs
  for select to authenticated using (
    private.has_tenant_role(tenant_id, array['patient']) and exists (
      select 1 from public.patient_accounts pa
      where pa.tenant_id = patient_meal_logs.tenant_id
        and pa.patient_id = patient_meal_logs.patient_id
        and pa.user_id = (select auth.uid())
    )
  );
create policy patient_meal_logs_care_read on public.patient_meal_logs
  for select to authenticated using (
    private.has_tenant_role(tenant_id, array['doctor','nurse'])
    and private.has_care_access(tenant_id, patient_id)
  );

create function private.record_patient_meal(
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

create function public.record_patient_meal(
  target_tenant uuid,
  request_key uuid,
  type_text text,
  happened_at timestamptz,
  note_text text
) returns uuid
language sql security invoker set search_path = '' as $$
  select private.record_patient_meal(target_tenant, request_key, type_text, happened_at, note_text);
$$;
revoke all on function public.record_patient_meal(uuid,uuid,text,timestamptz,text)
  from public, anon, authenticated;
grant execute on function public.record_patient_meal(uuid,uuid,text,timestamptz,text)
  to authenticated;
