import { InputError, tenantId } from "../../lib/validation.ts";

export const planFields = [
  ["title", "Título do plano", 160],
  ["goals", "Objetivos", 4000],
  ["actions", "Ações e orientações", 8000],
  ["frequency", "Frequência", 2000],
  ["period", "Período", 2000],
] as const;
export type PlanContent = Record<(typeof planFields)[number][0], string> & {
  review_on: string | null;
};
function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Dados inválidos.");
  return value as Record<string, unknown>;
}
export function planCreate(value: unknown) {
  const b = object(value);
  if (
    Object.keys(b).some((k) => !["patient_id", "encounter_id"].includes(k)) ||
    typeof b.patient_id !== "string" ||
    (b.encounter_id != null && typeof b.encounter_id !== "string")
  )
    throw new InputError("Escolha o paciente e o atendimento de origem.");
  return {
    patient_id: tenantId(b.patient_id),
    encounter_id: b.encounter_id ? tenantId(b.encounter_id as string) : null,
  };
}
export function planPatch(value: unknown) {
  const b = object(value);
  if (
    Object.keys(b).some(
      (k) =>
        ![
          "title",
          "goals",
          "actions",
          "frequency",
          "period",
          "review_on",
          "status",
          "version",
        ].includes(k),
    ) ||
    !Number.isSafeInteger(b.version) ||
    Number(b.version) < 1 ||
    !["draft", "in_review", "approved"].includes(String(b.status))
  )
    throw new InputError("Plano inválido. Confira a versão atual.");
  const content = {} as PlanContent;
  for (const [key, label, max] of planFields) {
    const text = b[key];
    if (
      typeof text !== "string" ||
      text.length > max ||
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(text)
    )
      throw new InputError(`${label}: use até ${max} caracteres.`);
    content[key] = text.trim();
  }
  if (
    b.review_on !== null &&
    (typeof b.review_on !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(b.review_on) ||
      !Number.isFinite(Date.parse(b.review_on)) ||
      new Date(b.review_on).toISOString().slice(0, 10) !== b.review_on)
  )
    throw new InputError("Informe uma data de revisão válida.");
  content.review_on = b.review_on as string | null;
  if (
    b.status !== "draft" &&
    (planFields.some(([key]) => !content[key]) || !content.review_on)
  )
    throw new InputError(
      "Preencha todos os campos antes de enviar para revisão médica.",
    );
  return {
    version: b.version as number,
    values: {
      ...content,
      status: b.status as "draft" | "in_review" | "approved",
    },
  };
}
export function planPage(value?: string) {
  if (value === undefined) return 1;
  if (!/^[1-9]\d{0,4}$/.test(value)) throw new InputError("Página inválida.");
  return Number(value);
}
