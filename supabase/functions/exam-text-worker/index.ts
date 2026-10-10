/// <reference lib="deno.ns" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { extractText, getDocumentProxy } from "unpdf";
import { parseSyntheticFixture, type SourcePage } from "./synthetic-structure.ts";
import { extractTextWithClaude, requestClaude, groundedItems, groundedMetadata, primaryModel, fallbackModel, promptVersion, type ClaudeResult } from "./claude-extraction.ts";

const bucket = "vivance-documents";
const extractorName = "unpdf-embedded-text";
const extractorVersion = "1.8.1+vivance-claude.2";
const maxPages = 50;
const maxPageCharacters = 80_000;
const maxDocumentCharacters = 500_000;

type Job = {
  job_id: string;
  tenant_id: string;
  patient_id: string;
  document_id: string;
  lease_token: string;
};

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function configuredSecret() {
  const dictionary = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (dictionary) {
    try {
      const parsed = JSON.parse(dictionary) as Record<string, unknown>;
      if (typeof parsed.default === "string" && parsed.default) return parsed.default;
    } catch { /* Fall through while hosted keys migrate. */ }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

async function sha256(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function shingles(value: string) {
  const normalized = value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
  const values = new Set<string>();
  for (let index = 0; index <= normalized.length - 8; index++)
    values.add(normalized.slice(index, index + 8));
  return { length: normalized.length, values };
}

function markPossibleRepeatedPages<T extends { extracted_text: string | null; page_number: number }>(pages: T[]) {
  const indexed = pages.map((page) => page.extracted_text ? shingles(page.extracted_text) : null);
  return pages.map((page, index) => {
    const current = indexed[index];
    if (!current || current.length < 400) return page;
    for (let earlier = 0; earlier < index; earlier++) {
      const previous = indexed[earlier];
      if (!previous || previous.length < 400
        || Math.min(current.length, previous.length) / Math.max(current.length, previous.length) < 0.97)
        continue;
      let shared = 0;
      for (const value of current.values) if (previous.values.has(value)) shared++;
      if ((2 * shared) / (current.values.size + previous.values.size) >= 0.99)
        return { ...page, status: "requires_review", possible_duplicate_of_page: pages[earlier].page_number };
    }
    return page;
  });
}

async function extractPdf(bytes: Uint8Array) {
  if (bytes.length < 5 || new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-")
    throw new Error("invalid_pdf");
  const pdf = await getDocumentProxy(bytes.slice());
  try {
    if (pdf.numPages < 1 || pdf.numPages > maxPages) throw new Error("page_limit");
    const extracted = await extractText(pdf);
    if (!Array.isArray(extracted.text) || extracted.totalPages !== pdf.numPages)
      throw new Error("incomplete_text");
    let totalCharacters = 0;
    const pages = [];
    for (let index = 0; index < extracted.text.length; index++) {
      const value = extracted.text[index].replace(/\r\n?/g, "\n").trim();
      totalCharacters += value.length;
      if (value.length > maxPageCharacters || totalCharacters > maxDocumentCharacters)
        throw new Error("text_limit");
      pages.push({
        page_number: index + 1,
        status: value ? "extracted" : "requires_review",
        extraction_method: value ? "embedded_text" : "none",
        extracted_text: value || null,
        text_sha256: value ? await sha256(value) : null,
        failure_code: null,
        possible_duplicate_of_page: null as number | null,
      });
    }
    return markPossibleRepeatedPages(pages);
  } finally {
    await pdf.loadingTask.destroy();
  }
}

function base64(bytes: Uint8Array) {
  let value = "";
  for (let index = 0; index < bytes.length; index += 8192)
    value += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return btoa(value);
}

async function extractVisual(bytes: Uint8Array, contentType: string, pageNumbers: number[], apiKey: string) {
  if (pageNumbers.length > 20) throw new Error("ocr_page_limit");
  const content = [
    { type: contentType === "application/pdf" ? "document" : "image", source: {
      type: "base64", media_type: contentType, data: base64(bytes),
    } },
    { type: "text", text: `Transcreva SOMENTE as páginas ${pageNumbers.join(", ")}. Preserve a numeração original e todos os resultados.` },
  ];
  let result = await requestClaude(apiKey, primaryModel, content);
  if (pageNumbers.some((number) => !result.pages.find((p) => p.page_number === number)?.source_text))
    result = await requestClaude(apiKey, fallbackModel, content);
  if (pageNumbers.some((number) => !result.pages.some((p) => p.page_number === number)))
    throw new Error("claude_incomplete");
  const pages = [];
  for (const number of pageNumbers) {
    const value = result.pages.find((p) => p.page_number === number)?.source_text?.replace(/\r\n?/g, "\n").trim() || null;
    if (value && value.length > maxPageCharacters) throw new Error("text_limit");
    pages.push({ page_number: number, status: "requires_review", extraction_method: value ? "claude_vision" : "none",
      extracted_text: value, text_sha256: value ? await sha256(value) : null, failure_code: null, possible_duplicate_of_page: null });
  }
  return { pages, result };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Método inválido." }, 405);
  const cronSecret = Deno.env.get("EXAM_WORKER_CRON_SECRET") ?? "";
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`)
    return json({ error: "Não autorizado." }, 401);
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const secret = configuredSecret();
  if (!url || !secret) return json({ error: "Worker indisponível." }, 503);
  const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const claimed = await client.rpc("claim_next_exam_text_extraction_job");
  if (claimed.error) return json({ error: "Não foi possível reservar a fila." }, 503);
  if (!claimed.data?.length) return new Response(null, { status: 204 });
  const job = claimed.data[0] as Job;
  let outcome: "retryable" | "permanent" = "retryable";
  try {
    const source = await client.from("patient_documents")
      .select("id,patient_id,storage_path,byte_size,content_type,display_title,original_filename")
      .eq("tenant_id", job.tenant_id).eq("id", job.document_id)
      .eq("patient_id", job.patient_id).eq("status", "available")
      .eq("attached_to", "documents").maybeSingle();
    if (source.error) throw new Error("source_unavailable");
    if (!source.data || !["application/pdf", "image/jpeg", "image/png"].includes(source.data.content_type)) outcome = "permanent";
    else {
      const download = await client.storage.from(bucket).download(source.data.storage_path);
      if (download.error || !download.data) throw new Error("download_failed");
      const bytes = new Uint8Array(await download.data.arrayBuffer());
      if (bytes.length !== source.data.byte_size) outcome = "permanent";
      else {
        const sourceHash = await sha256(bytes);
        const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
        if (!apiKey) throw new Error("claude_configuration");
        const prior = await client.from("document_extraction_runs").select("id")
          .eq("document_id", job.document_id).eq("tenant_id", job.tenant_id)
          .eq("source_content_sha256", sourceHash).eq("extractor_version", extractorVersion).maybeSingle();
        if (prior.error) throw new Error("prior_run_unavailable");
        let pages;
        let visualResult: ClaudeResult | null = null;
        if (!prior.data && source.data.content_type === "application/pdf") {
          pages = await extractPdf(bytes);
          const unreadable = pages.filter((p) => !p.extracted_text || p.extracted_text.length < 50).map((p) => p.page_number);
          if (unreadable.length) {
            const visual = await extractVisual(bytes, source.data.content_type, unreadable, apiKey);
            pages = pages.map((page) => visual.pages.find((p) => p.page_number === page.page_number) ?? page);
          }
        } else if (!prior.data) {
          const visual = await extractVisual(bytes, source.data.content_type, [1], apiKey);
          pages = visual.pages;
          visualResult = visual.result;
        }
        const saved = prior.data ? { data: prior.data.id, error: null } : await client.rpc("persist_queued_document_text_extraction", {
          target_job: job.job_id, target_lease: job.lease_token,
          target_tenant: job.tenant_id, target_document: job.document_id,
          source_content_sha256: sourceHash, extractor_name: source.data.content_type === "application/pdf" ? extractorName : "claude-vision",
          extractor_version: extractorVersion, pages, failure_code: null,
        });
        if (saved.error || !saved.data) throw new Error("persist_failed");
        const storedPages = await client.from("document_extracted_pages")
          .select("id,page_number,extracted_text,possible_duplicate_of_page")
          .eq("extraction_run_id", saved.data)
          .order("page_number", { ascending: true });
        if (storedPages.error) throw new Error("structured_source_unavailable");
        const existing = await client.from("exam_document_metadata").select("extraction_run_id").eq("extraction_run_id", saved.data).maybeSingle();
        if (existing.error) throw new Error("metadata_unavailable");
        const sourcePages = (storedPages.data ?? []) as SourcePage[];
        const structured = parseSyntheticFixture(sourcePages);
        if (!existing.data && structured.length) {
          const persisted = await client.rpc("persist_synthetic_exam_result_items", {
            target_run: saved.data,
            structured_extractor_name: "vivance-synthetic-fixture",
            structured_extractor_version: "1",
            items: structured,
          });
          if (persisted.error) throw new Error("structured_persist_failed");
        } else if (!existing.data) {
          const result = visualResult ?? await extractTextWithClaude(apiKey, sourcePages);
          let grounded = groundedItems(sourcePages, result);
          if (grounded.discarded) {
            // A stronger model is used only for source-grounding failures, once per document.
            const affected = sourcePages.filter((page) => grounded.rejectedPages.includes(page.page_number));
            const retry = await extractTextWithClaude(apiKey, affected, fallbackModel);
            retry.metadata.input_tokens = Number(retry.metadata.input_tokens) + Number(result.metadata.input_tokens);
            retry.metadata.output_tokens = Number(retry.metadata.output_tokens) + Number(result.metadata.output_tokens);
            result.pages = result.pages.map((page) => retry.pages.find((entry) => entry.page_number === page.page_number) ?? page);
            result.metadata = { ...result.metadata, model: `${primaryModel}+${fallbackModel}`,
              input_tokens: retry.metadata.input_tokens, output_tokens: retry.metadata.output_tokens };
            grounded = groundedItems(sourcePages, result);
          }
          const quality = Array.isArray(result.metadata.quality_notes) ? result.metadata.quality_notes as string[] : [];
          if (grounded.discarded) quality.push(`${grounded.discarded} item(ns) não puderam ser vinculados literalmente à página; conferir original.`);
          if (!grounded.items.length) quality.push("Não foi possível organizar resultados com fonte verificável. Confira o documento original.");
          result.metadata.quality_notes = quality.slice(0, 10);
          const allText = sourcePages.map((page) => page.extracted_text ?? "").join("\n");
          result.metadata.summary = (Array.isArray(result.metadata.summary) ? result.metadata.summary : [])
            .filter((entry: unknown) => typeof entry === "string" && allText.includes(entry)).slice(0, 3);
          result.metadata.prompt_version = promptVersion;
          result.metadata = groundedMetadata(sourcePages, result.metadata, source.data.display_title);
          const persisted = await client.rpc("persist_exam_ai_extraction", {
            target_run: saved.data, structured_extractor_name: "claude-factual-extraction",
            structured_extractor_version: promptVersion, items: grounded.items, metadata: result.metadata,
          });
          if (persisted.error) throw new Error("structured_persist_failed");
        }
        const completed = await client.rpc("complete_processing_job", {
          target_job: job.job_id, target_lease: job.lease_token,
        });
        if (completed.error) throw new Error("complete_failed");
        return json({ status: "completed", job_id: job.job_id });
      }
    }
  } catch (error) {
    if (error instanceof Error && ["invalid_pdf", "page_limit", "ocr_page_limit", "text_limit", "incomplete_text", "claude_configuration"].includes(error.message))
      outcome = "permanent";
    // Operational codes only: no document text, personal information or provider response.
    console.error("exam_worker", error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : "processing_failed");
  }
  await client.rpc("fail_processing_job", {
    target_job: job.job_id, target_lease: job.lease_token, failure_code: outcome,
  });
  return json({ status: outcome, job_id: job.job_id }, outcome === "retryable" ? 503 : 422);
});
