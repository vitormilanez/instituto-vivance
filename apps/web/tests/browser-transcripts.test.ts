import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { browserTranscriptInput, browserTranscriptReviewInput } from "../modules/browser-transcripts/validation.ts";
const input = () => ({ idempotencyKey: randomUUID(), source: "browser_speech_recognition", captureMode: "microphone", startedAt: "2026-10-14T12:00:00Z", endedAt: "2026-10-14T12:02:00Z", patientPermissionConfirmed: true, permissionNote: "Paciente autorizou verbalmente antes de iniciar, às 12h.", segments: [{ text: "  Relato literal. ", capturedAt: "2026-10-14T12:01:00Z", speaker: "unknown" }] });
test("browser transcript validates consent and preserves literal text without inferred speakers", () => {
  const value = input();
  assert.deepEqual(browserTranscriptInput(value).segments,value.segments);
  for (const changed of [{patientPermissionConfirmed:false},{permissionNote:""},{source:"google_meet"},{captureMode:"audio"},{idempotencyKey:"stable-key"},{audio:"not allowed"}]) assert.throws(()=>browserTranscriptInput({...value,...changed}));
  assert.throws(()=>browserTranscriptInput({...value,segments:[{...value.segments[0],speaker:"doctor"}]}));
});
test("browser transcript rejects reversed, excessive, future or unordered capture windows", () => {
  const value=input();
  for(const changed of [{endedAt:"2026-10-14T11:59:00Z"},{endedAt:"2026-10-14T16:00:01Z"},{startedAt:"invalid"},{endedAt:"2036-10-14T12:00:00Z"},{segments:[{...value.segments[0],capturedAt:"2026-10-14T12:03:00Z"}]},{segments:[{...value.segments[0],capturedAt:"2026-10-14T12:01:00Z"},{...value.segments[0],capturedAt:"2026-10-14T12:00:00Z"}]}]) assert.throws(()=>browserTranscriptInput({...value,...changed}));
  assert.throws(()=>browserTranscriptInput({...value,segments:Array.from({length:1001},()=>value.segments[0])}));
  assert.throws(()=>browserTranscriptInput({...value,segments:[{...value.segments[0],text:"x".repeat(100001)}]}));
  assert.equal(browserTranscriptInput({...value,segments:[{...value.segments[0],text:"😀".repeat(100000)}]}).segments[0].text.length,200000);
});
test("human review requires a decision and separate note", () => {
  assert.deepEqual(browserTranscriptReviewInput({decision:"reviewed",note:" Conferido. "}),{decision:"reviewed",note:"Conferido."});
  for(const value of [{decision:"published",note:"a"},{decision:"rejected",note:" "},{decision:"reviewed",note:"a",originalText:"overwrite"}]) assert.throws(()=>browserTranscriptReviewInput(value));
});
