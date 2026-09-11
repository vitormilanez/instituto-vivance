-- Slice 4C: manual requests, immutable patient submissions and human review.
-- No cadence, diagnosis, urgency or care-plan mutation is inferred here.
create table public.care_check_ins (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  patient_id uuid not null,
  prompt text not null check(length(btrim(prompt)) between 2 and 1000),
  due_on date,
  status text not null default 'pending' check(status in ('pending','submitted','reviewed')),
  requested_by uuid not null default auth.uid(),
  requested_at timestamptz not null default clock_timestamp(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  unique(tenant_id,id),
  unique(tenant_id,id,patient_id),
  foreign key(tenant_id,patient_id) references public.patients(tenant_id,id),
  foreign key(tenant_id,requested_by) references public.memberships(tenant_id,user_id),
  check((status='pending' and submitted_at is null and reviewed_at is null)
    or (status='submitted' and submitted_at is not null and reviewed_at is null)
    or (status='reviewed' and submitted_at is not null and reviewed_at is not null))
);
create index care_check_ins_staff_queue on public.care_check_ins(tenant_id,status,requested_at,id);
create index care_check_ins_patient_queue on public.care_check_ins(tenant_id,patient_id,status,requested_at desc,id);
alter table public.care_check_ins enable row level security;
revoke all on public.care_check_ins from public,anon,authenticated;
grant select on public.care_check_ins to authenticated;
create policy care_check_ins_staff_read on public.care_check_ins for select to authenticated
  using(private.has_care_access(tenant_id,patient_id));
create policy care_check_ins_patient_read on public.care_check_ins for select to authenticated
  using(private.has_tenant_role(tenant_id,array['patient']) and exists(
    select 1 from public.patient_accounts a where a.tenant_id=care_check_ins.tenant_id
      and a.patient_id=care_check_ins.patient_id and a.user_id=(select auth.uid())));

create table public.care_check_in_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  check_in_id uuid not null,
  patient_id uuid not null,
  actor_user_id uuid not null,
  report text not null check(length(btrim(report)) between 1 and 4000),
  measure_label text,
  measure_value numeric,
  measure_unit text,
  reported_on date not null,
  submitted_at timestamptz not null default clock_timestamp(),
  unique(tenant_id,check_in_id),
  foreign key(tenant_id,check_in_id,patient_id) references public.care_check_ins(tenant_id,id,patient_id),
  foreign key(tenant_id,actor_user_id) references public.memberships(tenant_id,user_id),
  check((measure_label is null and measure_value is null and measure_unit is null)
    or (length(btrim(measure_label)) between 1 and 80 and measure_value is not null
      and measure_value <> 'NaN'::numeric and abs(measure_value) <= 1000000000
      and length(btrim(measure_unit)) between 1 and 30))
);
create index care_check_in_submissions_patient on public.care_check_in_submissions(tenant_id,patient_id,submitted_at desc,id);
alter table public.care_check_in_submissions enable row level security;
revoke all on public.care_check_in_submissions from public,anon,authenticated;
grant select on public.care_check_in_submissions to authenticated;
create policy care_check_in_submissions_staff_read on public.care_check_in_submissions for select to authenticated
  using(private.has_care_access(tenant_id,patient_id));
create policy care_check_in_submissions_patient_read on public.care_check_in_submissions for select to authenticated
  using(actor_user_id=(select auth.uid()) and private.has_tenant_role(tenant_id,array['patient']) and exists(
    select 1 from public.patient_accounts a where a.tenant_id=care_check_in_submissions.tenant_id
      and a.patient_id=care_check_in_submissions.patient_id and a.user_id=(select auth.uid())));

create table public.care_check_in_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  check_in_id uuid not null,
  patient_id uuid not null,
  reviewer_id uuid not null,
  note text not null check(length(btrim(note)) between 1 and 2000),
  reviewed_at timestamptz not null default clock_timestamp(),
  unique(tenant_id,check_in_id),
  foreign key(tenant_id,check_in_id,patient_id) references public.care_check_ins(tenant_id,id,patient_id),
  foreign key(tenant_id,reviewer_id) references public.memberships(tenant_id,user_id)
);
create index care_check_in_reviews_patient on public.care_check_in_reviews(tenant_id,patient_id,reviewed_at desc,id);
alter table public.care_check_in_reviews enable row level security;
revoke all on public.care_check_in_reviews from public,anon,authenticated;
grant select on public.care_check_in_reviews to authenticated;
create policy care_check_in_reviews_staff_read on public.care_check_in_reviews for select to authenticated
  using(private.has_care_access(tenant_id,patient_id));

create trigger care_check_ins_audit after insert or update on public.care_check_ins
  for each row execute function private.audit_change();
create trigger care_check_in_submissions_audit after insert on public.care_check_in_submissions
  for each row execute function private.audit_change();
create trigger care_check_in_reviews_audit after insert on public.care_check_in_reviews
  for each row execute function private.audit_change();

create function private.request_care_check_in(t uuid,p uuid,prompt_text text,due date) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if not private.has_tenant_role(t,array['doctor','nurse']) or not private.has_care_access(t,p)
    or prompt_text is null or length(btrim(prompt_text)) not between 2 and 1000 then
    raise exception 'Active care access and prompt required' using errcode='42501'; end if;
  insert into public.care_check_ins(tenant_id,patient_id,prompt,due_on,requested_by)
    values(t,p,btrim(prompt_text),due,auth.uid()) returning id into result;
  return result;
end; $$;

create function private.submit_care_check_in(t uuid,check_in uuid,report_text text,label text,value numeric,unit text,reported date,confirmed boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.care_check_ins; result uuid;
begin
  if not private.has_tenant_role(t,array['patient']) or confirmed is distinct from true then
    raise exception 'Patient confirmation required' using errcode='42501'; end if;
  select * into c from public.care_check_ins where tenant_id=t and id=check_in for update;
  if not found or not exists(select 1 from public.patient_accounts a where a.tenant_id=t
    and a.patient_id=c.patient_id and a.user_id=auth.uid()) then
    raise exception 'Own check-in required' using errcode='42501'; end if;
  if c.status<>'pending' then
    select id into result from public.care_check_in_submissions where tenant_id=t and check_in_id=check_in and actor_user_id=auth.uid();
    if result is not null then return result; end if;
    raise exception 'Check-in already submitted' using errcode='23514';
  end if;
  if report_text is null or length(btrim(report_text)) not between 1 and 4000 or reported is null or reported > current_date then
    raise exception 'Valid patient report required' using errcode='23514'; end if;
  if (label is null and value is null and unit is null) then null;
  elsif label is null or value is null or unit is null or length(btrim(label)) not between 1 and 80
    or value='NaN'::numeric or abs(value)>1000000000 or length(btrim(unit)) not between 1 and 30 then
    raise exception 'Complete valid measure required' using errcode='23514'; end if;
  insert into public.care_check_in_submissions(tenant_id,check_in_id,patient_id,actor_user_id,report,measure_label,measure_value,measure_unit,reported_on)
    values(t,check_in,c.patient_id,auth.uid(),btrim(report_text),nullif(btrim(label),''),value,nullif(btrim(unit),''),reported) returning id into result;
  update public.care_check_ins set status='submitted',submitted_at=clock_timestamp() where tenant_id=t and id=check_in;
  return result;
end; $$;

create function private.review_care_check_in(t uuid,check_in uuid,note_text text,confirmed boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.care_check_ins; result uuid; reviewed_time timestamptz;
begin
  if not private.has_tenant_role(t,array['doctor','nurse']) or confirmed is distinct from true then
    raise exception 'Clinical review confirmation required' using errcode='42501'; end if;
  select * into c from public.care_check_ins where tenant_id=t and id=check_in for update;
  if not found or not private.has_care_access(t,c.patient_id) then
    raise exception 'Active care access required' using errcode='42501'; end if;
  if c.status='reviewed' then
    select id into result from public.care_check_in_reviews where tenant_id=t and check_in_id=check_in and reviewer_id=auth.uid();
    if result is not null then return result; end if;
    raise exception 'Check-in already reviewed' using errcode='23514';
  end if;
  if c.status<>'submitted' or note_text is null or length(btrim(note_text)) not between 1 and 2000 then
    raise exception 'Submitted check-in and review note required' using errcode='23514'; end if;
  insert into public.care_check_in_reviews(tenant_id,check_in_id,patient_id,reviewer_id,note)
    values(t,check_in,c.patient_id,auth.uid(),btrim(note_text)) returning id,reviewed_at into result,reviewed_time;
  update public.care_check_ins set status='reviewed',reviewed_at=reviewed_time where tenant_id=t and id=check_in;
  return result;
end; $$;

revoke all on function private.request_care_check_in(uuid,uuid,text,date),
  private.submit_care_check_in(uuid,uuid,text,text,numeric,text,date,boolean),
  private.review_care_check_in(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function private.request_care_check_in(uuid,uuid,text,date),
  private.submit_care_check_in(uuid,uuid,text,text,numeric,text,date,boolean),
  private.review_care_check_in(uuid,uuid,text,boolean) to authenticated;

create function public.request_care_check_in(target_tenant uuid,target_patient uuid,prompt_text text,due_on date) returns uuid
language sql security invoker set search_path='' as $$select private.request_care_check_in(target_tenant,target_patient,prompt_text,due_on);$$;
create function public.submit_care_check_in(target_tenant uuid,target_check_in uuid,report_text text,measure_label text,measure_value numeric,measure_unit text,reported_on date,confirmed boolean) returns uuid
language sql security invoker set search_path='' as $$select private.submit_care_check_in(target_tenant,target_check_in,report_text,measure_label,measure_value,measure_unit,reported_on,confirmed);$$;
create function public.review_care_check_in(target_tenant uuid,target_check_in uuid,note_text text,confirmed boolean) returns uuid
language sql security invoker set search_path='' as $$select private.review_care_check_in(target_tenant,target_check_in,note_text,confirmed);$$;
revoke all on function public.request_care_check_in(uuid,uuid,text,date),
  public.submit_care_check_in(uuid,uuid,text,text,numeric,text,date,boolean),
  public.review_care_check_in(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.request_care_check_in(uuid,uuid,text,date),
  public.submit_care_check_in(uuid,uuid,text,text,numeric,text,date,boolean),
  public.review_care_check_in(uuid,uuid,text,boolean) to authenticated;
