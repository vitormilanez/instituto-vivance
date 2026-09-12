-- Slice 5D: durable processing foundation. Jobs carry only tenant/patient
-- context and an idempotency key. They never store audio, clinical text,
-- prompts, provider responses or raw execution errors.
create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  job_type text not null check (job_type in ('audio_transcription', 'clinical_draft')),
  idempotency_key text not null check (
    char_length(btrim(idempotency_key)) between 1 and 160
    and idempotency_key !~ '[[:cntrl:]]'
  ),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 5),
  max_attempts integer not null default 3 check (max_attempts between 1 and 5),
  available_at timestamptz not null default clock_timestamp(),
  last_started_at timestamptz,
  lease_token uuid,
  lease_expires_at timestamptz,
  last_error_code text check (
    last_error_code is null
    or last_error_code in ('timeout', 'retryable', 'permanent')
  ),
  completed_at timestamptz,
  failed_at timestamptz,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (tenant_id, idempotency_key),
  unique (tenant_id, id, patient_id),
  foreign key (tenant_id, patient_id)
    references public.patients(tenant_id, id),
  foreign key (tenant_id, created_by)
    references public.memberships(tenant_id, user_id),
  check (attempt_count <= max_attempts),
  check (
    lease_expires_at is null
    or (last_started_at is not null and lease_expires_at > last_started_at)
  )
);
create index processing_jobs_patient_recent
  on public.processing_jobs(tenant_id, patient_id, created_at desc, id desc);
create index processing_jobs_claimable
  on public.processing_jobs(available_at, created_at, id)
  where status = 'pending';
create index processing_jobs_expiring
  on public.processing_jobs(lease_expires_at, id)
  where status = 'processing';

alter table public.processing_jobs enable row level security;
revoke all on public.processing_jobs from public, anon, authenticated;
grant select on public.processing_jobs to authenticated;
create policy processing_jobs_read_active_care on public.processing_jobs
  for select to authenticated
  using (private.has_care_access(tenant_id, patient_id));

create function private.validate_processing_job() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.tenant_id is distinct from old.tenant_id
    or new.patient_id is distinct from old.patient_id
    or new.job_type is distinct from old.job_type
    or new.idempotency_key is distinct from old.idempotency_key
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Immutable processing job identity' using errcode = '42501';
  end if;
  if (case new.status
    when 'pending' then
      new.lease_token is null
      and new.lease_expires_at is null
      and new.completed_at is null
      and new.failed_at is null
    when 'processing' then
      new.lease_token is not null
      and new.lease_expires_at is not null
      and new.completed_at is null
      and new.failed_at is null
    when 'completed' then
      new.lease_token is null
      and new.lease_expires_at is null
      and new.completed_at is not null
      and new.failed_at is null
      and new.last_error_code is null
    when 'failed' then
      new.lease_token is null
      and new.lease_expires_at is null
      and new.completed_at is null
      and new.failed_at is not null
      and new.last_error_code in ('timeout', 'retryable', 'permanent')
    else false
  end) is not true then
    raise exception 'Invalid processing job state' using errcode = '23514';
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function private.validate_processing_job() from public, anon, authenticated;
create trigger processing_jobs_validate before insert or update on public.processing_jobs
  for each row execute function private.validate_processing_job();
create trigger processing_jobs_audit after insert or update on public.processing_jobs
  for each row execute function private.audit_change();

-- Only an active clinician with current care access can put a future
-- processor's work in the queue. Individual source slices expose their own
-- public wrapper later; this generic producer remains in the private schema.
create function private.enqueue_processing_job(
  target_tenant uuid,
  target_patient uuid,
  target_job_type text,
  source_key text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  result uuid;
  existing public.processing_jobs;
  normalized_key text := btrim(source_key);
begin
  if not private.has_tenant_role(target_tenant, array['doctor', 'nurse'])
    or not private.has_care_access(target_tenant, target_patient) then
    raise exception 'Active clinical care access required' using errcode = '42501';
  end if;
  if target_job_type not in ('audio_transcription', 'clinical_draft')
    or normalized_key is null
    or char_length(normalized_key) not between 1 and 160
    or normalized_key ~ '[[:cntrl:]]' then
    raise exception 'Valid processing job required' using errcode = '23514';
  end if;

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
    normalized_key,
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
      and idempotency_key = normalized_key;
  if existing.patient_id is distinct from target_patient
    or existing.job_type is distinct from target_job_type then
    raise exception 'Idempotency key belongs to another processing job'
      using errcode = '23514';
  end if;
  return existing.id;
end;
$$;

-- A worker claims one available item using row locking, retaining a short
-- lease. Expired leases are retried until their bounded attempt budget ends.
-- The returned contract deliberately contains no source payload.
create function private.recover_expired_processing_jobs()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  recovered_count integer;
begin
  execute $recovery$
    update public.processing_jobs as job
      set status = case
            when job.attempt_count >= job.max_attempts then 'failed'
            else 'pending'
          end,
          lease_token = null,
          lease_expires_at = null,
          available_at = case
            when job.attempt_count >= job.max_attempts then job.available_at
            else clock_timestamp()
          end,
          failed_at = case
            when job.attempt_count >= job.max_attempts then clock_timestamp()
            else null
          end,
          completed_at = null,
          last_error_code = 'timeout',
          updated_at = clock_timestamp()
      where job.status = 'processing'
        and job.lease_expires_at <= clock_timestamp()
  $recovery$;
  get diagnostics recovered_count = row_count;
  return recovered_count;
end;
$$;

create function private.claim_next_processing_job()
returns table (
  job_id uuid,
  tenant_id uuid,
  patient_id uuid,
  job_type text,
  attempt_count integer,
  max_attempts integer,
  lease_token uuid
)
language sql security definer set search_path = '' as $$
  with candidate as (
    select job.id
      from public.processing_jobs as job
      where job.status = 'pending'
        and job.available_at <= clock_timestamp()
      order by job.available_at, job.created_at, job.id
      for update skip locked
      limit 1
  )
  update public.processing_jobs as job
    set status = 'processing',
        attempt_count = job.attempt_count + 1,
        last_started_at = clock_timestamp(),
        lease_token = gen_random_uuid(),
        lease_expires_at = clock_timestamp() + interval '5 minutes',
        completed_at = null,
        failed_at = null,
        last_error_code = null,
        updated_at = clock_timestamp()
    from candidate
    where job.id = candidate.id
      and job.status = 'pending'
  returning
    job.id,
    job.tenant_id,
    job.patient_id,
    job.job_type,
    job.attempt_count,
    job.max_attempts,
    job.lease_token;
$$;

create function private.complete_processing_job(
  target_job uuid,
  target_lease uuid
) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if target_job is null or target_lease is null then
    raise exception 'Processing lease required' using errcode = '23514';
  end if;
  update public.processing_jobs as job
    set status = 'completed',
        lease_token = null,
        lease_expires_at = null,
        completed_at = clock_timestamp(),
        failed_at = null,
        last_error_code = null,
        updated_at = clock_timestamp()
    where job.id = target_job
      and job.status = 'processing'
      and job.lease_token = target_lease
      and job.lease_expires_at > clock_timestamp();
  if not found then
    raise exception 'Processing lease is no longer active' using errcode = '42501';
  end if;
  return true;
end;
$$;

create function private.fail_processing_job(
  target_job uuid,
  target_lease uuid,
  failure_code text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  current_job public.processing_jobs;
  now_time timestamptz := clock_timestamp();
  retry_at timestamptz;
  result jsonb;
begin
  if target_job is null or target_lease is null
    or failure_code not in ('retryable', 'permanent') then
    raise exception 'Valid processing failure required' using errcode = '23514';
  end if;
  select * into current_job
    from public.processing_jobs as job
    where job.id = target_job
      and job.status = 'processing'
      and job.lease_token = target_lease
      and job.lease_expires_at > now_time
    for update;
  if not found then
    raise exception 'Processing lease is no longer active' using errcode = '42501';
  end if;

  if failure_code = 'permanent'
    or current_job.attempt_count >= current_job.max_attempts then
    update public.processing_jobs as job
      set status = 'failed',
          lease_token = null,
          lease_expires_at = null,
          completed_at = null,
          failed_at = now_time,
          last_error_code = failure_code,
          updated_at = now_time
      where job.id = current_job.id
      returning jsonb_build_object(
        'status', job.status,
        'available_at', job.available_at
      ) into result;
    return result;
  end if;

  retry_at := now_time + (
    least(300, 15 * current_job.attempt_count) * interval '1 second'
  );
  update public.processing_jobs as job
    set status = 'pending',
        lease_token = null,
        lease_expires_at = null,
        completed_at = null,
        failed_at = null,
        available_at = retry_at,
        last_error_code = 'retryable',
        updated_at = now_time
    where job.id = current_job.id
    returning jsonb_build_object(
      'status', job.status,
      'available_at', job.available_at
    ) into result;
  return result;
end;
$$;

revoke all on function private.enqueue_processing_job(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function private.enqueue_processing_job(uuid, uuid, text, text)
  to authenticated;
revoke all on function private.recover_expired_processing_jobs(),
  private.claim_next_processing_job(),
  private.complete_processing_job(uuid, uuid),
  private.fail_processing_job(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function private.recover_expired_processing_jobs(),
  private.claim_next_processing_job(),
  private.complete_processing_job(uuid, uuid),
  private.fail_processing_job(uuid, uuid, text)
  to service_role;

-- Worker wrappers are callable only by the server-side service role. A worker
-- recovers expired leases before claiming the next item. No browser route,
-- Vercel cron, provider or secret is activated by this slice.
create function public.recover_expired_processing_jobs()
returns integer
language sql security invoker set search_path = '' as $$
  select private.recover_expired_processing_jobs();
$$;
create function public.claim_next_processing_job()
returns table (
  job_id uuid,
  tenant_id uuid,
  patient_id uuid,
  job_type text,
  attempt_count integer,
  max_attempts integer,
  lease_token uuid
)
language sql security invoker set search_path = '' as $$
  select * from private.claim_next_processing_job();
$$;
create function public.complete_processing_job(
  target_job uuid,
  target_lease uuid
) returns boolean
language sql security invoker set search_path = '' as $$
  select private.complete_processing_job(target_job, target_lease);
$$;
create function public.fail_processing_job(
  target_job uuid,
  target_lease uuid,
  failure_code text
) returns table (status text, available_at timestamptz)
language sql security invoker set search_path = '' as $$
  select
    response.result->>'status' as status,
    (response.result->>'available_at')::timestamptz as available_at
  from (
    select private.fail_processing_job(
      target_job,
      target_lease,
      failure_code
    ) as result
  ) as response;
$$;
revoke all on function public.recover_expired_processing_jobs(),
  public.claim_next_processing_job(),
  public.complete_processing_job(uuid, uuid),
  public.fail_processing_job(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.recover_expired_processing_jobs(),
  public.claim_next_processing_job(),
  public.complete_processing_job(uuid, uuid),
  public.fail_processing_job(uuid, uuid, text)
  to service_role;
