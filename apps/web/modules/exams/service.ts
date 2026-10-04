import "server-only";
import { createHash } from "node:crypto";
import { DomainError } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { documentBucket, documentBytesMatch, documentId } from "@/modules/documents/validation";
import { requireClinic } from "@/modules/identity/service";
import { syntheticPilotAllows } from "./pilot";
import { embeddedTextExtractor, extractEmbeddedPdfText, PdfTextError } from "./text";

export class ExamExtractionError extends DomainError {}

export async function extractDocumentText(tenantInput: string, documentInput: string) {
  const tenant = tenantId(tenantInput);
  const document = documentId(documentInput);
  if (!syntheticPilotAllows(document))
    throw new ExamExtractionError("A extração está restrita aos exames sintéticos do piloto.", 403);
  const { client } = await requireClinic(tenant, ["doctor"]);
  const source = await client
    .from("patient_documents")
    .select("id,storage_path,byte_size,content_type")
    .eq("tenant_id", tenant)
    .eq("id", document)
    .eq("status", "available")
    .eq("attached_to", "documents")
    .maybeSingle();
  if (source.error) throw new ExamExtractionError("Não foi possível conferir o documento.", 503);
  if (!source.data) throw new ExamExtractionError("Exame não encontrado para este médico.", 404);
  if (source.data.content_type !== "application/pdf")
    throw new ExamExtractionError("Este piloto extrai texto apenas de PDFs.", 415);

  const download = await client.storage.from(documentBucket).download(source.data.storage_path, {}, { cache: "no-store" });
  if (download.error || !download.data)
    throw new ExamExtractionError("Não foi possível abrir o original.", 503);
  const bytes = new Uint8Array(await download.data.arrayBuffer());
  if (bytes.length !== source.data.byte_size || !documentBytesMatch("application/pdf", bytes))
    throw new ExamExtractionError("O original não corresponde ao arquivo registrado.", 409);

  const sourceHash = createHash("sha256").update(bytes).digest("hex");
  const prior = await client
    .from("document_extraction_runs")
    .select("id,status,page_count,review_page_count")
    .eq("tenant_id", tenant)
    .eq("document_id", document)
    .eq("source_content_sha256", sourceHash)
    .eq("extractor_name", embeddedTextExtractor.name)
    .eq("extractor_version", embeddedTextExtractor.version)
    .maybeSingle();
  if (prior.error) throw new ExamExtractionError("Não foi possível conferir o processamento anterior.", 503);
  if (prior.data)
    return {
      extractionId: prior.data.id,
      pageCount: prior.data.page_count,
      reviewPageCount: prior.data.review_page_count,
      status: prior.data.status,
    };

  let extracted: Awaited<ReturnType<typeof extractEmbeddedPdfText>>;
  try {
    extracted = await extractEmbeddedPdfText(bytes);
  } catch (error) {
    const failureCode = error instanceof PdfTextError
      ? error.code
      : error instanceof Error && error.name === "PasswordException"
        ? "password_protected"
        : error instanceof Error && error.name === "InvalidPDFException"
          ? "invalid_pdf"
          : null;
    if (!failureCode)
      throw new ExamExtractionError("A extração falhou temporariamente. Tente novamente.", 503);
    const failed = await client.rpc("persist_document_text_extraction", {
      target_tenant: tenant,
      target_document: document,
      source_content_sha256: sourceHash,
      extractor_name: embeddedTextExtractor.name,
      extractor_version: embeddedTextExtractor.version,
      pages: [],
      failure_code: failureCode,
    });
    if (failed.error || !failed.data)
      throw new ExamExtractionError("Não foi possível registrar a falha de extração.", 503);
    return { extractionId: failed.data, pageCount: 0, reviewPageCount: 0, status: "failed" };
  }
  const saved = await client.rpc("persist_document_text_extraction", {
    target_tenant: tenant,
    target_document: document,
    source_content_sha256: extracted.sourceContentSha256,
    extractor_name: embeddedTextExtractor.name,
    extractor_version: embeddedTextExtractor.version,
    pages: extracted.pages,
    failure_code: null,
  });
  if (saved.error || !saved.data)
    throw new ExamExtractionError("Não foi possível guardar o texto extraído.", 503);
  return {
    extractionId: saved.data,
    pageCount: extracted.pageCount,
    reviewPageCount: extracted.pages.filter((page) => page.status === "requires_review").length,
    status: extracted.pages.some((page) => page.status === "requires_review") ? "requires_review" : "extracted",
  };
}

export async function documentExtraction(tenantInput: string, documentInput: string) {
  const tenant = tenantId(tenantInput);
  const document = documentId(documentInput);
  if (!syntheticPilotAllows(document))
    throw new ExamExtractionError("A extração está restrita aos exames sintéticos do piloto.", 403);
  const { client } = await requireClinic(tenant, ["doctor", "nurse"]);
  const source = await client
    .from("patient_documents")
    .select("id,patient_id")
    .eq("tenant_id", tenant)
    .eq("id", document)
    .eq("status", "available")
    .eq("attached_to", "documents")
    .maybeSingle();
  if (source.error) throw new ExamExtractionError("Não foi possível conferir o documento.", 503);
  if (!source.data) throw new ExamExtractionError("Exame não encontrado para esta equipe.", 404);
  const run = await client
    .from("document_extraction_runs")
    .select("id,status,failure_code,page_count,extracted_page_count,review_page_count,failed_page_count,created_at")
    .eq("tenant_id", tenant)
    .eq("document_id", document)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (run.error) throw new ExamExtractionError("Não foi possível consultar a extração.", 503);
  if (!run.data) return null;
  const pages = await client
    .from("document_extracted_pages")
    .select("page_number,status,extraction_method,extracted_text,failure_code")
    .eq("tenant_id", tenant)
    .eq("document_id", document)
    .eq("extraction_run_id", run.data.id)
    .order("page_number")
    .limit(100);
  if (pages.error || (pages.data?.length ?? 0) !== run.data.page_count)
    throw new ExamExtractionError("As páginas extraídas estão incompletas.", 503);
  return { ...run.data, pages: pages.data ?? [] };
}

export type DocumentExtraction = NonNullable<Awaited<ReturnType<typeof documentExtraction>>>;
