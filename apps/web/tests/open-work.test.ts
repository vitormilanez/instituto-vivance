import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  documentItems,
  encounterItem,
  openWorkOrder,
  openWorkSummary,
  planItem,
  reportItem,
} from "../modules/workspace/open-work-items.ts";

const base = "/clinicas/t1";
const who = { patientId: "p1", patientName: "Ana" };

test("plano: rascunho, revisão e aprovado sem publicação entram; publicado na versão não", () => {
  const plan = (status: string, version = 3) => ({
    ...who,
    id: "plan-1",
    status,
    version,
    updatedAt: "2026-09-20T10:00:00Z",
  });
  assert.equal(planItem(base, plan("draft"), new Set())?.state, "Plano em rascunho");
  assert.equal(planItem(base, plan("in_review"), new Set())?.action, "Revisar plano");
  assert.equal(
    planItem(base, plan("approved"), new Set())?.state,
    "Plano aprovado, sem publicação ao paciente",
  );
  assert.equal(planItem(base, plan("approved"), new Set(["plan-1:3"])), null);
  // Publicação de uma versão anterior não conta como publicada.
  assert.ok(planItem(base, plan("approved", 4), new Set(["plan-1:3"])));
  assert.equal(planItem(base, plan("draft"), new Set())?.href, "/clinicas/t1/planos/plan-1");
});

test("relatório segue a mesma regra do plano", () => {
  const report = (status: string) => ({
    ...who,
    id: "r1",
    status,
    version: 2,
    updatedAt: "2026-09-20T10:00:00Z",
  });
  assert.equal(reportItem(base, report("in_review"), new Set())?.state, "Relatório em revisão");
  assert.equal(reportItem(base, report("approved"), new Set(["r1:2"])), null);
  assert.equal(reportItem(base, report("desconhecido"), new Set()), null);
});

test("documentos sem revisão viram uma linha por paciente, com a chegada mais antiga", () => {
  const rows = documentItems(
    base,
    [
      { id: "d1", patientId: "p1", at: "2026-09-18T10:00:00Z" },
      { id: "d2", patientId: "p1", at: "2026-09-12T10:00:00Z" },
      { id: "d3", patientId: "p2", at: "2026-09-19T10:00:00Z" },
      { id: "d4", patientId: "p2", at: "2026-09-10T10:00:00Z" },
    ],
    new Set(["d4"]),
    new Map([["p1", "Ana"], ["p2", "Bia"]]),
  );
  assert.equal(rows.length, 2);
  const ana = rows.find((row) => row.patientId === "p1")!;
  assert.equal(ana.state, "2 documentos sem revisão médica");
  assert.equal(ana.since, "2026-09-12T10:00:00Z");
  const bia = rows.find((row) => row.patientId === "p2")!;
  assert.equal(bia.state, "1 documento sem revisão médica");
  assert.equal(bia.href, "/clinicas/t1/pacientes/p2?aba=Documentos");
});

test("o que espera há mais tempo vem primeiro; empate é estável", () => {
  const older = encounterItem(base, { ...who, id: "e2", updatedAt: "2026-09-01T10:00:00Z" });
  const newer = encounterItem(base, { ...who, id: "e1", updatedAt: "2026-09-21T10:00:00Z" });
  const tieA = encounterItem(base, { ...who, id: "a", updatedAt: "2026-09-10T10:00:00Z" });
  const tieB = encounterItem(base, { ...who, id: "b", updatedAt: "2026-09-10T10:00:00Z" });
  assert.deepEqual(
    openWorkOrder([newer, tieB, older, tieA]).map((item) => item.id),
    ["e2", "a", "b", "e1"],
  );
  assert.equal(openWorkSummary(0), "Nada em aberto com você");
  assert.equal(openWorkSummary(1), "1 item em aberto");
  assert.equal(openWorkSummary(4), "4 itens em aberto");
});

test("a fila filtra clínica e autoria, e documento só para quem revisa", () => {
  const service = readFileSync(new URL("../modules/workspace/open-work.ts", import.meta.url), "utf8");
  assert.equal((service.match(/\.eq\("doctor_id", user\.id\)/g) ?? []).length, 3);
  assert.ok((service.match(/\.eq\("tenant_id", tenant\)/g) ?? []).length >= 7);
  assert.match(service, /isDoctor && input\.activePatientIds\.length/);
  assert.match(service, /\.in\("patient_id", input\.activePatientIds\)/);
});

test("a fila não usa cor nem palavra de prioridade e some quando vazia", () => {
  const component = readFileSync(new URL("../components/open-work.tsx", import.meta.url), "utf8");
  const items = readFileSync(new URL("../modules/workspace/open-work-items.ts", import.meta.url), "utf8");
  assert.doesNotMatch(component + items, /urgente|crítico|atenção|prioridade alta/i);
  assert.match(component, /if \(items && !items\.length\) return null;/);
  assert.match(component, /Não foi possível carregar o trabalho em aberto\./);
});
