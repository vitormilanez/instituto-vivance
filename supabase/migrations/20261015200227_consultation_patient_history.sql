-- Read-only, bounded consultation-assistance history for the patient's assigned
-- physician. The projection deliberately excludes transcript/source, generation
-- metadata and review notes; it is not a publication into the clinical record.
create function public.consultation_workflow_patient_history(
  target_tenant uuid,
  actor_id uuid,
  actor_session uuid,
  target_patient uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor_name text;
  appointment_row record;
  workflow jsonb;
  draft jsonb;
  review jsonb;
  items jsonb := '[]'::jsonb;
  item_count integer := 0;
  is_truncated boolean := false;
begin
  perform 1
    from auth.sessions s
    join auth.users u on u.id=s.user_id
    where s.id=actor_session
      and s.user_id=actor_id
      and u.deleted_at is null
      and (u.banned_until is null or u.banned_until<=clock_timestamp())
      and (s.not_after is null or s.not_after>clock_timestamp())
    for share of s,u;
  if not found then raise exception 'Live session required' using errcode='42501'; end if;

  select m.display_name into actor_name
    from public.memberships m
    join public.tenants t on t.id=m.tenant_id
    where m.tenant_id=target_tenant
      and m.user_id=actor_id
      and m.role='doctor'
      and m.status='active'
      and t.status='active'
    for share of m,t;
  if not found then raise exception 'Assigned physician required' using errcode='42501'; end if;

  perform 1 from public.patients p
    where p.tenant_id=target_tenant and p.id=target_patient for share;
  if not found then raise exception 'Patient unavailable' using errcode='42501'; end if;

  perform 1 from public.care_relationships r
    where r.tenant_id=target_tenant
      and r.patient_id=target_patient
      and r.professional_id=actor_id
      and r.status='active'
    for share;
  if not found then raise exception 'Active care relationship required' using errcode='42501'; end if;

  for appointment_row in
    select a.id,a.starts_at,a.ends_at,a.status,
      coalesce(tc.delivery_mode,'in_person') delivery_mode
    from public.appointments a
    left join public.appointment_teleconsultations tc
      on tc.tenant_id=a.tenant_id and tc.appointment_id=a.id
    where a.tenant_id=target_tenant
      and a.patient_id=target_patient
      and a.doctor_id=actor_id
      and exists (
        select 1
        from public.consultation_sources s
        join public.consultation_summary_jobs j on j.source_id=s.id
        where s.tenant_id=a.tenant_id and s.appointment_id=a.id
      )
    order by a.starts_at desc,a.id desc
    limit 21
  loop
    item_count:=item_count+1;
    if item_count>20 then is_truncated:=true; exit; end if;

    -- Reuse the appointment projection so every row rechecks live assignment,
    -- care, tenant and session while preserving one client/database round trip.
    workflow:=public.consultation_workflow_operation(
      'list',target_tenant,actor_id,actor_session,appointment_row.id,'{}'::jsonb
    );
    draft:=workflow#>'{summary,draft}';
    review:=workflow#>'{summary,review}';
    items:=items||jsonb_build_array(jsonb_build_object(
      'appointmentId',appointment_row.id,
      'startsAt',appointment_row.starts_at,
      'endsAt',appointment_row.ends_at,
      'deliveryMode',appointment_row.delivery_mode,
      'doctorName',coalesce(nullif(btrim(actor_name),''),'Médico responsável'),
      'appointmentStatus',appointment_row.status,
      'summaryStatus',workflow#>>'{summary,status}',
      'summary',case when draft is null or draft='null'::jsonb then null else jsonb_build_object(
        'id',draft->>'id',
        'version',(draft->>'version')::integer,
        'createdAt',draft->>'createdAt',
        'mode',draft#>>'{summary,mode}',
        'incomplete',coalesce((draft#>>'{summary,incomplete}')::boolean,false),
        'reviewDecision',case when review is null or review='null'::jsonb then null else review->>'decision' end,
        'reviewedAt',case when review is null or review='null'::jsonb then null else review->>'reviewedAt' end,
        'categories',draft#>'{summary,categories}'
      ) end
    ));
  end loop;

  return jsonb_build_object('items',items,'truncated',is_truncated,'limit',20);
end;
$$;

revoke all on function public.consultation_workflow_patient_history(uuid,uuid,uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.consultation_workflow_patient_history(uuid,uuid,uuid,uuid)
  to service_role;
