import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { consultationDate, consultationTime, historyReviewLabel } from "../modules/consultation-workflow/history-presentation.ts";

test("data e horário da consulta respeitam Brasília inclusive na virada UTC", () => {
  assert.equal(consultationDate("2026-10-16T01:30:00Z"), "15 de outubro de 2026");
  assert.equal(consultationTime("2026-10-16T01:30:00Z"), "22:30");
});

test("rascunho pronto não vira revisão aceita e rejeitado permanece não utilizar", () => {
  assert.equal(historyReviewLabel(null, "ready"), "Aguardando revisão");
  assert.equal(historyReviewLabel("accepted", "ready"), "Revisado pelo médico");
  assert.equal(historyReviewLabel("rejected", "ready"), "Não utilizar");
  assert.equal(historyReviewLabel(null, "failed"), "Resumo não gerado");
  assert.equal(historyReviewLabel(null, "processing"), "Resumo em processamento");
  assert.equal(historyReviewLabel(null, "unavailable"), "Sem resumo disponível");
});

test("histórico só entra na ficha médica e preserva fonte/revisão em ação explícita", () => {
  const page = readFileSync(new URL("../app/clinicas/[tenantId]/pacientes/[patientId]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /doctorView && active === "Linha do tempo" && <PatientConsultationHistoryPanel/);
  assert.match(page, /doctorView && <PatientConsultationHistoryPanel key=\{`\$\{tenantId\}:\$\{patientId\}`\}/);
  const panel = readFileSync(new URL("../components/patient-consultation-history.tsx", import.meta.url), "utf8");
  assert.match(panel, /cache: "no-store"/);
  assert.doesNotMatch(panel, /method: "POST"|process_summary|consent_decide/);
  assert.match(panel, /<details className=\{styles.entry\}>/);
  assert.match(panel, /draft.mode === "extractive"/);
  assert.match(panel, /versão criada em/);
  assert.match(panel, /Abrir consulta e revisar resumo/);
  assert.match(panel, /não foi publicado ao paciente/);
});
