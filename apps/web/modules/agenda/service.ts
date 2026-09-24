import { DomainError } from "@/lib/errors";
import "server-only";
import { listAppointmentTeleconsultations, type AppointmentTeleconsultation } from "@/modules/teleconsultations/service";
import { requireClinic } from "@/modules/identity/service";
import { InputError, tenantId } from "@/lib/validation";
import {
  agendaDate,
  appointmentInput,
  appointmentPatch,
  localToInstant,
} from "./validation";

export class AgendaError extends DomainError {}
const fields =
  "id, patient_id, doctor_id, doctor_display_name, starts_at, ends_at, kind, status, version, started_at, completed_at, cancelled_at, no_show_at, patients!appointments_tenant_id_patient_id_fkey(display_name)" as const;
export async function agendaContext(id: string) {
  return requireClinic(tenantId(id), ["admin", "doctor", "nurse", "patient"]);
}
export async function listAppointments(
  id: string,
  from: string,
  until: string,
) {
  const { client, clinic } = await agendaContext(id);
  const start = localToInstant(agendaDate(from), "00:00"),
    end = localToInstant(agendaDate(until), "00:00");
  if (end <= start || Date.parse(end) - Date.parse(start) > 93 * 86_400_000)
    throw new InputError("Selecione um período de até 93 dias.");
  const { data, error } = await client
    .from("appointments")
    .select(fields)
    .eq("tenant_id", id)
    .gte("starts_at", start)
    .lt("starts_at", end)
    .order("starts_at")
    .order("id")
    .limit(501);
  if (error) throw new Error("Unable to load appointments");
  const appointments = (data ?? []).slice(0, 500);
  const calls = await listAppointmentTeleconsultations(id, appointments.map(a => a.id));
  return {
    clinic,
    appointments: appointments.map(a => ({ ...a, ...(calls[a.id] ? { teleconsultation: calls[a.id] as AppointmentTeleconsultation } : {}) })),
    truncated: (data?.length ?? 0) > 500,
  };
}
export async function agendaOptions(id: string) {
  const { client, clinic, user } = await requireClinic(tenantId(id));
  const [patients, doctors] = await Promise.all([
    client
      .from("patients")
      .select("id, display_name")
      .eq("tenant_id", id)
      .order("display_name")
      .order("id")
      .limit(1000),
    client
      .from("memberships")
      .select("user_id, display_name")
      .eq("tenant_id", id)
      .eq("role", "doctor")
      .eq("status", "active")
      .order("display_name")
      .order("user_id"),
  ]);
  if (patients.error || doctors.error)
    throw new Error("Unable to load scheduling options");
  return {
    patients: patients.data ?? [],
    doctors: (doctors.data ?? [])
      .filter(
        (d) =>
          Boolean(d.display_name?.trim()) &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(d.display_name!.trim()) &&
          (clinic.role !== "doctor" || d.user_id === user.id),
      )
      .map((doctor) => ({
        user_id: doctor.user_id,
        display_name: doctor.display_name!.trim(),
      })),
  };
}
function databaseError(error: { code?: string }) {
  if (error.code === "23P01")
    throw new AgendaError(
      "O médico ou o paciente já tem um agendamento nesse horário. Escolha outro horário.",
      409,
    );
  if (error.code === "40001")
    throw new AgendaError(
      "O agendamento foi alterado por outra ação. Atualize a agenda antes de tentar novamente.",
      409,
    );
  if (["23503", "23514", "42501"].includes(error.code ?? ""))
    throw new AgendaError(
      "Não foi possível salvar. Verifique o horário, o paciente e o médico. Agendamentos com atendimento iniciado não podem ser alterados.",
      400,
    );
  throw new Error("Unable to save appointment");
}
export async function createAppointment(id: string, input: unknown) {
  const { client } = await requireClinic(tenantId(id), [
    "admin",
    "doctor",
    "nurse",
  ]);
  const values = appointmentInput(input);
  const { data, error } = await client
    .from("appointments")
    .insert({ tenant_id: id, ...values })
    .select(fields)
    .single();
  if (error) databaseError(error);
  return data;
}
export async function updateAppointment(
  id: string,
  appointmentId: string,
  input: unknown,
) {
  const { client } = await requireClinic(tenantId(id), [
    "admin",
    "doctor",
    "nurse",
  ]);
  tenantId(appointmentId);
  const change = appointmentPatch(input);
  if ("transition" in change && change.transition) {
    const transition = await client.rpc("transition_appointment", {
      target_tenant: id,
      target_appointment: appointmentId,
      read_version: change.version,
      target_status: change.transition,
    });
    if (transition.error) databaseError(transition.error);
    const current = await client
      .from("appointments")
      .select(fields)
      .eq("tenant_id", id)
      .eq("id", appointmentId)
      .maybeSingle();
    if (current.error) databaseError(current.error);
    if (!current.data)
      throw new AgendaError(
        "O agendamento não está disponível para sua conta.",
        404,
      );
    return current.data;
  }
  const { version, values } = change;
  const { data, error } = await client
    .from("appointments")
    .update({ ...values, expected_version: version })
    .eq("tenant_id", id)
    .eq("id", appointmentId)
    .eq("version", version)
    .eq("status", "scheduled")
    .select(fields)
    .maybeSingle();
  if (error) databaseError(error);
  if (!data)
    throw new AgendaError(
      "O agendamento foi alterado, cancelado ou não está disponível para sua conta. Atualize a agenda.",
      409,
    );
  return data;
}
export type Appointment = Awaited<
  ReturnType<typeof listAppointments>
>["appointments"][number];
export type AgendaOptions = Awaited<ReturnType<typeof agendaOptions>>;
