import { InputError, tenantId } from "../../lib/validation.ts";

export const documentBucket = "vivance-documents";
export const maxDocumentBytes = 5 * 1024 * 1024;

const supportedContentTypes = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
} as const;

export type DocumentCategory = "exam" | "clinical_document";
export type DocumentVisibility = "internal" | "shared";
export type DocumentContentType = keyof typeof supportedContentTypes;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Dados do documento inválidos.");
  return value as Record<string, unknown>;
}

export function documentId(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    throw new InputError("Documento inválido.");
  return value;
}

function filename(value: unknown, contentType: DocumentContentType): string {
  if (typeof value !== "string") throw new InputError("Informe o nome do arquivo.");
  const result = value.trim().replace(/\s+/g, " ");
  if (
    result.length < 1 ||
    result.length > 160 ||
    /[\x00-\x1f\x7f]/u.test(result) ||
    result.includes("/") ||
    result.includes("\\")
  )
    throw new InputError("Use um nome de arquivo válido de até 160 caracteres.");
  if (!supportedContentTypes[contentType].some((extension) => result.toLowerCase().endsWith(extension)))
    throw new InputError("O nome do arquivo não corresponde ao formato selecionado.");
  return result;
}

export function documentIntent(value: unknown) {
  const body = object(value);
  if (
    Object.keys(body).some(
      (key) =>
        ![
          "patient_id",
          "filename",
          "content_type",
          "byte_size",
          "category",
          "visibility",
        ].includes(key),
    ) ||
    typeof body.patient_id !== "string" ||
    typeof body.content_type !== "string" ||
    !Object.hasOwn(supportedContentTypes, body.content_type) ||
    !Number.isSafeInteger(body.byte_size) ||
    Number(body.byte_size) < 1 ||
    Number(body.byte_size) > maxDocumentBytes ||
    !["exam", "clinical_document"].includes(String(body.category)) ||
    !["internal", "shared"].includes(String(body.visibility))
  )
    throw new InputError("Confira o paciente, o formato e a visibilidade do documento.");
  const contentType = body.content_type as DocumentContentType;
  return {
    patientId: tenantId(body.patient_id),
    filename: filename(body.filename, contentType),
    contentType,
    byteSize: body.byte_size as number,
    category: body.category as DocumentCategory,
    visibility: body.visibility as DocumentVisibility,
  };
}

export function documentCompletion(value: unknown) {
  const body = object(value);
  if (Object.keys(body).some((key) => key !== "confirmed") || body.confirmed !== true)
    throw new InputError("Confirme o envio do documento.");
}

export function documentPage(value?: string): number {
  if (value === undefined) return 1;
  if (!/^[1-9]\d{0,4}$/.test(value)) throw new InputError("Página inválida.");
  return Number(value);
}

export function documentBytesMatch(
  contentType: string,
  bytes: Uint8Array,
): boolean {
  if (contentType === "application/pdf")
    return bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (contentType === "image/jpeg")
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png")
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  return false;
}
