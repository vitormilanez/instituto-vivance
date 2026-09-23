import assert from "node:assert/strict";
import test from "node:test";
import {
  earliestCutoff,
  receivedCutoff,
  receivedDateLabel,
  receivedEmptyCopy,
  receivedGroup,
  receivedItemLimit,
  receivedOrder,
  receivedSince,
  splitByPatient,
  type ReceivedItem,
  type ReceivedRow,
} from "../modules/workspace/received-items.ts";

const item = (id: string, at: string, kind: ReceivedItem["kind"] = "documents"): ReceivedItem => ({
  kind,
  id,
  at,
  author: null,
  href: `/destino/${id}`,
});

const row = (patientId: string, id: string, at: string): ReceivedRow => ({
  ...item(id, at),
  patientId,
});

const thirty = Array.from({ length: 30 }, (_, index) =>
  item(`item-${index}`, `2026-09-${String((index % 20) + 1).padStart(2, "0")}T12:00:00Z`),
);

test("o corte é a última consulta realizada, e o vínculo quando não há nenhuma", () => {
  assert.equal(
    receivedCutoff({
      finalizedAt: "2026-09-10T12:00:00Z",
      relationshipCreatedAt: "2026-01-01T00:00:00Z",
    }),
    "2026-09-10T12:00:00Z",
  );
  assert.equal(
    receivedCutoff({ finalizedAt: null, relationshipCreatedAt: "2026-01-01T00:00:00Z" }),
    "2026-01-01T00:00:00Z",
    "sem consulta anterior, nada de antes do vínculo aparece",
  );
  assert.equal(
    receivedCutoff({ finalizedAt: null, relationshipCreatedAt: null }),
    null,
    "sem corte, a lista é o que existe",
  );
  // Cancelada, falta e agendada não têm como definir corte: só um atendimento
  // finalizado produz finalized_at.
  assert.equal(
    receivedCutoff({ finalizedAt: "2026-09-12T09:00:00Z", relationshipCreatedAt: "2026-01-01T00:00:00Z" }),
    "2026-09-12T09:00:00Z",
  );
});

test("só entra o que chegou depois do corte", () => {
  const items = [
    item("antes", "2026-09-09T12:00:00Z"),
    item("na-hora", "2026-09-10T12:00:00Z"),
    item("depois", "2026-09-11T12:00:00Z"),
  ];
  assert.deepEqual(
    receivedSince(items, "2026-09-10T12:00:00Z").map((entry) => entry.id),
    ["depois"],
    "o instante do corte não conta como recebido depois dele",
  );
  assert.equal(receivedSince(items, null).length, 3);
});

test("a ordem é por chegada, mais recente primeiro, nunca por relevância", () => {
  const items = [
    item("meio", "2026-09-10T10:00:00Z"),
    item("velho", "2026-09-08T10:00:00Z"),
    item("novo", "2026-09-11T10:00:00Z"),
  ];
  assert.deepEqual(
    receivedOrder(items).map((entry) => entry.id),
    ["novo", "meio", "velho"],
  );
  // Empate de instante tem ordem estável, sem depender do banco.
  assert.deepEqual(
    receivedOrder([item("b", "2026-09-10T10:00:00Z"), item("a", "2026-09-10T10:00:00Z")]).map(
      (entry) => entry.id,
    ),
    ["b", "a"],
  );
});

test("o grupo mostra 5 e diz quantos ficaram", () => {
  const none = receivedGroup({ items: [], cutoff: null, hasPreviousConsultation: true, cutoffLabel: "10/09" });
  assert.deepEqual(none.items, []);
  assert.equal(none.total, 0);
  assert.equal(none.empty, "Nada enviado desde 10/09");

  const one = receivedGroup({
    items: [item("unico", "2026-09-11T10:00:00Z")],
    cutoff: "2026-09-10T12:00:00Z",
    hasPreviousConsultation: true,
    cutoffLabel: "10/09",
  });
  assert.equal(one.total, 1);
  assert.equal(one.hidden, 0);

  const many = receivedGroup({
    items: thirty,
    cutoff: null,
    hasPreviousConsultation: true,
    cutoffLabel: "10/09",
  });
  assert.equal(many.items.length, receivedItemLimit);
  assert.equal(many.total, 30);
  assert.equal(many.hidden, 25, "o restante é o que o 'Ver todos' anuncia");
});

test("o vazio distingue nunca-enviou de nada-desde-a-consulta", () => {
  assert.equal(receivedEmptyCopy(false, null), "Nada enviado ainda");
  assert.equal(receivedEmptyCopy(true, null), "Nada enviado ainda");
  assert.equal(receivedEmptyCopy(true, "10/09"), "Nada enviado desde 10/09");
});

test("o corte vale por paciente, mesmo com a query usando o menor de todos", () => {
  const cutoffs = new Map<string, string | null>([
    ["paciente-1", "2026-09-10T12:00:00Z"],
    ["paciente-2", "2026-09-15T12:00:00Z"],
  ]);
  // Uma query só, com o menor corte — o item antigo do paciente 2 veio no lote
  // e precisa ser descartado para ele, não para o paciente 1.
  const rows = [
    row("paciente-1", "p1-recente", "2026-09-12T12:00:00Z"),
    row("paciente-1", "p1-antes", "2026-09-09T12:00:00Z"),
    row("paciente-2", "p2-antes", "2026-09-12T12:00:00Z"),
    row("paciente-2", "p2-recente", "2026-09-16T12:00:00Z"),
  ];
  const grouped = splitByPatient(rows, cutoffs);
  assert.deepEqual(
    grouped.get("paciente-1")?.map((entry) => entry.id),
    ["p1-recente"],
  );
  assert.deepEqual(
    grouped.get("paciente-2")?.map((entry) => entry.id),
    ["p2-recente"],
  );
  assert.equal(earliestCutoff(cutoffs), "2026-09-10T12:00:00Z");
  // Um paciente sem corte obriga a lista inteira: nenhum limite pode cortar.
  assert.equal(
    earliestCutoff(new Map<string, string | null>([["a", null], ["b", "2026-09-10T12:00:00Z"]])),
    null,
  );
});

test("paciente sem vínculo não recebe corte e portanto não recebe item", () => {
  const grouped = splitByPatient(
    [row("paciente-3", "sem-vinculo", "2026-09-16T12:00:00Z")],
    new Map<string, string | null>(),
  );
  assert.equal(grouped.get("paciente-3"), undefined);
});

test("a data do corte é lida em São Paulo, não em UTC", () => {
  // 23:30 em UTC é 20:30 do mesmo dia em São Paulo; 02:00 UTC já é o dia
  // anterior às 23:00 de São Paulo.
  assert.equal(receivedDateLabel("2026-09-10T23:30:00Z"), "10/09");
  assert.equal(receivedDateLabel("2026-09-11T02:00:00Z"), "10/09");
  assert.equal(receivedDateLabel(null), null);
});
