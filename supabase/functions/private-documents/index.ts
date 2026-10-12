/// <reference lib="deno.ns" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const documentBucket = "vivance-documents";
const maxDocumentBytes = 5 * 1024 * 1024;
const encoder = new TextEncoder();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const contentTypes = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
} as const;

type ContentType = keyof typeof contentTypes;
type DocumentIntent = {
  tenantId: string;
  patientId: string;
  filename: string;
  contentType: ContentType;
  byteSize: number;
  category: "exam" | "clinical_document";
  visibility: "internal" | "shared";
  careRequestId: string | null;
  purpose?: "meal_log" | "profile_photo";
};

class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function configuredKey(dictionaryName: string, legacyName: string) {
  const dictionary = Deno.env.get(dictionaryName);
  if (dictionary) {
    try {
      const keys = JSON.parse(dictionary) as Record<string, unknown>;
      if (typeof keys.default === "string" && keys.default) return keys.default;
    } catch {
      // Fall through to the legacy hosted key while the project migrates keys.
    }
  }
  return Deno.env.get(legacyName) ?? "";
}

function response(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new RequestError("Dados do documento inválidos.", 400);
  return value as Record<string, unknown>;
}

function onlyKeys(body: Record<string, unknown>, keys: string[]) {
  if (Object.keys(body).some((key) => !keys.includes(key)))
    throw new RequestError("Dados do documento inválidos.", 400);
}

function validId(value: unknown, message: string) {
  if (typeof value !== "string" || !uuid.test(value))
    throw new RequestError(message, 400);
  return value;
}

function validFilename(value: unknown, contentType: ContentType) {
  if (typeof value !== "string")
    throw new RequestError("Informe o nome do arquivo.", 400);
  const filename = value.trim().replace(/\s+/g, " ");
  if (
    filename.length < 1 ||
    filename.length > 160 ||
    /[\x00-\x1f\x7f]/u.test(filename) ||
    filename.includes("/") ||
    filename.includes("\\") ||
    !contentTypes[contentType].some((extension) =>
      filename.toLowerCase().endsWith(extension)
    )
  )
    throw new RequestError("Confira o nome e o formato do arquivo.", 400);
  return filename;
}

function reserveIntent(body: Record<string, unknown>): DocumentIntent {
  onlyKeys(body, [
    "action",
    "tenant_id",
    "patient_id",
    "filename",
    "content_type",
    "byte_size",
    "category",
    "visibility",
    "care_request_id",
    "purpose",
  ]);
  if (body.action !== "reserve")
    throw new RequestError("Ação inválida.", 400);
  if (
    typeof body.content_type !== "string" ||
    !Object.hasOwn(contentTypes, body.content_type) ||
    !Number.isSafeInteger(body.byte_size) ||
    Number(body.byte_size) < 1 ||
    Number(body.byte_size) > maxDocumentBytes ||
    (body.category !== "exam" && body.category !== "clinical_document") ||
    (body.visibility !== "internal" && body.visibility !== "shared")
  )
    throw new RequestError("Confira o paciente, o formato e a visibilidade do documento.", 400);
  const contentType = body.content_type as ContentType;
  if (body.purpose !== undefined && (!["meal_log", "profile_photo"].includes(String(body.purpose)) || body.category !== "clinical_document" || !contentType.startsWith("image/") || body.care_request_id)) throw new RequestError("Foto de contexto inválida.", 400);
  const careRequestId =
    body.care_request_id === undefined || body.care_request_id === null
      ? null
      : validId(body.care_request_id, "Solicitação inválida.");
  if (
    careRequestId !== null &&
    (body.category !== "exam" || body.visibility !== "shared")
  )
    throw new RequestError(
      "A resposta a uma solicitação deve ser um exame compartilhado.",
      400,
    );
  return {
    tenantId: validId(body.tenant_id, "Clínica inválida."),
    patientId: validId(body.patient_id, "Paciente inválido."),
    filename: validFilename(body.filename, contentType),
    contentType,
    byteSize: body.byte_size as number,
    category: body.category,
    visibility: body.visibility,
    careRequestId,
    purpose: body.purpose as "meal_log" | "profile_photo" | undefined,
  };
}

function completionIntent(body: Record<string, unknown>) {
  onlyKeys(body, ["action", "tenant_id", "document_id"]);
  if (body.action !== "complete")
    throw new RequestError("Ação inválida.", 400);
  return {
    tenantId: validId(body.tenant_id, "Clínica inválida."),
    documentId: validId(body.document_id, "Documento inválido."),
  };
}

function bytesMatch(contentType: string, bytes: Uint8Array) {
  if (contentType === "application/pdf")
    return (
      bytes.length >= 5 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d
    );
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

function databaseError(code: string | undefined) {
  if (code === "P0015")
    throw new RequestError("Você atingiu 15 arquivos distintos neste ciclo. Solicite mais envios ao médico.", 409);
  if (code === "42501")
    throw new RequestError("Seu acesso mudou ou este documento não está disponível. Atualize a página.", 403);
  if (["23503", "23505", "23514"].includes(code ?? ""))
    throw new RequestError("Este documento mudou ou não foi concluído. Atualize a página antes de tentar novamente.", 409);
  throw new RequestError("Não foi possível concluir o documento. Tente novamente.", 503);
}

async function context(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ") || authorization.length > 8192)
    throw new RequestError("Entre novamente para continuar.", 401);
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey = configuredKey(
    "SUPABASE_PUBLISHABLE_KEYS",
    "SUPABASE_ANON_KEY",
  );
  const secretKey = configuredKey(
    "SUPABASE_SECRET_KEYS",
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  if (!url || !publishableKey || !secretKey)
    throw new RequestError("O serviço de documentos está indisponível.", 503);
  const userClient = createClient(url, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.slice("Bearer ".length);
  const auth = await userClient.auth.getUser(token);
  if (auth.error || !auth.data.user)
    throw new RequestError("Entre novamente para continuar.", 401);
  return {
    userClient,
    adminClient: createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    userId: auth.data.user.id,
  };
}

async function requireDocumentMember(
  userClient: any,
  tenantId: string,
  userId: string,
) {
  const membership = await userClient
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (membership.error || !membership.data)
    throw new RequestError("Você não tem acesso a esta clínica.", 403);
  if (!["doctor", "nurse", "patient"].includes(membership.data.role))
    throw new RequestError("Você não pode enviar documentos nesta clínica.", 403);
}

async function reserveDocument(request: Request, body: Record<string, unknown>) {
  const values = reserveIntent(body);
  const { userClient, adminClient, userId } = await context(request);
  await requireDocumentMember(userClient, values.tenantId, userId);
  const liveAccess = await userClient.rpc("get_exam_upload_quota", { target_tenant: values.tenantId, target_patient: values.patientId });
  if (liveAccess.error) databaseError(liveAccess.error.code);
  const reserved = await adminClient.rpc(values.purpose ? "reserve_context_photo" : "reserve_patient_document", values.purpose ? {
    target_tenant: values.tenantId, target_patient: values.patientId, target_uploader: userId,
    input_filename: values.filename, input_content_type: values.contentType, input_byte_size: values.byteSize,
    input_visibility: values.visibility, input_purpose: values.purpose,
  } : {
    target_tenant: values.tenantId,
    target_patient: values.patientId,
    target_uploader: userId,
    input_filename: values.filename,
    input_content_type: values.contentType,
    input_byte_size: values.byteSize,
    input_category: values.category,
    input_visibility: values.visibility,
    target_care_request: values.careRequestId,
  });
  if (reserved.error) databaseError(reserved.error.code);
  const document = (reserved.data as { document_id: string; storage_path: string }[] | null)?.[0];
  if (!document) throw new RequestError("Não foi possível preparar o documento. Tente novamente.", 503);
  const upload = await adminClient.storage
    .from(documentBucket)
    .createSignedUploadUrl(document.storage_path);
  if (upload.error || !upload.data) {
    await adminClient.rpc("reject_patient_document", {
      target_tenant: values.tenantId,
      target_document: document.document_id,
      target_actor: userId,
    });
    throw new RequestError("Não foi possível preparar o envio do documento. Tente novamente.", 503);
  }
  return response(
    {
      documentId: document.document_id,
      uploadPath: document.storage_path,
      uploadToken: upload.data.token,
    },
    201,
  );
}

async function completeDocument(request: Request, body: Record<string, unknown>) {
  const values = completionIntent(body);
  const { userClient, adminClient, userId } = await context(request);
  await requireDocumentMember(userClient, values.tenantId, userId);
  const pending = await userClient
    .from("patient_documents")
    .select("id,patient_id,uploaded_by,storage_path,content_type,byte_size,status,duplicate_of")
    .eq("tenant_id", values.tenantId)
    .eq("id", values.documentId)
    .maybeSingle();
  if (pending.error) databaseError(pending.error.code);
  if (!pending.data || pending.data.uploaded_by !== userId)
    throw new RequestError("O documento não está disponível para esta conta.", 404);
  const liveAccess = await userClient.rpc("get_exam_upload_quota", { target_tenant: values.tenantId, target_patient: pending.data.patient_id });
  if (liveAccess.error) databaseError(liveAccess.error.code);
  if (pending.data.duplicate_of) return response({ id: pending.data.id, canonicalId: pending.data.duplicate_of, duplicate: true });
  if (pending.data.status === "available") return response({ id: pending.data.id });
  if (pending.data.status !== "reserved")
    throw new RequestError("Este documento não pode mais ser disponibilizado. Selecione o arquivo novamente.", 409);
  const download = await userClient.storage
    .from(documentBucket)
    .download(pending.data.storage_path);
  if (download.error || !download.data)
    throw new RequestError("O arquivo ainda não foi recebido. Confira sua conexão e tente novamente.", 409);
  const bytes = new Uint8Array(await download.data.arrayBuffer());
  if (
    bytes.byteLength !== pending.data.byte_size ||
    !bytesMatch(pending.data.content_type, bytes)
  ) {
    await adminClient.storage.from(documentBucket).remove([pending.data.storage_path]);
    const rejected = await adminClient.rpc("reject_patient_document", {
      target_tenant: values.tenantId,
      target_document: pending.data.id,
      target_actor: userId,
    });
    if (rejected.error) databaseError(rejected.error.code);
    throw new RequestError("O arquivo não corresponde ao formato informado e não foi disponibilizado.", 400);
  }
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const complete = await adminClient.rpc("complete_verified_patient_document", {
    target_tenant: values.tenantId,
    target_document: pending.data.id,
    target_actor: userId,
    verified_sha256: hash,
  });
  if (complete.error) databaseError(complete.error.code);
  if (complete.data?.quota_full) {
    await adminClient.storage.from(documentBucket).remove([pending.data.storage_path]);
    databaseError("P0015");
  }
  return response(complete.data);
}

async function authorizeDocuments(request: Request, body: Record<string, unknown>) {
  onlyKeys(body, ["action", "tenant_id", "patient_id", "document_ids", "confirmed_synthetic"]);
  const tenant = validId(body.tenant_id, "Clínica inválida.");
  const patient = validId(body.patient_id, "Paciente inválido.");
  if (body.confirmed_synthetic !== true || !Array.isArray(body.document_ids) || body.document_ids.length < 1 || body.document_ids.length > 15)
    throw new RequestError("Confirme os dados de teste e selecione até 15 documentos.", 400);
  const ids = body.document_ids.map((id) => validId(id, "Documento inválido."));
  if (new Set(ids).size !== ids.length) throw new RequestError("Selecione documentos distintos.", 400);
  const { userClient, adminClient, userId } = await context(request);
  // Temporary single synthetic environment. A doctor action cannot open Gate P
  // or register clinical patients on a different deployment by accident.
  if (Deno.env.get("SUPABASE_URL") !== "https://oxuwrdjojsmgxoljqkuk.supabase.co")
    throw new RequestError("A habilitação sintética não está disponível neste ambiente.", 403);
  const access = await userClient.rpc("get_exam_upload_quota", { target_tenant: tenant, target_patient: patient });
  if (access.error) databaseError(access.error.code);
  const membership = await userClient.from("memberships").select("role").eq("tenant_id", tenant).eq("user_id", userId).eq("status", "active").maybeSingle();
  if (membership.error || membership.data?.role !== "doctor") throw new RequestError("Somente o médico responsável pode habilitar os exames.", 403);
  const documents = await userClient.from("patient_documents").select("id,storage_path,content_type,byte_size,status,attached_to").eq("tenant_id", tenant).eq("patient_id", patient).in("id", ids);
  if (documents.error) databaseError(documents.error.code);
  if (documents.data?.length !== ids.length || documents.data.some((d: any) => d.status !== "available" || d.attached_to !== "documents"))
    throw new RequestError("Selecione documentos disponíveis deste paciente.", 403);
  const canonicalIds: string[] = [];
  for (const document of documents.data) {
    const file = await userClient.storage.from(documentBucket).download(document.storage_path);
    if (file.error || !file.data) throw new RequestError("Não foi possível conferir um original. Tente novamente.", 409);
    const bytes = new Uint8Array(await file.data.arrayBuffer());
    if (bytes.length !== document.byte_size || bytes.length > maxDocumentBytes || !bytesMatch(document.content_type, bytes))
      throw new RequestError("Um arquivo não corresponde ao formato informado.", 400);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const attested = await adminClient.rpc("attest_existing_exam_document", { target_tenant: tenant, target_document: document.id, target_actor: userId, verified_sha256: hash });
    if (attested.error) databaseError(attested.error.code);
    canonicalIds.push(attested.data);
  }
  const registered = await adminClient.rpc("register_exam_ai_test_patient", { target_tenant: tenant, target_patient: patient });
  if (registered.error) databaseError(registered.error.code);
  const authorized = await userClient.rpc("authorize_exam_documents", { target_tenant: tenant, target_patient: patient, document_ids: [...new Set(canonicalIds)] });
  if (authorized.error) databaseError(authorized.error.code);
  return response({ documents: authorized.data });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return response({ error: "Método não permitido." }, 405);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return response({ error: "Use JSON." }, 415);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 4096)
    return response({ error: "Solicitação muito grande." }, 413);
  try {
    const raw = await request.text();
    if (encoder.encode(raw).byteLength > 4096)
      return response({ error: "Solicitação muito grande." }, 413);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return response({ error: "Dados do documento inválidos." }, 400);
    }
    const body = record(parsed);
    if (body.action === "reserve") return await reserveDocument(request, body);
    if (body.action === "complete") return await completeDocument(request, body);
    if (body.action === "authorize") return await authorizeDocuments(request, body);
    return response({ error: "Ação inválida." }, 400);
  } catch (error) {
    if (error instanceof RequestError)
      return response({ error: error.message }, error.status);
    return response({ error: "Não foi possível concluir o documento. Tente novamente." }, 503);
  }
});
