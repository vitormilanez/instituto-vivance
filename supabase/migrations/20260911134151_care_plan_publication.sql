-- Slice 4B. Published snapshots are separate from all private draft/history tables.
create table public.care_plan_publications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  plan_id uuid not null,
  patient_id uuid not null,
  source_version integer not null,
  revision integer not null,
  title text not null,
  goals text not null,
  actions text not null,
  frequency text not null,
  period text not null,
  review_on date not null,
  doctor_display_name text not null,
  approved_at timestamptz not null,
  published_by uuid not null,
  published_at timestamptz not null default clock_timestamp(),
  status text not null default 'published' check(status in ('published','superseded','withdrawn')),
  closed_at timestamptz,
  closed_by uuid,
  withdrawal_reason text,
  unique(tenant_id,id),
  unique(tenant_id,id,patient_id),
  foreign key(tenant_id,plan_id) references public.care_plans(tenant_id,id),
  foreign key(tenant_id,plan_id,source_version) references public.care_plan_versions(tenant_id,plan_id,version),
  foreign key(tenant_id,patient_id) references public.patients(tenant_id,id),
  foreign key(tenant_id,published_by) references public.memberships(tenant_id,user_id),
  foreign key(tenant_id,closed_by) references public.memberships(tenant_id,user_id),
  check ((status='published' and closed_at is null and closed_by is null and withdrawal_reason is null)
    or (status='superseded' and closed_at is not null and closed_by is not null and withdrawal_reason is null)
    or (status='withdrawn' and closed_at is not null and closed_by is not null and length(btrim(withdrawal_reason)) between 1 and 1000))
);
create unique index care_plan_one_publication on public.care_plan_publications(tenant_id,plan_id) where status='published';
create index care_publication_plan_history on public.care_plan_publications(tenant_id,plan_id,published_at desc);
create index care_publication_source on public.care_plan_publications(tenant_id,plan_id,source_version);
create index care_publication_patient on public.care_plan_publications(tenant_id,patient_id,status,published_at desc);
create index care_publication_author on public.care_plan_publications(tenant_id,published_by);
create index care_publication_closed_by on public.care_plan_publications(tenant_id,closed_by);
alter table public.care_plan_publications enable row level security;
revoke all on public.care_plan_publications from public,anon,authenticated;
grant select on public.care_plan_publications to authenticated;
create policy care_publication_staff on public.care_plan_publications for select to authenticated
  using (private.has_care_access(tenant_id,patient_id));
create policy care_publication_patient on public.care_plan_publications for select to authenticated
  using (status='published' and private.has_tenant_role(tenant_id,array['patient']) and exists(
    select 1 from public.patient_accounts a where a.tenant_id=care_plan_publications.tenant_id
      and a.patient_id=care_plan_publications.patient_id and a.user_id=(select auth.uid())));
create trigger care_publication_audit after insert or update on public.care_plan_publications
  for each row execute function private.audit_change();

create table public.care_plan_receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  publication_id uuid not null,
  patient_id uuid not null,
  actor_user_id uuid not null,
  acknowledged_at timestamptz not null default clock_timestamp(),
  unique(tenant_id,publication_id,actor_user_id),
  foreign key(tenant_id,publication_id,patient_id) references public.care_plan_publications(tenant_id,id,patient_id),
  foreign key(tenant_id,actor_user_id) references public.memberships(tenant_id,user_id)
);
create index care_receipts_patient on public.care_plan_receipts(tenant_id,patient_id);
create index care_receipts_actor on public.care_plan_receipts(tenant_id,actor_user_id);
alter table public.care_plan_receipts enable row level security;
revoke all on public.care_plan_receipts from public,anon,authenticated;
grant select on public.care_plan_receipts to authenticated;
create policy care_receipt_staff on public.care_plan_receipts for select to authenticated
  using(private.has_care_access(tenant_id,patient_id));
create policy care_receipt_patient on public.care_plan_receipts for select to authenticated
  using(actor_user_id=(select auth.uid()) and private.has_tenant_role(tenant_id,array['patient']) and exists(
    select 1 from public.care_plan_publications p where p.tenant_id=care_plan_receipts.tenant_id
      and p.id=care_plan_receipts.publication_id and p.status='published'));
create trigger care_receipt_audit after insert on public.care_plan_receipts
  for each row execute function private.audit_change();

-- Narrow, non-exposed writer. No caller has direct INSERT/UPDATE/DELETE grants.
-- Lock the plan for publication/withdrawal, matching the existing draft edit lock.
create function private.publish_care_plan(t uuid,plan uuid,read_version integer,previous_publication uuid,confirmed boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare p public.care_plans; v public.care_plan_versions; current_id uuid; result uuid;
begin
  if not private.has_tenant_role(t,array['doctor']) or confirmed is distinct from true then
    raise exception 'Doctor confirmation required' using errcode='42501'; end if;
  select * into p from public.care_plans where tenant_id=t and id=plan for update;
  if not found or p.doctor_id is distinct from auth.uid() or not private.has_care_access(t,p.patient_id) then
    raise exception 'Active author care access required' using errcode='42501'; end if;
  select id into current_id from public.care_plan_publications where tenant_id=t and plan_id=plan and status='published';
  if p.version is distinct from read_version or p.status<>'approved' or current_id is distinct from previous_publication then
    raise exception 'Publication context changed; reload before confirming' using errcode='23514'; end if;
  select * into v from public.care_plan_versions where tenant_id=t and plan_id=plan and version=read_version and status='approved';
  if not found or v.approved_at is null then raise exception 'Approved snapshot required' using errcode='23514'; end if;
  if exists(select 1 from public.care_plan_publications where id=current_id and source_version=v.version) then
    raise exception 'This version is already published' using errcode='23514'; end if;
  update public.care_plan_publications set status='superseded',closed_at=clock_timestamp(),closed_by=auth.uid() where id=current_id;
  insert into public.care_plan_publications(tenant_id,plan_id,patient_id,source_version,revision,title,goals,actions,frequency,period,review_on,doctor_display_name,approved_at,published_by)
    values(t,plan,p.patient_id,v.version,v.revision,v.title,v.goals,v.actions,v.frequency,v.period,v.review_on,p.doctor_display_name,v.approved_at,auth.uid()) returning id into result;
  return result;
end; $$;

create function private.withdraw_care_plan(t uuid,plan uuid,publication uuid,reason text,confirmed boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare p public.care_plans; result uuid;
begin
  if not private.has_tenant_role(t,array['doctor']) or confirmed is distinct from true then
    raise exception 'Doctor confirmation required' using errcode='42501'; end if;
  select * into p from public.care_plans where tenant_id=t and id=plan for update;
  if not found or p.doctor_id is distinct from auth.uid() or not private.has_care_access(t,p.patient_id) then
    raise exception 'Active author care access required' using errcode='42501'; end if;
  if reason is null or length(btrim(reason)) not between 1 and 1000 then
    raise exception 'Withdrawal reason required' using errcode='23514'; end if;
  update public.care_plan_publications set status='withdrawn',closed_at=clock_timestamp(),closed_by=auth.uid(),withdrawal_reason=btrim(reason)
    where tenant_id=t and plan_id=plan and id=publication and status='published' returning id into result;
  if result is null then raise exception 'Publication changed; reload before confirming' using errcode='23514'; end if;
  return result;
end; $$;

create function private.acknowledge_care_plan(t uuid,publication uuid,confirmed boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare p public.care_plan_publications; result uuid;
begin
  if not private.has_tenant_role(t,array['patient']) or confirmed is distinct from true then
    raise exception 'Patient confirmation required' using errcode='42501'; end if;
  -- SHARE serializes acknowledgement against replacement/withdrawal, without locking drafts.
  select * into p from public.care_plan_publications where tenant_id=t and id=publication and status='published' for share;
  if not found or not exists(select 1 from public.patient_accounts a where a.tenant_id=t and a.patient_id=p.patient_id and a.user_id=auth.uid()) then
    raise exception 'Own current publication required' using errcode='42501'; end if;
  insert into public.care_plan_receipts(tenant_id,publication_id,patient_id,actor_user_id)
    values(t,publication,p.patient_id,auth.uid()) on conflict(tenant_id,publication_id,actor_user_id) do nothing returning id into result;
  if result is null then select id into result from public.care_plan_receipts where tenant_id=t and publication_id=publication and actor_user_id=auth.uid(); end if;
  return result;
end; $$;
revoke all on function private.publish_care_plan(uuid,uuid,integer,uuid,boolean),
  private.withdraw_care_plan(uuid,uuid,uuid,text,boolean),private.acknowledge_care_plan(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function private.publish_care_plan(uuid,uuid,integer,uuid,boolean),
  private.withdraw_care_plan(uuid,uuid,uuid,text,boolean),private.acknowledge_care_plan(uuid,uuid,boolean) to authenticated;

create function public.publish_care_plan(target_tenant uuid,target_plan uuid,read_version integer,previous_publication uuid,confirmed boolean) returns uuid
language sql security invoker set search_path='' as $$select private.publish_care_plan(target_tenant,target_plan,read_version,previous_publication,confirmed);$$;
create function public.withdraw_care_plan(target_tenant uuid,target_plan uuid,target_publication uuid,reason text,confirmed boolean) returns uuid
language sql security invoker set search_path='' as $$select private.withdraw_care_plan(target_tenant,target_plan,target_publication,reason,confirmed);$$;
create function public.acknowledge_care_plan(target_tenant uuid,target_publication uuid,confirmed boolean) returns uuid
language sql security invoker set search_path='' as $$select private.acknowledge_care_plan(target_tenant,target_publication,confirmed);$$;
revoke all on function public.publish_care_plan(uuid,uuid,integer,uuid,boolean),
  public.withdraw_care_plan(uuid,uuid,uuid,text,boolean),public.acknowledge_care_plan(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.publish_care_plan(uuid,uuid,integer,uuid,boolean),
  public.withdraw_care_plan(uuid,uuid,uuid,text,boolean),public.acknowledge_care_plan(uuid,uuid,boolean) to authenticated;
