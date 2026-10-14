import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { encryptionKey, seal, unseal, nonce } from "../modules/google-meet/crypto.ts";
import { authorizationUrl, collectPages, createSpace, retrieveTranscripts, MEET_SCOPE, MEET_SETTINGS_SCOPE } from "../modules/google-meet/provider.ts";
const room = { space_name: "spaces/ABC", starts_at: "2026-10-14T12:00:00Z", ends_at: "2026-10-14T13:00:00Z", conference_name: null };
const conference = { name: "conferenceRecords/C", space: room.space_name, startTime: "2026-10-14T12:01:00Z", endTime: "2026-10-14T12:58:00Z" };
const transcript = { name: "conferenceRecords/C/transcripts/T", state: "FILE_GENERATED", startTime: conference.startTime, endTime: conference.endTime };
const entry = (id: string) => ({ name: `${transcript.name}/entries/${id}`, participant: "conferenceRecords/C/participants/P", text: "Relato literal sintético", startTime: "2026-10-14T12:02:00Z", endTime: "2026-10-14T12:03:00Z", languageCode: "pt-BR" });
const fetcher = (run: (url: URL) => unknown): typeof fetch => async (url) => Response.json(run(new URL(String(url))));
test("AES-GCM credentials are randomized and tenant/doctor bound", () => {
  const key = encryptionKey(randomBytes(32).toString("base64"));
  const encrypted = seal("synthetic refresh", key, "tenant:doctor");
  assert.equal(unseal(encrypted, key, "tenant:doctor"), "synthetic refresh");
  assert.notEqual(encrypted, seal("synthetic refresh", key, "tenant:doctor"));
  assert.throws(() => unseal(encrypted, key, "tenant:other-doctor"));
  assert.throws(() => encryptionKey("short"));
});
test("OAuth requests minimal app-created scope and PKCE, offline and fresh consent", () => {
  const url = new URL(authorizationUrl({ clientId: "synthetic", clientSecret: "not-rendered", redirectUri: "https://example.test/callback", key: randomBytes(32) }, nonce(), nonce()));
  assert.equal(url.searchParams.get("scope"), `${MEET_SCOPE} ${MEET_SETTINGS_SCOPE} openid email`);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.has("client_secret"), false);
});
test("new room disables automatic recording, transcription and AI notes", async () => {
  const mock: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.config.artifactConfig.transcriptionConfig.autoTranscriptionGeneration, "OFF");
    assert.equal(body.config.artifactConfig.recordingConfig.autoRecordingGeneration, "OFF");
    assert.equal(body.config.artifactConfig.smartNotesConfig.autoSmartNotesGeneration, "OFF");
    return Response.json({ name: "spaces/A", meetingUri: "https://meet.google.com/abc-defg-hij" });
  };
  assert.equal((await createSpace("synthetic", mock)).spaceName, "spaces/A");
});
test("complete paginated transcript preserves speaker, time and literal content", async () => {
  let calls = 0;
  const mock = fetcher((url) => {
    calls++;
    if (url.pathname.endsWith("/conferenceRecords")) { assert.match(url.searchParams.get("filter")!, /space.name = "spaces\/ABC"/); return { conferenceRecords: [conference] }; }
    if (url.pathname.endsWith("/transcripts")) return { transcripts: [transcript] };
    return url.searchParams.has("pageToken") ? { transcriptEntries: [entry("2")] } : { transcriptEntries: [entry("1")], nextPageToken: "page2" };
  });
  const result = await retrieveTranscripts("synthetic", room, mock);
  assert.equal(result.status, "imported"); assert.equal(calls, 4);
  assert.equal(result.sources[0].entries.length, 2);
  assert.deepEqual(result.sources[0].entries[0], { name: entry("1").name, speaker: entry("1").participant, text: entry("1").text, startTime: entry("1").startTime, endTime: entry("1").endTime, languageCode: "pt-BR" });
});
test("bound-space and ambiguous-session checks reject cross-patient imports", async () => {
  const wrongSpace = await retrieveTranscripts("x", room, fetcher(() => ({ conferenceRecords: [{ ...conference, space: "spaces/OTHER" }] })));
  assert.equal(wrongSpace.status, "not_available");
  await assert.rejects(retrieveTranscripts("x", room, fetcher(() => ({ conferenceRecords: [conference, { ...conference, name: "conferenceRecords/OTHER" }] }))), /mais de uma sessão/);
});
test("processing and no transcript are honest states, never empty imported sources", async () => {
  const mock = (state: string) => fetcher((url) => url.pathname.endsWith("/conferenceRecords") ? { conferenceRecords: [conference] } : { transcripts: [{ ...transcript, state }] });
  assert.equal((await retrieveTranscripts("x", room, mock("ENDED"))).status, "processing");
  assert.equal((await retrieveTranscripts("x", room, fetcher(() => ({ conferenceRecords: [] })))).status, "not_available");
});
test("pagination loops, missing timestamps, wrong speakers, and bounds fail without a partial source", async () => {
  await assert.rejects(collectPages("conferenceRecords", "conferenceRecords", "x", {}, fetcher(() => ({ conferenceRecords: [], nextPageToken: "loop" }))), /Paginação/);
  await assert.rejects(collectPages("conferenceRecords", "conferenceRecords", "x", {}, fetcher(() => ({})), { requests: 60, deadline: Date.now() + 1000 }), /incompleta/);
  for (const broken of [{ ...entry("1"), endTime: null }, { ...entry("1"), participant: "conferenceRecords/OTHER/participants/P" }]) {
    await assert.rejects(retrieveTranscripts("x", room, fetcher((url) => url.pathname.endsWith("/conferenceRecords") ? { conferenceRecords: [conference] } : url.pathname.endsWith("/transcripts") ? { transcripts: [transcript] } : { transcriptEntries: [broken] })), /incompleta/);
  }
});
