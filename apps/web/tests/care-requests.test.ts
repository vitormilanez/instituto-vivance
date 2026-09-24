import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { InputError } from "../lib/validation.ts";
import {
  careRequestInput,
  careRequestMaxNote,
} from "../modules/care-requests/validation.ts";
import {
  careRequestActionLabel,
  careRequestPendingLabel,
  consultationContextCards,
  type ConsultationContextInput,
} from "../modules/workspace/patient-context-cards.ts";

const base = "/clinicas/clinica-1";
const recordBase = `${base}/pacientes/paciente-1`;

const empty: ConsultationContextInput = {
  base,
  recordBase,
  preparation: null,
  canReviewPreparation: true,
  nextAppointmentAt: null,
  previousPreparation: null,
  documents: { total: 0, latestAt: null },
  measurements: { total: 0, latestAt: null },
  intake: null,
  encounter: null,
  publication: null,
  requests: [],
};

const card = (
  cards: ReturnType<typeof consultationContextCards>,
  id: string,
) => {
  const found = cards.find((item) => item.id === id);
  assert.ok(found, `card ${id} ausente`);
  return found;
};

const key = "11111111-1111-4111-8111-111111111111";

test("a solicitação aceita exatamente os quatro tipos que o paciente alimenta", () => {
  for (const kind of ["preparation", "exams", "measurements", "goals"]) {
    assert.equal(
      careRequestInput({ kind, request_key: key }).kind,
      kind,
      `${kind} deveria ser aceito`,
    );
  }
  // "Última consulta" e "Plano de cuidado" são registros da clínica: pedir isso
  // a um paciente não existe no contrato.
  for (const kind of ["encounter", "plan", "prescription", ""]) {
    assert.throws(
      () => careRequestInput({ kind, request_key: key }),
      InputError,
      `${kind} deveria ser recusado`,
    );
  }
});

test("o bilhete é opcional, limitado e normalizado", () => {
  assert.equal(careRequestInput({ kind: "exams", request_key: key }).note, "");
  assert.equal(
    careRequestInput({ kind: "exams", request_key: key, note: "  traga os exames  " }).note,
    "traga os exames",
  );
  assert.throws(
    () =>
      careRequestInput({
        kind: "exams",
        request_key: key,
        note: "a".repeat(careRequestMaxNote + 1),
      }),
    InputError,
  );
  assert.throws(
    () => careRequestInput({ kind: "exams", request_key: key, note: 3 }),
    InputError,
  );
});

test("a chave idempotente é obrigatória e o reenvio é explícito", () => {
  assert.throws(() => careRequestInput({ kind: "exams" }), InputError);
  assert.throws(
    () => careRequestInput({ kind: "exams", request_key: "não-é-uuid" }),
    InputError,
  );
  assert.equal(
    careRequestInput({ kind: "exams", request_key: key }).replacePending,
    false,
    "sem pedido explícito, nada é substituído",
  );
  assert.equal(
    careRequestInput({ kind: "exams", request_key: key, replace_pending: true })
      .replacePending,
    true,
  );
  assert.throws(
    () => careRequestInput({ kind: "exams", request_key: key, replace_pending: "sim" }),
    InputError,
  );
  // Campo fora do contrato não passa despercebido.
  assert.throws(
    () => careRequestInput({ kind: "exams", request_key: key, urgent: true }),
    InputError,
  );
});

test("só o que o paciente fornece ganha solicitação", () => {
  const cards = consultationContextCards(empty);
  assert.deepEqual(
    cards.filter((item) => item.request).map((item) => item.id),
    ["preparation", "documents", "measurements", "goals"],
  );
  // Registros da clínica nunca pedem nada a ninguém.
  assert.equal(card(cards, "encounter").request, null);
  assert.equal(card(cards, "plan").request, null);
  // E ninguém começa solicitado.
  for (const item of cards) assert.equal(item.request?.requestedAt ?? null, null);
});

test("a pendência aberta aparece no card do tipo certo, com a data", () => {
  const cards = consultationContextCards({
    ...empty,
    requests: [
      { kind: "exams", requested_at: "2026-09-22T12:00:00Z" },
      { kind: "goals", requested_at: "2026-09-20T12:00:00Z" },
    ],
  });
  // O card fala "exames"; o banco chama de "exams". A tradução fica num lugar só.
  assert.equal(card(cards, "documents").request?.kind, "exams");
  assert.equal(card(cards, "documents").request?.requestedAt, "2026-09-22T12:00:00Z");
  assert.equal(card(cards, "goals").request?.requestedAt, "2026-09-20T12:00:00Z");
  assert.equal(card(cards, "preparation").request?.requestedAt, null);
  assert.equal(card(cards, "measurements").request?.requestedAt, null);
  // O estado factual do card não é substituído pela pendência.
  assert.equal(card(cards, "documents").state, "Nenhum exame enviado");
  assert.equal(careRequestPendingLabel("2026-09-22T12:00:00Z"), "Solicitado em 22/09");
});

test("a ação nomeia o objeto que será pedido", () => {
  assert.equal(careRequestActionLabel("preparation"), "Solicitar pré-consulta");
  assert.equal(careRequestActionLabel("exams"), "Solicitar exames");
  assert.equal(careRequestActionLabel("measurements"), "Solicitar medidas");
  assert.equal(careRequestActionLabel("goals"), "Solicitar metas");
});

test("o botão é irmão do link, o bilhete é opcional e a incerteza não mente", () => {
  const component = readFileSync(
    new URL("../components/care-request-action.tsx", import.meta.url),
    "utf8",
  );
  const list = readFileSync(
    new URL("../components/context-card-list.tsx", import.meta.url),
    "utf8",
  );
  const route = readFileSync(
    new URL(
      "../app/api/v1/clinics/[tenantId]/patients/[patientId]/care-requests/route.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  // Nada de controle interativo dentro da âncora: o link navega, o botão pede.
  assert.match(list, /<\/a>\s*\{card\.history \? \(/);
  assert.match(list, /\) : null\}\s*\{card\.request && tenantId && patientId \? \(/);
  assert.doesNotMatch(list, /<a[^>]*>\s*<CareRequestAction/);
  // Um clique pede; o bilhete é um convite separado.
  assert.match(component, /Adicionar uma mensagem/);
  assert.match(component, /replace_pending: replace/);
  assert.match(component, /request_key: requestKey\.current/);
  // Chave estável entre tentativas e nenhuma promessa de sucesso na dúvida.
  assert.match(component, /if \(requestKey\.current === null\) requestKey\.current = crypto\.randomUUID\(\)/);
  assert.match(component, /não será duplicada/);
  // Só uma resposta aceita vira pendência: o erro sai antes de tocar o estado,
  // e a falha de rede marca incerteza em vez de "Solicitado".
  assert.match(
    component,
    /if \(!response\.ok\) \{\s*setUncertain\(false\);\s*setError\([\s\S]*?return;\s*\}/,
  );
  assert.match(
    component,
    /setPendingSince\(new Date\(\)\.toISOString\(\)\);\s*setUncertain\(false\);/,
  );
  assert.match(component, /\} catch \{\s*\/\/[^\n]*\n\s*setUncertain\(true\);/);
  // A rota é do mesmo host, exige JSON e responde 201.
  assert.match(route, /sameOrigin\(request\)/);
  assert.match(route, /return json\(\s*\{[\s\S]*\},\s*201,?\s*\)/);
  // Alvos de 44px também no convite ao bilhete.
  assert.match(css, /\.context-request-note \{[^}]*min-height: 44px;/);
});

test("pendências do paciente carregam o alvo exato da pré-consulta", () => {
  const service = readFileSync(
    new URL("../modules/care-requests/service.ts", import.meta.url),
    "utf8",
  );
  assert.match(service, /select\("kind,requested_at,preparation_id"\)/);
  assert.match(service, /preparation_starts_at/);
  assert.match(service, /Agende primeiro uma próxima consulta/);
});

test("a página estática de metas reutiliza o acolhimento versionado após o onboarding", () => {
  const page = readFileSync(
    new URL(
      "../app/clinicas/[tenantId]/meu-cuidado/metas/page.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(page, /onboarding\.status !== "submitted"/);
  assert.match(page, /<PatientIntakePanel/);
  assert.match(page, /audience="patient"/);
  assert.match(page, /canEdit/);
});
