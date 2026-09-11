drop policy care_check_ins_staff_read on public.care_check_ins;
drop policy care_check_ins_patient_read on public.care_check_ins;
create policy care_check_ins_read on public.care_check_ins
  for select to authenticated using (
    private.has_care_access(tenant_id, patient_id)
    or (
      private.has_tenant_role(tenant_id, array['patient'])
      and exists (
        select 1 from public.patient_accounts a
        where a.tenant_id = care_check_ins.tenant_id
          and a.patient_id = care_check_ins.patient_id
          and a.user_id = (select auth.uid())
      )
    )
  );

drop policy care_check_in_submissions_staff_read on public.care_check_in_submissions;
drop policy care_check_in_submissions_patient_read on public.care_check_in_submissions;
create policy care_check_in_submissions_read on public.care_check_in_submissions
  for select to authenticated using (
    private.has_care_access(tenant_id, patient_id)
    or (
      actor_user_id = (select auth.uid())
      and private.has_tenant_role(tenant_id, array['patient'])
      and exists (
        select 1 from public.patient_accounts a
        where a.tenant_id = care_check_in_submissions.tenant_id
          and a.patient_id = care_check_in_submissions.patient_id
          and a.user_id = (select auth.uid())
      )
    )
  );
