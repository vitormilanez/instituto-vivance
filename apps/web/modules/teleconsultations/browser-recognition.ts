export type CaptureMode = "microphone" | "tab_and_microphone";
export type CapturedSegment = { text: string; capturedAt: string; speaker: "unknown" };
export type CaptureState = "idle" | "starting" | "listening" | "stopping" | "paused";
export interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null; onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  start(track?: MediaStreamTrack): void; stop(): void; abort(): void;
}
export type RecognitionFactory = new () => Recognition;
export type CaptureInput = { track?: MediaStreamTrack; release(): void; watchEnded?(stop: () => void): void };
type CaptureCallbacks = { state(state: CaptureState): void; segment(segment: CapturedSegment): void; interim(text: string): void; notice(text: string): void };

export function supportsTabAudio(userAgent: string) {
  const version = /(?:Chrome|Edg)\/(\d+)/.exec(userAgent);
  return !/Android|iPhone|iPad|Mobile/.test(userAgent) && Number(version?.[1] ?? 0) >= 135;
}

export async function browserAudio(mode: CaptureMode, signal: AbortSignal): Promise<CaptureInput> {
  if (mode === "microphone") return { release() {} };
  const streams: MediaStream[] = [];
  let context: AudioContext | undefined;
  const release = () => { streams.forEach(stream => stream.getTracks().forEach(track => track.stop())); if (context && context.state !== "closed") void context.close().catch(() => {}); };
  const verify = () => { if (signal.aborted) { release(); throw new Error("Captura cancelada."); } };
  signal.addEventListener("abort", release, { once: true });
  try {
    const display = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: "browser" }, audio: true });
    streams.push(display);
    verify();
    if (display.getVideoTracks()[0]?.getSettings().displaySurface !== "browser" || !display.getAudioTracks().some(track => track.readyState === "live")) throw new Error("Selecione a aba do Meet e marque Compartilhar áudio da aba. Nenhuma captura foi iniciada.");
    const microphone = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true }, video: false });
    streams.push(microphone);
    verify();
    context = new AudioContext();
    await context.resume();
    verify();
    const destination = context.createMediaStreamDestination();
    const remote = context.createMediaStreamSource(new MediaStream(display.getAudioTracks()));
    const local = context.createMediaStreamSource(microphone);
    remote.connect(destination); local.connect(destination);
    streams.push(destination.stream);
    return { track: destination.stream.getAudioTracks()[0], release: () => { signal.removeEventListener("abort", release); release(); },
      watchEnded: stop => [...display.getTracks(), ...microphone.getTracks()].forEach(track => track.addEventListener("ended", stop, { once: true })) };
  } catch (error) { signal.removeEventListener("abort", release); release(); throw error; }
}

/** No automatic restarts. Every resumed capture requires the doctor's click. */
export class BrowserRecognitionCapture {
  private generation = 0;
  private recognition: Recognition | null = null;
  private input: CaptureInput | null = null;
  private acquisition: AbortController | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private active = false;
  private destroyed = false;
  private factory: RecognitionFactory;
  private audio: (mode: CaptureMode, signal: AbortSignal) => Promise<CaptureInput>;
  private callbacks: CaptureCallbacks;
  constructor(factory: RecognitionFactory, audio: (mode: CaptureMode, signal: AbortSignal) => Promise<CaptureInput>, callbacks: CaptureCallbacks) { this.factory = factory; this.audio = audio; this.callbacks = callbacks; }
  async start(mode: CaptureMode, deadline = Date.now() + 4 * 60 * 60 * 1000 - 5000) {
    if (this.active || this.destroyed) return;
    this.active = true;
    const generation = ++this.generation;
    this.callbacks.state("starting"); this.callbacks.notice("");
    try {
      const acquisition = new AbortController(); this.acquisition = acquisition;
      const input = await this.audio(mode, acquisition.signal);
      if (generation !== this.generation || this.destroyed) { input.release(); return; }
      this.input = input;
      const recognition = new this.factory();
      this.recognition = recognition;
      recognition.lang = "pt-BR"; recognition.continuous = true; recognition.interimResults = true;
      const seen = new Set<number>();
      const current = () => generation === this.generation && !this.destroyed;
      recognition.onstart = () => { if (current()) { this.clearTimer(); this.callbacks.state("listening"); this.timer = setTimeout(() => { this.callbacks.notice("Limite de duração alcançado. Confira e salve o texto captado."); this.stop(); }, Math.max(0, deadline - Date.now())); } };
      recognition.onresult = event => {
        if (!current() || Date.now() > deadline + 2500) return;
        let interim = "";
        for (let index = event.resultIndex; index < event.results.length; index++) {
          const result = event.results[index], text = result[0].transcript;
          if (result.isFinal && !seen.has(index) && text.trim()) { seen.add(index); this.callbacks.segment({ text, capturedAt: new Date().toISOString(), speaker: "unknown" }); }
          else if (!result.isFinal) interim += text;
        }
        this.callbacks.interim(interim);
      };
      recognition.onerror = event => { if (current()) { this.callbacks.notice(event.error === "not-allowed" || event.error === "service-not-allowed" ? "Permissão de microfone recusada. Libere o microfone nas configurações do navegador e tente novamente." : event.error === "network" ? "O serviço do navegador não respondeu. O texto captado foi preservado; retome quando houver conexão." : "A captura foi interrompida. Confira o texto e clique em Retomar quando estiver pronto."); this.finish(); } };
      recognition.onend = () => { if (current()) { this.callbacks.notice("Captura parada. Revise o texto ou clique em Retomar para continuar."); this.finish(); } };
      input.watchEnded?.(() => { if (current()) { this.callbacks.notice("Compartilhamento ou microfone encerrado. Confira o texto captado."); this.stop(); } });
      this.timer = setTimeout(() => { if (current()) { this.callbacks.notice("O navegador não iniciou a captura. Confira a permissão e tente novamente."); this.finish(); } }, 12000);
      recognition.start(input.track);
    } catch (error) { if (generation === this.generation && !this.destroyed) { this.callbacks.notice(error instanceof Error ? error.message : "Não foi possível iniciar. Confira as permissões do navegador."); this.finish(); } }
  }
  stop() {
    if (!this.active) return;
    if (!this.recognition) { this.finish(); return; }
    this.clearTimer(); this.callbacks.state("stopping");
    this.timer = setTimeout(() => this.finish(), 2500);
    try { this.recognition.stop(); } catch { this.finish(); }
  }
  private clearTimer() { if (this.timer) clearTimeout(this.timer); this.timer = null; }
  private finish() {
    ++this.generation; this.active = false; this.clearTimer();
    this.acquisition?.abort(); this.acquisition = null;
    const recognition = this.recognition; this.recognition = null;
    if (recognition) { recognition.onresult = null; recognition.onstart = null; recognition.onend = null; recognition.onerror = null; try { recognition.abort(); } catch {} }
    this.input?.release(); this.input = null;
    if (!this.destroyed) { this.callbacks.interim(""); this.callbacks.state("paused"); }
  }
  destroy() { this.destroyed = true; this.finish(); }
}
