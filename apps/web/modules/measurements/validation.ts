import { InputError, tenantId } from "../../lib/validation.ts";

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Dados de medidas inválidos.");
  return value as Record<string, unknown>;
}

function optionalMeasure(value: unknown, label: string, limit: number) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > limit)
    throw new InputError(`${label}: informe um valor entre 0 e ${limit}.`);
  return numeric;
}

function reportedOn(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value ||
    value > new Date().toISOString().slice(0, 10)
  )
    throw new InputError("Informe uma data atual ou anterior.");
  return value;
}

export function patientMeasurementInput(value: unknown) {
  const body = record(value);
  const allowed = [
    "weight_kg",
    "height_cm",
    "waist_cm",
    "measured_on",
    "client_request_id",
    "confirmed",
  ];
  // A autoria vem da sessão da própria pessoa; "confirmed" ainda é aceito para
  // não quebrar uma aba aberta com o formulário antigo, mas não é exigido.
  if (Object.keys(body).some((key) => !allowed.includes(key)))
    throw new InputError("Dados de medidas inválidos.");
  const result = {
    weightKg: optionalMeasure(body.weight_kg, "Peso", 500),
    heightCm: optionalMeasure(body.height_cm, "Altura", 300),
    waistCm: optionalMeasure(body.waist_cm, "Circunferência abdominal", 400),
    measuredOn: reportedOn(body.measured_on),
    requestId: tenantId(String(body.client_request_id ?? "")),
  };
  if (result.weightKg === null && result.heightCm === null && result.waistCm === null)
    throw new InputError("Informe pelo menos uma medida.");
  return result;
}
