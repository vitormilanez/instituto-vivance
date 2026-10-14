-- Prepared locally only. OAuth secrets and literal transcript sources are
-- inaccessible from anon/authenticated Data API. Server RPC rechecks live
-- session, current doctor assignment and care relationship on every operation.
create table public.google_meet_connections (
  tenant_id uuid not null,
  doctor_id uuid not null,
  generation integer not null default 0,
  refresh_ciphertext text,
  account_email text,
  google_subject text,
  connected_at timestamptz,
  primary key(tenant_id, doctor_id),
  foreign key(tenant_id,doctor_id) references public.memberships(tenant_id,user_id),
  check ((refresh_ciphertext is null) = (connected_at is null))
);
create table public.google_meet_oauth_states (
  state_hash text primary key check(state_hash ~ '^[a-f0-9]{64}$'),
  tenant_id uuid not null,
  doctor_id uuid not null,
  session_id uuid not null,
  generation integer not null,
  verifier_ciphertext text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  foreign key(tenant_id,doctor_id) references public.google_meet_connections(tenant_id,doctor_id)
);
create index google_meet_oauth_states_expiry_idx on public.google_meet_oauth_states(expires_at);
create table public.google_meet_rooms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  appointment_id uuid not null,
  doctor_id uuid not null,
  patient_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  generation integer not null,
  status text not null check(status in ('creating','ready','recovery_required')),
  google_subject text not null,
  attempt_id uuid not null,
  space_name text unique check(space_name ~ '^spaces/[A-Za-z0-9_-]+$'),
  meeting_uri text check(meeting_uri ~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$'),
  conference_name text unique,
  consent_at timestamptz,
  permission_note text,
  created_at timestamptz not null default clock_timestamp(),
  unique(tenant_id,appointment_id),
  foreign key(tenant_id,appointment_id) references public.appointments(tenant_id,id),
  foreign key(tenant_id,doctor_id) references public.memberships(tenant_id,user_id),
  foreign key(tenant_id,patient_id) references public.patients(tenant_id,id),
  check((status <> 'ready') or (space_name is not null and meeting_uri is not null)),
  check((consent_at is null and permission_note is null) or (consent_at is not null and char_length(permission_note) between 5 and 500))
);
create table public.google_meet_transcripts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  room_id uuid not null references public.google_meet_rooms(id),
  conference_name text not null,
  transcript_name text not null unique,
  entries jsonb not null check(jsonb_typeof(entries)='array' and jsonb_array_length(entries) between 1 and 5000),
  metadata jsonb not null,
  source_hash text not null check(source_hash ~ '^[a-f0-9]{64}$'),
  imported_by uuid not null,
  imported_at timestamptz not null default clock_timestamp(),
  foreign key(tenant_id,imported_by) references public.memberships(tenant_id,user_id)
);
create index google_meet_transcripts_room_idx on public.google_meet_transcripts(room_id,imported_at);
create table public.google_meet_transcript_reviews (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references public.google_meet_transcripts(id),
  tenant_id uuid not null,
  doctor_id uuid not null,
  decision text not null check(decision in ('reviewed','rejected')),
  note text not null check(char_length(note) between 1 and 2000),
  reviewed_at timestamptz not null default clock_timestamp(),
  foreign key(tenant_id,doctor_id) references public.memberships(tenant_id,user_id)
);
create index google_meet_reviews_transcript_idx on public.google_meet_transcript_reviews(transcript_id,reviewed_at desc);
alter table public.google_meet_connections enable row level security;
alter table public.google_meet_oauth_states enable row level security;
alter table public.google_meet_rooms enable row level security;
alter table public.google_meet_transcripts enable row level security;
alter table public.google_meet_transcript_reviews enable row level security;
revoke all on public.google_meet_connections,public.google_meet_oauth_states,public.google_meet_rooms,public.google_meet_transcripts,public.google_meet_transcript_reviews from public,anon,authenticated,service_role;
-- No general table writes, even for the server. Operations below preserve
-- immutable imported sources; human review is an append-only separate record.

create function public.google_meet_operation(
  operation text, target_tenant uuid, actor_id uuid, actor_session uuid,
  target_appointment uuid default null, payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  connection public.google_meet_connections;
  state_row public.google_meet_oauth_states;
  appointment public.appointments;
  room public.google_meet_rooms;
  source public.google_meet_transcripts;
  source_payload jsonb;
  result jsonb;
  prior_claims text := current_setting('request.jwt.claims',true);
begin
  -- This service-role-only boundary accepts an actor only from the authenticated
  -- Next.js server. It cannot be invoked by a browser or other tenant role.
  if not exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id
      where s.id=actor_session and s.user_id=actor_id and u.deleted_at is null
        and (u.banned_until is null or u.banned_until<=clock_timestamp())
        and (s.not_after is null or s.not_after>clock_timestamp()))
    or not exists(select 1 from public.memberships m join public.tenants t on t.id=m.tenant_id
      where m.tenant_id=target_tenant and m.user_id=actor_id and m.role='doctor'
        and m.status='active' and t.status='active') then
    raise exception 'Doctor live session required' using errcode='42501';
  end if;
  -- Legacy audit/teleconsultation triggers resolve this verified actor.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor_id,'session_id',actor_session,'role','authenticated')::text,true);
  -- Serialize account changes and room reservations across competing requests.
  perform pg_advisory_xact_lock(hashtextextended(target_tenant::text || ':' || actor_id::text, 81414));
  if operation not in ('connection','list','sync_context') then
    insert into public.google_meet_connections(tenant_id,doctor_id) values(target_tenant,actor_id) on conflict do nothing;
  end if;
  select * into connection from public.google_meet_connections where tenant_id=target_tenant and doctor_id=actor_id for update;

  if operation='connection' then result:=coalesce(to_jsonb(connection),jsonb_build_object('generation',0,'connected_at',null,'refresh_ciphertext',null,'account_email',null));
  elsif operation='oauth_start' then
    -- Also invalidate consumed callbacks that are still exchanging tokens.
    delete from public.google_meet_oauth_states where tenant_id=target_tenant and doctor_id=actor_id;
    insert into public.google_meet_oauth_states(state_hash,tenant_id,doctor_id,session_id,generation,verifier_ciphertext,expires_at)
      values(payload->>'stateHash',target_tenant,actor_id,actor_session,connection.generation,payload->>'verifier',clock_timestamp()+interval '10 minutes');
    result:='{}';
  elsif operation='oauth_consume' then
    update public.google_meet_oauth_states set consumed_at=clock_timestamp()
      where state_hash=payload->>'stateHash' and tenant_id=target_tenant and doctor_id=actor_id and session_id=actor_session
        and generation=connection.generation and consumed_at is null and expires_at>clock_timestamp()
      returning * into state_row;
    if state_row.state_hash is null then raise exception 'Invalid state' using errcode='42501'; end if;
    result:=to_jsonb(state_row);
  elsif operation='oauth_finish' then
    select * into state_row from public.google_meet_oauth_states where state_hash=payload->>'stateHash' for update;
    if state_row.tenant_id is distinct from target_tenant or state_row.doctor_id is distinct from actor_id
      or state_row.session_id is distinct from actor_session or state_row.consumed_at is null
      or state_row.expires_at<=clock_timestamp() or state_row.generation<>connection.generation then
      raise exception 'Invalid connection generation' using errcode='42501';
    end if;
    update public.google_meet_connections set refresh_ciphertext=payload->>'refreshCiphertext', account_email=payload->>'accountEmail',
      google_subject=payload->>'googleSubject',connected_at=clock_timestamp(),generation=generation+1
      where tenant_id=target_tenant and doctor_id=actor_id;
    delete from public.google_meet_oauth_states where state_hash=state_row.state_hash;
    result:='{}';
  elsif operation='disconnect' then
    update public.google_meet_connections set refresh_ciphertext=null,account_email=null,google_subject=null,connected_at=null,generation=generation+1 where tenant_id=target_tenant and doctor_id=actor_id;
    update public.google_meet_oauth_states set consumed_at=clock_timestamp() where tenant_id=target_tenant and doctor_id=actor_id and consumed_at is null;
    result:='{}';
  else
    select * into appointment from public.appointments where tenant_id=target_tenant and id=target_appointment for update;
    if appointment.id is null or appointment.doctor_id<>actor_id or not exists(select 1 from public.care_relationships
      where tenant_id=target_tenant and patient_id=appointment.patient_id and professional_id=actor_id and status='active') then
      raise exception 'Assigned responsible physician required' using errcode='42501';
    end if;
    select * into room from public.google_meet_rooms where tenant_id=target_tenant and appointment_id=target_appointment for update;
    if room.id is not null and (room.doctor_id,room.patient_id,room.starts_at,room.ends_at) is distinct from
      (appointment.doctor_id,appointment.patient_id,appointment.starts_at,appointment.ends_at) then
      raise exception 'Appointment binding changed' using errcode='40001';
    end if;
    if operation='room_reserve' then
      if room.id is not null then result:=to_jsonb(room);
      else
        if connection.connected_at is null or (payload->>'generation')::integer is distinct from connection.generation then raise exception 'Connect account first' using errcode='23514'; end if;
        if appointment.status<>'scheduled' or exists(select 1 from public.appointment_teleconsultations where tenant_id=target_tenant and appointment_id=target_appointment and join_url is not null) then
          raise exception 'Manual room or appointment closed' using errcode='23514';
        end if;
        insert into public.google_meet_rooms(tenant_id,appointment_id,doctor_id,patient_id,starts_at,ends_at,generation,google_subject,status,attempt_id)
          values(target_tenant,target_appointment,actor_id,appointment.patient_id,appointment.starts_at,appointment.ends_at,connection.generation,connection.google_subject,'creating',(payload->>'attemptId')::uuid) returning * into room;
        result:=to_jsonb(room);
      end if;
    elsif operation='room_finish' then
      if room.id is null or room.status<>'creating' or room.attempt_id<>(payload->>'attemptId')::uuid
        or room.generation<>connection.generation or connection.connected_at is null or appointment.status<>'scheduled' then
        raise exception 'Room attempt no longer valid' using errcode='40001';
      end if;
      if exists(select 1 from public.appointment_teleconsultations where tenant_id=target_tenant and appointment_id=target_appointment and join_url is not null) then
        raise exception 'Do not replace manual room' using errcode='40001';
      end if;
      update public.google_meet_rooms set status='ready',space_name=payload->>'spaceName',meeting_uri=payload->>'meetingUri' where id=room.id returning * into room;
      insert into public.appointment_teleconsultations(tenant_id,appointment_id,delivery_mode,provider,join_url)
        values(target_tenant,target_appointment,'video','google_meet',room.meeting_uri)
        on conflict(tenant_id,appointment_id) do update set delivery_mode='video',provider='google_meet',join_url=excluded.join_url,expected_version=public.appointment_teleconsultations.version;
      result:=to_jsonb(room);
    elsif operation='room_fail' then
      update public.google_meet_rooms set status='recovery_required' where id=room.id and status='creating' and attempt_id=(payload->>'attemptId')::uuid;
      result:='{}';
    elsif operation in ('list','sync_context','consent','import','review') then
      if room.id is not null and room.status='ready' and not exists(select 1 from public.appointment_teleconsultations where tenant_id=target_tenant and appointment_id=target_appointment and join_url=room.meeting_uri and delivery_mode='video') then
        raise exception 'Room binding changed' using errcode='40001';
      end if;
      if operation='consent' then
        if room.status is distinct from 'ready' or payload->>'patientPermissionConfirmed' is distinct from 'true' or char_length(btrim(payload->>'permissionNote')) not between 5 and 500 then
          raise exception 'Patient permission required' using errcode='23514';
        end if;
        if room.consent_at is null then
          update public.google_meet_rooms set consent_at=clock_timestamp(),permission_note=btrim(payload->>'permissionNote') where id=room.id returning * into room;
        end if;
      elsif operation in ('sync_context','import') then
        if room.status is distinct from 'ready' or room.consent_at is null or connection.connected_at is null or room.google_subject is distinct from connection.google_subject then
          raise exception 'Consent and connected room account required' using errcode='23514';
        end if;
        if operation='import' then
          if (payload->>'generation')::integer is distinct from connection.generation or payload->>'spaceName' is distinct from room.space_name then raise exception 'Connection changed' using errcode='40001'; end if;
          if jsonb_typeof(payload->'sources') is distinct from 'array' or jsonb_array_length(payload->'sources') not between 1 and 100 then raise exception 'Invalid source batch' using errcode='23514'; end if;
          -- One transaction commits the complete retrieval batch. If any source
          -- conflicts or fails, every preceding insert and binding rolls back.
          for source_payload in select value from jsonb_array_elements(payload->'sources') loop
            if room.conference_name is not null and room.conference_name<>source_payload->>'conferenceName' then raise exception 'Conference changed' using errcode='23514'; end if;
            if source_payload->>'conferenceName' is null or source_payload->>'conferenceName' !~ '^conferenceRecords/[A-Za-z0-9_-]+$' or source_payload->>'transcriptName' is null or source_payload->>'transcriptName' not like (source_payload->>'conferenceName')||'/transcripts/%' then raise exception 'Invalid source' using errcode='23514'; end if;
            select * into source from public.google_meet_transcripts where transcript_name=source_payload->>'transcriptName';
            if source.id is not null then
              if source.room_id<>room.id or source.source_hash<>source_payload->>'sourceHash' then raise exception 'Immutable source changed' using errcode='23505'; end if;
            else
              insert into public.google_meet_transcripts(tenant_id,room_id,conference_name,transcript_name,entries,metadata,source_hash,imported_by)
                values(target_tenant,room.id,source_payload->>'conferenceName',source_payload->>'transcriptName',source_payload->'entries',source_payload->'metadata',source_payload->>'sourceHash',actor_id);
            end if;
            update public.google_meet_rooms set conference_name=source_payload->>'conferenceName' where id=room.id returning * into room;
          end loop;
        end if;
      elsif operation='review' then
        select * into source from public.google_meet_transcripts where id=(payload->>'transcriptId')::uuid and room_id=room.id and tenant_id=target_tenant;
        if source.id is null then raise exception 'Source unavailable' using errcode='42501'; end if;
        insert into public.google_meet_transcript_reviews(tenant_id,doctor_id,transcript_id,decision,note)
          values(target_tenant,actor_id,source.id,payload->>'decision',payload->>'note');
      end if;
      if operation='sync_context' then result:=jsonb_build_object('room',to_jsonb(room),'connection',to_jsonb(connection));
      else
        select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'state','imported','conferenceName',s.conference_name,'transcriptName',s.transcript_name,'importedAt',s.imported_at,'entries',s.entries,'sourceHash',s.source_hash,
          'review',(select jsonb_build_object('decision',r.decision,'note',r.note,'reviewedAt',r.reviewed_at) from public.google_meet_transcript_reviews r where r.transcript_id=s.id order by r.reviewed_at desc,r.id desc limit 1)) order by s.imported_at),'[]') into result from public.google_meet_transcripts s where s.room_id=room.id;
        result:=jsonb_build_object('room',case when room.id is null then null else jsonb_build_object('status',room.status,'meetingUri',room.meeting_uri,'spaceName',room.space_name) end,
          'status',case when room.id is null then 'not_bound' when room.consent_at is null then 'consent_required' else 'available' end,
          'consent',case when room.consent_at is null then null else jsonb_build_object('confirmedAt',room.consent_at,'permissionNote',room.permission_note) end,'imports',result);
      end if;
    else raise exception 'Unknown operation' using errcode='23514'; end if;
  end if;
  if operation not in ('connection','list','sync_context') then
    insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,changed_fields)
      values(target_tenant,actor_id,'google_meet_'||operation,'google_meet',coalesce(target_appointment,actor_id),array[operation]);
  end if;
  perform set_config('request.jwt.claims',coalesce(prior_claims,''),true);
  return result;
end;
$$;
revoke all on function public.google_meet_operation(text,uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.google_meet_operation(text,uuid,uuid,uuid,uuid,jsonb) to service_role;
