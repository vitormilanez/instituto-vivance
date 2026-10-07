import "server-only";
import { createHash } from "node:crypto";
import type { Database } from "@/lib/supabase/database.types";
import { documentBucket, documentBytesMatch } from "@/modules/documents/validation";
import { requireClinic } from "@/modules/identity/service";
import { syntheticPilotAllows } from "./pilot";
import { embeddedTextExtractor, extractEmbeddedPdfText, PdfTextError } from "./text";

type ClaimedJob = Database["public"]["Functions"]["claim_next_exam_text_extraction_job"]["Returns"][number];
type WorkerClient = Awaited<ReturnType<typeof requireClinic>>["client"];

async function processClaim(client: WorkerClient, job: ClaimedJob) {
  if (!syntheticPilotAllows(job.document_id)) return "permanent" as const;
  const source = await client.from("patient_documents")
    .select("id,patient_id,storage_path,byte_size,content_type")
    .eq("tenant_id", job.tenant_id).eq("id", job.document_id)
    .eq("patient_id", job.patient_id)
    .eq("status", "available").eq("attached_to", "documents")
    .maybeSingle();
  if (source.error) return "retryable" as const;
  if (!source.data || source.data.content_type !== "application/pdf") return "permanent" as const;
  const download = await client.storage.from(documentBucket)
    .download(source.data.storage_path, {}, { cache: "no-store" });
  if (download.error || !download.data) return "retryable" as const;
  const bytes = new Uint8Array(await download.data.arrayBuffer());
  if (bytes.length !== source.data.byte_size || !documentBytesMatch("application/pdf", bytes))
    return "permanent" as const;
  const sourceHash = createHash("sha256").update(bytes).digest("hex");
  const prior = await client.from("document_extraction_runs").select("id")
    .eq("tenant_id", job.tenant_id).eq("document_id", job.document_id)
    .eq("source_content_sha256", sourceHash)
    .eq("extractor_name", embeddedTextExtractor.name)
    .eq("extractor_version", embeddedTextExtractor.version)
    .maybeSingle();
  if (prior.error) return "retryable" as const;
  if (prior.data) return "completed" as const;

  let pages: Awaited<ReturnType<typeof extractEmbeddedPdfText>>["pages"] = [];
  let failureCode: string | null = null;
  try {
    pages = (await extractEmbeddedPdfText(bytes)).pages;
  } catch (error) {
    failureCode = error instanceof PdfTextError ? error.code
      : error instanceof Error && error.name === "PasswordException" ? "password_protected"
      : error instanceof Error && error.name === "InvalidPDFException" ? "invalid_pdf" : null;
    if (!failureCode) return "retryable" as const;
  }
  const saved = await client.rpc("persist_doctor_exam_text_extraction", {
    target_job: job.job_id,
    target_lease: job.lease_token,
    target_tenant: job.tenant_id,
    target_document: job.document_id,
    source_content_sha256: sourceHash,
    extractor_name: embeddedTextExtractor.name,
    extractor_version: embeddedTextExtractor.version,
    pages,
    failure_code: failureCode,
  });
  if (saved.error || !saved.data) return "retryable" as const;
  return "completed" as const;
}

export async function runOneSyntheticExamJob(tenant: string, document: string) {
  if (process.env.VIVANCE_EXAM_TEXT_PILOT !== "synthetic"
    || process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development"
    || !syntheticPilotAllows(document))
    return;
  try {
    const { client } = await requireClinic(tenant, ["doctor"]);
    const claimed = await client.rpc("claim_doctor_exam_text_extraction_job", {
      target_tenant: tenant, target_document: document,
    });
    if (claimed.error || !claimed.data?.length) return;
    const job = claimed.data[0];
    let outcome: "completed" | "retryable" | "permanent" = "retryable";
    try { outcome = await processClaim(client, job); } catch { /* No source text in logs. */ }
    if (outcome === "completed")
      await client.rpc("complete_doctor_exam_text_extraction_job", {
        target_tenant: tenant, target_document: document,
        target_job: job.job_id, target_lease: job.lease_token,
      });
    else
      await client.rpc("fail_doctor_exam_text_extraction_job", {
        target_tenant: tenant, target_document: document,
        target_job: job.job_id, target_lease: job.lease_token,
        failure_code: outcome,
      });
  } catch { /* Auth changes or transient failures leave the lease recoverable. */ }
}
