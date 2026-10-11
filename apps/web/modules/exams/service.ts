import "server-only";
import { DomainError } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { documentId } from "@/modules/documents/validation";
import { requireClinic } from "@/modules/identity/service";

export class ExamExtractionError extends DomainError {}

function validatedDocument(tenantInput: string, documentInput: string) {
  const tenant = tenantId(tenantInput);
  const document = documentId(documentInput);
  return { tenant, document };
}

export async function enqueueDocumentText(tenantInput: string, documentInput: string) {
  const { tenant, document } = validatedDocument(tenantInput, documentInput);
  const { client } = await requireClinic(tenant, ["doctor"]);
  const result = await client.rpc("enqueue_exam_extraction", {
    target_tenant: tenant,
    target_document: document,
  });
  if (result.error || !result.data)
    throw new ExamExtractionError("Não foi possível processar o exame. Confira se este paciente participa do teste de extração.", 503);
  return { jobId: result.data };
}

export async function resumeDocumentExtraction(tenantInput: string, documentInput: string) {
  const { tenant, document } = validatedDocument(tenantInput, documentInput);
  const { client } = await requireClinic(tenant, ["doctor"]);
  const result = await client.rpc("resume_exam_extraction", {
    target_tenant: tenant,
    target_document: document,
  });
  if (result.error?.code === "40001") {
    const creatorChanged = result.error.message?.includes("doctor who started");
    throw new ExamExtractionError(creatorChanged
      ? "A retomada precisa ser feita pelo médico que iniciou a organização."
      : "Esta organização já foi concluída. Atualize o exame.", 409);
  }
  if (result.error?.code === "42501")
    throw new ExamExtractionError("Seu acesso a este exame não está ativo.", 403);
  if (result.error?.code === "P0002")
    throw new ExamExtractionError("Não há uma organização para retomar neste exame.", 404);
  const row = Array.isArray(result.data) ? result.data[0] : null;
  if (result.error || !row || typeof row.job_id !== "string"
    || !["pending", "processing"].includes(row.status)
    || typeof row.resumed !== "boolean")
    throw new ExamExtractionError("Não foi possível retomar a organização do exame.", 503);
  return { jobId: row.job_id, status: row.status as "pending" | "processing", resumed: row.resumed };
}

export async function documentExtraction(tenantInput: string, documentInput: string) {
  const { tenant, document } = validatedDocument(tenantInput, documentInput);
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

const has = (value: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(value, key);

function correctedText(value: unknown, limit: number, nullable: boolean, multiline = false): string | null {
  if (value === null && nullable) return null;
  if (typeof value !== "string" || !value.trim() || value.length > limit
    || /[\x00-\x1f\x7f]/.test(multiline ? value.replace(/[\n\r\t]/g, "") : value))
    throw new ExamExtractionError("Informe uma correção literal válida.", 400);
  return value.trim();
}

function correctedDate(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)
    || !Number.isFinite(Date.parse(`${value}T12:00:00Z`))
    || new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value)
    throw new ExamExtractionError("Informe uma data válida no formato AAAA-MM-DD.", 400);
  return value;
}

export async function reviewExamItem(tenantInput: string, documentInput: string, input: unknown) {
  const { tenant, document } = validatedDocument(tenantInput, documentInput);
  const { client } = await requireClinic(tenant, ["doctor"]);
  if (!input || typeof input !== "object") throw new ExamExtractionError("Revisão inválida.", 400);
  const value = input as Record<string, unknown>;
  const item = documentId(String(value.itemId ?? ""));
  const request = documentId(String(value.requestId ?? ""));
  const decision = value.decision;
  const expectedVersion = value.expectedVersion;
  const note = value.note == null ? null : typeof value.note === "string" ? value.note.trim() : "";
  if (!["confirmed", "corrected", "rejected"].includes(String(decision))
    || !Number.isSafeInteger(expectedVersion) || (expectedVersion as number) < 0
    || (note !== null && (!note || note.length > 2000))
    || (decision === "rejected" && !note)
    || (decision !== "corrected" && (value.correctedData != null
      || ["correctedUnit", "correctedReferenceText", "correctedObservedDate"].some((key) => has(value, key)))))
    throw new ExamExtractionError("Revisão inválida.", 400);
  const belongs = await client.from("exam_result_items")
    .select("id,item_kind").eq("tenant_id", tenant).eq("document_id", document).eq("id", item)
    .maybeSingle();
  if (belongs.error) throw new ExamExtractionError("Não foi possível conferir o item.", 503);
  if (!belongs.data) throw new ExamExtractionError("Item não encontrado para este exame.", 404);
  let correction: Record<string, string | null> | null = null;
  if (decision === "corrected") {
    if (value.correctedData != null && (typeof value.correctedData !== "object" || Array.isArray(value.correctedData)))
      throw new ExamExtractionError("Revisão inválida.", 400);
    const literal = (value.correctedData ?? {}) as Record<string, unknown>;
    const field = belongs.data.item_kind === "narrative" ? "narrative_text" : "literal_value";
    if (Object.keys(literal).some((key) => key !== field)) throw new ExamExtractionError("Revisão inválida.", 400);
    correction = {};
    if (has(literal, field)) correction[field] = correctedText(literal[field], field === "narrative_text" ? 12000 : 500, false, field === "narrative_text");
    if (has(value, "correctedUnit")) {
      if (belongs.data.item_kind !== "laboratory") throw new ExamExtractionError("Revisão inválida.", 400);
      correction.unit_text = correctedText(value.correctedUnit, 120, true);
    }
    if (has(value, "correctedReferenceText")) {
      if (belongs.data.item_kind !== "laboratory") throw new ExamExtractionError("Revisão inválida.", 400);
      correction.reference_text = correctedText(value.correctedReferenceText, 1000, true, true);
    }
    if (has(value, "correctedObservedDate")) correction.observed_on = correctedDate(value.correctedObservedDate);
    if (!Object.keys(correction).length) throw new ExamExtractionError("Informe ao menos um campo corrigido.", 400);
  }
  const result = await client.rpc("review_exam_result_item_versioned", {
    target_tenant: tenant,
    target_item: item,
    target_review_request: request,
    decision: String(decision),
    corrected_data: correction,
    note,
    expected_version: expectedVersion as number,
  });
  if (result.error?.code === "40001") throw new ExamExtractionError("Este item recebeu outra revisão. Atualize os resultados antes de salvar.", 409);
  if (result.error?.code === "42501") throw new ExamExtractionError("Seu acesso a este exame não está ativo.", 403);
  if (result.error?.code === "23514") throw new ExamExtractionError("A revisão mudou. Atualize os resultados antes de salvar.", 409);
  if (result.error || !result.data)
    throw new ExamExtractionError("Não foi possível registrar a revisão do item.", 503);
  const saved = await client.from("exam_result_item_reviews")
    .select("id,version").eq("tenant_id", tenant).eq("id", result.data).single();
  const latestCorrection = await client.from("exam_result_item_reviews")
    .select("corrected_data").eq("tenant_id", tenant).eq("item_id", item)
    .eq("decision", "corrected").lte("version", saved.data?.version ?? 0)
    .order("version", { ascending: false }).limit(1).maybeSingle();
  if (saved.error || !saved.data || latestCorrection.error)
    throw new ExamExtractionError("A revisão foi registrada, mas não foi possível atualizar a tela. Recarregue os resultados.", 503);
  return { reviewId: saved.data.id, version: saved.data.version,
    correctedData: (latestCorrection.data?.corrected_data ?? null) as Record<string, string | null> | null };
}
