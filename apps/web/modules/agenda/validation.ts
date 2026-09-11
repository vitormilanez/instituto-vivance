import { InputError, tenantId } from "../../lib/validation.ts";

export const agendaTimeZone = "America/Sao_Paulo";
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: agendaTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function clinicDate(value = new Date()) {
  return dateFormatter.format(value);
}
export function agendaDate(value: string) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value ||
    value < "2020-01-01" ||
    value > "2101-01-01"
  )
    throw new InputError("Informe uma data válida.");
  return value;
}
// Scheduling UI explicitly uses Brasilia UTC-3; never the device's timezone.
export function localToInstant(date: string, time: string) {
  agendaDate(date);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new InputError("Informe um horário válido.");
  return new Date(`${date}T${time}:00-03:00`).toISOString();
}
export function appointmentInput(value: unknown, now = Date.now()) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Agendamento inválido.");
  const body = value as Record<string, unknown>;
  if (
    Object.keys(body).some(
      (k) =>
        !["patient_id", "doctor_id", "starts_at", "ends_at", "kind"].includes(
          k,
        ),
    )
  )
    throw new InputError("Campos não permitidos no agendamento.");
  for (const key of ["patient_id", "doctor_id"] as const) {
    if (typeof body[key] !== "string")
      throw new InputError("Selecione paciente e médico.");
    tenantId(body[key]);
  }
  for (const key of ["starts_at", "ends_at"] as const) {
    const v = body[key];
    if (
      typeof v !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) ||
      !Number.isFinite(Date.parse(v)) ||
      new Date(v).toISOString() !== v
    )
      throw new InputError("Data ou horário inválido.");
  }
  const start = Date.parse(body.starts_at as string),
    end = Date.parse(body.ends_at as string);
  if (start <= now) throw new InputError("Escolha um horário futuro.");
  if (end - start < 300_000 || end - start > 28_800_000)
    throw new InputError("A duração deve ser de 5 minutos a 8 horas.");
  if (body.kind !== "consultation" && body.kind !== "return")
    throw new InputError("Selecione consulta ou retorno.");
  return {
    patient_id: body.patient_id as string,
    doctor_id: body.doctor_id as string,
    starts_at: body.starts_at as string,
    ends_at: body.ends_at as string,
    kind: body.kind,
  };
}
export function appointmentPatch(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Alteração inválida.");
  const { version, ...body } = value as Record<string, unknown>;
  if (!Number.isSafeInteger(version) || (version as number) < 1)
    throw new InputError("Recarregue o agendamento antes de alterar.");
  if (
    (body.status === "cancelled" || body.status === "no_show") &&
    Object.keys(body).length === 1
  )
    return {
      version: version as number,
      transition: body.status,
    };
  return { version: version as number, values: appointmentInput(body) };
}
