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
    const items = await client.from("exam_result_items")
      .select("id,page_number,item_index,item_kind,literal_name,literal_value,unit_text,reference_text,observed_on,narrative_text,source_excerpt,requires_review_reason")
      .eq("tenant_id", tenant).eq("document_id", document)
      .eq("extraction_run_id", run.data.id)
      .order("page_number").order("item_index").limit(1000);
    const structuredUnavailable = items.error?.code === "PGRST205" || items.error?.code === "42P01";
    if (items.error && !structuredUnavailable)
      throw new ExamExtractionError("Não foi possível consultar os itens do exame.", 503);
    const itemIds = (items.data ?? []).map((item) => item.id);
    const reviews = itemIds.length ? await client.from("exam_result_item_reviews")
      .select("id,item_id,version,decision,corrected_data,note,reviewed_by,reviewed_at")
      .eq("tenant_id", tenant).in("item_id", itemIds)
      .order("version", { ascending: true }).limit(1000) : null;
    if (reviews?.error) throw new ExamExtractionError("Não foi possível consultar as revisões do exame.", 503);
    extraction = { ...run.data, pages: pages.data ?? [], structuredUnavailable, items: (items.data ?? []).map((item) => ({
      ...item,
      reviews: (reviews?.data ?? []).filter((review) => review.item_id === item.id),
    })) };
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

export async function reviewExamItem(tenantInput: string, documentInput: string, input: unknown) {
  const { tenant, document } = pilotDocument(tenantInput, documentInput);
  const { client } = await requireClinic(tenant, ["doctor"]);
  if (!input || typeof input !== "object") throw new ExamExtractionError("Revisão inválida.", 400);
  const value = input as Record<string, unknown>;
  const item = documentId(String(value.itemId ?? ""));
  const request = documentId(String(value.requestId ?? ""));
  const decision = value.decision;
  const note = value.note == null ? null : typeof value.note === "string" ? value.note.trim() : "";
  if (!["confirmed", "corrected", "rejected"].includes(String(decision))
    || (note !== null && (!note || note.length > 2000))
    || (decision === "rejected" && !note)
    || (decision === "corrected" && (
      !value.correctedData || typeof value.correctedData !== "object"
      || Array.isArray(value.correctedData)
    ))) throw new ExamExtractionError("Revisão inválida.", 400);
  const belongs = await client.from("exam_result_items")
    .select("id,item_kind").eq("tenant_id", tenant).eq("document_id", document).eq("id", item)
    .maybeSingle();
  if (belongs.error) throw new ExamExtractionError("Não foi possível conferir o item.", 503);
  if (!belongs.data) throw new ExamExtractionError("Item não encontrado para este exame.", 404);
  if (decision === "corrected") {
    const correction = value.correctedData as Record<string, unknown>;
    const field = belongs.data.item_kind === "narrative" ? "narrative_text" : "literal_value";
    if (Object.keys(correction).length !== 1 || typeof correction[field] !== "string"
      || !correction[field].trim()
      || correction[field].length > (field === "narrative_text" ? 12000 : 500))
      throw new ExamExtractionError("Informe uma correção literal válida.", 400);
  }
  const result = await client.rpc("review_exam_result_item", {
    target_tenant: tenant,
    target_item: item,
    target_review_request: request,
    decision: String(decision),
    corrected_data: decision === "corrected" ? value.correctedData as Record<string, string> : null,
    note,
  });
  if (result.error || !result.data)
    throw new ExamExtractionError("Não foi possível registrar a revisão do item.", 503);
  return { reviewId: result.data };
}
