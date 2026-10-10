import "server-only";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import { ExamExtractionError } from "./service";
import { buildExamOverview, type ExamDocumentSummary, type ExamExtractionSummary } from "./overview";

const batchSize = 200;

export async function patientExamOverview(tenantInput: string, patientInput: string) {
  const tenant = tenantId(tenantInput);
  const patient = tenantId(patientInput);
  const { client, user } = await requireClinic(tenant, ["doctor"]);
  const relationship = await client
    .from("care_relationships")
    .select("patient_id")
    .eq("tenant_id", tenant)
    .eq("patient_id", patient)
    .eq("professional_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (relationship.error) throw new ExamExtractionError("Não foi possível conferir o vínculo de cuidado.", 503);
  if (!relationship.data) throw new ExamExtractionError("Seu vínculo de cuidado com este paciente não está ativo.", 403);

  // The existing Documents list is paginated for navigation. This compact
  // overview must account for every available file, including later pages.
  const documents: ExamDocumentSummary[] = [];
  for (let offset = 0; ; offset += batchSize) {
    const result = await client
      .from("patient_documents")
      .select("id,category,content_type,original_filename,display_title,created_at,available_at")
      .eq("tenant_id", tenant)
      .eq("patient_id", patient)
      .eq("status", "available")
      .eq("attached_to", "documents")
      .or("category.eq.exam,visibility.eq.shared")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + batchSize - 1);
    if (result.error) throw new ExamExtractionError("Não foi possível reunir os documentos do paciente.", 503);
    documents.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < batchSize) break;
  }

  const runs: ExamExtractionSummary[] = [];
  for (let offset = 0; ; offset += batchSize) {
    const result = await client
      .from("document_extraction_runs")
      .select("document_id,status,page_count,extracted_page_count,review_page_count,failed_page_count,created_at,id")
      .eq("tenant_id", tenant)
      .eq("patient_id", patient)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + batchSize - 1);
    if (result.error) throw new ExamExtractionError("Não foi possível reunir o estado dos exames.", 503);
    runs.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < batchSize) break;
  }
  return buildExamOverview(documents, runs);
}

export type PatientExamOverview = Awaited<ReturnType<typeof patientExamOverview>>;
