import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import { encryptionKey, seal, unseal, digest, nonce } from "./crypto";
import { authorizationUrl, createSpace, googleJson, MEET_SCOPE, MEET_SETTINGS_SCOPE, MeetError, retrieveTranscripts, tokenRequest, type GoogleConfig } from "./provider";
import type { MeetStatus, MeetTranscripts } from "./types";

function configuration(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_MEET_CLIENT_ID, clientSecret = process.env.GOOGLE_MEET_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_MEET_REDIRECT_URI, rawKey = process.env.GOOGLE_MEET_TOKEN_ENCRYPTION_KEY;
  if (!clientId || !clientSecret || !redirectUri || !rawKey || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    const uri = new URL(redirectUri);
    if (uri.pathname !== "/api/integrations/google-meet/callback" || uri.search || uri.hash || uri.username || uri.password || !(uri.protocol === "https:" || uri.protocol === "http:" && uri.hostname === "localhost")) return null;
    return { clientId, clientSecret, redirectUri, key: encryptionKey(rawKey) };
  } catch { return null; }
}
function configured() {
  const config = configuration();
  if (!config) throw new MeetError("A integração Google Meet ainda não foi configurada.", 503);
  return config;
}
async function context(tenantInput: string) {
  const tenant = tenantId(tenantInput);
  const { client, user } = await requireClinic(tenant, ["doctor"]);
  const claims = await client.auth.getClaims();
  const session = claims.data?.claims.session_id;
  if (claims.error || typeof session !== "string") throw new MeetError("Entre novamente para conectar o Google Meet.", 401);
  const config = configured();
  const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) } });
  const binding = `${tenant}:${user.id}`;
  async function rpc(operation: string, appointment: string | null = null, payload: Record<string, unknown> = {}) {
    const { data, error } = await service.rpc("google_meet_operation", { operation, target_tenant: tenant, actor_id: user.id, actor_session: session, target_appointment: appointment ? tenantId(appointment) : null, payload });
    if (error) {
      if (error.code === "42501") throw new MeetError("Seu acesso ou sua sessão mudou. Atualize a página.", 403);
      if (["23514", "23505", "40001"].includes(error.code)) throw new MeetError("A consulta, a sala ou a conexão mudou. Confira o vínculo e a permissão do paciente antes de tentar novamente.", 409);
      throw new MeetError("A integração no banco ainda não está disponível.", 503);
    }
    return data;
  }
  return { tenant, user, config, binding, rpc };
}
type Context = Awaited<ReturnType<typeof context>>;
async function requireNativeTranscription(tenant: string) {
  await requireClinic(tenantId(tenant), ["doctor"]);
  if (process.env.GOOGLE_MEET_TRANSCRIPTION_ENABLED !== "true") throw new MeetError("A transcrição nativa do Meet está desativada. Use a transcrição gratuita pelo navegador nesta consulta.", 409);
}
async function accessToken(ctx: Context, connection: { refresh_ciphertext: string | null }) {
  if (!connection.refresh_ciphertext) throw new MeetError("Conecte sua conta Google para continuar.", 409);
  const refresh = unseal(connection.refresh_ciphertext, ctx.config.key, ctx.binding);
  const data = await tokenRequest(ctx.config, { grant_type: "refresh_token", refresh_token: refresh });
  if (typeof data.access_token !== "string") throw new MeetError("Reconecte sua conta Google.", 409);
  return data.access_token;
}
export async function meetStatus(tenantInput: string): Promise<MeetStatus> {
  await requireClinic(tenantId(tenantInput), ["doctor"]);
  if (!configuration()) return { configured: false, available: false, connected: false, accountEmail: null, reason: "configuration_required" };
  try {
    const ctx = await context(tenantInput), connection = await ctx.rpc("connection");
    return { configured: true, available: true, connected: !!connection.connected_at, accountEmail: connection.connected_at ? connection.account_email : null, reason: connection.connected_at ? null : "not_connected" };
  } catch (error) {
    if (error instanceof MeetError && error.status === 503) return { configured: true, available: false, connected: false, accountEmail: null, reason: "database_unavailable" };
    throw error;
  }
}
export async function connectMeet(tenantInput: string) {
  const ctx = await context(tenantInput), state = `${ctx.tenant}.${nonce()}`, verifier = nonce();
  await ctx.rpc("oauth_start", null, { stateHash: digest(state), verifier: seal(verifier, ctx.config.key, `${ctx.binding}:pkce`) });
  return { authorizationUrl: authorizationUrl(ctx.config, state, createHash("sha256").update(verifier).digest("base64url")) };
}
export async function completeMeetOAuth(request: Request): Promise<string> {
  const params = new URL(request.url).searchParams, state = params.get("state") ?? "";
  if (!/^[a-f0-9-]{36}\.[A-Za-z0-9_-]{43}$/.test(state)) throw new MeetError("Conexão expirada ou inválida.", 403);
  const tenant = tenantId(state.split(".")[0]), ctx = await context(tenant);
  // Consume before token exchange: expiry, same live session and single use.
  const stateRow = await ctx.rpc("oauth_consume", null, { stateHash: digest(state) });
  if (params.get("error") || !params.get("code") || params.get("code")!.length > 4096) throw new MeetError("Conexão não autorizada.", 409);
  const tokens = await tokenRequest(ctx.config, { grant_type: "authorization_code", code: params.get("code")!, redirect_uri: ctx.config.redirectUri, code_verifier: unseal(stateRow.verifier_ciphertext, ctx.config.key, `${ctx.binding}:pkce`) });
  try {
    if (typeof tokens.refresh_token !== "string" || typeof tokens.access_token !== "string" || typeof tokens.scope !== "string" || ![MEET_SCOPE, MEET_SETTINGS_SCOPE].every((scope) => (tokens.scope as string).split(" ").includes(scope))) throw new MeetError("Autorize os acessos do Meet e tente conectar novamente.", 409);
    const account = await googleJson("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    if (typeof account.sub !== "string" || typeof account.email !== "string" || account.email_verified !== true) throw new MeetError("Não foi possível verificar a conta Google.", 409);
    await ctx.rpc("oauth_finish", null, { stateHash: digest(state), refreshCiphertext: seal(tokens.refresh_token, ctx.config.key, ctx.binding), accountEmail: account.email, googleSubject: account.sub });
  } catch (error) {
    // Also attempt revocation after partial consent, identity lookup failures,
    // or a disconnect/reconnect that invalidates this callback.
    const orphan = typeof tokens.refresh_token === "string" ? tokens.refresh_token : typeof tokens.access_token === "string" ? tokens.access_token : null;
    if (orphan) await revoke(orphan).catch(() => {});
    throw error;
  }
  return tenant;
}
async function revoke(token: string) {
  const response = await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", redirect: "error", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }), signal: AbortSignal.timeout(12000), cache: "no-store" });
  await response.body?.cancel();
  return response.ok;
}
export async function disconnectMeet(tenantInput: string) {
  const ctx = await context(tenantInput), connection = await ctx.rpc("connection");
  // Local disable is durable even if Google revocation is temporarily offline.
  await ctx.rpc("disconnect");
  let revoked = true;
  if (connection.refresh_ciphertext) {
    try { revoked = await revoke(unseal(connection.refresh_ciphertext, ctx.config.key, ctx.binding)); } catch { revoked = false; }
  }
  return { disconnected: true, googleRevocationConfirmed: revoked };
}
export async function createMeetRoom(tenantInput: string, appointmentInput: string) {
  const ctx = await context(tenantInput), appointment = tenantId(appointmentInput), attemptId = randomUUID();
  const existing = await ctx.rpc("list", appointment) as MeetTranscripts;
  if (existing.room?.status === "ready") return existing.room;
  // Get a token before reserving so revoked credentials cannot strand a room.
  const connection = await ctx.rpc("connection"), token = await accessToken(ctx, connection);
  const room = await ctx.rpc("room_reserve", appointment, { attemptId, generation: connection.generation });
  if (room.status === "ready") return { status: "ready", meetingUri: room.meeting_uri, spaceName: room.space_name };
  if (room.attempt_id !== attemptId || room.status !== "creating") throw new MeetError("A criação desta sala já começou. Se não aparecer, é necessária recuperação técnica antes de gerar outra sala.", 409);
  try {
    const space = await createSpace(token);
    const saved = await ctx.rpc("room_finish", appointment, { attemptId, ...space });
    return { status: "ready", meetingUri: saved.meeting_uri, spaceName: saved.space_name };
  } catch (error) {
    await ctx.rpc("room_fail", appointment, { attemptId }).catch(() => {});
    throw error;
  }
}
export async function listMeetTranscripts(tenantInput: string, appointmentInput: string): Promise<MeetTranscripts> {
  await requireNativeTranscription(tenantInput);
  const ctx = await context(tenantInput);
  return await ctx.rpc("list", appointmentInput) as MeetTranscripts;
}
export async function confirmMeetConsent(tenantInput: string, appointmentInput: string, body: unknown): Promise<MeetTranscripts> {
  await requireNativeTranscription(tenantInput);
  const input = body as { patientPermissionConfirmed?: unknown; permissionNote?: unknown };
  if (input?.patientPermissionConfirmed !== true || typeof input.permissionNote !== "string" || input.permissionNote.trim().length < 5 || input.permissionNote.length > 500) throw new MeetError("Confirme a permissão do paciente e registre quando e como ela foi obtida.", 400);
  const ctx = await context(tenantInput);
  return await ctx.rpc("consent", appointmentInput, { patientPermissionConfirmed: true, permissionNote: input.permissionNote.trim() }) as MeetTranscripts;
}
export async function syncMeetTranscripts(tenantInput: string, appointmentInput: string) {
  await requireNativeTranscription(tenantInput);
  const ctx = await context(tenantInput), bound = await ctx.rpc("sync_context", appointmentInput);
  const token = await accessToken(ctx, bound.connection);
  const response = await retrieveTranscripts(token, bound.room);
  if (response.sources.length) await ctx.rpc("import", appointmentInput, { generation: bound.connection.generation, spaceName: bound.room.space_name, sources: response.sources.map((source) => ({ ...source, sourceHash: digest(JSON.stringify({ entries: source.entries, metadata: source.metadata })) })) });
  const current = await ctx.rpc("list", appointmentInput) as MeetTranscripts;
  return { status: response.status, imports: current.imports };
}
export async function reviewMeetTranscript(tenantInput: string, appointmentInput: string, transcriptInput: string, body: unknown): Promise<MeetTranscripts> {
  await requireNativeTranscription(tenantInput);
  const input = body as { decision?: unknown; note?: unknown };
  if (!input || !["reviewed", "rejected"].includes(input.decision as string) || typeof input.note !== "string" || !input.note.trim() || input.note.length > 2000) throw new MeetError("Informe a conferência ou rejeição e uma nota de revisão.", 400);
  const ctx = await context(tenantInput);
  return await ctx.rpc("review", appointmentInput, { transcriptId: tenantId(transcriptInput), decision: input.decision, note: input.note.trim() }) as MeetTranscripts;
}
