-- Slice 5D follow-up: an idempotency key is an opaque reference, never source
-- content. Existing development jobs were confirmed empty before this guard.
alter table public.processing_jobs
  add constraint processing_jobs_idempotency_key_opaque_uuid check (
    idempotency_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

create or replace function private.enqueue_processing_job(
  target_tenant uuid,
  target_patient uuid,
  target_job_type text,
  source_key text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  result uuid;
  existing public.processing_jobs;
  normalized_key uuid;
begin
  if not private.has_tenant_role(target_tenant, array['doctor', 'nurse'])
    or not private.has_care_access(target_tenant, target_patient) then
    raise exception 'Active clinical care access required' using errcode = '42501';
  end if;
  if target_job_type not in ('audio_transcription', 'clinical_draft')
    or source_key is null
    or char_length(btrim(source_key)) not between 1 and 160
    or source_key ~ '[[:cntrl:]]' then
    raise exception 'Valid processing job required' using errcode = '23514';
  end if;
  begin
    normalized_key := btrim(source_key)::uuid;
  exception when invalid_text_representation then
    raise exception 'Opaque processing source reference required'
      using errcode = '23514';
  end;

  insert into public.processing_jobs(
    tenant_id,
    patient_id,
    job_type,
    idempotency_key,
    created_by
  ) values (
    target_tenant,
    target_patient,
    target_job_type,
    normalized_key::text,
    auth.uid()
  ) on conflict (tenant_id, idempotency_key)
    do nothing
  returning id into result;
  if result is not null then
    return result;
  end if;

  select * into existing
    from public.processing_jobs
    where tenant_id = target_tenant
      and idempotency_key = normalized_key::text;
  if existing.patient_id is distinct from target_patient
    or existing.job_type is distinct from target_job_type then
    raise exception 'Idempotency key belongs to another processing job'
      using errcode = '23514';
  end if;
  return existing.id;
end;
$$;
revoke all on function private.enqueue_processing_job(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function private.enqueue_processing_job(uuid, uuid, text, text)
  to authenticated;

-- Claim always reconciles expired leases before selecting a pending task, so a
-- future server worker cannot accidentally omit timeout recovery.
create or replace function public.claim_next_processing_job()
returns table (
  job_id uuid,
  tenant_id uuid,
  patient_id uuid,
  job_type text,
  attempt_count integer,
  max_attempts integer,
  lease_token uuid
)
language plpgsql security invoker set search_path = '' as $$
begin
  perform private.recover_expired_processing_jobs();
  return query select * from private.claim_next_processing_job();
end;
$$;
revoke all on function public.claim_next_processing_job()
  from public, anon, authenticated;
grant execute on function public.claim_next_processing_job() to service_role;
comment on function public.claim_next_processing_job() is
  'Service-role only. Recovers expired leases before claiming one job.';
