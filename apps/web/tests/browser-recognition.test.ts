import assert from "node:assert/strict";
import test from "node:test";
import { BrowserRecognitionCapture, browserAudio, supportsTabAudio, type Recognition, type CaptureState, type CapturedSegment, type CaptureInput } from "../modules/teleconsultations/browser-recognition.ts";

class Engine implements Recognition {
  static latest: Engine;
  lang = ""; continuous = false; interimResults = false;
  onstart: Recognition["onstart"] = null; onend: Recognition["onend"] = null;
  onresult: Recognition["onresult"] = null; onerror: Recognition["onerror"] = null;
  starts = 0; aborts = 0; stops = 0;
  constructor() { Engine.latest = this; }
  start() { this.starts++; this.onstart?.(); }
  stop() { this.stops++; }
  abort() { this.aborts++; }
}
function capture(audio: (mode: "microphone" | "tab_and_microphone", signal: AbortSignal) => Promise<CaptureInput> = async () => ({ release() {} })) {
  const states: CaptureState[] = [], segments: CapturedSegment[] = [], notices: string[] = [];
  const value = new BrowserRecognitionCapture(Engine, audio, { state: x => states.push(x), segment: x => segments.push(x), notice: x => notices.push(x), interim() {} });
  return { value, states, segments, notices };
}

test("one active engine, final result deduplication, stop flush and no automatic restart", async () => {
  const item = capture(); await item.value.start("microphone");
  const engine = Engine.latest; await item.value.start("microphone");
  assert.equal(engine.starts, 1);
  const result = { resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "Texto sintético de teste." } }] };
  engine.onresult?.(result); engine.onresult?.(result);
  item.value.stop();
  engine.onresult?.({ resultIndex: 1, results: [result.results[0], { isFinal: true, 0: { transcript: "Trecho final." } }] });
  engine.onend?.();
  assert.deepEqual(item.segments.map(x => x.text), ["Texto sintético de teste.", "Trecho final."]);
  assert.equal(item.states.at(-1), "paused"); assert.equal(engine.starts, 1); assert.equal(engine.aborts, 1);
  item.value.destroy();
});
test("cancel during acquisition aborts immediately and never starts a late engine", async () => {
  let resolve!: (value: CaptureInput) => void; let cancelled = false, released = false;
  const item = capture(async (_mode, signal) => { signal.addEventListener("abort", () => cancelled = true); return await new Promise<CaptureInput>(done => resolve = done); });
  const starting = item.value.start("tab_and_microphone");
  item.value.stop(); assert.equal(cancelled, true);
  resolve({ release() { released = true; } }); await starting;
  assert.equal(released, true); assert.equal(item.states.at(-1), "paused"); item.value.destroy();
});
test("stop while microphone permission is pending closes already acquired sharing tracks", async () => {
  let resolveMic!: (stream: MediaStream) => void; let displayStopped = 0, micStopped = 0;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const displayTrack = { stop() { displayStopped++; }, getSettings: () => ({ displaySurface: "browser" }) };
  const audioTrack = { readyState: "live", stop() { displayStopped++; } };
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { mediaDevices: {
    getDisplayMedia: async () => ({ getTracks: () => [displayTrack, audioTrack], getAudioTracks: () => [audioTrack], getVideoTracks: () => [displayTrack] }),
    getUserMedia: () => new Promise<MediaStream>(done => resolveMic = done),
  } } });
  try {
    const abort = new AbortController(), pending = browserAudio("tab_and_microphone", abort.signal);
    await Promise.resolve(); await Promise.resolve();
    abort.abort(); assert.ok(displayStopped >= 2);
    resolveMic({ getTracks: () => [{ stop() { micStopped++; } }] } as unknown as MediaStream);
    await assert.rejects(pending, /cancelada/); assert.ok(micStopped >= 1);
  } finally { if (descriptor) Object.defineProperty(globalThis, "navigator", descriptor); else Reflect.deleteProperty(globalThis, "navigator"); }
});
test("tab input never offered on mobile or unsupported desktop versions", () => {
  assert.equal(supportsTabAudio("Chrome/134.0"), false);
  assert.equal(supportsTabAudio("Chrome/135.0"), true);
  assert.equal(supportsTabAudio("Android Chrome/155.0 Mobile"), false);
  assert.equal(supportsTabAudio("iPhone CriOS/155.0"), false);
  assert.equal(supportsTabAudio("Safari/605.1.15"), false);
});
test("a resumed capture respects an absolute deadline, not a new four-hour window", async () => {
  const item = capture(); await item.value.start("microphone", Date.now() - 1000);
  await new Promise(done => setTimeout(done, 5));
  assert.equal(Engine.latest.stops, 1);
  Engine.latest.onend?.(); item.value.destroy();
});
