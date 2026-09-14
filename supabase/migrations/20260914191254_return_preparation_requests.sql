-- V2: preparation requested for one future return appointment.
-- The questionnaire is fixed and versioned. Patient drafts remain private;
-- final submissions are immutable and physician reviews never rewrite them.
create table public.return_preparation_questionnaires (
  version integer primary key check (version > 0),
  title text not null check (char_length(btrim(title)) between 2 and 120),
  questions jsonb not null check (
    jsonb_typeof(questions) = 'array'
    and jsonb_array_length(questions) between 1 and 12
  ),
  created_at timestamptz not null default clock_timestamp()
);

insert into public.return_preparation_questionnaires(version,title,questions)
values (1,'Antes do seu retorno','[
  {"id":"changes","label":"O que mudou desde a última consulta?"},
  {"id":"progress","label":"O que funcionou bem neste período?"},
  {"id":"difficulties","label":"O que foi mais difícil?"},
  {"id":"treatment","label":"Como foi seguir as orientações combinadas?"},
  {"id":"questions","label":"O que você quer conversar com o médico no retorno?"}
]'::jsonb);

alter table public.return_preparation_questionnaires enable row level security;
revoke all on public.return_preparation_questionnaires from public, anon, authenticated;
grant select on public.return_preparation_questionnaires to authenticated;
create policy return_preparation_questionnaires_read
  on public.return_preparation_questionnaires for select to authenticated
  using (private.has_live_session());

create function private.lock_return_preparation_questionnaire() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Return preparation questionnaire versions are immutable'
    using errcode = '42501';
end;
$$;
revoke all on function private.lock_return_preparation_questionnaire()
  from public, anon, authenticated;
create trigger return_preparation_questionnaires_immutable
  before update or delete on public.return_preparation_questionnaires
  for each row execute function private.lock_return_preparation_questionnaire();

create table public.return_preparation_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  appointment_id uuid not null,
  patient_id uuid not null,
  doctor_id uuid not null,
  questionnaire_version integer not null,
  request_number integer not null,
  status text not null default 'requested' check (
    status in ('requested','draft','submitted','reviewed','cancelled')
  ),
  version integer not null default 1 check (version > 0),
  requested_by uuid not null default auth.uid(),
  client_request_id uuid not null,
  requested_at timestamptz not null default clock_timestamp(),
  draft_updated_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (tenant_id,id),
  unique (tenant_id,id,patient_id),
  unique (tenant_id,id,patient_id,doctor_id),
  unique (tenant_id,appointment_id,request_number),
  unique (tenant_id,requested_by,client_request_id),
  foreign key (tenant_id,appointment_id)
    references public.appointments(tenant_id,id),
  foreign key (tenant_id,patient_id)
    references public.patients(tenant_id,id),
  foreign key (tenant_id,doctor_id)
    references public.memberships(tenant_id,user_id),
  foreign key (tenant_id,requested_by)
    references public.memberships(tenant_id,user_id),
  foreign key (questionnaire_version)
    references public.return_preparation_questionnaires(version),
  check (
    (status='requested' and draft_updated_at is null and submitted_at is null
      and reviewed_at is null and cancelled_at is null)
    or (status='draft' and draft_updated_at is not null and submitted_at is null
      and reviewed_at is null and cancelled_at is null)
    or (status='submitted' and submitted_at is not null
      and reviewed_at is null and cancelled_at is null)
    or (status='reviewed' and submitted_at is not null
      and reviewed_at is not null and cancelled_at is null)
    or (status='cancelled' and cancelled_at is not null)
  )
);
create index return_preparation_staff_queue
  on public.return_preparation_requests(tenant_id,doctor_id,status,submitted_at desc,requested_at desc,id);
create index return_preparation_patient_queue
  on public.return_preparation_requests(tenant_id,patient_id,status,requested_at desc,id);
create unique index return_preparation_one_open_per_appointment
  on public.return_preparation_requests(tenant_id,appointment_id)
  where status in ('requested','draft');

create table public.return_preparation_drafts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  tenant_id uuid not null,
  patient_id uuid not null,
  actor_user_id uuid not null,
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers)='object'),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (tenant_id,request_id,patient_id)
    references public.return_preparation_requests(tenant_id,id,patient_id),
  foreign key (tenant_id,actor_user_id)
    references public.memberships(tenant_id,user_id)
);

create table public.return_preparation_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  request_id uuid not null,
  patient_id uuid not null,
  doctor_id uuid not null,
  actor_user_id uuid not null,
  questionnaire_version integer not null,
  answers jsonb not null check (jsonb_typeof(answers)='object'),
  submitted_at timestamptz not null default clock_timestamp(),
  unique (tenant_id,request_id),
  foreign key (tenant_id,request_id,patient_id,doctor_id)
    references public.return_preparation_requests(tenant_id,id,patient_id,doctor_id),
  foreign key (tenant_id,actor_user_id)
    references public.memberships(tenant_id,user_id),
  foreign key (questionnaire_version)
    references public.return_preparation_questionnaires(version)
);

create table public.return_preparation_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  request_id uuid not null,
  patient_id uuid not null,
  doctor_id uuid not null,
  reviewer_id uuid not null,
  note text not null check (char_length(btrim(note)) between 1 and 2000),
  reviewed_at timestamptz not null default clock_timestamp(),
  unique (tenant_id,request_id),
  foreign key (tenant_id,request_id,patient_id,doctor_id)
    references public.return_preparation_requests(tenant_id,id,patient_id,doctor_id),
  foreign key (tenant_id,reviewer_id)
    references public.memberships(tenant_id,user_id)
);
create index return_preparation_drafts_patient
  on public.return_preparation_drafts(tenant_id,patient_id,updated_at desc,id);
create index return_preparation_drafts_actor
  on public.return_preparation_drafts(tenant_id,actor_user_id);
create index return_preparation_submissions_patient
  on public.return_preparation_submissions(tenant_id,patient_id,submitted_at desc,id);
create index return_preparation_submissions_doctor
  on public.return_preparation_submissions(tenant_id,doctor_id,submitted_at desc,id);
create index return_preparation_submissions_actor
  on public.return_preparation_submissions(tenant_id,actor_user_id);
create index return_preparation_submissions_questionnaire
  on public.return_preparation_submissions(questionnaire_version);
create index return_preparation_reviews_patient
  on public.return_preparation_reviews(tenant_id,patient_id,reviewed_at desc,id);
create index return_preparation_reviews_doctor
  on public.return_preparation_reviews(tenant_id,doctor_id,reviewed_at desc,id);
create index return_preparation_reviews_reviewer
  on public.return_preparation_reviews(tenant_id,reviewer_id);

create function private.lock_return_preparation_snapshot() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  raise exception 'Submitted return preparation records are immutable'
    using errcode='42501';
end; $$;
revoke all on function private.lock_return_preparation_snapshot()
  from public,anon,authenticated;
create trigger return_preparation_submissions_immutable
  before update or delete on public.return_preparation_submissions
  for each row execute function private.lock_return_preparation_snapshot();
create trigger return_preparation_reviews_immutable
  before update or delete on public.return_preparation_reviews
  for each row execute function private.lock_return_preparation_snapshot();

alter table public.return_preparation_requests enable row level security;
alter table public.return_preparation_drafts enable row level security;
alter table public.return_preparation_submissions enable row level security;
alter table public.return_preparation_reviews enable row level security;
revoke all on public.return_preparation_requests, public.return_preparation_drafts,
  public.return_preparation_submissions, public.return_preparation_reviews
  from public, anon, authenticated;
grant select on public.return_preparation_requests,
  public.return_preparation_submissions to authenticated;
grant select on public.return_preparation_drafts,
  public.return_preparation_reviews to authenticated;

create policy return_preparation_requests_patient_read
  on public.return_preparation_requests for select to authenticated using (
    private.has_tenant_role(tenant_id,array['patient']) and exists (
      select 1 from public.patient_accounts a
      where a.tenant_id=return_preparation_requests.tenant_id
        and a.patient_id=return_preparation_requests.patient_id
        and a.user_id=(select auth.uid())
    )
  );
create policy return_preparation_requests_doctor_read
  on public.return_preparation_requests for select to authenticated using (
    doctor_id=(select auth.uid())
    and private.has_tenant_role(tenant_id,array['doctor'])
    and private.has_care_access(tenant_id,patient_id)
  );
create policy return_preparation_drafts_patient_read
  on public.return_preparation_drafts for select to authenticated using (
    actor_user_id=(select auth.uid())
    and private.has_tenant_role(tenant_id,array['patient'])
    and exists (
      select 1 from public.patient_accounts a where
        a.tenant_id=return_preparation_drafts.tenant_id
        and a.patient_id=return_preparation_drafts.patient_id
        and a.user_id=(select auth.uid())
    )
  );
create policy return_preparation_submissions_patient_read
  on public.return_preparation_submissions for select to authenticated using (
    actor_user_id=(select auth.uid())
    and private.has_tenant_role(tenant_id,array['patient'])
  );
create policy return_preparation_submissions_doctor_read
  on public.return_preparation_submissions for select to authenticated using (
    doctor_id=(select auth.uid())
    and private.has_tenant_role(tenant_id,array['doctor'])
    and private.has_care_access(tenant_id,patient_id)
  );
create policy return_preparation_reviews_doctor_read
  on public.return_preparation_reviews for select to authenticated using (
    reviewer_id=(select auth.uid())
    and doctor_id=(select auth.uid())
    and private.has_tenant_role(tenant_id,array['doctor'])
    and private.has_care_access(tenant_id,patient_id)
  );

create function private.valid_return_preparation_answers(
  questionnaire integer,
  supplied jsonb
) returns boolean
language sql stable security definer set search_path='' as $$
  select jsonb_typeof(supplied)='object'
    and not exists (
      select 1 from jsonb_each(supplied) a
      where jsonb_typeof(a.value)<>'string'
        or char_length(btrim(a.value #>> '{}')) not between 1 and 4000
        or regexp_replace(a.value #>> '{}', E'[\\n\\r\\t]', '', 'g') ~ '[[:cntrl:]]'
        or not exists (
          select 1 from public.return_preparation_questionnaires q,
            jsonb_array_elements(q.questions) item
          where q.version=questionnaire and item->>'id'=a.key
        )
    );
$$;
revoke all on function private.valid_return_preparation_answers(integer,jsonb)
  from public,anon,authenticated;

create function private.request_return_preparation(
  target_tenant uuid,
  target_appointment uuid,
  request_key uuid
) returns uuid
language plpgsql security definer set search_path='' as $$
declare a public.appointments; result uuid; next_number integer;
begin
  if request_key is null or not private.has_tenant_role(target_tenant,array['doctor']) then
    raise exception 'Active doctor and request key required' using errcode='42501';
  end if;
  select * into a from public.appointments
    where tenant_id=target_tenant and id=target_appointment for update;
  if not found or a.doctor_id<>auth.uid() or a.kind<>'return'
    or a.status<>'scheduled' or a.starts_at<=now()
    or not private.has_care_access(target_tenant,a.patient_id)
    or not exists(select 1 from public.patient_accounts pa
      where pa.tenant_id=target_tenant and pa.patient_id=a.patient_id) then
    raise exception 'Eligible future return and active care access required' using errcode='42501';
  end if;
  select id into result from public.return_preparation_requests
    where tenant_id=target_tenant and requested_by=auth.uid()
      and client_request_id=request_key;
  if result is not null then return result; end if;
  if exists(select 1 from public.return_preparation_requests
    where tenant_id=target_tenant and appointment_id=target_appointment
      and status in ('requested','draft')) then
    raise exception 'Open preparation already exists' using errcode='23514';
  end if;
  select coalesce(max(request_number),0)+1 into next_number
    from public.return_preparation_requests
    where tenant_id=target_tenant and appointment_id=target_appointment;
  insert into public.return_preparation_requests(
    tenant_id,appointment_id,patient_id,doctor_id,questionnaire_version,
    request_number,requested_by,client_request_id
  ) values(target_tenant,target_appointment,a.patient_id,a.doctor_id,1,
    next_number,auth.uid(),request_key) returning id into result;
  perform private.queue_in_app_notification(target_tenant,
    (select pa.user_id from public.patient_accounts pa
      where pa.tenant_id=target_tenant and pa.patient_id=a.patient_id),
    'return_preparation_requested','return-preparation-requested:'||result,
    '/clinicas/'||target_tenant||'/meu-cuidado/hoje');
  return result;
end; $$;

create function private.save_return_preparation_draft(
  target_tenant uuid,target_request uuid,read_version integer,
  supplied_answers jsonb
) returns integer
language plpgsql security definer set search_path='' as $$
declare r public.return_preparation_requests; d public.return_preparation_drafts;
  next_version integer; event_time timestamptz:=clock_timestamp();
begin
  if not private.has_tenant_role(target_tenant,array['patient']) then
    raise exception 'Patient access required' using errcode='42501'; end if;
  select * into r from public.return_preparation_requests
    where tenant_id=target_tenant and id=target_request for update;
  if not found or r.status not in ('requested','draft') or not exists(
    select 1 from public.patient_accounts a where a.tenant_id=target_tenant
      and a.patient_id=r.patient_id and a.user_id=auth.uid()) then
    raise exception 'Open own preparation required' using errcode='42501'; end if;
  if not private.valid_return_preparation_answers(r.questionnaire_version,supplied_answers) then
    raise exception 'Valid questionnaire answers required' using errcode='23514'; end if;
  select * into d from public.return_preparation_drafts
    where request_id=target_request for update;
  if found then
    if d.version<>read_version then raise exception 'Stale preparation draft' using errcode='40001'; end if;
    next_version:=d.version+1;
    update public.return_preparation_drafts set answers=supplied_answers,
      version=next_version,updated_at=event_time where request_id=target_request;
  else
    if read_version<>0 then raise exception 'Stale preparation draft' using errcode='40001'; end if;
    next_version:=1;
    insert into public.return_preparation_drafts(request_id,tenant_id,patient_id,actor_user_id,answers,updated_at)
      values(target_request,target_tenant,r.patient_id,auth.uid(),supplied_answers,event_time);
  end if;
  update public.return_preparation_requests set status='draft',version=version+1,
    draft_updated_at=event_time,updated_at=event_time where id=target_request;
  return next_version;
end; $$;

create function private.submit_return_preparation(
  target_tenant uuid,target_request uuid,read_version integer,
  supplied_answers jsonb,confirmed boolean
) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.return_preparation_requests; d public.return_preparation_drafts;
  result uuid; event_time timestamptz:=clock_timestamp();
begin
  if confirmed is distinct from true or not private.has_tenant_role(target_tenant,array['patient']) then
    raise exception 'Patient confirmation required' using errcode='42501'; end if;
  select * into r from public.return_preparation_requests
    where tenant_id=target_tenant and id=target_request for update;
  if not found or not exists(select 1 from public.patient_accounts a
    where a.tenant_id=target_tenant and a.patient_id=r.patient_id and a.user_id=auth.uid()) then
    raise exception 'Own preparation required' using errcode='42501'; end if;
  if r.status in ('submitted','reviewed') then
    select id into result from public.return_preparation_submissions
      where tenant_id=target_tenant and request_id=target_request and actor_user_id=auth.uid();
    if result is not null then return result; end if;
  end if;
  if r.status not in ('requested','draft') then
    raise exception 'Open preparation required' using errcode='23514'; end if;
  select * into d from public.return_preparation_drafts where request_id=target_request for update;
  if (found and d.version<>read_version) or (not found and read_version<>0) then
    raise exception 'Stale preparation draft' using errcode='40001'; end if;
  if not private.valid_return_preparation_answers(r.questionnaire_version,supplied_answers) then
    raise exception 'Valid questionnaire answers required' using errcode='23514'; end if;
  insert into public.return_preparation_submissions(
    tenant_id,request_id,patient_id,doctor_id,actor_user_id,
    questionnaire_version,answers,submitted_at
  ) values(target_tenant,target_request,r.patient_id,r.doctor_id,auth.uid(),
    r.questionnaire_version,supplied_answers,event_time) returning id into result;
  delete from public.return_preparation_drafts where request_id=target_request;
  update public.return_preparation_requests set status='submitted',version=version+1,
    submitted_at=event_time,updated_at=event_time where id=target_request;
  perform private.queue_in_app_notification(target_tenant,r.doctor_id,
    'return_preparation_submitted','return-preparation-submitted:'||result,
    '/clinicas/'||target_tenant||'/preparo');
  return result;
end; $$;

create function private.review_return_preparation(
  target_tenant uuid,target_request uuid,read_version integer,
  note_text text,confirmed boolean
) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.return_preparation_requests; result uuid;
  event_time timestamptz:=clock_timestamp(); patient_user uuid;
begin
  if confirmed is distinct from true or not private.has_tenant_role(target_tenant,array['doctor']) then
    raise exception 'Doctor review confirmation required' using errcode='42501'; end if;
  select * into r from public.return_preparation_requests
    where tenant_id=target_tenant and id=target_request for update;
  if not found or r.doctor_id<>auth.uid() or not private.has_care_access(target_tenant,r.patient_id) then
    raise exception 'Assigned doctor care access required' using errcode='42501'; end if;
  if r.status='reviewed' then
    select id into result from public.return_preparation_reviews
      where tenant_id=target_tenant and request_id=target_request and reviewer_id=auth.uid();
    if result is not null then return result; end if;
  end if;
  if r.status<>'submitted' or r.version<>read_version
    or note_text is null or char_length(btrim(note_text)) not between 1 and 2000 then
    raise exception 'Current submitted preparation and review note required' using errcode='40001'; end if;
  insert into public.return_preparation_reviews(tenant_id,request_id,patient_id,
    doctor_id,reviewer_id,note,reviewed_at)
    values(target_tenant,target_request,r.patient_id,r.doctor_id,auth.uid(),btrim(note_text),event_time)
    returning id into result;
  update public.return_preparation_requests set status='reviewed',version=version+1,
    reviewed_at=event_time,updated_at=event_time where id=target_request;
  select user_id into patient_user from public.patient_accounts
    where tenant_id=target_tenant and patient_id=r.patient_id;
  perform private.queue_in_app_notification(target_tenant,patient_user,
    'return_preparation_reviewed','return-preparation-reviewed:'||result,
    '/clinicas/'||target_tenant||'/meu-cuidado/hoje');
  return result;
end; $$;

create function private.cancel_return_preparations_for_appointment() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if (new.status in ('cancelled','no_show') and new.status is distinct from old.status)
    or new.patient_id is distinct from old.patient_id
    or new.doctor_id is distinct from old.doctor_id then
    update public.return_preparation_requests set status='cancelled',version=version+1,
      cancelled_at=clock_timestamp(),updated_at=clock_timestamp()
      where tenant_id=new.tenant_id and appointment_id=new.id and status<>'cancelled';
  end if;
  return new;
end; $$;
revoke all on function private.cancel_return_preparations_for_appointment()
  from public,anon,authenticated;

alter table public.in_app_notifications drop constraint in_app_notifications_kind_check;
alter table public.in_app_notifications add constraint in_app_notifications_kind_check
  check(kind in ('message','plan_published','return_preparation_requested',
    'return_preparation_submitted','return_preparation_reviewed'));
create or replace function private.queue_in_app_notification(
  target_tenant uuid,target_recipient uuid,notice_kind text,
  source_event_key text,internal_path text
) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if notice_kind not in ('message','plan_published','return_preparation_requested',
      'return_preparation_submitted','return_preparation_reviewed')
    or source_event_key is null or char_length(source_event_key) not between 1 and 180
    or internal_path not like '/clinicas/'||target_tenant::text||'/%' then
    raise exception 'Valid internal notification required' using errcode='23514'; end if;
  if target_recipient is null or target_recipient=auth.uid() then return null; end if;
  if not exists(select 1 from public.memberships m join public.tenants t on t.id=m.tenant_id
    where m.tenant_id=target_tenant and m.user_id=target_recipient
      and m.status='active' and t.status='active') then return null; end if;
  if exists(select 1 from public.notification_preferences p
    where p.tenant_id=target_tenant and p.user_id=target_recipient
      and p.in_app_enabled=false) then return null; end if;
  insert into public.in_app_notifications(tenant_id,recipient_user_id,kind,event_key,target_path)
    values(target_tenant,target_recipient,notice_kind,source_event_key,internal_path)
    on conflict(tenant_id,recipient_user_id,event_key) do nothing returning id into result;
  return result;
end; $$;
revoke all on function private.queue_in_app_notification(uuid,uuid,text,text,text)
  from public,anon,authenticated;

revoke all on function private.request_return_preparation(uuid,uuid,uuid),
  private.save_return_preparation_draft(uuid,uuid,integer,jsonb),
  private.submit_return_preparation(uuid,uuid,integer,jsonb,boolean),
  private.review_return_preparation(uuid,uuid,integer,text,boolean)
  from public,anon,authenticated;
grant execute on function private.request_return_preparation(uuid,uuid,uuid),
  private.save_return_preparation_draft(uuid,uuid,integer,jsonb),
  private.submit_return_preparation(uuid,uuid,integer,jsonb,boolean),
  private.review_return_preparation(uuid,uuid,integer,text,boolean)
  to authenticated;

create function public.request_return_preparation(target_tenant uuid,target_appointment uuid,request_key uuid)
returns uuid language sql security invoker set search_path='' as $$
  select private.request_return_preparation(target_tenant,target_appointment,request_key); $$;
create function public.save_return_preparation_draft(target_tenant uuid,target_request uuid,read_version integer,supplied_answers jsonb)
returns integer language sql security invoker set search_path='' as $$
  select private.save_return_preparation_draft(target_tenant,target_request,read_version,supplied_answers); $$;
create function public.submit_return_preparation(target_tenant uuid,target_request uuid,read_version integer,supplied_answers jsonb,confirmed boolean)
returns uuid language sql security invoker set search_path='' as $$
  select private.submit_return_preparation(target_tenant,target_request,read_version,supplied_answers,confirmed); $$;
create function public.review_return_preparation(target_tenant uuid,target_request uuid,read_version integer,note_text text,confirmed boolean)
returns uuid language sql security invoker set search_path='' as $$
  select private.review_return_preparation(target_tenant,target_request,read_version,note_text,confirmed); $$;
revoke all on function public.request_return_preparation(uuid,uuid,uuid),
  public.save_return_preparation_draft(uuid,uuid,integer,jsonb),
  public.submit_return_preparation(uuid,uuid,integer,jsonb,boolean),
  public.review_return_preparation(uuid,uuid,integer,text,boolean)
  from public,anon,authenticated;
grant execute on function public.request_return_preparation(uuid,uuid,uuid),
  public.save_return_preparation_draft(uuid,uuid,integer,jsonb),
  public.submit_return_preparation(uuid,uuid,integer,jsonb,boolean),
  public.review_return_preparation(uuid,uuid,integer,text,boolean)
  to authenticated;

create trigger return_preparation_requests_audit after insert or update
  on public.return_preparation_requests for each row execute function private.audit_change();
create trigger return_preparation_drafts_audit after insert or update
  on public.return_preparation_drafts for each row execute function private.audit_change();
create trigger return_preparation_submissions_audit after insert
  on public.return_preparation_submissions for each row execute function private.audit_change();
create trigger return_preparation_reviews_audit after insert
  on public.return_preparation_reviews for each row execute function private.audit_change();
create trigger appointment_return_preparation_cancel after update
  on public.appointments for each row
  execute function private.cancel_return_preparations_for_appointment();
