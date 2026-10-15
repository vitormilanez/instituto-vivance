import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("consulta inicia por gesto, identifica checkpoints e não reprocessa ao carregar", () => {
  const session = source("../components/consultation-session.tsx");
  assert.match(session, /const input = await browserAudio\(inputMode, signal\)/);
  assert.match(session, /action\("begin", \{ captureId: requestedCaptureId.current \}\)/);
  assert.match(session, /clientChunkId: crypto.randomUUID\(\)/);
  assert.match(session, /await stopCapture\(\); await drain\(\); await action\("end"/);
  assert.match(session, /state.consent.decision !== "granted"/);
  assert.match(session, /controller.current\?\.stop\(\)/);
  assert.match(session, /Date.parse\(capture.current.startedAt\) \+ 14400000/);
  assert.match(session, /beforeunload/);
  assert.match(session, /Conferir na conversa/);
  assert.match(session, /Resumo marcado como não utilizar/);
  assert.match(session, /view.capture.status !== "cancelled"/);
});

test("consentimento é escolha do paciente sem opção previamente selecionada", () => {
  const patient = source("../components/consultation-consent.tsx");
  assert.match(patient, /useState<"granted" \| "refused" \| "">\(""\)/);
  assert.match(patient, /consent.text/);
  assert.match(patient, /consent_decide/);
  assert.match(patient, /Confirmar retirada/);
  assert.doesNotMatch(patient, /categories|capture\.segments/);
});

test("entrada médica mantém captura integrada e histórico sem novos controles", () => {
  const hub = source("../components/teleconsultation-hub.tsx");
  const workspace = source("../components/teleconsultation-workspace.tsx");
  assert.match(hub, /Iniciar consulta/);
  assert.doesNotMatch(hub, /BrowserTranscriptPanel/);
  assert.match(workspace, /ConsultationSession/);
  const page = source("../app/clinicas/[tenantId]/teleconsulta/[appointmentId]/page.tsx");
  assert.match(page, /readOnly/);
});
