-- Keep one permissive SELECT policy per role/action while preserving the same
-- staff and patient predicates from the applied teleconsultation migration.
drop policy if exists appointment_teleconsultations_read_staff
  on public.appointment_teleconsultations;
drop policy if exists appointment_teleconsultations_read_patient
  on public.appointment_teleconsultations;

create policy appointment_teleconsultations_read_authorized
  on public.appointment_teleconsultations for select to authenticated
  using (
    exists (
      select 1
      from public.appointments appointment
      where appointment.tenant_id = appointment_teleconsultations.tenant_id
        and appointment.id = appointment_teleconsultations.appointment_id
        and (
          private.has_tenant_role(
            appointment.tenant_id,
            array['admin', 'nurse']
          )
          or (
            appointment.doctor_id = (select auth.uid())
            and private.has_tenant_role(appointment.tenant_id, array['doctor'])
          )
        )
    )
    or exists (
      select 1
      from public.appointments appointment
      join public.patient_accounts account
        on account.tenant_id = appointment.tenant_id
       and account.patient_id = appointment.patient_id
      where appointment.tenant_id = appointment_teleconsultations.tenant_id
        and appointment.id = appointment_teleconsultations.appointment_id
        and appointment.status in ('scheduled', 'in_progress')
        and account.user_id = (select auth.uid())
        and private.has_tenant_role(appointment.tenant_id, array['patient'])
    )
  );
