import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const service = readFileSync(
  new URL("../modules/messages/service.ts", import.meta.url),
  "utf8",
);
const workspace = readFileSync(
  new URL("../components/messages-workspace.tsx", import.meta.url),
  "utf8",
);

test("contexto da conversa usa apenas fontes autorizadas do paciente selecionado", () => {
  assert.match(service, /async function staffMessageContext/);
  assert.match(service, /\.eq\("patient_id", patientId\)/);
  assert.match(service, /\.eq\("category", "clinical_document"\)/);
  assert.match(service, /\.eq\("category", "exam"\)/);
  assert.match(service, /\.eq\("status", "finalized"\)/);
  assert.match(service, /documentTitle\(/);
  assert.match(service, /staffRecentWeight\(tenant, patientId\)/);
  assert.doesNotMatch(service, /from\("processing_jobs"\)/);
  assert.match(service, /selected \? staffMessageContext/);
});

test("cartões não expõem contexto clínico na conversa do paciente", () => {
  assert.match(workspace, /isStaffConversation && initial\.context/);
  assert.match(workspace, /Transcrições não estão disponíveis/);
  assert.match(workspace, /<PreviousPrescriptions[\s\S]*patientView=\{true\}/);
  assert.match(workspace, /key=\{patientId\}/);
});
