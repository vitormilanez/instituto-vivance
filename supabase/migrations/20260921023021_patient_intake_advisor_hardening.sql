-- Keep the intake update path represented by one policy and cover the foreign
-- keys used by audit/author lookups. This clears the advisor findings added by
-- the patient-owned intake slice without changing who may update an intake.

create index patient_intake_contexts_recorded_by_fk
  on public.patient_intake_contexts(tenant_id, recorded_by);

create index patient_intake_context_versions_recorded_by_fk
  on public.patient_intake_context_versions(tenant_id, recorded_by);

drop policy patient_intake_update_doctor on public.patient_intake_contexts;
drop policy patient_intake_update_own on public.patient_intake_contexts;

create policy patient_intake_update_authorized
  on public.patient_intake_contexts
  for update to authenticated
  using (
    (
      private.has_tenant_role(tenant_id, array['doctor'])
      and private.has_care_access(tenant_id, patient_id)
    )
    or (
      private.has_tenant_role(tenant_id, array['patient'])
      and exists (
        select 1 from public.patient_accounts account
        where account.tenant_id = patient_intake_contexts.tenant_id
          and account.patient_id = patient_intake_contexts.patient_id
          and account.user_id = (select auth.uid())
      )
    )
  )
  with check (
    (
      private.has_tenant_role(tenant_id, array['doctor'])
      and private.has_care_access(tenant_id, patient_id)
    )
    or (
      private.has_tenant_role(tenant_id, array['patient'])
      and exists (
        select 1 from public.patient_accounts account
        where account.tenant_id = patient_intake_contexts.tenant_id
          and account.patient_id = patient_intake_contexts.patient_id
          and account.user_id = (select auth.uid())
      )
    )
  );
