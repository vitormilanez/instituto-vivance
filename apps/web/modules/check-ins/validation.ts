import { InputError, tenantId } from "../../lib/validation.ts";

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Dados inválidos.");
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number, min = 1) {
  if (typeof value !== "string")
    throw new InputError(`${label}: informe um texto válido.`);
  const result = value.trim();
  if (
    result.length < min ||
    result.length > max ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(result)
  )
    throw new InputError(`${label}: use entre ${min} e ${max} caracteres.`);
  return result;
}
function date(value: unknown, optional = false) {
  if (optional && (value === null || value === "")) return null;
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value
  )
    throw new InputError("Informe uma data válida.");
  return value;
}
export function requestInput(value: unknown) {
  const b = record(value);
  if (
    Object.keys(b).some((k) => !["patient_id", "prompt", "due_on"].includes(k))
  )
    throw new InputError("Solicitação inválida.");
  return {
    patientId: tenantId(String(b.patient_id)),
    prompt: text(b.prompt, "Pergunta", 1000, 2),
    dueOn: date(b.due_on, true),
  };
}
export function submissionInput(value: unknown) {
  const b = record(value),
    allowed = [
      "report",
      "measure_label",
      "measure_value",
      "measure_unit",
      "reported_on",
      "confirmed",
    ];
  if (Object.keys(b).some((k) => !allowed.includes(k)) || b.confirmed !== true)
    throw new InputError("Confirme o envio do relato.");
  const present = [b.measure_label, b.measure_value, b.measure_unit].map(
    (v) => v !== null && v !== "" && v !== undefined,
  );
  if (present.some(Boolean) && !present.every(Boolean))
    throw new InputError("Preencha nome, valor e unidade da medida.");
  const numeric = present[1] ? Number(b.measure_value) : null;
  if (
    numeric !== null &&
    (!Number.isFinite(numeric) || Math.abs(numeric) > 1_000_000_000)
  )
    throw new InputError("Informe um valor de medida válido.");
  return {
    report: text(b.report, "Relato", 4000),
    measureLabel: present[0]
      ? text(b.measure_label, "Nome da medida", 80)
      : null,
    measureValue: numeric,
    measureUnit: present[2] ? text(b.measure_unit, "Unidade", 30) : null,
    reportedOn: date(b.reported_on)!,
  };
}
export function reviewInput(value: unknown) {
  const b = record(value);
  if (
    Object.keys(b).some((k) => !["note", "confirmed"].includes(k)) ||
    b.confirmed !== true
  )
    throw new InputError("Confirme a revisão do relato.");
  return { note: text(b.note, "Registro da revisão", 2000) };
}
