import "server-only";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { documentBucket, documentBytesMatch } from "@/modules/documents/validation";
import { syntheticPilotAllows } from "./pilot";
import { embeddedTextExtractor, extractEmbeddedPdfText, PdfTextError } from "./text";

// Only the server can hold this key. Every claimed document is checked against
// the Preview allowlist again; the database enforces its private allowlist too.
function workerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Synthetic exam worker is not configured.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

type ClaimedJob = Database["public"]["Functions"]["claim_next_exam_text_extraction_job"]["Returns"][number];

async function processClaim(client: ReturnType<typeof workerClient>, job: ClaimedJob) {
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
  const saved = await client.rpc("persist_queued_document_text_extraction", {
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

export async function runOneSyntheticExamJob() {
  if (process.env.VIVANCE_EXAM_TEXT_PILOT !== "synthetic"
    || process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development")
    return;
  const client = workerClient();
  const claimed = await client.rpc("claim_next_exam_text_extraction_job");
  if (claimed.error || !claimed.data?.length) return;
  const job = claimed.data[0];
  let outcome: "completed" | "retryable" | "permanent" = "retryable";
  try { outcome = await processClaim(client, job); } catch { /* No source text in logs. */ }
  if (outcome === "completed")
    await client.rpc("complete_processing_job", { target_job: job.job_id, target_lease: job.lease_token });
  else
    await client.rpc("fail_processing_job", {
      target_job: job.job_id,
      target_lease: job.lease_token,
      failure_code: outcome,
    });
}
