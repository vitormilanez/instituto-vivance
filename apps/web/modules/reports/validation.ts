import { InputError, tenantId } from "../../lib/validation.ts";

export type ReportSourceType = "check_in" | "document_review";
export type ReportSourceRef = { type: ReportSourceType; id: string };

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Dados do relatório inválidos.");
  return value as Record<string, unknown>;
}

function date(value: unknown, label: string) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  )
    throw new InputError(`Informe ${label} válida.`);
  return value;
}

function period(start: unknown, end: unknown) {
  const periodStart = date(start, "uma data inicial");
  const periodEnd = date(end, "uma data final");
  const days = (Date.parse(periodEnd) - Date.parse(periodStart)) / 86_400_000;
  if (days < 0 || days > 366)
    throw new InputError("Escolha um período de até 366 dias.");
  return { periodStart, periodEnd };
}

export function reportCreateInput(value: unknown) {
  const body = object(value);
  if (
    Object.keys(body).some(
      (key) => !["patient_id", "period_start", "period_end"].includes(key),
    ) ||
    typeof body.patient_id !== "string"
  )
    throw new InputError("Escolha o paciente e o período do relatório.");
  return {
    patientId: tenantId(body.patient_id),
    ...period(body.period_start, body.period_end),
  };
}

function text(value: unknown, label: string, max: number) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(value)
  )
    throw new InputError(`${label}: use até ${max.toLocaleString("pt-BR")} caracteres.`);
  return value.trim();
}

function sources(value: unknown): ReportSourceRef[] {
  if (!Array.isArray(value) || value.length > 20)
    throw new InputError("Escolha até 20 fontes do período.");
  const result = value.map((source) => {
    const item = object(source);
    if (
      Object.keys(item).some((key) => !["type", "id"].includes(key)) ||
      !["check_in", "document_review"].includes(String(item.type)) ||
      typeof item.id !== "string"
    )
      throw new InputError("Fonte do relatório inválida.");
    return {
      type: item.type as ReportSourceType,
      id: tenantId(item.id),
    };
  });
  if (new Set(result.map((source) => `${source.type}:${source.id}`)).size !== result.length)
    throw new InputError("Uma fonte não pode ser selecionada duas vezes.");
  return result;
}

export function reportPatchInput(value: unknown) {
  const body = object(value);
  if (
    Object.keys(body).some(
      (key) =>
        ![
          "version",
          "status",
          "title",
          "summary",
          "consultation_points",
          "sources",
        ].includes(key),
    ) ||
    !Number.isSafeInteger(body.version) ||
    Number(body.version) < 1 ||
    !["draft", "in_review"].includes(String(body.status))
  )
    throw new InputError("Confira a versão e o estado do relatório.");
  const result = {
    version: body.version as number,
    status: body.status as "draft" | "in_review",
    title: text(body.title, "Título", 160),
    summary: text(body.summary, "Síntese", 12000),
    consultationPoints: text(
      body.consultation_points,
      "Pontos para a consulta",
      6000,
    ),
    sources: sources(body.sources),
  };
  if (
    result.status === "in_review" &&
    (!result.title ||
      !result.summary ||
      !result.consultationPoints ||
      !result.sources.length)
  )
    throw new InputError(
      "Preencha o relatório e escolha ao menos uma fonte antes da revisão.",
    );
  return result;
}

export function reportApprovalInput(value: unknown) {
  const body = object(value);
  if (
    Object.keys(body).some((key) => !["version", "confirmed"].includes(key)) ||
    !Number.isSafeInteger(body.version) ||
    Number(body.version) < 1 ||
    body.confirmed !== true
  )
    throw new InputError("Confira a versão e confirme a aprovação médica.");
  return { version: body.version as number };
}
