import { InputError } from "../../lib/validation.ts";
import type { ExamsStatus, Nutrition, ProfilePhotos, ProfileSection } from "./profile-types.ts";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("Dados do perfil inválidos.");
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new InputError("O perfil contém campos não permitidos.");
}
function text(value: unknown, max: number) {
  if (typeof value !== "string" || value.length > max || /\x00/u.test(value)) throw new InputError("Texto do perfil inválido.");
  return value;
}
function uuid(value: unknown) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value))
    throw new InputError("Documento inválido.");
  return value;
}
function version(value: unknown) {
  if (!Number.isInteger(value) || (value as number) < 1) throw new InputError("Versão do perfil inválida.");
  return value as number;
}
export function nutritionInput(value: unknown): Nutrition {
  const body = record(value);
  keys(body, ["pattern", "preferences", "avoidedFoods", "mealRoutine"]);
  if (Object.keys(body).length !== 4 || !["", "mixed", "vegetarian", "vegan", "other"].includes(body.pattern as string))
    throw new InputError("Alimentação inválida.");
  if (!Array.isArray(body.mealRoutine) || body.mealRoutine.length > 4) throw new InputError("Rotina alimentar inválida.");
  const seen = new Set<string>();
  const mealRoutine = body.mealRoutine.map((raw) => {
    const meal = record(raw); keys(meal, ["id", "time", "description"]);
    if (Object.keys(meal).length !== 3 || !["breakfast", "lunch", "dinner", "snack"].includes(meal.id as string) || seen.has(meal.id as string))
      throw new InputError("Rotina alimentar inválida.");
    seen.add(meal.id as string);
    return { id: meal.id as Nutrition["mealRoutine"][number]["id"], time: text(meal.time, 100), description: text(meal.description, 2000) };
  });
  return { pattern: body.pattern as Nutrition["pattern"], preferences: text(body.preferences, 4000), avoidedFoods: text(body.avoidedFoods, 4000), mealRoutine };
}
export function photosInput(value: unknown): ProfilePhotos {
  const body = record(value); keys(body, ["frontDocumentId", "sideDocumentId", "backDocumentId"]);
  if (Object.keys(body).length !== 3) throw new InputError("Fotos inválidas.");
  const document = (value: unknown) => value === null ? null : uuid(value);
  return { frontDocumentId: document(body.frontDocumentId), sideDocumentId: document(body.sideDocumentId), backDocumentId: document(body.backDocumentId) };
}
export function profilePatchInput(value: unknown) {
  const body = record(value); keys(body, ["version", "nutrition", "photos", "examsStatus", "examsDocumentIds"]);
  const readVersion = version(body.version);
  const patch: { nutrition?: Nutrition; photos?: ProfilePhotos; examsStatus?: ExamsStatus; examsDocumentIds?: string[] } = {};
  if (body.nutrition !== undefined) patch.nutrition = nutritionInput(body.nutrition);
  if (body.photos !== undefined) patch.photos = photosInput(body.photos);
  if (body.examsStatus !== undefined) {
    if (!["not_started", "shared", "none_now"].includes(body.examsStatus as string)) throw new InputError("Situação dos exames inválida.");
    patch.examsStatus = body.examsStatus as ExamsStatus;
  }
  if (body.examsDocumentIds !== undefined) {
    if (!Array.isArray(body.examsDocumentIds) || body.examsDocumentIds.length > 50) throw new InputError("Exames inválidos.");
    patch.examsDocumentIds = [...new Set(body.examsDocumentIds.map(uuid))];
  }
  if (!Object.keys(patch).length) throw new InputError("Informe ao menos uma alteração.");
  return { readVersion, patch };
}
export function profileSubmissionInput(value: unknown) {
  const body = record(value); keys(body, ["version", "section", "shareConsent"]);
  if (!["nutrition", "photos", "exams"].includes(body.section as string) || body.shareConsent !== true)
    throw new InputError("Confirme o compartilhamento da seção.");
  return { readVersion: version(body.version), section: body.section as ProfileSection };
}
