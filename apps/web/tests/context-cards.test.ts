import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  consultationContextCards,
  contextCardOrder,
  contextSummary,
  type ConsultationContextInput,
} from "../modules/workspace/patient-context-cards.ts";

const base = "/clinicas/clinica-1";
const recordBase = `${base}/pacientes/paciente-1`;

const empty: ConsultationContextInput = {
  base,
  recordBase,
  preparation: null,
  documents: { total: 0, latestAt: null },
  measurements: { total: 0, latestAt: null },
  intake: null,
  encounter: null,
  publication: null,
};

const card = (cards: ReturnType<typeof consultationContextCards>, id: string) => {
  const found = cards.find((item) => item.id === id);
  assert.ok(found, `card ${id} ausente`);
  return found;
};

test("os cards de contexto mantêm a mesma ordem e nunca somem quando faltam", () => {
  const cards = consultationContextCards(empty);
  assert.deepEqual(cards.map((c) => c.id), contextCardOrder);
  // Ausência é estado visível e acionável: nenhum card vazio e todos com destino.
  for (const item of cards) {
    assert.ok(item.state.length > 0, `${item.id} sem estado`);
    assert.ok(item.action.length > 0, `${item.id} sem ação`);
    assert.ok(item.href.startsWith(base), `${item.id} sem destino`);
  }
  assert.deepEqual(cards.filter((c) => c.pending).map((c) => c.id), [
    "preparation",
    "documents",
    "measurements",
    "goals",
    "encounter",
    "plan",
  ]);
});

test("cada card escreve o próprio estado factual, sem frase genérica", () => {
  const cards = consultationContextCards({
    ...empty,
    preparation: { id: "prep-1", status: "draft", submittedAt: null },
    documents: { total: 2, latestAt: "2026-09-17T12:00:00Z" },
    measurements: { total: 1, latestAt: "2026-09-18T12:00:00Z" },
    intake: { hasGoal: true, updatedAt: "2026-09-10T12:00:00Z" },
    encounter: { id: "enc-1", finalizedAt: "2026-09-12T12:00:00Z" },
    publication: { planId: "plan-1", revision: 3, publishedAt: "2026-09-13T12:00:00Z" },
  });
  assert.equal(card(cards, "preparation").state, "Rascunho salvo");
  assert.equal(card(cards, "documents").state, "2 exames enviados em 17/09");
  // A contagem funciona no singular e mesmo sem data conhecida.
  assert.equal(
    card(
      consultationContextCards({ ...empty, documents: { total: 1, latestAt: null } }),
      "documents",
    ).state,
    "1 exame enviado",
  );
  assert.equal(card(cards, "measurements").state, "Última atualização em 18/09");
  assert.equal(card(cards, "goals").state, "Respondidas");
  assert.equal(card(cards, "encounter").state, "Finalizada em 12/09");
  assert.equal(card(cards, "plan").state, "Publicado em 13/09 · revisão 3");
  // Só o rascunho de pré-consulta segue como lacuna do paciente.
  assert.deepEqual(cards.filter((c) => c.pending).map((c) => c.id), ["preparation"]);
});

test("pré-consulta distingue não preenchida, rascunho e enviada", () => {
  const state = (preparation: ConsultationContextInput["preparation"]) =>
    card(consultationContextCards({ ...empty, preparation }), "preparation");
  assert.equal(state(null).state, "Não preenchida");
  assert.equal(state({ id: "p", status: "requested", submittedAt: null }).state, "Não preenchida");
  assert.equal(state({ id: "p", status: "cancelled", submittedAt: null }).state, "Não preenchida");
  assert.equal(state({ id: "p", status: "draft", submittedAt: null }).state, "Rascunho salvo");
  assert.equal(state({ id: "p", status: "submitted", submittedAt: "2026-09-20T12:00:00Z" }).state, "Enviada");
  assert.equal(state({ id: "p", status: "reviewed", submittedAt: "2026-09-20T12:00:00Z" }).state, "Enviada");
  // O rascunho e a solicitação pendente continuam sendo lacuna.
  assert.ok(state({ id: "p", status: "draft", submittedAt: null }).pending);
  assert.ok(state(null).pending);
  assert.ok(!state({ id: "p", status: "submitted", submittedAt: null }).pending);
});

test("o resumo conta só o que o paciente deve fornecer", () => {
  const cards = consultationContextCards(empty);
  assert.equal(contextSummary(cards), "4 de 4 informações do paciente ainda não foram registradas.");
  const onlyPlanMissing = consultationContextCards({
    ...empty,
    preparation: { id: "p", status: "submitted", submittedAt: null },
    documents: { total: 1, latestAt: "2026-09-17T12:00:00Z" },
    measurements: { total: 1, latestAt: "2026-09-18T12:00:00Z" },
    intake: { hasGoal: true, updatedAt: null },
  });
  assert.equal(
    contextSummary(onlyPlanMissing),
    "Pré-consulta, exames, medidas e metas estão registrados por este paciente.",
    "registro da clínica ausente não conta como lacuna do paciente",
  );
});

test("a tela mostra os cards e distingue falta de vínculo de falta de registro", () => {
  const component = readFileSync(
    new URL("../components/today-workspace.tsx", import.meta.url),
    "utf8",
  );
  const css = readFileSync(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  // A frase genérica saiu; a falta de vínculo tem causa e consequência.
  assert.doesNotMatch(component, /Não há contexto clínico disponível/);
  assert.match(component, /Sem vínculo de cuidado ativo com este paciente para o seu\s+acesso\./);
  assert.match(component, /Pré-consulta, exames, medidas e metas aparecem aqui/);
  // Todo card é um alvo único e focável — nada de linha inerte.
  assert.match(component, /<ul className="context-cards">/);
  assert.match(component, /<a className=\{card\.pending \? "is-pending" : undefined\} href=\{card\.href\}>/);
  assert.doesNotMatch(component, /care-context-links/);
  assert.doesNotMatch(css, /care-context-links/);
  // Alvo de 44px, medida contida e contraste do texto secundário por token.
  assert.match(css, /\.context-cards > li > a \{[^}]*min-height: 44px;/);
  assert.match(css, /\.context-cards \.context-state \{[^}]*max-width: 52ch;[^}]*color: var\(--context-muted\);/);
  assert.match(css, /--context-muted: #4c5d78;/);
});
