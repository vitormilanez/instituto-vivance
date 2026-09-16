-- Extend the preparation flow to consultations as well as returns. A custom
-- questionnaire is an immutable per-request snapshot; the legacy version 1
-- remains available for existing records and callers that omit questions.

create function private.normalize_preconsultation_questions(supplied jsonb)
returns jsonb
language plpgsql immutable security invoker set search_path = '' as $$
declare normalized jsonb;
begin
  if supplied is null then return null; end if;
  if jsonb_typeof(supplied) <> 'array' or jsonb_array_length(supplied) <> 5
    or exists (
      select 1
      from jsonb_array_elements(supplied) item
      where jsonb_typeof(item) <> 'object'
        or not (item ? 'id' and item ? 'label')
        or item - 'id' - 'label' <> '{}'::jsonb
        or jsonb_typeof(item->'id') <> 'string'
        or jsonb_typeof(item->'label') <> 'string'
        or item->>'id' not in ('goal','changes','routine','treatment','questions')
        or char_length(btrim(item->>'label')) not between 1 and 600
        or item->>'label' ~ '[[:cntrl:]]'
    )
    or (select count(distinct item->>'id')
        from jsonb_array_elements(supplied) item) <> 5 then
    raise exception 'Exactly five valid pre-consultation questions required'
      using errcode = '23514';
  end if;
  select jsonb_agg(
    jsonb_build_object('id',item->>'id','label',btrim(item->>'label'))
    order by ordinal
  ) into normalized
  from jsonb_array_elements(supplied) with ordinality as q(item,ordinal);
  return normalized;
end;
$$;
revoke all on function private.normalize_preconsultation_questions(jsonb)
  from public, anon, authenticated;

create function private.valid_preconsultation_priorities(supplied text[])
returns boolean
language sql immutable security invoker set search_path = '' as $$
  select supplied is not null
    and cardinality(supplied) <= 3
    and (
      cardinality(supplied) = 0
      or (array_ndims(supplied) = 1 and array_lower(supplied,1) = 1)
    )
    and (select count(*) = count(distinct priority) from unnest(supplied) priority)
    and not exists (
      select 1 from unnest(supplied) priority
      where priority is null or priority not in (
        'sleep','nutrition','movement','energy','treatment','concerns','other'
      )
    );
$$;
revoke all on function private.valid_preconsultation_priorities(text[])
  from public, anon, authenticated;

alter table public.return_preparation_questionnaires
  add column tenant_id uuid,
  add column doctor_id uuid,
  add constraint return_preparation_questionnaires_doctor_fk
    foreign key (tenant_id,doctor_id)
    references public.memberships(tenant_id,user_id),
  add constraint return_preparation_questionnaires_scope_check check (
    (version = 1 and tenant_id is null and doctor_id is null)
    or (version <> 1 and tenant_id is not null and doctor_id is not null
      and private.normalize_preconsultation_questions(questions) = questions)
  );

create sequence private.return_preparation_questionnaire_version_seq;
select setval(
  'private.return_preparation_questionnaire_version_seq'::regclass,
  (select greatest(coalesce(max(version),0),1)
   from public.return_preparation_questionnaires),
  true
);
alter table public.return_preparation_questionnaires
  alter column version set default
    nextval('private.return_preparation_questionnaire_version_seq'::regclass);
revoke all on sequence private.return_preparation_questionnaire_version_seq
  from public, anon, authenticated;

alter table public.return_preparation_requests
  add column supplied_questions jsonb,
  add constraint return_preparation_requests_supplied_questions_check check (
    supplied_questions is null
    or private.normalize_preconsultation_questions(supplied_questions) = supplied_questions
  );
create index return_preparation_requests_questionnaire_scope
  on public.return_preparation_requests(
    questionnaire_version,tenant_id,doctor_id,patient_id
  );
alter table public.return_preparation_drafts
  add column priorities text[] not null default '{}'::text[],
  add constraint return_preparation_drafts_priorities_check
    check (private.valid_preconsultation_priorities(priorities));
alter table public.return_preparation_submissions
  add column priorities text[] not null default '{}'::text[],
  add column submitted_draft_version integer check (submitted_draft_version >= 0),
  add constraint return_preparation_submissions_priorities_check
    check (private.valid_preconsultation_priorities(priorities));

drop policy return_preparation_questionnaires_read
  on public.return_preparation_questionnaires;
create policy return_preparation_questionnaires_read
  on public.return_preparation_questionnaires for select to authenticated
  using (
    private.has_live_session()
    and (
      (version = 1 and tenant_id is null and doctor_id is null)
      or exists (
        select 1
        from public.return_preparation_requests r
        where r.questionnaire_version = return_preparation_questionnaires.version
          and r.tenant_id = return_preparation_questionnaires.tenant_id
          and r.doctor_id = return_preparation_questionnaires.doctor_id
          and (
            (r.doctor_id = (select auth.uid())
              and private.has_tenant_role(r.tenant_id,array['doctor'])
              and private.has_care_access(r.tenant_id,r.patient_id))
            or (private.has_tenant_role(r.tenant_id,array['patient']) and exists (
              select 1 from public.patient_accounts pa
              where pa.tenant_id = r.tenant_id
                and pa.patient_id = r.patient_id
                and pa.user_id = (select auth.uid())
            ))
          )
      )
    )
  );

drop function public.request_return_preparation(uuid,uuid,uuid);
drop function public.save_return_preparation_draft(uuid,uuid,integer,jsonb);
drop function public.submit_return_preparation(uuid,uuid,integer,jsonb,boolean);
drop function private.request_return_preparation(uuid,uuid,uuid);
drop function private.save_return_preparation_draft(uuid,uuid,integer,jsonb);
drop function private.submit_return_preparation(uuid,uuid,integer,jsonb,boolean);

create function private.request_return_preparation(
  target_tenant uuid,
  target_appointment uuid,
  request_key uuid,
  supplied_questions jsonb default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  a public.appointments;
  result uuid;
  next_number integer;
  questionnaire_version_value integer := 1;
  normalized_questions jsonb;
  prior_appointment uuid;
  prior_questions jsonb;
  prior_patient uuid;
  prior_doctor uuid;
begin
  if request_key is null
    or not private.has_tenant_role(target_tenant,array['doctor']) then
    raise exception 'Active doctor and request key required' using errcode='42501';
  end if;
  normalized_questions := private.normalize_preconsultation_questions(supplied_questions);

  select id,appointment_id,return_preparation_requests.supplied_questions,
      patient_id,doctor_id
    into result,prior_appointment,prior_questions,prior_patient,prior_doctor
  from public.return_preparation_requests
  where tenant_id=target_tenant and requested_by=auth.uid()
    and client_request_id=request_key;
  if result is not null then
    if prior_appointment is distinct from target_appointment
      or prior_questions is distinct from normalized_questions then
      raise exception 'Request key is already bound to a different appointment or questionnaire'
        using errcode='22023';
    end if;
    if prior_doctor is distinct from auth.uid()
      or not private.has_care_access(target_tenant,prior_patient)
      or not exists(select 1 from public.patient_accounts pa
        where pa.tenant_id=target_tenant and pa.patient_id=prior_patient) then
      raise exception 'Active doctor care access required for request replay'
        using errcode='42501';
    end if;
    return result;
  end if;

  select * into a from public.appointments
    where tenant_id=target_tenant and id=target_appointment for update;
  if not found or a.doctor_id<>auth.uid()
    or a.kind not in ('consultation','return')
    or a.status<>'scheduled' or a.starts_at<=now()
    or not private.has_care_access(target_tenant,a.patient_id)
    or not exists(select 1 from public.patient_accounts pa
      where pa.tenant_id=target_tenant and pa.patient_id=a.patient_id) then
    raise exception 'Eligible future consultation and active care access required'
      using errcode='42501';
  end if;

  -- Recheck after the appointment lock so concurrent replays cannot duplicate.
  select id,appointment_id,return_preparation_requests.supplied_questions,
      patient_id,doctor_id
    into result,prior_appointment,prior_questions,prior_patient,prior_doctor
  from public.return_preparation_requests
  where tenant_id=target_tenant and requested_by=auth.uid()
    and client_request_id=request_key;
  if result is not null then
    if prior_appointment is distinct from target_appointment
      or prior_questions is distinct from normalized_questions then
      raise exception 'Request key is already bound to a different appointment or questionnaire'
        using errcode='22023';
    end if;
    if prior_doctor is distinct from auth.uid()
      or not private.has_care_access(target_tenant,prior_patient)
      or not exists(select 1 from public.patient_accounts pa
        where pa.tenant_id=target_tenant and pa.patient_id=prior_patient) then
      raise exception 'Active doctor care access required for request replay'
        using errcode='42501';
    end if;
    return result;
  end if;

  if exists(select 1 from public.return_preparation_requests
    where tenant_id=target_tenant and appointment_id=target_appointment
      and status in ('requested','draft')) then
    raise exception 'Open preparation already exists' using errcode='23514';
  end if;
  select coalesce(max(request_number),0)+1 into next_number
    from public.return_preparation_requests
    where tenant_id=target_tenant and appointment_id=target_appointment;

  if normalized_questions is not null then
    insert into public.return_preparation_questionnaires(
      tenant_id,doctor_id,title,questions
    ) values (
      target_tenant,a.doctor_id,'Antes da sua consulta',normalized_questions
    ) returning version into questionnaire_version_value;
  end if;

  insert into public.return_preparation_requests(
    tenant_id,appointment_id,patient_id,doctor_id,questionnaire_version,
    request_number,requested_by,client_request_id,supplied_questions
  ) values(target_tenant,target_appointment,a.patient_id,a.doctor_id,
    questionnaire_version_value,next_number,auth.uid(),request_key,
    normalized_questions) returning id into result;
  perform private.queue_in_app_notification(target_tenant,
    (select pa.user_id from public.patient_accounts pa
      where pa.tenant_id=target_tenant and pa.patient_id=a.patient_id),
    'return_preparation_requested','return-preparation-requested:'||result,
    '/clinicas/'||target_tenant||'/meu-cuidado/hoje');
  return result;
end;
$$;

create function private.save_return_preparation_draft(
  target_tenant uuid,
  target_request uuid,
  read_version integer,
  supplied_answers jsonb,
  supplied_priorities text[] default '{}'::text[]
) returns integer
language plpgsql security definer set search_path='' as $$
declare
  r public.return_preparation_requests;
  d public.return_preparation_drafts;
  next_version integer;
  event_time timestamptz:=clock_timestamp();
begin
  if not private.has_tenant_role(target_tenant,array['patient']) then
    raise exception 'Patient access required' using errcode='42501';
  end if;
  if read_version is null or read_version < 0 then
    raise exception 'Valid preparation draft version required' using errcode='23514';
  end if;
  if not private.valid_preconsultation_priorities(supplied_priorities) then
    raise exception 'Up to three unique valid priorities required' using errcode='23514';
  end if;
  select * into r from public.return_preparation_requests
    where tenant_id=target_tenant and id=target_request for update;
  if not found or r.status not in ('requested','draft') or not exists(
    select 1 from public.patient_accounts a where a.tenant_id=target_tenant
      and a.patient_id=r.patient_id and a.user_id=auth.uid())
    or not exists(
      select 1 from public.care_relationships cr
      join public.memberships m on m.tenant_id=cr.tenant_id
        and m.user_id=cr.professional_id
      where cr.tenant_id=target_tenant and cr.patient_id=r.patient_id
        and cr.professional_id=r.doctor_id and cr.status='active'
        and m.role='doctor' and m.status='active'
    ) then
    raise exception 'Open own preparation with active care required' using errcode='42501';
  end if;
  if not private.valid_return_preparation_answers(r.questionnaire_version,supplied_answers) then
    raise exception 'Valid questionnaire answers required' using errcode='23514';
  end if;
  select * into d from public.return_preparation_drafts
    where request_id=target_request for update;
  if found then
    if d.version<>read_version then
      raise exception 'Stale preparation draft' using errcode='40001';
    end if;
    next_version:=d.version+1;
    update public.return_preparation_drafts
      set answers=supplied_answers,priorities=supplied_priorities,
        version=next_version,updated_at=event_time
      where request_id=target_request;
  else
    if read_version<>0 then
      raise exception 'Stale preparation draft' using errcode='40001';
    end if;
    next_version:=1;
    insert into public.return_preparation_drafts(
      request_id,tenant_id,patient_id,actor_user_id,answers,priorities,updated_at
    ) values(target_request,target_tenant,r.patient_id,auth.uid(),
      supplied_answers,supplied_priorities,event_time);
  end if;
  update public.return_preparation_requests set status='draft',version=version+1,
    draft_updated_at=event_time,updated_at=event_time where id=target_request;
  return next_version;
end;
$$;

create function private.submit_return_preparation(
  target_tenant uuid,
  target_request uuid,
  read_version integer,
  supplied_answers jsonb,
  confirmed boolean,
  supplied_priorities text[] default '{}'::text[]
) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  r public.return_preparation_requests;
  d public.return_preparation_drafts;
  previous public.return_preparation_submissions;
  result uuid;
  event_time timestamptz:=clock_timestamp();
begin
  if confirmed is distinct from true
    or not private.has_tenant_role(target_tenant,array['patient']) then
    raise exception 'Patient confirmation required' using errcode='42501';
  end if;
  if read_version is null or read_version < 0 then
    raise exception 'Valid preparation draft version required' using errcode='23514';
  end if;
  if not private.valid_preconsultation_priorities(supplied_priorities) then
    raise exception 'Up to three unique valid priorities required' using errcode='23514';
  end if;
  select * into r from public.return_preparation_requests
    where tenant_id=target_tenant and id=target_request for update;
  if not found or not exists(select 1 from public.patient_accounts a
    where a.tenant_id=target_tenant and a.patient_id=r.patient_id
      and a.user_id=auth.uid()) then
    raise exception 'Own preparation required' using errcode='42501';
  end if;
  if r.status in ('submitted','reviewed') then
    select * into previous from public.return_preparation_submissions
      where tenant_id=target_tenant and request_id=target_request
        and actor_user_id=auth.uid();
    if found then
      if previous.answers is distinct from supplied_answers
        or previous.priorities is distinct from supplied_priorities then
        raise exception 'Submission retry payload does not match the immutable submission'
          using errcode='22023';
      end if;
      if previous.submitted_draft_version is not null
        and previous.submitted_draft_version <> read_version then
        raise exception 'Submission retry uses a stale draft version'
          using errcode='40001';
      end if;
      return previous.id;
    end if;
  end if;
  if r.status not in ('requested','draft') then
    raise exception 'Open preparation required' using errcode='23514';
  end if;
  if not exists(
    select 1 from public.care_relationships cr
    join public.memberships m on m.tenant_id=cr.tenant_id
      and m.user_id=cr.professional_id
    where cr.tenant_id=target_tenant and cr.patient_id=r.patient_id
      and cr.professional_id=r.doctor_id and cr.status='active'
      and m.role='doctor' and m.status='active'
  ) then
    raise exception 'Active care required' using errcode='42501';
  end if;
  select * into d from public.return_preparation_drafts
    where request_id=target_request for update;
  if (found and d.version<>read_version) or (not found and read_version<>0) then
    raise exception 'Stale preparation draft' using errcode='40001';
  end if;
  if not private.valid_return_preparation_answers(r.questionnaire_version,supplied_answers) then
    raise exception 'Valid questionnaire answers required' using errcode='23514';
  end if;
  insert into public.return_preparation_submissions(
    tenant_id,request_id,patient_id,doctor_id,actor_user_id,
    questionnaire_version,answers,priorities,submitted_draft_version,submitted_at
  ) values(target_tenant,target_request,r.patient_id,r.doctor_id,auth.uid(),
    r.questionnaire_version,supplied_answers,supplied_priorities,read_version,event_time)
    returning id into result;
  delete from public.return_preparation_drafts where request_id=target_request;
  update public.return_preparation_requests set status='submitted',version=version+1,
    submitted_at=event_time,updated_at=event_time where id=target_request;
  perform private.queue_in_app_notification(target_tenant,r.doctor_id,
    'return_preparation_submitted','return-preparation-submitted:'||result,
    '/clinicas/'||target_tenant||'/preparo');
  return result;
end;
$$;

revoke all on function private.request_return_preparation(uuid,uuid,uuid,jsonb),
  private.save_return_preparation_draft(uuid,uuid,integer,jsonb,text[]),
  private.submit_return_preparation(uuid,uuid,integer,jsonb,boolean,text[])
  from public,anon,authenticated;
grant execute on function private.request_return_preparation(uuid,uuid,uuid,jsonb),
  private.save_return_preparation_draft(uuid,uuid,integer,jsonb,text[]),
  private.submit_return_preparation(uuid,uuid,integer,jsonb,boolean,text[])
  to authenticated;

create function public.request_return_preparation(
  target_tenant uuid,target_appointment uuid,request_key uuid,
  supplied_questions jsonb default null
) returns uuid language sql security invoker set search_path='' as $$
  select private.request_return_preparation(
    target_tenant,target_appointment,request_key,supplied_questions
  );
$$;
create function public.save_return_preparation_draft(
  target_tenant uuid,target_request uuid,read_version integer,
  supplied_answers jsonb,supplied_priorities text[] default '{}'::text[]
) returns integer language sql security invoker set search_path='' as $$
  select private.save_return_preparation_draft(
    target_tenant,target_request,read_version,supplied_answers,supplied_priorities
  );
$$;
create function public.submit_return_preparation(
  target_tenant uuid,target_request uuid,read_version integer,
  supplied_answers jsonb,confirmed boolean,
  supplied_priorities text[] default '{}'::text[]
) returns uuid language sql security invoker set search_path='' as $$
  select private.submit_return_preparation(
    target_tenant,target_request,read_version,supplied_answers,confirmed,
    supplied_priorities
  );
$$;
revoke all on function public.request_return_preparation(uuid,uuid,uuid,jsonb),
  public.save_return_preparation_draft(uuid,uuid,integer,jsonb,text[]),
  public.submit_return_preparation(uuid,uuid,integer,jsonb,boolean,text[])
  from public,anon,authenticated;
grant execute on function public.request_return_preparation(uuid,uuid,uuid,jsonb),
  public.save_return_preparation_draft(uuid,uuid,integer,jsonb,text[]),
  public.submit_return_preparation(uuid,uuid,integer,jsonb,boolean,text[])
  to authenticated;
