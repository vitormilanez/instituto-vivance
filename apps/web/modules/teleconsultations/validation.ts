import { InputError } from "../../lib/validation.ts";

export type TeleconsultationDeliveryMode = "in_person" | "video";

export type TeleconsultationInput = {
  deliveryMode: TeleconsultationDeliveryMode;
  joinUrl: string | null;
  version: number;
};

const googleMeetPattern =
  /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

export function teleconsultationInput(value: unknown): TeleconsultationInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Configuração do atendimento inválida.");
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some(
      (key) => !["delivery_mode", "join_url", "version"].includes(key),
    )
  )
    throw new InputError("A configuração contém campos não permitidos.");
  if (input.delivery_mode !== "in_person" && input.delivery_mode !== "video")
    throw new InputError("Escolha atendimento presencial ou por vídeo.");
  if (
    !Number.isInteger(input.version) ||
    (input.version as number) < 0 ||
    (input.version as number) > 2_147_483_647
  )
    throw new InputError("Atualize o agendamento antes de salvar.");
  if (input.delivery_mode === "in_person") {
    if (input.join_url !== null)
      throw new InputError("Atendimento presencial não usa link de acesso.");
  } else if (
    typeof input.join_url !== "string" ||
    !googleMeetPattern.test(input.join_url)
  ) {
    throw new InputError(
      "Informe um link Google Meet no formato https://meet.google.com/xxx-xxxx-xxx.",
    );
  }
  return {
    deliveryMode: input.delivery_mode,
    joinUrl: input.join_url as string | null,
    version: input.version as number,
  };
}

/* Teleconsulta pelo menu próprio ------------------------------------------
   Um pedido cria (ou reaproveita) o paciente, um agendamento por vídeo e a
   configuração do Meet. Em "agora" o médico também abre o atendimento.
   Nada aqui cria a reunião: o link vem de uma sala já aberta no Google Meet. */

export type TeleconsultationBooking = {
  when: "now" | "scheduled";
  patient:
    | { id: string }
    | { new: { display_name: string; birth_date: string | null } };
  doctorId: string;
  kind: "consultation" | "return";
  joinUrl: string;
  durationMinutes: number;
  startsAt: string | null;
  acceptCare: boolean;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const instantPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function teleconsultationBookingInput(
  value: unknown,
): TeleconsultationBooking {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Teleconsulta inválida.");
  const body = value as Record<string, unknown>;
  const allowed = [
    "when",
    "patient_id",
    "new_patient",
    "doctor_id",
    "kind",
    "join_url",
    "duration_minutes",
    "starts_at",
    "accept_care",
  ];
  if (Object.keys(body).some((key) => !allowed.includes(key)))
    throw new InputError("A teleconsulta contém campos não permitidos.");
  if (body.when !== "now" && body.when !== "scheduled")
    throw new InputError("Escolha iniciar agora ou agendar.");
  const hasExisting = body.patient_id !== undefined && body.patient_id !== null;
  const hasNew = body.new_patient !== undefined && body.new_patient !== null;
  if (hasExisting === hasNew)
    throw new InputError("Escolha um paciente cadastrado ou cadastre um novo.");
  let patient: TeleconsultationBooking["patient"];
  if (hasExisting) {
    if (typeof body.patient_id !== "string" || !uuidPattern.test(body.patient_id))
      throw new InputError("Selecione o paciente.");
    patient = { id: body.patient_id };
  } else {
    const input = body.new_patient;
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new InputError("Informe o nome do novo paciente.");
    const record = input as Record<string, unknown>;
    // Os limites finos (tamanho, data) ficam com patientInput no servidor.
    patient = {
      new: {
        display_name:
          typeof record.display_name === "string" ? record.display_name : "",
        birth_date:
          typeof record.birth_date === "string" && record.birth_date !== ""
            ? record.birth_date
            : null,
      },
    };
    if (patient.new.display_name.trim().length < 2)
      throw new InputError("Informe o nome do novo paciente.");
  }
  if (typeof body.doctor_id !== "string" || !uuidPattern.test(body.doctor_id))
    throw new InputError("Selecione o médico.");
  const kind = body.kind ?? "consultation";
  if (kind !== "consultation" && kind !== "return")
    throw new InputError("Selecione consulta ou retorno.");
  if (
    !Number.isInteger(body.duration_minutes) ||
    (body.duration_minutes as number) < 5 ||
    (body.duration_minutes as number) > 480
  )
    throw new InputError("A duração deve ser de 5 minutos a 8 horas.");
  const joinUrl =
    typeof body.join_url === "string" ? normalizeMeetUrl(body.join_url) : "";
  // Mesma regra do link salvo pela Agenda.
  teleconsultationInput({ delivery_mode: "video", join_url: joinUrl, version: 0 });
  let startsAt: string | null = null;
  if (body.when === "scheduled") {
    if (
      typeof body.starts_at !== "string" ||
      !instantPattern.test(body.starts_at) ||
      new Date(body.starts_at).toISOString() !== body.starts_at
    )
      throw new InputError("Informe data e horário da teleconsulta.");
    startsAt = body.starts_at;
  } else if (body.accept_care !== true) {
    throw new InputError("Confirme que você é responsável por este atendimento.");
  }
  return {
    when: body.when,
    patient,
    doctorId: body.doctor_id,
    kind,
    joinUrl,
    durationMinutes: body.duration_minutes as number,
    startsAt,
    acceptCare: body.accept_care === true,
  };
}

/**
 * A agenda só aceita horários futuros (validação e trigger no banco). "Agora"
 * vira o próximo minuto cheio, com pelo menos 30 segundos de folga; o
 * atendimento é aberto em seguida, então o horário serve de registro.
 */
export function instantStart(now = Date.now()): string {
  const minute = 60_000;
  return new Date(Math.ceil((now + 30_000) / minute) * minute).toISOString();
}

/**
 * O Meet costuma copiar o link com "?authuser=0" ou "?pli=1". Guardamos só a
 * forma canônica (https://meet.google.com/xxx-xxxx-xxx); qualquer outro
 * endereço segue igual e é recusado pela validação.
 */
export function normalizeMeetUrl(value: string): string {
  const text = value.trim();
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    if (url.hostname.toLowerCase() !== "meet.google.com") return text;
    const code = url.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
    return `https://meet.google.com/${code}`;
  } catch {
    return text;
  }
}
