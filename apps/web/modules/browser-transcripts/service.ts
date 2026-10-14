import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import { browserTranscriptInput, browserTranscriptReviewInput } from "./validation";
import type { BrowserTranscripts } from "./types";
export class BrowserTranscriptError extends DomainError {}
async function operation(tenantInput: string, appointmentInput: string, action: string, payload: object = {}): Promise<BrowserTranscripts> {
  const tenant = tenantId(tenantInput), appointment = tenantId(appointmentInput);
  const { client, user } = await requireClinic(tenant, ["doctor"]);
  const claims = await client.auth.getClaims(), session = claims.data?.claims.session_id;
  if (claims.error || typeof session !== "string") throw new BrowserTranscriptError("Entre novamente para acessar a transcrição.", 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new BrowserTranscriptError("A transcrição no banco ainda não está disponível.", 503);
  const service = createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) } });
  const { data, error } = await service.rpc("browser_transcript_operation", { operation: action, target_tenant: tenant, actor_id: user.id, actor_session: session, target_appointment: appointment, payload });
  if (error) {
    if (error.code === "42501") throw new BrowserTranscriptError("Seu acesso ou vínculo com a consulta mudou. Atualize a página.", 403);
    if (["23514", "23505", "40001", "22007", "22P02"].includes(error.code)) throw new BrowserTranscriptError("A captura ou a consulta mudou. Confira os dados antes de tentar novamente.", 409);
    throw new BrowserTranscriptError("A transcrição no banco ainda não está disponível.", 503);
  }
  return data as BrowserTranscripts;
}
export function listBrowserTranscripts(tenant: string, appointment: string) { return operation(tenant, appointment, "list"); }
export function saveBrowserTranscript(tenant: string, appointment: string, body: unknown) { return operation(tenant, appointment, "save", browserTranscriptInput(body)); }
export function reviewBrowserTranscript(tenant: string, appointment: string, transcript: string, body: unknown) { return operation(tenant, appointment, "review", { transcriptId: tenantId(transcript), ...browserTranscriptReviewInput(body) }); }
