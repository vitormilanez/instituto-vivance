import { InputError, tenantId } from "../../lib/validation.ts";
import type { PrescriptionSource } from "./types.ts";

const allowedKeys = new Set([
  "patient_id",
  "request_key",
  "title",
  "prescribed_on",
  "source_type",
  "document_id",
  "memed_url",
  "visibility",
  "patient_consent",
]);

function memedUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2048)
    throw new InputError("Informe um link válido da Memed.");
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new InputError("Informe um link válido da Memed.");
  }
  const host = parsed.hostname.toLowerCase();
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    (host !== "memed.com.br" && !host.endsWith(".memed.com.br"))
  )
    throw new InputError("Use um link HTTPS oficial da Memed.");
  return parsed.toString();
}

export function prescriptionInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Confira os dados da receita anterior.");
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !allowedKeys.has(key)))
    throw new InputError("A receita contém campos não permitidos.");
  const metadata = prescriptionDraftInput(body);
  let source: PrescriptionSource;
  if (metadata.sourceType === "document") {
    if (typeof body.document_id !== "string" || body.memed_url != null)
      throw new InputError("Envie um PDF ou JPG da receita.");
    source = { type: "document", documentId: tenantId(body.document_id) };
  } else {
    if (body.document_id != null)
      throw new InputError("Escolha somente uma origem para a receita.");
    source = { type: "memed", url: metadata.memedUrl as string };
  }
  const visibility = body.visibility ?? "shared";
  if (visibility !== "shared" && visibility !== "internal")
    throw new InputError("Escolha quem pode ver esta receita.");
  if (body.patient_consent !== undefined && typeof body.patient_consent !== "boolean")
    throw new InputError("Confirme o compartilhamento do arquivo.");
  return {
    patientId: tenantId(String(body.patient_id)),
    requestKey: tenantId(String(body.request_key)),
    title: metadata.title,
    prescribedOn: metadata.prescribedOn,
    source,
    visibility,
    patientConsent: body.patient_consent === true,
  };
}

export function prescriptionDraftInput(value: Record<string, unknown>) {
  if (typeof value.title !== "string")
    throw new InputError("Informe um título para identificar a receita.");
  const title = value.title.trim().replace(/\s+/gu, " ");
  if (
    [...title].length < 1 ||
    [...title].length > 160 ||
    /[\x00-\x1f\x7f]/u.test(title)
  )
    throw new InputError("Use um título de até 160 caracteres.");
  if (
    typeof value.prescribed_on !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.prescribed_on) ||
    Number.isNaN(Date.parse(value.prescribed_on)) ||
    new Date(`${value.prescribed_on}T00:00:00.000Z`).toISOString().slice(0, 10) !==
      value.prescribed_on ||
    value.prescribed_on < "1900-01-01" ||
    value.prescribed_on > new Date().toISOString().slice(0, 10)
  )
    throw new InputError("Informe uma data válida da receita.");
  const sourceType = value.source_type;
  if (sourceType === "document") {
    return { title, prescribedOn: value.prescribed_on, sourceType, memedUrl: null };
  }
  if (sourceType !== "memed")
    throw new InputError("Escolha o arquivo ou o link da Memed.");
  return {
    title,
    prescribedOn: value.prescribed_on,
    sourceType,
    memedUrl: memedUrl(value.memed_url),
  };
}

export function prescriptionCursor(
  prescribedOn: string | null,
  createdAt: string | null,
  id: string | null,
) {
  if (prescribedOn === null && createdAt === null && id === null) return null;
  if (
    prescribedOn === null ||
    createdAt === null ||
    id === null ||
    !/^\d{4}-\d{2}-\d{2}$/.test(prescribedOn) ||
    prescribedOn < "1900-01-01" ||
    prescribedOn > new Date().toISOString().slice(0, 10) ||
    createdAt.length > 64 ||
    Number.isNaN(Date.parse(createdAt)) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    throw new InputError("Página do histórico inválida.");
  return { prescribedOn, createdAt, id };
}
