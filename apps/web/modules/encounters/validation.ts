import { InputError, tenantId } from "../../lib/validation.ts";
import { Buffer } from "node:buffer";

export const encounterPageSize = 20;
export const encounterDetailPageSize = 20;

function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Dados inválidos.");
  return value as Record<string, unknown>;
}

function cursorError(): never {
  throw new InputError("A página solicitada não é válida. Refaça a busca.");
}

function validTimestamp(value: string) {
  return (
    value.length <= 40 &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) &&
    Number.isFinite(Date.parse(value))
  );
}

function normalizedQuery(value: unknown) {
  if (
    value !== undefined &&
    (typeof value !== "string" ||
      value.length > 80 ||
      /[\x00-\x1f\x7f]/u.test(value))
  )
    throw new InputError("Revise a busca: limite de 80 caracteres.");
  return typeof value === "string" ? value.trim() : "";
}

export function encounterCursor(
  expectedTenant: string,
  createdAt: string,
  id: string,
  query = "",
) {
  const tenant = tenantId(expectedTenant);
  const recordId = tenantId(id);
  const search = normalizedQuery(query);
  if (!validTimestamp(createdAt)) cursorError();
  return Buffer.from(
    JSON.stringify([tenant, search, createdAt, recordId]),
  ).toString("base64url");
}

export function encounterSearch(value: unknown, expectedTenant: string) {
  const tenant = tenantId(expectedTenant);
  const body = object(value);
  if (Object.keys(body).some((key) => !["query", "cursor"].includes(key)))
    throw new InputError("Campos não permitidos na busca.");
  const query = normalizedQuery(body.query);
  if (body.cursor === undefined || body.cursor === null)
    return { query, beforeCreatedAt: null, beforeId: null };
  if (
    typeof body.cursor !== "string" ||
    body.cursor.length > 384 ||
    !/^[A-Za-z0-9_-]+$/.test(body.cursor)
  )
    cursorError();
  try {
    const decoded = JSON.parse(
      Buffer.from(body.cursor, "base64url").toString("utf8"),
    ) as unknown;
    if (!Array.isArray(decoded) || decoded.length !== 4)
      return cursorError();
    const [cursorTenant, cursorQuery, createdAt, id] = decoded;
    if (
      typeof cursorTenant !== "string" ||
      typeof cursorQuery !== "string" ||
      typeof createdAt !== "string" ||
      typeof id !== "string" ||
      tenantId(cursorTenant) !== tenant ||
      cursorQuery !== query ||
      tenantId(id) !== id ||
      !validTimestamp(createdAt) ||
      encounterCursor(cursorTenant, createdAt, id, cursorQuery) !== body.cursor
    )
      return cursorError();
    return { query, beforeCreatedAt: createdAt, beforeId: id };
  } catch (error) {
    if (error instanceof InputError) throw error;
    return cursorError();
  }
}

export function encounterDetailCursor(value: unknown) {
  if (value === undefined) return undefined;
  if (
    typeof value !== "string" ||
    !/^[1-9]\d{0,8}$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  )
    throw new InputError("A página do histórico não é válida.");
  return Number(value);
}
export function encounterStart(value: unknown) {
  const body = object(value);
  if (
    Object.keys(body).some(
      (k) =>
        !["appointment_id", "appointment_version", "accept_care"].includes(k),
    ) ||
    body.accept_care !== true ||
    typeof body.appointment_id !== "string" ||
    !Number.isSafeInteger(body.appointment_version) ||
    Number(body.appointment_version) < 1
  )
    throw new InputError("Confirme sua responsabilidade pelo atendimento.");
  return {
    appointment_id: tenantId(body.appointment_id),
    appointment_version: body.appointment_version as number,
    accept_care: true,
  };
}
export function encounterPatch(value: unknown) {
  const b = object(value);
  if (
    Object.keys(b).some(
      (k) => !["reason", "evolution", "status", "version"].includes(k),
    ) ||
    !Number.isSafeInteger(b.version) ||
    Number(b.version) < 1 ||
    !["draft", "finalized"].includes(String(b.status))
  )
    throw new InputError("Registro inválido. Atualize o atendimento.");
  for (const [key, max] of [
    ["reason", 2000],
    ["evolution", 10000],
  ] as const) {
    if (
      typeof b[key] !== "string" ||
      (b[key] as string).length > max ||
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(b[key] as string)
    )
      throw new InputError(`Revise o texto: limite de ${max} caracteres.`);
  }
  const reason = (b.reason as string).trim(),
    evolution = (b.evolution as string).trim();
  if (b.status === "finalized" && (!reason || !evolution))
    throw new InputError("Preencha o motivo e a evolução antes de finalizar.");
  return {
    version: b.version as number,
    values: { reason, evolution, status: b.status as "draft" | "finalized" },
  };
}

export function encounterAddendum(value: unknown) {
  const body = object(value);
  if (
    Object.keys(body).some(
      (key) => !["reason", "content", "encounter_version"].includes(key),
    ) ||
    !Number.isSafeInteger(body.encounter_version) ||
    Number(body.encounter_version) < 1
  )
    throw new InputError("Adendo inválido. Atualize o atendimento.");
  for (const [key, max] of [
    ["reason", 1000],
    ["content", 10000],
  ] as const) {
    if (
      typeof body[key] !== "string" ||
      (body[key] as string).length > max ||
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(body[key] as string)
    )
      throw new InputError(`Revise o texto: limite de ${max} caracteres.`);
  }
  const reason = (body.reason as string).trim();
  const content = (body.content as string).trim();
  if (!reason || !content)
    throw new InputError("Informe o motivo e a correção do adendo.");
  return {
    encounter_version: body.encounter_version as number,
    reason,
    content,
  };
}
