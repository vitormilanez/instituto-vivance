-- Patient-owned profile extension. Drafts are private; each explicit share
-- appends an immutable section snapshot visible only to active care staff.
-- Preserve legacy steps while allowing the redesigned wizard to resume at
-- its exact screen even when every optional answer on that screen is blank.
alter table public.patient_onboarding drop constraint patient_onboarding_current_step_check;
alter table public.patient_onboarding add constraint patient_onboarding_current_step_check
  check (current_step in ('profile','measurements','questions','exams','medications','history','family','goal','review'));
alter table public.patient_onboarding drop constraint patient_onboarding_skipped_steps_check;
alter table public.patient_onboarding add constraint patient_onboarding_skipped_steps_check
  check (skipped_steps <@ array['profile','measurements','questions','exams','medications','history','family','goal','review']::text[]);
alter table public.patient_onboarding_submissions add constraint patient_onboarding_submission_current_step_check
  check (current_step in ('profile','measurements','questions','exams','medications','history','family','goal','review'));
alter table public.patient_onboarding_submissions add constraint patient_onboarding_submission_skipped_steps_check
  check (skipped_steps <@ array['profile','measurements','questions','exams','medications','history','family','goal','review']::text[]);

alter table public.patient_onboarding add column health_context jsonb not null default
  '{"medications":{"status":"","details":""},"conditions":{"status":"","details":""},"allergies":{"status":"","details":""},"surgeries":{"status":"","details":""},"familyHistory":{"status":"","details":""}}'::jsonb;
alter table public.patient_onboarding_submissions add column health_context jsonb not null default
  '{"medications":{"status":"","details":""},"conditions":{"status":"","details":""},"allergies":{"status":"","details":""},"surgeries":{"status":"","details":""},"familyHistory":{"status":"","details":""}}'::jsonb;
grant update (health_context) on public.patient_onboarding to authenticated;

create function private.valid_onboarding_health_context(value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(value) = 'object'
    and (select count(*) from jsonb_object_keys(value)) = 5
    and value ?& array['medications','conditions','allergies','surgeries','familyHistory']
    and not exists (
      select 1 from jsonb_each(value) as entry(key, section)
      where jsonb_typeof(section) <> 'object'
        or (select count(*) from jsonb_object_keys(section)) <> 2
        or not (section ?& array['status','details'])
        or jsonb_typeof(section->'status') <> 'string'
        or section->>'status' not in ('','yes','no','unknown','discuss')
        or jsonb_typeof(section->'details') <> 'string'
        or length(section->>'details') > 4000
    );
$$;
alter table public.patient_onboarding add constraint patient_onboarding_health_context_check
  check (private.valid_onboarding_health_context(health_context));
alter table public.patient_onboarding_submissions add constraint patient_onboarding_submission_health_context_check
  check (private.valid_onboarding_health_context(health_context));

create table public.patient_profile_context (
  tenant_id uuid not null,
  patient_id uuid not null,
  user_id uuid not null,
  nutrition jsonb not null default '{"pattern":"","preferences":"","avoidedFoods":"","mealRoutine":[{"id":"breakfast","time":"","description":""},{"id":"lunch","time":"","description":""},{"id":"dinner","time":"","description":""},{"id":"snack","time":"","description":""}]}'::jsonb,
  photos jsonb not null default '{"frontDocumentId":null,"sideDocumentId":null,"backDocumentId":null}'::jsonb,
  exams_status text not null default 'not_started' check (exams_status in ('not_started','shared','none_now')),
  exams_document_ids uuid[] not null default '{}',
  nutrition_submitted_at timestamptz,
  photos_submitted_at timestamptz,
  exams_submitted_at timestamptz,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, patient_id),
  unique (tenant_id, user_id),
  foreign key (tenant_id, patient_id) references public.patients(tenant_id, id),
  foreign key (tenant_id, user_id) references public.patient_accounts(tenant_id, user_id)
);
alter table public.patient_profile_context enable row level security;
revoke all on public.patient_profile_context from public, anon, authenticated;
grant select on public.patient_profile_context to authenticated;
create policy patient_profile_context_read_own on public.patient_profile_context
  for select to authenticated using (
    user_id = (select auth.uid()) and private.has_live_session()
    and private.has_tenant_role(tenant_id, array['patient'])
    and exists (select 1 from public.patient_accounts account
      where account.tenant_id = patient_profile_context.tenant_id
      and account.patient_id = patient_profile_context.patient_id
      and account.user_id = (select auth.uid()))
  );
create function private.audit_patient_profile_context() returns trigger
language plpgsql security definer set search_path = '' as $$
declare fields text[];
begin
  if auth.uid() is not null and not private.has_live_session() then
    raise exception 'Inactive session' using errcode = '42501';
  end if;
  select coalesce(array_agg(key order by key), '{}'::text[]) into fields
    from jsonb_each(to_jsonb(new)) entry(key, value)
    where (case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end)->key is distinct from value
      and key <> 'updated_at';
  insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,changed_fields)
    values(new.tenant_id,auth.uid(),lower(tg_op),'patient_profile_context',new.patient_id,fields);
  return new;
end;
$$;
revoke all on function private.audit_patient_profile_context() from public, anon, authenticated;
create trigger patient_profile_context_audit after insert or update on public.patient_profile_context
  for each row execute function private.audit_patient_profile_context();

create table public.patient_profile_context_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  user_id uuid not null,
  section text not null check (section in ('nutrition','photos','exams')),
  source_version integer not null,
  payload jsonb not null,
  submitted_at timestamptz not null default clock_timestamp(),
  foreign key (tenant_id, patient_id) references public.patients(tenant_id, id),
  foreign key (tenant_id, user_id) references public.patient_accounts(tenant_id, user_id)
);
create index patient_profile_context_submissions_latest on public.patient_profile_context_submissions
  (tenant_id, patient_id, section, submitted_at desc);
alter table public.patient_profile_context_submissions enable row level security;
revoke all on public.patient_profile_context_submissions from public, anon, authenticated;
grant select on public.patient_profile_context_submissions to authenticated;
create policy patient_profile_context_submissions_read_own on public.patient_profile_context_submissions
  for select to authenticated using (
    user_id = (select auth.uid()) and private.has_live_session()
    and private.has_tenant_role(tenant_id, array['patient'])
  );
create policy patient_profile_context_submissions_read_care on public.patient_profile_context_submissions
  for select to authenticated using (private.has_care_access(tenant_id, patient_id));
create trigger patient_profile_context_submissions_audit after insert on public.patient_profile_context_submissions
  for each row execute function private.audit_change();

create function private.valid_profile_nutrition(value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(value) = 'object' and (select count(*) from jsonb_object_keys(value)) = 4
    and value ?& array['pattern','preferences','avoidedFoods','mealRoutine']
    and jsonb_typeof(value->'pattern') = 'string'
    and value->>'pattern' in ('','mixed','vegetarian','vegan','other')
    and jsonb_typeof(value->'preferences') = 'string' and length(value->>'preferences') <= 4000
    and jsonb_typeof(value->'avoidedFoods') = 'string' and length(value->>'avoidedFoods') <= 4000
    and jsonb_typeof(value->'mealRoutine') = 'array' and jsonb_array_length(value->'mealRoutine') <= 4
    and not exists (select 1 from jsonb_array_elements(value->'mealRoutine') as meal(value)
      where jsonb_typeof(meal.value) <> 'object'
        or (select count(*) from jsonb_object_keys(meal.value)) <> 3
        or not (meal.value ?& array['id','time','description'])
        or meal.value->>'id' not in ('breakfast','lunch','dinner','snack')
        or jsonb_typeof(meal.value->'time') <> 'string' or length(meal.value->>'time') > 100
        or jsonb_typeof(meal.value->'description') <> 'string' or length(meal.value->>'description') > 2000);
$$;
create function private.valid_profile_photos(value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(value) = 'object' and (select count(*) from jsonb_object_keys(value)) = 3
    and value ?& array['frontDocumentId','sideDocumentId','backDocumentId']
    and not exists (select 1 from jsonb_each(value) as photo(key, document_id)
      where jsonb_typeof(document_id) not in ('null','string')
        or (jsonb_typeof(document_id) = 'string' and document_id #>> '{}' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'));
$$;
alter table public.patient_profile_context add constraint patient_profile_nutrition_check check (private.valid_profile_nutrition(nutrition));
alter table public.patient_profile_context add constraint patient_profile_photos_check check (private.valid_profile_photos(photos));

create function private.validate_patient_profile_documents(target_tenant uuid, target_patient uuid, target_user uuid,
  input_photos jsonb, input_exams uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from jsonb_each_text(input_photos) as photo(key, document_id)
    where document_id is not null and document_id <> '' and not exists (
      select 1 from public.patient_documents document where document.tenant_id = target_tenant
        and document.patient_id = target_patient and document.id::text = photo.document_id
        and document.uploaded_by = target_user and document.status = 'available'
        and document.visibility = 'internal' and document.category = 'clinical_document'
        and document.content_type in ('image/jpeg','image/png')))
  then raise exception 'Available private patient image required' using errcode = '23514'; end if;
  if exists (select 1 from unnest(input_exams) document_id where not exists (
    select 1 from public.patient_documents document where document.tenant_id = target_tenant
      and document.patient_id = target_patient and document.id = document_id
      and document.uploaded_by = target_user and document.status = 'available'
      and document.category = 'exam'))
  then raise exception 'Available patient exam required' using errcode = '23514'; end if;
end;
$$;
revoke all on function private.validate_patient_profile_documents(uuid,uuid,uuid,jsonb,uuid[]) from public, anon, authenticated;

create function public.save_patient_profile_context(target_tenant uuid, read_version integer, patch jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare draft public.patient_profile_context; patient uuid;
begin
  if not private.has_tenant_role(target_tenant, array['patient']) or not private.has_live_session()
    then raise exception 'Patient access required' using errcode = '42501'; end if;
  select account.patient_id into patient from public.patient_accounts account
    join public.patient_onboarding onboarding on onboarding.tenant_id = account.tenant_id
      and onboarding.patient_id = account.patient_id and onboarding.status = 'submitted'
    where account.tenant_id = target_tenant and account.user_id = auth.uid();
  if patient is null then raise exception 'Submitted onboarding required' using errcode = '42501'; end if;
  if jsonb_typeof(patch) <> 'object' or patch = '{}'::jsonb
    or (select count(*) from jsonb_object_keys(patch)) <>
      (select count(*) from jsonb_object_keys(patch) key where key in ('nutrition','photos','examsStatus','examsDocumentIds'))
    then raise exception 'Invalid profile patch' using errcode = '23514'; end if;
  insert into public.patient_profile_context(tenant_id,patient_id,user_id)
    values(target_tenant,patient,auth.uid()) on conflict (tenant_id,patient_id) do nothing;
  select * into draft from public.patient_profile_context where tenant_id = target_tenant and patient_id = patient for update;
  if draft.version <> read_version then raise exception 'Stale profile version' using errcode = '40001'; end if;
  if patch ? 'nutrition' and not private.valid_profile_nutrition(patch->'nutrition')
    then raise exception 'Invalid nutrition' using errcode = '23514'; end if;
  if patch ? 'photos' and not private.valid_profile_photos(patch->'photos')
    then raise exception 'Invalid photos' using errcode = '23514'; end if;
  if patch ? 'examsStatus' and (jsonb_typeof(patch->'examsStatus') <> 'string'
    or patch->>'examsStatus' not in ('not_started','shared','none_now'))
    then raise exception 'Invalid exams status' using errcode = '23514'; end if;
  if patch ? 'examsDocumentIds' and (jsonb_typeof(patch->'examsDocumentIds') <> 'array'
    or jsonb_array_length(patch->'examsDocumentIds') > 50
    or exists (select 1 from jsonb_array_elements(patch->'examsDocumentIds') entry
      where jsonb_typeof(entry) <> 'string' or entry #>> '{}' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'))
    then raise exception 'Invalid exams' using errcode = '23514'; end if;
  update public.patient_profile_context set
    nutrition = case when patch ? 'nutrition' then patch->'nutrition' else draft.nutrition end,
    photos = case when patch ? 'photos' then patch->'photos' else draft.photos end,
    exams_status = case when patch ? 'examsStatus' then patch->>'examsStatus' else draft.exams_status end,
    exams_document_ids = case when patch ? 'examsDocumentIds' then
      array(select jsonb_array_elements_text(patch->'examsDocumentIds')::uuid) else draft.exams_document_ids end,
    version = draft.version + 1, updated_at = clock_timestamp()
    where tenant_id = target_tenant and patient_id = patient;
  select * into draft from public.patient_profile_context where tenant_id = target_tenant and patient_id = patient;
  perform private.validate_patient_profile_documents(target_tenant,patient,auth.uid(),draft.photos,draft.exams_document_ids);
  return draft.version;
end;
$$;
revoke all on function public.save_patient_profile_context(uuid,integer,jsonb) from public, anon;
grant execute on function public.save_patient_profile_context(uuid,integer,jsonb) to authenticated;

create function public.submit_patient_profile_context(target_tenant uuid, read_version integer,
  target_section text, explicit_share_consent boolean) returns integer
language plpgsql security definer set search_path = '' as $$
declare draft public.patient_profile_context; payload jsonb;
begin
  if explicit_share_consent is distinct from true or target_section not in ('nutrition','photos','exams')
    or not private.has_tenant_role(target_tenant, array['patient']) or not private.has_live_session()
    then raise exception 'Explicit patient sharing required' using errcode = '42501'; end if;
  select * into draft from public.patient_profile_context where tenant_id = target_tenant
    and user_id = auth.uid() for update;
  if not found then raise exception 'Profile draft unavailable' using errcode = '42501'; end if;
  if draft.version <> read_version then raise exception 'Stale profile version' using errcode = '40001'; end if;
  perform private.validate_patient_profile_documents(target_tenant,draft.patient_id,auth.uid(),draft.photos,draft.exams_document_ids);
  if target_section = 'nutrition' then payload := draft.nutrition;
  elsif target_section = 'photos' then
    if draft.photos->>'frontDocumentId' is null or draft.photos->>'sideDocumentId' is null
      or draft.photos->>'backDocumentId' is null
      or draft.photos->>'frontDocumentId' = draft.photos->>'sideDocumentId'
      or draft.photos->>'frontDocumentId' = draft.photos->>'backDocumentId'
      or draft.photos->>'sideDocumentId' = draft.photos->>'backDocumentId'
      then raise exception 'Three profile photos required' using errcode = '23514'; end if;
    payload := draft.photos;
  else
    if draft.exams_status = 'not_started' or (draft.exams_status = 'shared' and cardinality(draft.exams_document_ids) = 0)
      or (draft.exams_status = 'none_now' and cardinality(draft.exams_document_ids) <> 0)
      then raise exception 'Exam sharing choice required' using errcode = '23514'; end if;
    payload := jsonb_build_object('status',draft.exams_status,'documentIds',to_jsonb(draft.exams_document_ids));
  end if;
  insert into public.patient_profile_context_submissions(tenant_id,patient_id,user_id,section,source_version,payload)
    values(target_tenant,draft.patient_id,auth.uid(),target_section,draft.version,payload);
  update public.patient_profile_context set
    nutrition_submitted_at = case when target_section = 'nutrition' then clock_timestamp() else nutrition_submitted_at end,
    photos_submitted_at = case when target_section = 'photos' then clock_timestamp() else photos_submitted_at end,
    exams_submitted_at = case when target_section = 'exams' then clock_timestamp() else exams_submitted_at end,
    version = draft.version + 1, updated_at = clock_timestamp()
    where tenant_id = target_tenant and patient_id = draft.patient_id;
  return draft.version + 1;
end;
$$;
revoke all on function public.submit_patient_profile_context(uuid,integer,text,boolean) from public, anon;
grant execute on function public.submit_patient_profile_context(uuid,integer,text,boolean) to authenticated;

-- Patient-owned internal files remain inaccessible to staff until an explicit
-- section submission references them; care access is still checked first.
create or replace function private.can_staff_read_patient_document(
  target_tenant uuid, target_patient uuid, target_document uuid,
  target_uploader uuid, target_visibility text
) returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_care_access(target_tenant, target_patient)
    and (
      target_visibility = 'shared'
      or not exists (select 1 from public.memberships uploader
        where uploader.tenant_id = target_tenant and uploader.user_id = target_uploader
          and uploader.role = 'patient')
      or exists (select 1 from public.patient_onboarding_submissions submission
        where submission.tenant_id = target_tenant and submission.patient_id = target_patient
          and (submission.photo_document_id = target_document
            or target_document = any(submission.exam_document_ids)))
      or exists (select 1 from public.patient_profile_context_submissions submission
        where submission.tenant_id = target_tenant and submission.patient_id = target_patient
          and ((submission.section = 'photos' and target_document::text in (
            submission.payload->>'frontDocumentId', submission.payload->>'sideDocumentId', submission.payload->>'backDocumentId'))
            or (submission.section = 'exams' and submission.payload->'documentIds' ? target_document::text)))
    );
$$;

create or replace function public.submit_patient_onboarding(
  target_tenant uuid, read_version integer, explicit_share_consent boolean
) returns integer
language plpgsql security definer set search_path = '' as $$
declare draft public.patient_onboarding;
begin
  if explicit_share_consent is distinct from true
    or not private.has_tenant_role(target_tenant, array['patient']) then
    raise exception 'Explicit sharing consent required' using errcode = '42501';
  end if;
  select * into draft from public.patient_onboarding
    where tenant_id = target_tenant and user_id = auth.uid() for update;
  if not found then raise exception 'Onboarding unavailable' using errcode = '42501'; end if;
  if draft.status <> 'draft' then return draft.version; end if;
  if draft.version <> read_version then
    raise exception 'Stale onboarding version' using errcode = '40001';
  end if;
  insert into public.patient_onboarding_submissions(
    tenant_id, patient_id, user_id, source_version, current_step, skipped_steps,
    questionnaire_version,
    photo_document_id, birth_date, weight_kg, height_cm, waist_cm, measured_on,
    exam_document_ids,
    answer_goal, answer_history, answer_routine, answer_treatments,
    answer_questions, health_context, share_consent
  ) values (
    draft.tenant_id, draft.patient_id, draft.user_id, draft.version,
    draft.current_step, draft.skipped_steps, draft.questionnaire_version, draft.photo_document_id,
    draft.birth_date, draft.weight_kg, draft.height_cm, draft.waist_cm,
    draft.measured_on, draft.exam_document_ids, draft.answer_goal, draft.answer_history,
    draft.answer_routine, draft.answer_treatments, draft.answer_questions, draft.health_context, true
  );
  update public.patient_onboarding set status = 'submitted', share_consent = true,
    submitted_at = clock_timestamp(), expected_version = draft.version
    where tenant_id = draft.tenant_id and patient_id = draft.patient_id;
  return draft.version + 1;
end;
$$;
