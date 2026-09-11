import "server-only";
import { createClient } from "@/lib/supabase/server";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import type { Database } from "@/lib/supabase/database.types";
import {
  documentBucket,
  documentId,
  documentIntent,
  documentPage,
} from "./validation";

type DocumentRow = Database["public"]["Tables"]["patient_documents"]["Row"];
type StaffDocument = DocumentRow & {
  patients: { display_name: string } | null;
};
type ServerClient = Awaited<ReturnType<typeof createClient>>;

export class DocumentError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function databaseFailure(code?: string): never {
  if (code === "42501")
    throw new DocumentError(
      "Seu acesso mudou ou este documento não está disponível. Atualize a página.",
      403,
    );
  if (["23503", "23505", "23514"].includes(code ?? ""))
    throw new DocumentError(
      "Este documento mudou ou não foi concluído. Atualize a página antes de tentar novamente.",
      409,
    );
  throw new Error("Document operation failed");
}

async function sessionToken(client: ServerClient) {
  const { data, error } = await client.auth.getSession();
  if (error || !data.session)
    throw new DocumentError("Sua sessão expirou. Entre novamente.", 401);
  return data.session.access_token;
}

async function documentFunction(
  client: ServerClient,
  accessToken: string,
  body: Record<string, unknown>,
) {
  const { data, error } = await client.functions.invoke("private-documents", {
    body,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (error) {
    const context = "context" in error ? error.context : undefined;
    if (context instanceof Response) {
      const status = context.status;
      let message = "Não foi possível concluir o documento.";
      try {
        const payload = (await context.clone().json()) as { error?: unknown };
        if (typeof payload.error === "string") message = payload.error;
      } catch {}
      throw new DocumentError(
        message,
        status >= 400 && status < 600 ? status : 503,
      );
    }
    throw new Error("Private document function failed");
  }
  if (!data || typeof data !== "object")
    throw new Error("Private document function returned an invalid response");
  return data as Record<string, unknown>;
}

export async function reserveDocument(id: string, input: unknown) {
  const tenant = tenantId(id);
  const values = documentIntent(input);
  const { client } = await requireClinic(tenant, ["doctor", "nurse", "patient"]);
  const response = await documentFunction(client, await sessionToken(client), {
    action: "reserve",
    tenant_id: tenant,
    patient_id: values.patientId,
    filename: values.filename,
    content_type: values.contentType,
    byte_size: values.byteSize,
    category: values.category,
    visibility: values.visibility,
  });
  if (
    typeof response.documentId !== "string" ||
    typeof response.uploadPath !== "string" ||
    typeof response.uploadToken !== "string"
  )
    throw new Error("Document reservation returned an invalid response");
  return {
    documentId: response.documentId,
    uploadPath: response.uploadPath,
    uploadToken: response.uploadToken,
  };
}

export async function completeDocument(id: string, document: string) {
  const tenant = tenantId(id);
  const documentUuid = documentId(document);
  const { client } = await requireClinic(tenant, ["doctor", "nurse", "patient"]);
  const response = await documentFunction(client, await sessionToken(client), {
    action: "complete",
    tenant_id: tenant,
    document_id: documentUuid,
  });
  if (typeof response.id !== "string")
    throw new Error("Document completion returned an invalid response");
  return { id: response.id };
}

export async function staffDocuments(id: string, pageInput?: string) {
  const tenant = tenantId(id);
  const page = documentPage(pageInput);
  const { client, clinic, user } = await requireClinic(tenant, ["doctor", "nurse"]);
  const [documents, relationships] = await Promise.all([
    client
      .from("patient_documents")
      .select(
        "*,patients!patient_documents_tenant_id_patient_id_fkey(display_name)",
      )
      .eq("tenant_id", tenant)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .order("id")
      .range((page - 1) * 20, page * 20),
    client
      .from("care_relationships")
      .select(
        "patient_id,patients!care_relationships_tenant_id_patient_id_fkey(display_name)",
      )
      .eq("tenant_id", tenant)
      .eq("professional_id", user.id)
      .eq("status", "active")
      .order("patient_id"),
  ]);
  if (documents.error || relationships.error)
    databaseFailure(documents.error?.code ?? relationships.error?.code);
  return {
    clinic,
    documents: ((documents.data ?? []).slice(0, 20) as StaffDocument[]),
    patients: (relationships.data ?? []).map((relationship) => ({
      id: relationship.patient_id,
      display_name: relationship.patients?.display_name ?? "Paciente",
    })),
    page,
    hasNext: (documents.data?.length ?? 0) > 20,
  };
}

export async function patientDocuments(id: string, pageInput?: string) {
  const tenant = tenantId(id);
  const page = documentPage(pageInput);
  const { client, clinic } = await requireClinic(tenant, ["patient"]);
  const [documents, account] = await Promise.all([
    client
      .from("patient_documents")
      .select("*")
      .eq("tenant_id", tenant)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .order("id")
      .range((page - 1) * 20, page * 20),
    client
      .from("patient_accounts")
      .select("patient_id")
      .eq("tenant_id", tenant)
      .maybeSingle(),
  ]);
  if (documents.error || account.error)
    databaseFailure(documents.error?.code ?? account.error?.code);
  return {
    clinic,
    patientId: account.data?.patient_id ?? null,
    documents: (documents.data ?? []).slice(0, 20),
    page,
    hasNext: (documents.data?.length ?? 0) > 20,
  };
}

export async function documentDownload(id: string, document: string) {
  const tenant = tenantId(id);
  const documentUuid = documentId(document);
  const { client } = await requireClinic(tenant, ["doctor", "nurse", "patient"]);
  const result = await client
    .from("patient_documents")
    .select("id,original_filename,storage_path")
    .eq("tenant_id", tenant)
    .eq("id", documentUuid)
    .eq("status", "available")
    .maybeSingle();
  if (result.error) databaseFailure(result.error.code);
  if (!result.data)
    throw new DocumentError(
      "O documento não está disponível para esta conta.",
      404,
    );
  const signed = await client.storage
    .from(documentBucket)
    .createSignedUrl(result.data.storage_path, 60, {
      download: result.data.original_filename,
    });
  if (signed.error || !signed.data)
    throw new DocumentError(
      "Não foi possível preparar o download do documento. Tente novamente.",
      503,
    );
  return { url: signed.data.signedUrl, filename: result.data.original_filename };
}

export type StaffDocuments = Awaited<ReturnType<typeof staffDocuments>>;
export type PatientDocuments = Awaited<ReturnType<typeof patientDocuments>>;
