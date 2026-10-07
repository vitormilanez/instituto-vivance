import "server-only";
import { DomainError } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { documentId } from "@/modules/documents/validation";
import { requireClinic } from "@/modules/identity/service";
import { syntheticPilotAllows } from "./pilot";

export class ExamExtractionError extends DomainError {}

function pilotDocument(tenantInput: string, documentInput: string) {
  const tenant = tenantId(tenantInput);
  const document = documentId(documentInput);
  if (!syntheticPilotAllows(document))
    throw new ExamExtractionError("A extração está restrita aos exames sintéticos do piloto.", 403);
  return { tenant, document };
}

export async function enqueueDocumentText(tenantInput: string, documentInput: string) {
  const { tenant, document } = pilotDocument(tenantInput, documentInput);
  const { client } = await requireClinic(tenant, ["doctor"]);
  const result = await client.rpc("enqueue_synthetic_exam_text_extraction", {
    target_tenant: tenant,
    target_document: document,
  });
  if (result.error || !result.data)
    throw new ExamExtractionError("Não foi possível colocar o exame na fila do piloto.", 503);
  return { jobId: result.data };
}

export async function documentExtraction(tenantInput: string, documentInput: string) {
  const { tenant, document } = pilotDocument(tenantInput, documentInput);
  const { client } = await requireClinic(tenant, ["doctor", "nurse"]);
  const source = await client.from("patient_documents")
    .select("id,patient_id")
    .eq("tenant_id", tenant).eq("id", document)
    .eq("status", "available").eq("attached_to", "documents")
    .maybeSingle();
  if (source.error) throw new ExamExtractionError("Não foi possível conferir o documento.", 503);
  if (!source.data) throw new ExamExtractionError("Exame não encontrado para esta equipe.", 404);
  const run = await client.from("document_extraction_runs")
    .select("id,status,failure_code,page_count,extracted_page_count,review_page_count,failed_page_count,created_at")
    .eq("tenant_id", tenant).eq("document_id", document)
    .order("created_at", { ascending: false }).order("id", { ascending: false })
    .limit(1).maybeSingle();
  if (run.error) throw new ExamExtractionError("Não foi possível consultar a extração.", 503);
  let extraction = null;
  if (run.data) {
    const pages = await client.from("document_extracted_pages")
      .select("page_number,status,extraction_method,extracted_text,possible_duplicate_of_page,failure_code")
      .eq("tenant_id", tenant).eq("document_id", document)
      .eq("extraction_run_id", run.data.id)
      .order("page_number").limit(100);
    if (pages.error || (pages.data?.length ?? 0) !== run.data.page_count)
      throw new ExamExtractionError("As páginas extraídas estão incompletas.", 503);
    extraction = { ...run.data, pages: pages.data ?? [] };
  }
  const queued = await client.from("processing_jobs")
    .select("id,status,attempt_count,max_attempts,available_at,lease_expires_at,last_error_code")
    .eq("tenant_id", tenant).eq("patient_id", source.data.patient_id)
    .eq("job_type", "exam_text_extraction").eq("idempotency_key", document)
    .maybeSingle();
  if (queued.error) throw new ExamExtractionError("Não foi possível consultar a fila.", 503);
  return { extraction, job: queued.data };
}

export type DocumentExtraction = NonNullable<Awaited<ReturnType<typeof documentExtraction>>["extraction"]>;
