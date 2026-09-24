import "server-only";
import { createAppointment, AgendaError } from "@/modules/agenda/service";
import { startEncounter } from "@/modules/encounters/service";
import { requireClinic } from "@/modules/identity/service";
import { createPatient } from "@/modules/patients/service";
import { tenantId } from "@/lib/validation";
import { DomainError } from "@/lib/errors";
import {
  saveAppointmentTeleconsultation,
  TeleconsultationError,
} from "./service";
import { instantStart, teleconsultationBookingInput } from "./validation";

export type TeleconsultationBookingResult = {
  appointmentId: string;
  patientId: string;
  encounterId: string | null;
};

/**
 * Cria a teleconsulta em passos que já existem e já têm RLS e auditoria:
 * paciente (se novo) → agendamento → link do Meet → atendimento (se "agora").
 * Sem service role. Se um passo depois do agendamento falhar, o que já foi
 * salvo continua visível na Agenda e a mensagem diz isso.
 */
export async function bookTeleconsultation(
  tenantInput: string,
  body: unknown,
): Promise<TeleconsultationBookingResult> {
  const tenant = tenantId(tenantInput);
  const input = teleconsultationBookingInput(body);
  const { clinic, user } = await requireClinic(tenant, [
    "admin",
    "doctor",
    "nurse",
  ]);
  if (input.when === "now" && (clinic.role !== "doctor" || input.doctorId !== user.id))
    throw new TeleconsultationError(
      "Só o médico responsável pode iniciar uma teleconsulta agora. Use Agendar para outra pessoa.",
      403,
    );

  const patientId =
    "id" in input.patient
      ? input.patient.id
      : (await createPatient(tenant, input.patient.new)).id;

  const startsAt = input.startsAt ?? instantStart();
  const appointment = await createAppointment(tenant, {
    patient_id: patientId,
    doctor_id: input.doctorId,
    kind: input.kind,
    starts_at: startsAt,
    ends_at: new Date(
      Date.parse(startsAt) + input.durationMinutes * 60_000,
    ).toISOString(),
  });
  if (!appointment)
    throw new AgendaError("Não foi possível criar o agendamento.", 409);

  try {
    await saveAppointmentTeleconsultation(tenant, appointment.id, {
      delivery_mode: "video",
      join_url: input.joinUrl,
      version: 0,
    });
  } catch (error) {
    throw partial(
      error,
      "O horário foi criado na Agenda, mas o link do Meet não foi salvo. Abra o agendamento na Agenda e salve o link em Modalidade / teleconsulta.",
    );
  }

  if (input.when === "scheduled")
    return { appointmentId: appointment.id, patientId, encounterId: null };

  try {
    const encounterId = await startEncounter(tenant, {
      appointment_id: appointment.id,
      appointment_version: appointment.version,
      accept_care: true,
    });
    return { appointmentId: appointment.id, patientId, encounterId };
  } catch (error) {
    throw partial(
      error,
      "A teleconsulta foi criada com o link, mas o atendimento não abriu. Use Abrir atendimento na lista abaixo.",
    );
  }
}

function partial(error: unknown, message: string) {
  const status = error instanceof DomainError ? error.status : 409;
  return new TeleconsultationError(message, status >= 500 ? 409 : status);
}
