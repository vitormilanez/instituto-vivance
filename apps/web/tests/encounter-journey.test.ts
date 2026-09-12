import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const editor = readFileSync(
  new URL("../components/encounter-editor.tsx", import.meta.url),
  "utf8",
);
const page = readFileSync(
  new URL(
    "../app/clinicas/[tenantId]/atendimentos/[encounterId]/page.tsx",
    import.meta.url,
  ),
  "utf8",
);
const service = readFileSync(
  new URL("../modules/encounters/service.ts", import.meta.url),
  "utf8",
);

test("encounter journey keeps the four manual stages distinct", () => {
  assert.match(editor, /label: "Preparo"/);
  assert.match(editor, /label: "Consulta"/);
  assert.match(editor, /label: "Plano"/);
  assert.match(editor, /label: "Fechamento"/);
  assert.match(editor, /Finalizar não publica[\s\S]*orientações/);
  assert.match(editor, /Criar plano de cuidado/);
  assert.match(editor, /Há alterações não salvas/);
  assert.match(editor, /Aprovado, ainda não publicado/);
});

test("encounter preparation uses only the submitted onboarding available to care", () => {
  assert.match(page, /getSubmittedPatientOnboarding/);
  assert.match(page, /detail\.encounter\.patient_id/);
  assert.match(editor, /<OnboardingSummary/);
  assert.match(editor, /Não há um onboarding enviado/);
});

test("closing exposes the saved plan and its publication state without publishing", () => {
  assert.match(service, /linkedPlans/);
  assert.match(service, /care_plan_publications/);
  assert.match(service, /publishedSourceVersion/);
  assert.doesNotMatch(editor, /\/publication[\s\S]*method:\s*["']POST/);
});
