import assert from "node:assert/strict";
import test from "node:test";
import {
  betweenConsultations,
  careLinkCopy,
  earlierLabel,
  openConsultationId,
  receivedUnavailableLabel,
  receivedView,
  receivedWhen,
  rowSummary,
  splitDay,
} from "../modules/workspace/home-view.ts";
import { noCareLinkCopy, noCareLinkRowLabel } from "../modules/workspace/home-day.ts";
import type { ReceivedItem } from "../modules/workspace/received-items.ts";

const item = (id: string, at: string, kind: ReceivedItem["kind"] = "documents"): ReceivedItem => ({
  kind,
  id,
  at,
  author: null,
  href: `/x/${id}`,
});
const many = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    item(`i${String(index).padStart(2, "0")}`, `2026-09-${String(10 + (index % 12)).padStart(2, "0")}T12:${String(index).padStart(2, "0")}:00Z`),
  );
const day = [
  { id: "a", status: "completed" },
  { id: "b", status: "cancelled" },
  { id: "c", status: "scheduled" },
  { id: "d", status: "scheduled" },
];

test("as consultas anteriores à próxima ficam recolhidas; sem próxima hoje, o dia inteiro fica recolhido", () => {
  assert.deepEqual(
    splitDay(day, "c").earlier.map((row) => row.id),
    ["a", "b"],
  );
  assert.deepEqual(splitDay(day, "c").rest.map((row) => row.id), ["c", "d"]);
  assert.equal(splitDay(day, null).earlier.length, 4);
  assert.deepEqual(splitDay(day, null).rest, []);
  assert.equal(earlierLabel(1), "1 consulta anterior");
  assert.equal(earlierLabel(3), "3 consultas anteriores");
  assert.equal(earlierLabel(6, true), "6 consultas de hoje");
  assert.equal(earlierLabel(1, true), "1 consulta de hoje");
});

test("a consulta aberta pela URL só vale se for do dia", () => {
  assert.equal(openConsultationId(day, "a", "c"), "a");
  assert.equal(openConsultationId(day, "de-outra-clinica", "c"), "c");
  assert.equal(openConsultationId(day, undefined, "c"), "c");
  assert.equal(openConsultationId(day, null, null), null);
});

test("a linha diz o fato: sem vínculo, indisponível ou N recebidos — nunca zero parcial", () => {
  assert.equal(
    rowSummary({ link: { status: "none" }, received: [], failed: [] }),
    noCareLinkRowLabel,
  );
  assert.equal(
    rowSummary({
      link: { status: "assigned", relationshipId: "r", version: 1 },
      received: [item("x", "2026-09-20T10:00:00Z")],
      failed: [],
    }),
    noCareLinkRowLabel,
  );
  assert.equal(
    rowSummary({ link: { status: "active" }, received: [], failed: ["messages"] }),
    receivedUnavailableLabel,
  );
  assert.equal(
    rowSummary({ link: { status: "active" }, received: [], failed: [] }),
    "Nada recebido",
  );
  assert.equal(
    rowSummary({ link: { status: "active" }, received: many(3), failed: [] }),
    "3 recebidos",
  );
});

test("Recebido com 0, 1 e 30 itens", () => {
  const base = { cutoff: null, hasPreviousConsultation: true, cutoffLabel: "12/09", failed: [] };
  const empty = receivedView({ ...base, items: [] });
  assert.equal(empty.visible.length, 0);
  assert.equal(empty.total, 0);
  assert.equal(empty.empty, "Nada enviado desde 12/09");

  const one = receivedView({ ...base, items: [item("x", "2026-09-20T10:00:00Z", "messages")] });
  assert.equal(one.visible.length, 1);
  assert.equal(one.visible[0].label, "Mensagem");
  assert.equal(one.more.length, 0);
  assert.equal(one.empty, null);

  const thirty = receivedView({ ...base, items: many(30) });
  assert.equal(thirty.visible.length, 5);
  assert.equal(thirty.more.length, 25);
  assert.equal(thirty.total, 30);
  // Mais recente primeiro, em toda a lista.
  const all = [...thirty.visible, ...thirty.more].map((row) => row.at);
  assert.deepEqual(all, [...all].sort().reverse());
});

test("sem consulta anterior, o vazio não inventa data", () => {
  const view = receivedView({
    items: [],
    cutoff: "2026-09-01T00:00:00Z",
    hasPreviousConsultation: false,
    cutoffLabel: "01/09",
    failed: [],
  });
  assert.equal(view.empty, "Nada enviado ainda");
});

test("um tipo que falhou: os outros aparecem, sem total e sem vazio", () => {
  const view = receivedView({
    items: [item("x", "2026-09-20T10:00:00Z")],
    cutoff: null,
    hasPreviousConsultation: true,
    cutoffLabel: "12/09",
    failed: ["messages", "checkins"],
  });
  assert.equal(view.visible.length, 1);
  assert.equal(view.total, null);
  assert.equal(view.empty, null);
  assert.deepEqual(view.failedLabels, ["Mensagem", "Check-in"]);

  const nothing = receivedView({
    items: [],
    cutoff: null,
    hasPreviousConsultation: true,
    cutoffLabel: "12/09",
    failed: ["documents"],
  });
  assert.equal(nothing.empty, null, "falha nunca vira 'Nada enviado'");
});

test("o corte do paciente vale também na tela", () => {
  const view = receivedView({
    items: [item("antes", "2026-09-10T10:00:00Z"), item("depois", "2026-09-20T10:00:00Z")],
    cutoff: "2026-09-15T00:00:00Z",
    hasPreviousConsultation: true,
    cutoffLabel: "15/09",
    failed: [],
  });
  assert.deepEqual(view.visible.map((row) => row.id), ["depois"]);
});

test("data em um formato só, no fuso da clínica", () => {
  assert.equal(receivedWhen("2026-09-12T15:00:00Z", "2026-09-22"), "12/09");
  assert.equal(receivedWhen("2026-09-22T13:05:00Z", "2026-09-22"), "Hoje, 10:05");
  // 01h UTC do dia 23 ainda é dia 22 em São Paulo.
  assert.equal(receivedWhen("2026-09-23T01:00:00Z", "2026-09-22"), "Hoje, 22:00");
});

test("a cópia do vínculo diz a saída certa", () => {
  assert.equal(
    careLinkCopy({ status: "assigned", relationshipId: "r", version: 2 }),
    noCareLinkCopy,
  );
  assert.match(careLinkCopy({ status: "none" }) ?? "", /Equipe de cuidado/);
  assert.equal(careLinkCopy({ status: "active" }), null);
});

test("Entre consultas: só quem enviou algo, quem enviou por último primeiro", () => {
  const rows = betweenConsultations(
    [
      { patientId: "p1", name: "Ana" },
      { patientId: "p2", name: "Bia" },
      { patientId: "p3", name: "Caio" },
    ],
    new Map([
      ["p1", [item("a", "2026-09-18T10:00:00Z")]],
      ["p3", [item("c1", "2026-09-19T10:00:00Z"), item("c2", "2026-09-21T10:00:00Z")]],
    ]),
  );
  assert.deepEqual(rows.map((row) => row.name), ["Caio", "Ana"]);
  assert.equal(rows[0].items[0].id, "c2");
});
