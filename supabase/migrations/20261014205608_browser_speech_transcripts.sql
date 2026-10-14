-- Browser-recognized text only: no audio, inferred speaker or completeness claim.
-- Original capture and review history are private, immutable and server-only.
create table public.browser_transcripts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  appointment_id uuid not null,
  patient_id uuid not null,
  doctor_id uuid not null,
  idempotency_key uuid not null unique,
  source text not null check(source='browser_speech_recognition'),
  capture_mode text not null check(capture_mode in ('microphone','tab_and_microphone')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  segments jsonb not null check(jsonb_typeof(segments)='array' and jsonb_array_length(segments) between 1 and 1000),
  original_text text not null check(char_length(original_text) between 1 and 100000),
  source_hash text not null check(source_hash ~ '^[a-f0-9]{64}$'),
  permission_note text not null check(char_length(btrim(permission_note)) between 5 and 500),
  consent_at timestamptz not null default clock_timestamp(),
  imported_at timestamptz not null default clock_timestamp(),
  foreign key(tenant_id,appointment_id) references public.appointments(tenant_id,id),
  foreign key(tenant_id,patient_id) references public.patients(tenant_id,id),
  foreign key(tenant_id,doctor_id) references public.memberships(tenant_id,user_id),
  check(ended_at>=started_at and ended_at-started_at<=interval '4 hours')
);
create index browser_transcripts_appointment_idx on public.browser_transcripts(tenant_id,appointment_id,imported_at);
create table public.browser_transcript_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  transcript_id uuid not null references public.browser_transcripts(id),
  doctor_id uuid not null,
  decision text not null check(decision in ('reviewed','rejected')),
  note text not null check(char_length(btrim(note)) between 1 and 2000),
  reviewed_at timestamptz not null default clock_timestamp(),
  foreign key(tenant_id,doctor_id) references public.memberships(tenant_id,user_id)
);
create index browser_transcript_reviews_source_idx on public.browser_transcript_reviews(transcript_id,reviewed_at desc,id desc);
alter table public.browser_transcripts enable row level security;
alter table public.browser_transcript_reviews enable row level security;
revoke all on public.browser_transcripts,public.browser_transcript_reviews from public,anon,authenticated,service_role;
create trigger browser_transcripts_immutable before update or delete on public.browser_transcripts for each row execute function private.reject_document_extraction_mutation();
create trigger browser_transcript_reviews_immutable before update or delete on public.browser_transcript_reviews for each row execute function private.reject_document_extraction_mutation();

create function public.browser_transcript_operation(
  operation text, target_tenant uuid, actor_id uuid, actor_session uuid,
  target_appointment uuid, payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  appointment public.appointments;
  source_row public.browser_transcripts;
  capture_start timestamptz;
  capture_end timestamptz;
  capture_time timestamptz;
  previous_time timestamptz;
  capture_key uuid;
  segment jsonb;
  literal_text text := '';
  content_hash text;
  result jsonb;
  prior_claims text := current_setting('request.jwt.claims',true);
begin
  -- Verified session ID comes from the authenticated server, never POST input.
  if not exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id
      where s.id=actor_session and s.user_id=actor_id and u.deleted_at is null
        and (u.banned_until is null or u.banned_until<=clock_timestamp())
        and (s.not_after is null or s.not_after>clock_timestamp()))
    or not exists(select 1 from public.memberships m join public.tenants t on t.id=m.tenant_id
      where m.tenant_id=target_tenant and m.user_id=actor_id and m.role='doctor'
        and m.status='active' and t.status='active') then
    raise exception 'Doctor live session required' using errcode='42501';
  end if;
  select * into appointment from public.appointments where tenant_id=target_tenant and id=target_appointment for update;
  if appointment.id is null or appointment.doctor_id is distinct from actor_id or not exists(select 1 from public.care_relationships
      where tenant_id=target_tenant and patient_id=appointment.patient_id and professional_id=actor_id and status='active') then
    raise exception 'Assigned responsible physician required' using errcode='42501';
  end if;
  if operation not in ('list','save','review') then raise exception 'Unknown operation' using errcode='23514'; end if;
  if jsonb_typeof(payload) is distinct from 'object' then raise exception 'Invalid payload' using errcode='23514'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor_id,'session_id',actor_session,'role','authenticated')::text,true);
  if operation='save' then
    if appointment.status in ('cancelled','missed') then raise exception 'Appointment unavailable' using errcode='23514'; end if;
    if exists(select 1 from jsonb_object_keys(payload) k where k not in ('idempotencyKey','source','captureMode','startedAt','endedAt','patientPermissionConfirmed','permissionNote','segments'))
      or payload->>'source' is distinct from 'browser_speech_recognition'
      or coalesce(payload->>'captureMode','') not in ('microphone','tab_and_microphone')
      or payload->'patientPermissionConfirmed' is distinct from 'true'::jsonb
      or jsonb_typeof(payload->'permissionNote') is distinct from 'string'
      or char_length(coalesce(btrim(payload->>'permissionNote'),'')) not between 5 and 500
      or char_length(payload->>'permissionNote')>500
      or coalesce(payload->>'idempotencyKey','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
      or jsonb_typeof(payload->'segments') is distinct from 'array' then
      raise exception 'Consent and valid capture required' using errcode='23514';
    end if;
    if jsonb_array_length(payload->'segments') not between 1 and 1000 then raise exception 'Capture segment limit' using errcode='23514'; end if;
    begin
      capture_start:=(payload->>'startedAt')::timestamptz;
      capture_end:=(payload->>'endedAt')::timestamptz;
      capture_key:=(payload->>'idempotencyKey')::uuid;
    exception when others then raise exception 'Invalid capture window' using errcode='23514'; end;
    if capture_start is null or capture_end is null or not isfinite(capture_start) or not isfinite(capture_end)
      or capture_end<capture_start or capture_end-capture_start>interval '4 hours'
      or capture_end>clock_timestamp()+interval '5 minutes' then raise exception 'Invalid capture window' using errcode='23514'; end if;
    previous_time:=capture_start;
    for segment in select value from jsonb_array_elements(payload->'segments') loop
      if jsonb_typeof(segment) is distinct from 'object' then raise exception 'Invalid segment' using errcode='23514'; end if;
      if exists(select 1 from jsonb_object_keys(segment) k where k not in ('text','capturedAt','speaker'))
        or segment->>'speaker' is distinct from 'unknown'
        or jsonb_typeof(segment->'text') is distinct from 'string'
        or char_length(coalesce(btrim(segment->>'text'),''))=0
        or jsonb_typeof(segment->'capturedAt') is distinct from 'string' then raise exception 'Invalid segment' using errcode='23514'; end if;
      begin capture_time:=(segment->>'capturedAt')::timestamptz;
      exception when others then raise exception 'Invalid segment time' using errcode='23514'; end;
      if capture_time is null or not isfinite(capture_time) or capture_time<previous_time or capture_time>capture_end then raise exception 'Invalid segment sequence' using errcode='23514'; end if;
      previous_time:=capture_time;
      literal_text:=literal_text||case when literal_text='' then '' else E'\n' end||(segment->>'text');
      if char_length(literal_text)>100000 then raise exception 'Capture text limit' using errcode='23514'; end if;
    end loop;
    content_hash:=encode(sha256(convert_to(jsonb_build_object('source',payload->>'source','captureMode',payload->>'captureMode',
      'startedAt',capture_start,'endedAt',capture_end,'segments',payload->'segments','permissionNote',btrim(payload->>'permissionNote'))::text,'UTF8')),'hex');
    -- Global key lock prevents accidental reuse across consultations or clinics.
    perform pg_advisory_xact_lock(hashtextextended(capture_key::text,81415));
    select * into source_row from public.browser_transcripts where idempotency_key=capture_key;
    if source_row.id is not null then
      if (source_row.tenant_id,source_row.appointment_id,source_row.patient_id,source_row.doctor_id,source_row.source_hash)
        is distinct from (target_tenant,target_appointment,appointment.patient_id,actor_id,content_hash) then
        raise exception 'Immutable capture identity changed' using errcode='23505';
      end if;
    else
      insert into public.browser_transcripts(tenant_id,appointment_id,patient_id,doctor_id,idempotency_key,source,capture_mode,started_at,ended_at,segments,original_text,source_hash,permission_note)
        values(target_tenant,target_appointment,appointment.patient_id,actor_id,capture_key,'browser_speech_recognition',payload->>'captureMode',capture_start,capture_end,payload->'segments',literal_text,content_hash,btrim(payload->>'permissionNote')) returning * into source_row;
      insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,changed_fields)
        values(target_tenant,actor_id,'browser_transcript_consent','browser_transcript',source_row.id,array['patient_permission','permission_note']);
      insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,changed_fields)
        values(target_tenant,actor_id,'browser_transcript_save','browser_transcript',source_row.id,array['original_text','source','capture_mode','capture_window','segments']);
    end if;
  elsif operation='review' then
    if exists(select 1 from jsonb_object_keys(payload) k where k not in ('transcriptId','decision','note'))
      or coalesce(payload->>'decision','') not in ('reviewed','rejected')
      or jsonb_typeof(payload->'note') is distinct from 'string'
      or char_length(coalesce(btrim(payload->>'note'),'')) not between 1 and 2000 then raise exception 'Review note required' using errcode='23514'; end if;
    select * into source_row from public.browser_transcripts where id=(payload->>'transcriptId')::uuid
      and tenant_id=target_tenant and appointment_id=target_appointment and patient_id=appointment.patient_id and doctor_id=actor_id;
    if source_row.id is null then raise exception 'Source unavailable' using errcode='42501'; end if;
    insert into public.browser_transcript_reviews(tenant_id,transcript_id,doctor_id,decision,note)
      values(target_tenant,source_row.id,actor_id,payload->>'decision',btrim(payload->>'note'));
    insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,changed_fields)
      values(target_tenant,actor_id,'browser_transcript_review','browser_transcript',source_row.id,array['review']);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'state','imported','source',s.source,'captureMode',s.capture_mode,
    'startedAt',s.started_at,'endedAt',s.ended_at,'importedAt',s.imported_at,'segments',s.segments,'originalText',s.original_text,'sourceHash',s.source_hash,
    'consent',jsonb_build_object('confirmedAt',s.consent_at,'permissionNote',s.permission_note),
    'review',(select jsonb_build_object('decision',r.decision,'note',r.note,'reviewedAt',r.reviewed_at) from public.browser_transcript_reviews r
      where r.transcript_id=s.id order by r.reviewed_at desc,r.id desc limit 1)) order by s.imported_at,s.id),'[]') into result
    from public.browser_transcripts s where s.tenant_id=target_tenant and s.appointment_id=target_appointment
      and s.patient_id=appointment.patient_id and s.doctor_id=actor_id;
  perform set_config('request.jwt.claims',coalesce(prior_claims,''),true);
  return jsonb_build_object('imports',result);
end;
$$;
revoke all on function public.browser_transcript_operation(text,uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.browser_transcript_operation(text,uuid,uuid,uuid,uuid,jsonb) to service_role;
