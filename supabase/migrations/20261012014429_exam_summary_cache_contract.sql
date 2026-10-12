-- Configuration participates in the same immutable identity as reviewed facts.
alter function private.exam_summary_manifest(uuid,uuid) rename to exam_summary_manifest_before_generation_contract;
create function private.exam_summary_manifest(t uuid,p uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select private.exam_summary_manifest_before_generation_contract(t,p)||jsonb_build_object('generationContract',jsonb_build_object(
 'providerModel','claude-haiku-5-5','promptVersion','vivance-exam-summary-20261011.1','verifierVersion','exam-selection-v2'))
$$;
revoke all on function private.exam_summary_manifest(uuid,uuid),private.exam_summary_manifest_before_generation_contract(uuid,uuid) from public,anon,authenticated,service_role;

-- Preserve technical retries, but never overwrite a medically rejected snapshot.
alter function public.begin_exam_summary(uuid,uuid) set schema private;
alter function private.begin_exam_summary(uuid,uuid) rename to begin_exam_summary_before_cache_contract;
revoke all on function private.begin_exam_summary_before_cache_contract(uuid,uuid) from public,anon,authenticated,service_role;
create function public.begin_exam_summary(target_tenant uuid,target_patient uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m jsonb; s public.exam_longitudinal_summaries;
begin
 if not private.has_live_session() or not private.has_tenant_role(target_tenant,array['doctor']) or not private.has_care_access(target_tenant,target_patient) then raise exception 'Active doctor care required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target_tenant::text||target_patient::text,0));
 m:=private.exam_summary_manifest(target_tenant,target_patient);
 select * into s from public.exam_longitudinal_summaries where tenant_id=target_tenant and patient_id=target_patient and source_key=md5(m::text) for update;
 if found and exists(select 1 from public.exam_summary_reviews where summary_id=s.id and decision='rejected') then return jsonb_build_object('cached',true,'summaryId',s.id,'status','failed','rejected',true); end if;
 return private.begin_exam_summary_before_cache_contract(target_tenant,target_patient);
end $$;
revoke all on function public.begin_exam_summary(uuid,uuid) from public,anon,service_role;
grant execute on function public.begin_exam_summary(uuid,uuid) to authenticated;
create or replace function public.get_exam_summary(target_tenant uuid,target_patient uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m jsonb; s public.exam_longitudinal_summaries;
begin
 if not private.has_live_session() or not private.has_tenant_role(target_tenant,array['doctor']) or not private.has_care_access(target_tenant,target_patient) then raise exception 'Active doctor care required' using errcode='42501'; end if;
 m:=private.exam_summary_manifest(target_tenant,target_patient);
 select * into s from public.exam_longitudinal_summaries where tenant_id=target_tenant and patient_id=target_patient order by created_at desc,id desc limit 1;
 return jsonb_build_object('manifest',m,'summary',case when s.id is not null then to_jsonb(s)-'lease_token'-'requested_session' else null end,
 'stale',s.id is not null and s.source_manifest<>m,'leaseExpired',s.status='processing' and s.lease_expires_at<=now(),
 'clinicalLibraryAvailable',jsonb_array_length(m->'library')>0,'published',exists(select 1 from public.exam_summary_publications where summary_id=s.id),
 'rejected',exists(select 1 from public.exam_summary_reviews where summary_id=s.id and decision='rejected'));
end $$;
