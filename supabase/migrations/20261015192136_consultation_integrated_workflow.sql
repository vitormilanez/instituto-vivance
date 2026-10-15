-- Integrated consultation assistance. Browser audio is never stored: only
-- patient-authorized text checkpoints and derived drafts are persisted.
-- Clinical encounter completion and patient publication remain separate acts.

create table public.consultation_consent_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  appointment_id uuid not null,
  patient_id uuid not null,
  patient_user_id uuid not null,
  decision_id uuid not null unique,
  consent_version text not null check (consent_version = 'consultation-assistance-v1'),
  decision text not null check (decision in ('granted','refused','withdrawn')),
  consent_text text not null check (char_length(consent_text) between 40 and 2000),
  capture_allowed boolean not null,
  summary_allowed boolean not null,
  decided_at timestamptz not null default clock_timestamp(),
  foreign key (tenant_id,appointment_id) references public.appointments(tenant_id,id),
  foreign key (tenant_id,patient_id) references public.patients(tenant_id,id),
  foreign key (tenant_id,patient_user_id) references public.memberships(tenant_id,user_id),
  check ((decision='granted' and capture_allowed and summary_allowed)
    or (decision<>'granted' and not capture_allowed and not summary_allowed))
);
create index consultation_consent_latest_idx on public.consultation_consent_events
  (tenant_id,appointment_id,decided_at desc,id desc);

create table public.consultation_capture_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  appointment_id uuid not null,
  patient_id uuid not null,
  doctor_id uuid not null,
  consent_event_id uuid not null references public.consultation_consent_events(id),
  consent_version text not null,
  status text not null check (status in ('capturing','paused','finalized','cancelled')),
  started_at timestamptz not null default clock_timestamp(),
  paused_at timestamptz,
  ended_at timestamptz,
  next_chunk_index integer not null default 0 check (next_chunk_index between 0 and 360),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (tenant_id,appointment_id) references public.appointments(tenant_id,id),
  foreign key (tenant_id,patient_id) references public.patients(tenant_id,id),
  foreign key (tenant_id,doctor_id) references public.memberships(tenant_id,user_id),
  check ((status='finalized' and ended_at is not null)
    or (status<>'finalized' and ended_at is null))
);
create unique index consultation_capture_one_live_idx on public.consultation_capture_sessions(tenant_id,appointment_id)
  where status in ('capturing','paused');

create table public.consultation_capture_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  capture_id uuid not null references public.consultation_capture_sessions(id),
  chunk_index integer not null check (chunk_index between 0 and 359),
  client_chunk_id uuid not null,
  text text not null check (char_length(btrim(text)) between 1 and 2000),
  captured_at timestamptz not null,
  start_seconds numeric(10,3) not null check (start_seconds>=0 and start_seconds<=14400),
  end_seconds numeric(10,3) not null check (end_seconds>=start_seconds and end_seconds<=14400),
  speaker text not null check (speaker='unknown'),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default clock_timestamp(),
  unique (capture_id,chunk_index),
  unique (capture_id,client_chunk_id)
);
create index consultation_capture_chunks_order_idx on public.consultation_capture_chunks(capture_id,chunk_index);

create table public.consultation_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  appointment_id uuid not null,
  capture_id uuid not null unique references public.consultation_capture_sessions(id),
  patient_id uuid not null,
  doctor_id uuid not null,
  consent_event_id uuid not null references public.consultation_consent_events(id),
  consent_version text not null,
  segments jsonb not null check (jsonb_typeof(segments)='array'),
  original_text text not null check (char_length(original_text)<=100000),
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  finalized_at timestamptz not null default clock_timestamp(),
  foreign key (tenant_id,appointment_id) references public.appointments(tenant_id,id),
  foreign key (tenant_id,patient_id) references public.patients(tenant_id,id),
  foreign key (tenant_id,doctor_id) references public.memberships(tenant_id,user_id),
  unique (tenant_id,appointment_id,source_hash)
);

create table public.consultation_summary_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  appointment_id uuid not null,
  source_id uuid not null unique references public.consultation_sources(id),
  consent_event_id uuid not null references public.consultation_consent_events(id),
  consent_version text not null,
  source_hash text not null,
  contract_version text not null default 'consultation-summary-v1',
  generator_key text,
  status text not null check (status in ('pending','processing','ready','failed','cancelled','unavailable')),
  attempts integer not null default 0 check (attempts between 0 and 10),
  lease_token uuid,
  lease_expires_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (tenant_id,appointment_id) references public.appointments(tenant_id,id),
  check ((status='processing' and lease_token is not null and lease_expires_at is not null)
    or status<>'processing')
);
create index consultation_summary_jobs_status_idx on public.consultation_summary_jobs(status,lease_expires_at,created_at);

create table public.consultation_summary_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  job_id uuid not null references public.consultation_summary_jobs(id),
  source_id uuid not null references public.consultation_sources(id),
  version integer not null check (version>0),
  kind text not null check (kind in ('generated','doctor_correction')),
  summary jsonb not null check (jsonb_typeof(summary)='object'),
  metadata jsonb not null check (jsonb_typeof(metadata)='object'),
  summary_hash text not null check (summary_hash ~ '^[a-f0-9]{64}$'),
  corrected_from uuid references public.consultation_summary_versions(id),
  created_by uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  foreign key (tenant_id,created_by) references public.memberships(tenant_id,user_id),
  unique (job_id,version)
);
create index consultation_summary_versions_latest_idx on public.consultation_summary_versions(job_id,version desc);

create table public.consultation_summary_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  summary_id uuid not null references public.consultation_summary_versions(id),
  doctor_id uuid not null,
  decision text not null check (decision in ('accepted','rejected')),
  note text not null check (char_length(btrim(note)) between 1 and 2000),
  reviewed_at timestamptz not null default clock_timestamp(),
  foreign key (tenant_id,doctor_id) references public.memberships(tenant_id,user_id)
);
create index consultation_summary_reviews_latest_idx on public.consultation_summary_reviews(summary_id,reviewed_at desc,id desc);

alter table public.consultation_consent_events enable row level security;
alter table public.consultation_capture_sessions enable row level security;
alter table public.consultation_capture_chunks enable row level security;
alter table public.consultation_sources enable row level security;
alter table public.consultation_summary_jobs enable row level security;
alter table public.consultation_summary_versions enable row level security;
alter table public.consultation_summary_reviews enable row level security;
revoke all on public.consultation_consent_events,public.consultation_capture_sessions,
  public.consultation_capture_chunks,public.consultation_sources,
  public.consultation_summary_jobs,public.consultation_summary_versions,
  public.consultation_summary_reviews from public,anon,authenticated,service_role;

create trigger consultation_consent_events_immutable before update or delete on public.consultation_consent_events
  for each row execute function private.reject_document_extraction_mutation();
create trigger consultation_capture_chunks_immutable before update or delete on public.consultation_capture_chunks
  for each row execute function private.reject_document_extraction_mutation();
create trigger consultation_sources_immutable before update or delete on public.consultation_sources
  for each row execute function private.reject_document_extraction_mutation();
create trigger consultation_summary_versions_immutable before update or delete on public.consultation_summary_versions
  for each row execute function private.reject_document_extraction_mutation();
create trigger consultation_summary_reviews_immutable before update or delete on public.consultation_summary_reviews
  for each row execute function private.reject_document_extraction_mutation();

create function public.consultation_workflow_operation(
  operation text, target_tenant uuid, actor_id uuid, actor_session uuid,
  target_appointment uuid, payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  appointment public.appointments;
  actor_role text;
  patient_actor boolean := false;
  doctor_actor boolean := false;
  consent public.consultation_consent_events;
  prior_consent public.consultation_consent_events;
  capture public.consultation_capture_sessions;
  chunk public.consultation_capture_chunks;
  source public.consultation_sources;
  job public.consultation_summary_jobs;
  summary_row public.consultation_summary_versions;
  review_row public.consultation_summary_reviews;
  decision_key uuid;
  capture_key uuid;
  chunk_key uuid;
  requested_chunk_index integer;
  chunk_start numeric;
  chunk_end numeric;
  chunk_time timestamptz;
  previous_chunk_time timestamptz;
  chunk_hash text;
  previous_end_seconds numeric;
  source_segments jsonb;
  source_text text;
  calculated_hash text;
  lease_seconds integer;
  supplied_token uuid;
  supplied_version integer;
  next_version integer;
  corrected jsonb;
  result jsonb;
  consent_copy text := 'Autorizo o reconhecimento de fala pelo serviço do navegador (no Chrome, Google), o armazenamento do texto no Vivance e a geração de resumo por IA com Anthropic Claude, somente para revisão privada do médico. O Vivance não grava áudio. Posso recusar ou retirar esta autorização sem cancelar a consulta.';
  prior_claims text := current_setting('request.jwt.claims',true);
begin
  if jsonb_typeof(payload) is distinct from 'object' then
    raise exception 'Invalid payload' using errcode='23514';
  end if;
  perform 1 from auth.sessions s join auth.users u on u.id=s.user_id
    where s.id=actor_session and s.user_id=actor_id and u.deleted_at is null
      and (u.banned_until is null or u.banned_until<=clock_timestamp())
      and (s.not_after is null or s.not_after>clock_timestamp())
    for share of s,u;
  if not found then
    raise exception 'Live session required' using errcode='42501';
  end if;
  select m.role into actor_role from public.memberships m join public.tenants t on t.id=m.tenant_id
    where m.tenant_id=target_tenant and m.user_id=actor_id and m.status='active' and t.status='active'
    for share of m,t;
  if actor_role not in ('doctor','patient') then raise exception 'Role denied' using errcode='42501'; end if;
  select * into appointment from public.appointments
    where tenant_id=target_tenant and id=target_appointment for update;
  if appointment.id is null then raise exception 'Appointment unavailable' using errcode='42501'; end if;
  if actor_role='patient' then
    perform 1 from public.patient_accounts a where a.tenant_id=target_tenant
      and a.patient_id=appointment.patient_id and a.user_id=actor_id for share;
    patient_actor:=found;
  elsif actor_role='doctor' and appointment.doctor_id=actor_id then
    perform 1 from public.care_relationships r where r.tenant_id=target_tenant
      and r.patient_id=appointment.patient_id and r.professional_id=actor_id and r.status='active' for share;
    doctor_actor:=found;
  end if;
  if not patient_actor and not doctor_actor then raise exception 'Appointment access denied' using errcode='42501'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor_id,'session_id',actor_session,'role','authenticated')::text,true);

  select * into consent from public.consultation_consent_events c
    where c.tenant_id=target_tenant and c.appointment_id=target_appointment
    order by c.decided_at desc,c.id desc limit 1;

  if operation='consent_decide' then
    if not patient_actor then raise exception 'Patient decision required' using errcode='42501'; end if;
    if exists(select 1 from jsonb_object_keys(payload) k where k not in ('decisionId','consentVersion','decision'))
      or payload->>'consentVersion' is distinct from 'consultation-assistance-v1'
      or coalesce(payload->>'decision','') not in ('granted','refused','withdrawn')
      or coalesce(payload->>'decisionId','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' then
      raise exception 'Invalid consent decision' using errcode='23514';
    end if;
    if appointment.status in ('cancelled','no_show') and payload->>'decision'='granted' then
      raise exception 'Appointment unavailable' using errcode='23514';
    end if;
    decision_key := (payload->>'decisionId')::uuid;
    perform pg_advisory_xact_lock(hashtextextended(decision_key::text,15102026));
    select * into prior_consent from public.consultation_consent_events where decision_id=decision_key;
    if prior_consent.id is not null then
      if (prior_consent.tenant_id,prior_consent.appointment_id,prior_consent.patient_id,prior_consent.patient_user_id,
          prior_consent.consent_version,prior_consent.decision)
        is distinct from (target_tenant,target_appointment,appointment.patient_id,actor_id,
          payload->>'consentVersion',payload->>'decision') then
        raise exception 'Immutable consent identity changed' using errcode='23505';
      end if;
      consent := prior_consent;
    else
      insert into public.consultation_consent_events(
        tenant_id,appointment_id,patient_id,patient_user_id,decision_id,consent_version,decision,consent_text,capture_allowed,summary_allowed)
      values(target_tenant,target_appointment,appointment.patient_id,actor_id,decision_key,
        payload->>'consentVersion',payload->>'decision',
        consent_copy,
        payload->>'decision'='granted',payload->>'decision'='granted')
      returning * into consent;
      insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,changed_fields)
      values(target_tenant,actor_id,'consultation_consent_'||consent.decision,'consultation_consent',consent.id,
        array['decision','consent_version','capture_allowed','summary_allowed']);
      if consent.decision in ('refused','withdrawn') then
        update public.consultation_capture_sessions set status='cancelled',paused_at=coalesce(paused_at,clock_timestamp()),updated_at=clock_timestamp()
          where tenant_id=target_tenant and appointment_id=target_appointment and status in ('capturing','paused');
        update public.consultation_summary_jobs set status='cancelled',lease_token=null,lease_expires_at=null,updated_at=clock_timestamp()
          where tenant_id=target_tenant and appointment_id=target_appointment and status in ('pending','processing','failed');
      end if;
    end if;
  elsif operation='begin' then
    if not doctor_actor then raise exception 'Assigned physician required' using errcode='42501'; end if;
    if appointment.status in ('cancelled','no_show') then raise exception 'Appointment unavailable' using errcode='23514'; end if;
    if consent.id is null or consent.decision<>'granted' or not consent.capture_allowed or not consent.summary_allowed then
      raise exception 'Current patient consent required' using errcode='23514';
    end if;
    if exists(select 1 from jsonb_object_keys(payload) k where k<>'captureId')
      or coalesce(payload->>'captureId','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' then
      raise exception 'Capture identity required' using errcode='23514';
    end if;
    capture_key := (payload->>'captureId')::uuid;
    select * into capture from public.consultation_capture_sessions c
      where c.tenant_id=target_tenant and c.appointment_id=target_appointment
        and c.status in ('capturing','paused') order by c.started_at desc limit 1 for update;
    if capture.id is null then
      insert into public.consultation_capture_sessions(id,tenant_id,appointment_id,patient_id,doctor_id,consent_event_id,consent_version,status)
      values(capture_key,target_tenant,target_appointment,appointment.patient_id,actor_id,consent.id,consent.consent_version,'capturing') returning * into capture;
      insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,changed_fields)
      values(target_tenant,actor_id,'consultation_capture_begin','consultation_capture',capture.id,array['status','consent_event_id']);
    elsif capture.id<>capture_key or capture.consent_event_id<>consent.id then
      raise exception 'Capture already exists or consent changed' using errcode='23505';
    elsif capture.status='paused' then
      if capture.started_at+interval '4 hours'<=clock_timestamp() then
        raise exception 'Capture duration exhausted' using errcode='23514';
      end if;
      update public.consultation_capture_sessions set status='capturing',paused_at=null,updated_at=clock_timestamp()
        where id=capture.id returning * into capture;
    end if;
  elsif operation='append_chunk' then
    if not doctor_actor then raise exception 'Assigned physician required' using errcode='42501'; end if;
    if consent.id is null or consent.decision<>'granted' or not consent.capture_allowed or not consent.summary_allowed then
      raise exception 'Current patient consent required' using errcode='23514';
    end if;
    if exists(select 1 from jsonb_object_keys(payload) k where k not in ('captureId','chunkIndex','clientChunkId','text','capturedAt','startSeconds','endSeconds','speaker'))
      or coalesce(payload->>'captureId','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
      or coalesce(payload->>'clientChunkId','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
      or jsonb_typeof(payload->'text') is distinct from 'string' or char_length(coalesce(btrim(payload->>'text'),'')) not between 1 and 2000
      or payload->>'speaker' is distinct from 'unknown' then
      raise exception 'Invalid capture chunk' using errcode='23514';
    end if;
    begin
      capture_key := (payload->>'captureId')::uuid;
      chunk_key := (payload->>'clientChunkId')::uuid;
      requested_chunk_index := (payload->>'chunkIndex')::integer;
      chunk_time := (payload->>'capturedAt')::timestamptz;
      chunk_start := (payload->>'startSeconds')::numeric;
      chunk_end := (payload->>'endSeconds')::numeric;
    exception when others then raise exception 'Invalid capture chunk' using errcode='23514'; end;
    if requested_chunk_index not between 0 and 359 or chunk_time is null or not isfinite(chunk_time)
      or chunk_start<0 or chunk_end<chunk_start or chunk_end>14400 then
      raise exception 'Invalid capture chunk' using errcode='23514';
    end if;
    select * into capture from public.consultation_capture_sessions where id=capture_key
      and tenant_id=target_tenant and appointment_id=target_appointment for update;
    if capture.id is null or capture.doctor_id<>actor_id or capture.patient_id<>appointment.patient_id
      or capture.consent_event_id<>consent.id or capture.status<>'capturing' then
      raise exception 'Capture is not writable' using errcode='23514';
    end if;
    chunk_hash := encode(sha256(convert_to(jsonb_build_object('index',requested_chunk_index,'clientChunkId',chunk_key,
      'text',payload->>'text','capturedAt',chunk_time,'startSeconds',chunk_start,'endSeconds',chunk_end,'speaker','unknown')::text,'UTF8')),'hex');
    if chunk_time<capture.started_at-interval '5 minutes'
      or chunk_time>capture.started_at+interval '4 hours 5 minutes'
      or chunk_time>clock_timestamp()+interval '5 minutes' then
      raise exception 'Invalid capture chunk time' using errcode='23514';
    end if;
    select c.* into chunk from public.consultation_capture_chunks c where c.capture_id=capture.id
      and (c.client_chunk_id=chunk_key or c.chunk_index=requested_chunk_index) order by c.created_at limit 1;
    if chunk.id is not null then
      if chunk.client_chunk_id<>chunk_key or chunk.chunk_index<>requested_chunk_index or chunk.content_hash<>chunk_hash then
        raise exception 'Immutable chunk identity changed' using errcode='23505';
      end if;
    else
      if capture.next_chunk_index<>requested_chunk_index then raise exception 'Capture chunk out of sequence' using errcode='40001'; end if;
      if requested_chunk_index>0 then
        select c.captured_at,c.end_seconds into previous_chunk_time,previous_end_seconds
          from public.consultation_capture_chunks c where c.capture_id=capture.id
          order by c.chunk_index desc limit 1;
        if previous_chunk_time>chunk_time or previous_end_seconds>chunk_start then
          raise exception 'Capture timeline out of sequence' using errcode='40001';
        end if;
      end if;
      insert into public.consultation_capture_chunks(tenant_id,capture_id,chunk_index,client_chunk_id,text,captured_at,start_seconds,end_seconds,speaker,content_hash)
      values(target_tenant,capture.id,requested_chunk_index,chunk_key,payload->>'text',chunk_time,chunk_start,chunk_end,'unknown',chunk_hash) returning * into chunk;
      update public.consultation_capture_sessions set next_chunk_index=next_chunk_index+1,updated_at=clock_timestamp()
        where id=capture.id returning * into capture;
    end if;
  elsif operation='pause' then
    if not doctor_actor then raise exception 'Assigned physician required' using errcode='42501'; end if;
    if consent.id is null or consent.decision<>'granted' then raise exception 'Current patient consent required' using errcode='23514'; end if;
    capture_key := nullif(payload->>'captureId','')::uuid;
    select * into capture from public.consultation_capture_sessions where id=capture_key
      and tenant_id=target_tenant and appointment_id=target_appointment for update;
    if capture.id is null or capture.doctor_id<>actor_id or capture.consent_event_id<>consent.id
      or capture.status not in ('capturing','paused') then raise exception 'Capture cannot be paused' using errcode='23514'; end if;
    if capture.status='capturing' then
      update public.consultation_capture_sessions set status='paused',paused_at=clock_timestamp(),updated_at=clock_timestamp()
        where id=capture.id returning * into capture;
    end if;
  elsif operation='end' then
    if not doctor_actor then raise exception 'Assigned physician required' using errcode='42501'; end if;
    if consent.id is null or consent.decision<>'granted' or not consent.capture_allowed or not consent.summary_allowed then
      raise exception 'Current patient consent required' using errcode='23514';
    end if;
    capture_key := nullif(payload->>'captureId','')::uuid;
    select * into capture from public.consultation_capture_sessions where id=capture_key
      and tenant_id=target_tenant and appointment_id=target_appointment for update;
    if capture.id is null or capture.doctor_id<>actor_id or capture.consent_event_id<>consent.id
      or capture.status not in ('capturing','paused','finalized') then raise exception 'Capture cannot be finalized' using errcode='23514'; end if;
    select * into source from public.consultation_sources where capture_id=capture.id;
    if source.id is null then
      select coalesce(jsonb_agg(jsonb_build_object('id',c.client_chunk_id,'text',c.text,'capturedAt',c.captured_at,
        'startSeconds',c.start_seconds,'endSeconds',c.end_seconds,'speaker','unknown') order by c.chunk_index),'[]'::jsonb),
        coalesce(string_agg(c.text,E'\n' order by c.chunk_index),'') into source_segments,source_text
      from public.consultation_capture_chunks c where c.capture_id=capture.id;
      calculated_hash := encode(sha256(convert_to(jsonb_build_object('segments',source_segments,'consentEventId',consent.id,
        'consentVersion',consent.consent_version)::text,'UTF8')),'hex');
      insert into public.consultation_sources(tenant_id,appointment_id,capture_id,patient_id,doctor_id,consent_event_id,consent_version,segments,original_text,source_hash)
      values(target_tenant,target_appointment,capture.id,appointment.patient_id,actor_id,consent.id,consent.consent_version,
        source_segments,source_text,calculated_hash) returning * into source;
      insert into public.consultation_summary_jobs(tenant_id,appointment_id,source_id,consent_event_id,consent_version,source_hash,status)
      values(target_tenant,target_appointment,source.id,consent.id,consent.consent_version,source.source_hash,
        case when jsonb_array_length(source_segments)=0 then 'unavailable' else 'pending' end) returning * into job;
      update public.consultation_capture_sessions set status='finalized',ended_at=clock_timestamp(),paused_at=null,updated_at=clock_timestamp()
        where id=capture.id returning * into capture;
      insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,changed_fields)
      values(target_tenant,actor_id,'consultation_source_finalize','consultation_source',source.id,array['segments','source_hash','consent_event_id']);
    end if;
  elsif operation='summary_claim' then
    if not doctor_actor then raise exception 'Assigned physician required' using errcode='42501'; end if;
    if consent.id is null or consent.decision<>'granted' or not consent.summary_allowed then raise exception 'Current patient consent required' using errcode='23514'; end if;
    if payload->>'contractVersion' is distinct from 'consultation-summary-v1'
      or jsonb_typeof(payload->'generatorKey') is distinct from 'string'
      or char_length(coalesce(btrim(payload->>'generatorKey'),'')) not between 1 and 200 then
      raise exception 'Invalid summary generator' using errcode='23514';
    end if;
    begin lease_seconds:=coalesce((payload->>'leaseSeconds')::integer,120); exception when others then raise exception 'Invalid lease' using errcode='23514'; end;
    if lease_seconds not between 30 and 300 then raise exception 'Invalid lease' using errcode='23514'; end if;
    select j.* into job from public.consultation_summary_jobs j join public.consultation_sources s on s.id=j.source_id
      where j.tenant_id=target_tenant and j.appointment_id=target_appointment and s.doctor_id=actor_id for update;
    if job.id is null or job.consent_event_id<>consent.id or job.source_hash is distinct from
      (select s.source_hash from public.consultation_sources s where s.id=job.source_id) then raise exception 'Summary source changed' using errcode='23514'; end if;
    if job.status='ready' then null;
    elsif job.status='processing' and job.lease_expires_at>clock_timestamp() then raise exception 'Summary is already processing' using errcode='40001';
    elsif job.status not in ('pending','failed','processing') or job.attempts>=10 then raise exception 'Summary cannot be claimed' using errcode='23514';
    else
      update public.consultation_summary_jobs set status='processing',attempts=attempts+1,lease_token=gen_random_uuid(),
        lease_expires_at=clock_timestamp()+make_interval(secs=>lease_seconds),generator_key=btrim(payload->>'generatorKey'),
        contract_version=payload->>'contractVersion',last_error_code=null,updated_at=clock_timestamp()
      where id=job.id returning * into job;
    end if;
    select * into source from public.consultation_sources where id=job.source_id;
    if job.status='processing' then
      return jsonb_build_object('claim',jsonb_build_object('jobId',job.id,'leaseToken',job.lease_token,
        'sourceId',source.id,'sourceHash',source.source_hash,'consentEventId',source.consent_event_id,
        'consentVersion',source.consent_version,'segments',source.segments));
    end if;
  elsif operation='summary_complete' then
    if not doctor_actor then raise exception 'Assigned physician required' using errcode='42501'; end if;
    if consent.id is null or consent.decision<>'granted' or not consent.summary_allowed then raise exception 'Current patient consent required' using errcode='23514'; end if;
    begin supplied_token:=(payload->>'leaseToken')::uuid; exception when others then raise exception 'Invalid summary lease' using errcode='23514'; end;
    select * into job from public.consultation_summary_jobs where id=(payload->>'jobId')::uuid
      and tenant_id=target_tenant and appointment_id=target_appointment for update;
    select * into source from public.consultation_sources where id=job.source_id;
    if job.id is null or job.status<>'processing' or job.lease_token<>supplied_token or job.lease_expires_at<clock_timestamp()
      or job.consent_event_id<>consent.id or source.consent_event_id<>consent.id
      or payload->>'consentEventId' is distinct from consent.id::text
      or payload->>'sourceHash' is distinct from source.source_hash or job.source_hash<>source.source_hash
      or payload->>'consentVersion' is distinct from consent.consent_version
      or jsonb_typeof(payload->'summary') is distinct from 'object' or jsonb_typeof(payload->'metadata') is distinct from 'object' then
      raise exception 'Summary completion guard changed' using errcode='40001';
    end if;
    calculated_hash:=encode(sha256(convert_to((payload->'summary')::text,'UTF8')),'hex');
    insert into public.consultation_summary_versions(tenant_id,job_id,source_id,version,kind,summary,metadata,summary_hash,created_by)
    values(target_tenant,job.id,source.id,1,'generated',payload->'summary',payload->'metadata',calculated_hash,actor_id)
    returning * into summary_row;
    update public.consultation_summary_jobs set status='ready',lease_expires_at=null,updated_at=clock_timestamp() where id=job.id returning * into job;
    insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,changed_fields)
    values(target_tenant,actor_id,'consultation_summary_generated','consultation_summary',summary_row.id,array['summary','metadata','source_hash','consent_event_id']);
  elsif operation='summary_fail' then
    if not doctor_actor then raise exception 'Assigned physician required' using errcode='42501'; end if;
    if consent.id is null or consent.decision<>'granted' then raise exception 'Current patient consent required' using errcode='23514'; end if;
    begin supplied_token:=(payload->>'leaseToken')::uuid; exception when others then raise exception 'Invalid summary lease' using errcode='23514'; end;
    select * into job from public.consultation_summary_jobs where id=(payload->>'jobId')::uuid
      and tenant_id=target_tenant and appointment_id=target_appointment for update;
    if job.id is null or job.status<>'processing' or job.lease_token<>supplied_token
      or job.lease_expires_at<clock_timestamp() or job.consent_event_id<>consent.id then
      raise exception 'Summary failure guard changed' using errcode='40001';
    end if;
    update public.consultation_summary_jobs set status='failed',lease_token=null,lease_expires_at=null,
      last_error_code=case when payload->>'errorCode' in ('generation_failed','invalid_output','timeout') then payload->>'errorCode' else 'generation_failed' end,
      updated_at=clock_timestamp() where id=job.id returning * into job;
  elsif operation='review_summary' then
    if not doctor_actor then raise exception 'Assigned physician required' using errcode='42501'; end if;
    if consent.id is null or consent.decision<>'granted' or not consent.summary_allowed then
      raise exception 'Current patient consent required' using errcode='23514';
    end if;
    if coalesce(payload->>'decision','') not in ('accepted','rejected')
      or jsonb_typeof(payload->'note') is distinct from 'string'
      or char_length(coalesce(btrim(payload->>'note'),'')) not between 1 and 2000 then
      raise exception 'Review decision and note required' using errcode='23514';
    end if;
    begin supplied_version:=(payload->>'expectedVersion')::integer; exception when others then raise exception 'Invalid summary version' using errcode='23514'; end;
    select v.* into summary_row from public.consultation_summary_versions v join public.consultation_summary_jobs j on j.id=v.job_id
      join public.consultation_sources s on s.id=v.source_id where v.id=(payload->>'summaryId')::uuid
      and v.tenant_id=target_tenant and j.appointment_id=target_appointment and s.doctor_id=actor_id for update;
    select max(v.version) into next_version from public.consultation_summary_versions v where v.job_id=summary_row.job_id;
    if summary_row.id is null or supplied_version<>next_version then raise exception 'Summary version changed' using errcode='40001'; end if;
    corrected:=payload->'correctedSummary';
    if corrected is not null and corrected<>'null'::jsonb then
      if payload->>'decision'<>'accepted' or jsonb_typeof(corrected)<>'object' then raise exception 'Invalid corrected summary' using errcode='23514'; end if;
      calculated_hash:=encode(sha256(convert_to(corrected::text,'UTF8')),'hex');
      insert into public.consultation_summary_versions(tenant_id,job_id,source_id,version,kind,summary,metadata,summary_hash,corrected_from,created_by)
      values(target_tenant,summary_row.job_id,summary_row.source_id,next_version+1,'doctor_correction',corrected,
        jsonb_build_object('correctedByDoctor',true),calculated_hash,summary_row.id,actor_id) returning * into summary_row;
    end if;
    insert into public.consultation_summary_reviews(tenant_id,summary_id,doctor_id,decision,note)
    values(target_tenant,summary_row.id,actor_id,payload->>'decision',btrim(payload->>'note')) returning * into review_row;
    insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,changed_fields)
    values(target_tenant,actor_id,'consultation_summary_'||review_row.decision,'consultation_summary',summary_row.id,array['review']);
  elsif operation<>'list' then
    raise exception 'Unknown operation' using errcode='23514';
  end if;

  select * into consent from public.consultation_consent_events c
    where c.tenant_id=target_tenant and c.appointment_id=target_appointment order by c.decided_at desc,c.id desc limit 1;
  if patient_actor then
    result:=jsonb_build_object('role','patient','appointmentId',appointment.id,'patientId',appointment.patient_id,
      'consent',jsonb_build_object('version','consultation-assistance-v1','decision',coalesce(consent.decision,'pending'),
        'text',coalesce(consent.consent_text,consent_copy),'decidedAt',consent.decided_at));
  else
    select * into capture from public.consultation_capture_sessions c where c.tenant_id=target_tenant
      and c.appointment_id=target_appointment order by c.started_at desc,c.id desc limit 1;
    if capture.id is not null then select * into source from public.consultation_sources where capture_id=capture.id; end if;
    if source.id is not null then select * into job from public.consultation_summary_jobs where source_id=source.id; end if;
    if job.id is not null then
      select * into summary_row from public.consultation_summary_versions where job_id=job.id order by version desc limit 1;
      if summary_row.id is not null then select * into review_row from public.consultation_summary_reviews where summary_id=summary_row.id order by reviewed_at desc,id desc limit 1; end if;
    end if;
    result:=jsonb_build_object('role','doctor','appointmentId',appointment.id,'patientId',appointment.patient_id,
      'consent',jsonb_build_object('version','consultation-assistance-v1','decision',coalesce(consent.decision,'pending'),
        'text',coalesce(consent.consent_text,consent_copy),'decidedAt',consent.decided_at),
      'capture',jsonb_build_object('id',capture.id,'status',coalesce(capture.status,'idle'),'startedAt',capture.started_at,
        'endedAt',capture.ended_at,'nextChunkIndex',coalesce(capture.next_chunk_index,0),'sourceHash',source.source_hash,
        'segments',coalesce(source.segments,(select coalesce(jsonb_agg(jsonb_build_object('id',c.client_chunk_id,'text',c.text,
          'capturedAt',c.captured_at,'startSeconds',c.start_seconds,'endSeconds',c.end_seconds,'speaker','unknown') order by c.chunk_index),'[]'::jsonb)
          from public.consultation_capture_chunks c where c.capture_id=capture.id),'[]'::jsonb)),
      'summary',jsonb_build_object('status',case when job.id is null then 'not_requested' else job.status end,
        'attempts',coalesce(job.attempts,0),'errorCode',job.last_error_code,
        'draft',case when summary_row.id is null then null else jsonb_build_object('id',summary_row.id,'version',summary_row.version,
          'summary',summary_row.summary,'metadata',summary_row.metadata,'createdAt',summary_row.created_at) end,
        'review',case when review_row.id is null then null else jsonb_build_object('decision',review_row.decision,
          'note',review_row.note,'reviewedAt',review_row.reviewed_at) end));
  end if;
  perform set_config('request.jwt.claims',coalesce(prior_claims,''),true);
  return result;
end;
$$;
revoke all on function public.consultation_workflow_operation(text,uuid,uuid,uuid,uuid,jsonb)
  from public,anon,authenticated;
grant execute on function public.consultation_workflow_operation(text,uuid,uuid,uuid,uuid,jsonb) to service_role;
