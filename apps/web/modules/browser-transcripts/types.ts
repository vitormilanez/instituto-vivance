export type BrowserTranscriptSegment = { text: string; capturedAt: string; speaker: "unknown" };
export type BrowserTranscriptSave = {
  idempotencyKey: string;
  source: "browser_speech_recognition";
  captureMode: "microphone" | "tab_and_microphone";
  startedAt: string;
  endedAt: string;
  patientPermissionConfirmed: true;
  permissionNote: string;
  segments: BrowserTranscriptSegment[];
};
export type BrowserTranscript = {
  id: string;
  state: "imported";
  source: "browser_speech_recognition";
  captureMode: BrowserTranscriptSave["captureMode"];
  startedAt: string;
  endedAt: string;
  importedAt: string;
  segments: BrowserTranscriptSegment[];
  originalText: string;
  sourceHash: string;
  consent: { confirmedAt: string; permissionNote: string };
  review: { decision: "reviewed" | "rejected"; note: string; reviewedAt: string } | null;
};
export type BrowserTranscripts = { imports: BrowserTranscript[] };
