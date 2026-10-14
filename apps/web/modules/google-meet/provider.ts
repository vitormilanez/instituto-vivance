import "server-only";
import { DomainError } from "../../lib/errors.ts";
import type { MeetEntry } from "./types.ts";
export const MEET_SCOPE = "https://www.googleapis.com/auth/meetings.space.created";
// Required only to explicitly disable inherited automatic artifacts on new
// spaces. We never modify third-party rooms or enable recording/transcription.
export const MEET_SETTINGS_SCOPE = "https://www.googleapis.com/auth/meetings.space.settings";
export const OAUTH_SCOPES = [MEET_SCOPE, MEET_SETTINGS_SCOPE, "openid", "email"];
export class MeetError extends DomainError {}
type Obj = Record<string, unknown>;
const asObject = (value: unknown): Obj => value && typeof value === "object" && !Array.isArray(value) ? value as Obj : {};
const str = (value: unknown) => typeof value === "string" ? value : "";
const validTime = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
export type GoogleConfig = { clientId: string; clientSecret: string; redirectUri: string; key: Buffer };

// Never log a provider payload: OAuth errors and responses can contain tokens.
export async function googleJson(url: string, init: RequestInit = {}, fetcher: typeof fetch = fetch): Promise<Obj> {
  let response: Response;
  try { response = await fetcher(url, { ...init, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(12000) }); }
  catch { throw new MeetError("O Google não respondeu. Tente novamente.", 503); }
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 401) throw new MeetError("Reconecte sua conta Google para continuar.", 409);
    if (response.status === 403) throw new MeetError("A conta Google não permite esta operação. Confira a licença e as permissões do Meet.", 409);
    throw new MeetError("Não foi possível consultar o Google Meet. Tente novamente.", 503);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new MeetError("Resposta do Google incompleta.", 503);
  const chunks: Uint8Array[] = []; let bytes = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    bytes += value.length;
    if (bytes > 4 * 1024 * 1024) { await reader.cancel(); throw new MeetError("Resposta muito extensa; importação não concluída.", 409); }
    chunks.push(value);
  }
  try { return asObject(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
  catch { throw new MeetError("Resposta do Google incompleta.", 503); }
}
export function authorizationUrl(config: GoogleConfig, state: string, challenge: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: "code", scope: OAUTH_SCOPES.join(" "), access_type: "offline", prompt: "consent select_account", state, code_challenge: challenge, code_challenge_method: "S256", include_granted_scopes: "false" }).toString();
  return url.toString();
}
export async function tokenRequest(config: GoogleConfig, fields: Record<string, string>) {
  return googleJson("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...fields }) });
}
export async function createSpace(token: string, fetcher: typeof fetch = fetch) {
  const data = await googleJson("https://meet.googleapis.com/v2/spaces", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ config: { accessType: "RESTRICTED", artifactConfig: { recordingConfig: { autoRecordingGeneration: "OFF" }, transcriptionConfig: { autoTranscriptionGeneration: "OFF" }, smartNotesConfig: { autoSmartNotesGeneration: "OFF" } } } }) }, fetcher);
  const name = str(data.name), meetingUri = str(data.meetingUri);
  if (!/^spaces\/[A-Za-z0-9_-]+$/.test(name) || !/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(meetingUri)) throw new MeetError("A sala criada precisa de recuperação técnica. Não gere outra sala para esta consulta.", 409);
  return { spaceName: name, meetingUri };
}

// Pagination is all-or-nothing. A page limit, loop, malformed entry or budget
// exhaustion never becomes a supposedly complete clinical source.
export async function collectPages(path: string, key: string, token: string, query: Record<string, string> = {}, fetcher: typeof fetch = fetch, budget: { requests: number; deadline: number; bytes?: number } = { requests: 0, deadline: Date.now() + 45000 }): Promise<Obj[]> {
  const result: Obj[] = []; let pageToken = ""; const seen = new Set<string>();
  do {
    if (++budget.requests > 60 || Date.now() > budget.deadline) throw new MeetError("Transcrição extensa ou ainda incompleta. A importação não foi salva; tente novamente.", 409);
    const url = new URL(`https://meet.googleapis.com/v2/${path}`);
    url.search = new URLSearchParams({ ...query, pageSize: "100", ...(pageToken ? { pageToken } : {}) }).toString();
    const data = await googleJson(url.toString(), { headers: { Authorization: `Bearer ${token}` } }, fetcher);
    budget.bytes = (budget.bytes ?? 0) + Buffer.byteLength(JSON.stringify(data));
    if (budget.bytes > 4 * 1024 * 1024) throw new MeetError("Transcrição extensa; importação não salva.", 409);
    if (data[key] !== undefined && !Array.isArray(data[key])) throw new MeetError("Transcrição incompleta; importação não salva.", 409);
    result.push(...((data[key] ?? []) as unknown[]).map(asObject));
    if (result.length > 5000) throw new MeetError("Transcrição extensa; importação não salva.", 409);
    if (data.nextPageToken !== undefined && typeof data.nextPageToken !== "string") throw new MeetError("Paginação incompleta; importação não salva.", 409);
    pageToken = str(data.nextPageToken);
    if (pageToken && seen.has(pageToken)) throw new MeetError("Paginação incompleta; importação não salva.", 409);
    seen.add(pageToken);
  } while (pageToken);
  return result;
}
export function normalizeEntries(raw: Obj[], conferenceName: string, transcriptName: string): MeetEntry[] {
  const names = new Set<string>();
  const entries = raw.map((entry) => {
    const name = str(entry.name), speaker = str(entry.participant), text = str(entry.text);
    if (!name.startsWith(`${transcriptName}/entries/`) || names.has(name) || !speaker.startsWith(`${conferenceName}/participants/`) || !text.trim() || !validTime(entry.startTime) || !validTime(entry.endTime) || Date.parse(str(entry.endTime)) < Date.parse(str(entry.startTime))) throw new MeetError("Transcrição incompleta; importação não salva.", 409);
    names.add(name);
    return { name, speaker, startTime: str(entry.startTime), endTime: str(entry.endTime), text, languageCode: str(entry.languageCode) || null };
  });
  if (JSON.stringify(entries).length > 4 * 1024 * 1024) throw new MeetError("Transcrição extensa; importação não salva.", 409);
  return entries.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime) || a.name.localeCompare(b.name));
}
export async function retrieveTranscripts(token: string, room: { space_name: string; starts_at: string; ends_at: string; conference_name: string | null }, fetcher: typeof fetch = fetch) {
  const start = new Date(Date.parse(room.starts_at) - 30 * 60000).toISOString(), end = new Date(Date.parse(room.ends_at) + 120 * 60000).toISOString();
  const budget = { requests: 0, deadline: Date.now() + 45000 };
  const conferences = await collectPages("conferenceRecords", "conferenceRecords", token, { filter: `space.name = "${room.space_name}" AND start_time >= "${start}" AND start_time <= "${end}"` }, fetcher, budget);
  const selected = conferences.filter((item) => str(item.space) === room.space_name && validTime(item.startTime) && Date.parse(str(item.startTime)) >= Date.parse(start) && Date.parse(str(item.startTime)) <= Date.parse(end) && (!room.conference_name || item.name === room.conference_name));
  if (!selected.length) return { status: "not_available" as const, sources: [] };
  if (selected.length !== 1) throw new MeetError("Há mais de uma sessão nesta sala. A vinculação exige conferência técnica; nada foi importado.", 409);
  const conference = selected[0], conferenceName = str(conference.name);
  if (!/^conferenceRecords\/[A-Za-z0-9_-]+$/.test(conferenceName)) throw new MeetError("Sessão do Google inválida.", 409);
  if (!validTime(conference.endTime)) return { status: "processing" as const, sources: [] };
  if (Date.parse(str(conference.endTime)) < Date.parse(str(conference.startTime)) || Date.parse(str(conference.endTime)) > Date.parse(end)) throw new MeetError("A sessão ultrapassa a janela desta consulta. Confira a vinculação antes de importar.", 409);
  const transcripts = await collectPages(`${conferenceName}/transcripts`, "transcripts", token, {}, fetcher, budget);
  if (!transcripts.length) return { status: "not_available" as const, sources: [] };
  if (transcripts.some((t) => t.state !== "FILE_GENERATED")) return { status: "processing" as const, sources: [] };
  const sources: { conferenceName: string; transcriptName: string; entries: MeetEntry[]; metadata: Obj }[] = [];
  for (const transcript of transcripts) {
    const transcriptName = str(transcript.name);
    if (!transcriptName.startsWith(`${conferenceName}/transcripts/`) || !/^conferenceRecords\/[A-Za-z0-9_-]+\/transcripts\/[A-Za-z0-9_-]+$/.test(transcriptName)) throw new MeetError("Fonte do Google inválida.", 409);
    const entries = normalizeEntries(await collectPages(`${transcriptName}/entries`, "transcriptEntries", token, {}, fetcher, budget), conferenceName, transcriptName);
    if (!entries.length) throw new MeetError("A transcrição não contém trechos disponíveis. Nada foi importado.", 409);
    sources.push({ conferenceName, transcriptName, entries, metadata: { startTime: transcript.startTime ?? null, endTime: transcript.endTime ?? null, state: transcript.state, origin: "google_meet_api_entries" } });
  }
  return { status: "imported" as const, sources };
}
