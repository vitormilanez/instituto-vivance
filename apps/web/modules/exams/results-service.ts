import "server-only";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import { ExamExtractionError } from "./service";
import type { ExamDocumentResult, ExamResult, ExamResultsView, ExamReview } from "./results";

const batchSize = 200;
const unavailable = (code?: string) => code === "PGRST205" || code === "42P01";

export async function patientExamResults(tenantInput: string, patientInput: string): Promise<ExamResultsView> {
  const tenant = tenantId(tenantInput);
  const patient = tenantId(patientInput);
  const { client, user } = await requireClinic(tenant, ["doctor"]);
  const relationship = await client.from("care_relationships")
    .select("patient_id")
    .eq("tenant_id", tenant).eq("patient_id", patient)
    .eq("professional_id", user.id).eq("status", "active").maybeSingle();
  if (relationship.error) throw new ExamExtractionError("Não foi possível conferir o vínculo de cuidado.", 503);
  if (!relationship.data) throw new ExamExtractionError("Seu vínculo de cuidado com este paciente não está ativo.", 403);

  const documents: { id: string; display_title: string | null; original_filename: string; created_at: string; available_at: string | null; category: string; visibility: string }[] = [];
  for (let offset = 0; ; offset += batchSize) {
    const page = await client.from("patient_documents")
      .select("id,display_title,original_filename,created_at,available_at,category,visibility")
      .eq("tenant_id", tenant).eq("patient_id", patient)
      .in("category", ["exam", "clinical_document"]).eq("status", "available").eq("attached_to", "documents").is("duplicate_of", null)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + batchSize - 1);
    if (page.error) throw new ExamExtractionError("Não foi possível consultar os exames.", 503);
    documents.push(...(page.data ?? []).filter((document) => document.category === "exam" || document.visibility === "shared"));
    if ((page.data?.length ?? 0) < batchSize) break;
  }
  if (!documents.length) return { documents: [] };

  const jobByDocument = new Map<string, "pending" | "processing" | "failed" | "completed">();
  const resumableDocuments = new Set<string>();
  for (let offset = 0; ; offset += batchSize) {
    const page = await client.from("processing_jobs")
      .select("idempotency_key,status,created_by,lease_expires_at")
      .eq("tenant_id", tenant).eq("patient_id", patient)
      .eq("job_type", "exam_text_extraction")
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + batchSize - 1);
    if (page.error) throw new ExamExtractionError("Não foi possível consultar o processamento dos exames.", 503);
    for (const job of page.data ?? []) {
      if (!jobByDocument.has(job.idempotency_key)
        && ["pending", "processing", "failed", "completed"].includes(job.status)) {
        jobByDocument.set(job.idempotency_key, job.status as "pending" | "processing" | "failed" | "completed");
        const interrupted = job.status === "failed" || (job.status === "processing"
          && typeof job.lease_expires_at === "string" && Date.parse(job.lease_expires_at) <= Date.now());
        if (interrupted && job.created_by === user.id) resumableDocuments.add(job.idempotency_key);
      }
    }
    if ((page.data?.length ?? 0) < batchSize) break;
  }

  const runs: { id: string; document_id: string; created_at: string; page_count: number; extracted_page_count: number }[] = [];
  for (let offset = 0; ; offset += batchSize) {
    const page = await client.from("document_extraction_runs")
      .select("id,document_id,created_at,page_count,extracted_page_count")
      .eq("tenant_id", tenant).eq("patient_id", patient)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + batchSize - 1);
    if (page.error) throw new ExamExtractionError("Não foi possível consultar as extrações dos exames.", 503);
    runs.push(...(page.data ?? []));
    if ((page.data?.length ?? 0) < batchSize) break;
  }
  const latest = new Map<string, string>();
  for (const run of runs) if (!latest.has(run.document_id)) latest.set(run.document_id, run.id);
  const runsById = new Map(runs.map((run) => [run.id, run]));
  const runIds = [...latest.values()];
  if (!runIds.length) return { documents: documents.map((document) => ({
    id: document.id, title: document.display_title || document.original_filename,
    receivedAt: document.available_at ?? document.created_at, observedOn: null,
    processingStatus: jobByDocument.get(document.id) ?? null,
    canResume: resumableDocuments.has(document.id),
    issuer: null, summary: [], qualityNotes: [], items: [],
  })) };

  const itemRows: ExamResult[] = [];
  for (let offset = 0; ; offset += batchSize) {
    const page = await client.from("exam_result_items")
      .select("id,document_id,extraction_run_id,page_number,item_index,item_kind,literal_name,literal_value,numeric_value,unit_text,reference_text,observed_on,narrative_text,source_excerpt,requires_review_reason,method_text,specimen_text")
      .eq("tenant_id", tenant).eq("patient_id", patient)
      .in("extraction_run_id", runIds)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + batchSize - 1);
    if (unavailable(page.error?.code)) return { documents: [], unavailable: true };
    if (page.error) throw new ExamExtractionError("Não foi possível consultar os resultados dos exames.", 503);
    itemRows.push(...(page.data ?? []).map((item) => ({ ...item, reviews: [] })));
    if ((page.data?.length ?? 0) < batchSize) break;
  }

  const itemIds = itemRows.map((item) => item.id);
  const reviews: (ExamReview & { item_id: string })[] = [];
  for (let index = 0; index < itemIds.length; index += batchSize) {
    const page = await client.from("exam_result_item_reviews")
      .select("id,item_id,version,decision,corrected_data,reviewed_at")
      .eq("tenant_id", tenant).eq("patient_id", patient).in("item_id", itemIds.slice(index, index + batchSize));
    if (page.error) throw new ExamExtractionError("Não foi possível consultar as revisões dos resultados.", 503);
    reviews.push(...((page.data ?? []) as (ExamReview & { item_id: string })[]));
  }

  type Metadata = { extraction_run_id: string; title: string; issuer: string | null; observed_on: string | null; summary: unknown; quality_notes: unknown };
  const metadata: Metadata[] = [];
  for (let index = 0; index < runIds.length; index += batchSize) {
    const page = await client.from("exam_document_metadata")
      .select("extraction_run_id,title,issuer,observed_on,summary,quality_notes")
      .eq("tenant_id", tenant).eq("patient_id", patient).in("extraction_run_id", runIds.slice(index, index + batchSize));
    if (unavailable(page.error?.code)) break;
    if (page.error) throw new ExamExtractionError("Não foi possível consultar o resumo dos laudos.", 503);
    metadata.push(...((page.data ?? []) as Metadata[]));
  }
  const metadataByRun = new Map(metadata.map((entry) => [entry.extraction_run_id, entry]));
  const itemsByDocument = new Map<string, ExamResult[]>();
  for (const item of itemRows) {
    item.reviews = reviews.filter((review) => review.item_id === item.id);
    itemsByDocument.set(item.document_id, [...(itemsByDocument.get(item.document_id) ?? []), item]);
  }
  const strings = (value: unknown) => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim())) : [];
  const result: ExamDocumentResult[] = documents.map((document) => {
    const info = metadataByRun.get(latest.get(document.id) ?? "");
    const run = runsById.get(latest.get(document.id) ?? "");
    return {
      id: document.id,
      title: info?.title && info.title !== "Exame ou documento" ? info.title : document.display_title || document.original_filename,
      receivedAt: document.available_at ?? document.created_at,
      processingStatus: jobByDocument.get(document.id) ?? null,
      canResume: resumableDocuments.has(document.id),
      pageCount: run?.page_count,
      extractedPageCount: run?.extracted_page_count,
      observedOn: info?.observed_on ?? null,
      issuer: info?.issuer ?? null,
      summary: strings(info?.summary).slice(0, 3),
      qualityNotes: strings(info?.quality_notes),
      items: (itemsByDocument.get(document.id) ?? []).sort((a, b) => a.page_number - b.page_number || a.item_index - b.item_index),
    };
  });
  return { documents: result };
}
