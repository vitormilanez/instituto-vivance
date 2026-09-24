import "server-only";
import { DomainError, databaseFailure } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import { teleconsultationInput } from "./validation";

export class TeleconsultationError extends DomainError {}

const failed: (code?: string) => never = databaseFailure({
  error: TeleconsultationError,
  denied:
    "Seu acesso mudou ou este agendamento não está disponível. Atualize a página.",
  conflict:
    "A configuração do atendimento mudou ou o agendamento já foi encerrado. Atualize a página.",
  conflictCodes: ["23503", "23505", "23514", "40001"],
  log: "Teleconsultation operation failed",
});

const fields =
  "id,tenant_id,appointment_id,delivery_mode,provider,join_url,version,created_by,updated_by,created_at,updated_at" as const;

export type AppointmentTeleconsultation = {
  id: string;
  tenant_id: string;
  appointment_id: string;
  delivery_mode: "in_person" | "video";
  provider: "google_meet" | null;
  join_url: string | null;
  version: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  // Resolved only when fetching one configuration. The audit identity remains
  // the immutable membership ID even when its display name is unavailable.
  updated_by_name?: string | null;
};

export async function getAppointmentTeleconsultation(
  tenantInput: string,
  appointmentInput: string,
): Promise<AppointmentTeleconsultation | null> {
  const tenant = tenantId(tenantInput);
  const appointmentId = tenantId(appointmentInput);
  const { client } = await requireClinic(tenant, [
    "admin",
    "doctor",
    "nurse",
    "patient",
  ]);
  const appointment = await client
    .from("appointments")
    .select("id")
    .eq("tenant_id", tenant)
    .eq("id", appointmentId)
    .maybeSingle();
  if (appointment.error) failed(appointment.error.code);
  if (!appointment.data)
    throw new TeleconsultationError("Agendamento não disponível.", 404);
  const result = await client
    .from("appointment_teleconsultations")
    .select(fields)
    .eq("tenant_id", tenant)
    .eq("appointment_id", appointmentId)
    .maybeSingle();
  if (result.error) failed(result.error.code);
  if (!result.data) return null;
  const editor = await client
    .from("memberships")
    .select("display_name")
    .eq("tenant_id", tenant)
    .eq("user_id", result.data.updated_by)
    .maybeSingle();
  return {
    ...result.data,
    updated_by_name: editor.error ? null : editor.data?.display_name ?? null,
  } as AppointmentTeleconsultation;
}

export async function listAppointmentTeleconsultations(
  tenantInput: string,
  appointmentInputs: string[],
): Promise<Record<string, AppointmentTeleconsultation>> {
  const tenant = tenantId(tenantInput);
  if (!Array.isArray(appointmentInputs) || appointmentInputs.length > 500)
    throw new TeleconsultationError("Há agendamentos demais para carregar.", 400);
  const appointmentIds = [...new Set(appointmentInputs.map(tenantId))];
  if (!appointmentIds.length) return {};
  const { client } = await requireClinic(tenant, [
    "admin",
    "doctor",
    "nurse",
    "patient",
  ]);
  const result = await client
    .from("appointment_teleconsultations")
    .select(fields)
    .eq("tenant_id", tenant)
    .in("appointment_id", appointmentIds);
  if (result.error) failed(result.error.code);
  return Object.fromEntries(
    ((result.data ?? []) as AppointmentTeleconsultation[]).map((row) => [
      row.appointment_id,
      row,
    ]),
  );
}

export async function saveAppointmentTeleconsultation(
  tenantInput: string,
  appointmentInput: string,
  body: unknown,
): Promise<AppointmentTeleconsultation> {
  const tenant = tenantId(tenantInput);
  const appointmentId = tenantId(appointmentInput);
  const input = teleconsultationInput(body);
  const { client, clinic } = await requireClinic(tenant, ["admin", "doctor", "nurse"]);
  const values = {
    delivery_mode: input.deliveryMode,
    provider: input.deliveryMode === "video" ? ("google_meet" as const) : null,
    join_url: input.joinUrl,
  };
  const result =
    input.version === 0
      ? await client
          .from("appointment_teleconsultations")
          .insert({ tenant_id: tenant, appointment_id: appointmentId, ...values })
          .select(fields)
          .single()
      : await client
          .from("appointment_teleconsultations")
          .update({ ...values, expected_version: input.version })
          .eq("tenant_id", tenant)
          .eq("appointment_id", appointmentId)
          .eq("version", input.version)
          .select(fields)
          .maybeSingle();
  if (result.error) failed(result.error.code);
  if (!result.data)
    throw new TeleconsultationError(
      "A configuração do atendimento mudou ou o agendamento não está disponível. Atualize a página.",
      409,
    );
  return {
    ...result.data,
    updated_by_name: clinic.displayName,
  } as AppointmentTeleconsultation;
}
