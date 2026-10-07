import assert from "node:assert/strict";
import test from "node:test";
import { consultationAction, outsideBriefing, reviewSidebar } from "../modules/workspace/consultation-layout.ts";
import type { OpenWorkItem } from "../modules/workspace/open-work-items.ts";

const documentWork: OpenWorkItem = { kind: "documents", id: "docs", patientId: "a", patientName: "Paciente A", total: 5, state: "5 documentos sem revisão", action: "Revisar", href: "/docs", since: "2026-10-01" };

test("a coluna direita exclui apenas o paciente cujo contexto está no briefing", () => {
  assert.deepEqual(outsideBriefing([{ patientId: "a" }, { patientId: "b" }], "a"), [{ patientId: "b" }]);
  assert.equal(outsideBriefing([documentWork], null).length, 1);
  assert.deepEqual(reviewSidebar({ patients: [], work: [documentWork], focusPatientId: "a" }), []);
});

test("os documentos de trabalho substituem a contagem de recebidos sem duplicá-los", () => {
  const groups = reviewSidebar({ patients: [{ patientId: "a", name: "Paciente A", items: [{ kind: "documents", id: "doc", at: "2026-10-02", href: "/doc", author: null, reviewed: false }] }], work: [documentWork], focusPatientId: null });
  assert.deepEqual(groups[0].counts, [{ kind: "documents", total: 5 }]);
});

test("um documento adicionado pela equipe aparece mesmo sem envio do paciente", () => {
  assert.deepEqual(reviewSidebar({ patients: [], work: [documentWork], focusPatientId: null })[0].counts, [{ kind: "documents", total: 5 }]);
});

test("rascunho desta consulta ou ainda não agendado vira a ação principal", () => {
  const input = { appointmentId: "today", preparable: true, base: "/clinic", agendaHref: "/agenda" };
  for (const appointment_id of ["today", null]) assert.deepEqual(consultationAction({ ...input, draft: { id: "draft", appointment_id } }), { label: "Retomar atendimento", href: "/clinic/atendimentos/draft" });
  assert.equal(consultationAction({ ...input, draft: { id: "draft", appointment_id: "other" } }).label, "Preparar atendimento");
});
