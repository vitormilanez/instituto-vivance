// A Home do paciente: uma ação em destaque, a fila curta, atalhos para
// registrar e a confirmação do que foi enviado.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  friendlyNumber,
  patientFocus,
  quickLogs,
  recentSent,
  sentWhen,
  type SentItem,
} from "../modules/workspace/patient-home.ts";
import { patientTodayTasks } from "../modules/workspace/patient-today-tasks.ts";

const base = "/clinicas/tenant/meu-cuidado";
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const home = read("../components/patient-home.tsx");
const page = read("../app/clinicas/[tenantId]/meu-cuidado/[section]/page.tsx");

test("uma ação em destaque: consulta em andamento vence; depois a primeira tarefa", () => {
  const tasks = patientTodayTasks({
    base,
    hasRequiredPreparation: true,
    hasMeasurement: false,
    careRequests: [{ kind: "exams", requested_at: "2026-09-20T12:00:00Z" }],
  });
  const now = patientFocus({ base, consultationInProgress: true, tasks });
  assert.equal(now.focus.kind, "consultation");
  assert.equal(now.rest.length, tasks.length, "na consulta, a fila inteira continua visível");

  const first = patientFocus({ base, consultationInProgress: false, tasks });
  assert.equal(first.focus.title, "Preencher sua pré-consulta");
  assert.equal(first.focus.href, "#preconsulta-obrigatoria");
  // O pedido do médico vem logo depois, e nada aparece duas vezes.
  assert.equal(first.rest[0].title, "Enviar exames ou documentos");
  assert.ok(!first.rest.some((task) => task.title === first.focus.title));
});

test("sem nada pendente, a tela diz que está tudo em dia e convida a registrar", () => {
  const clear = patientFocus({ base, consultationInProgress: false, tasks: [] });
  assert.equal(clear.focus.kind, "clear");
  assert.equal(clear.focus.title, "Tudo em dia por aqui");
  assert.equal(clear.focus.href, `${base}/evolucao#atualizar-medidas`);
  assert.deepEqual(clear.rest, []);
});

test("registrar agora: quatro atalhos que abrem o formulário certo", () => {
  const logs = quickLogs({
    base,
    doctorName: "Dr. Guilherme Martins",
    latestMeasurement: { measure_label: "Peso", measure_value: 72.4, measure_unit: "kg", reported_on: "2026-09-20" },
  });
  assert.deepEqual(logs.map((log) => log.href), [
    `${base}/evolucao#atualizar-medidas`,
    `${base}/diario#registrar-refeicao`,
    `${base}/documentos#enviar-documento`,
    `${base}/conversas`,
  ]);
  assert.equal(logs[0].hint, "Último: peso 72,4 kg em 20/09");
  assert.equal(logs[3].title, "Mensagem para Dr. Guilherme Martins");
  const empty = quickLogs({ base, doctorName: null, latestMeasurement: null });
  assert.equal(empty[0].hint, "Leva menos de um minuto");
  assert.equal(empty[3].title, "Mensagem para o seu médico");
  assert.equal(friendlyNumber(63.21), "63,2");
  assert.equal(friendlyNumber(72), "72");
});

test("os âncoras dos atalhos existem nas telas de destino", () => {
  assert.match(read("../components/patient-meal-logs.tsx"), /id="registrar-refeicao"/);
  assert.match(read("../components/documents-workspace.tsx"), /id="enviar-documento" open/);
  assert.match(read("../components/patient-measurements.tsx"), /id="atualizar-medidas"/);
});

test("últimos envios: mais recente primeiro, um envio por linha, no máximo cinco", () => {
  const item = (kind: SentItem["kind"], key: string, at: string): SentItem => ({ kind, key, at, detail: null });
  const rows = recentSent([
    item("meal", "m1", "2026-09-18T10:00:00Z"),
    item("measurements", "req-1", "2026-09-21T10:00:00Z"),
    item("measurements", "req-1", "2026-09-21T10:00:00Z"),
    item("document", "d1", "2026-09-22T10:00:00Z"),
    item("message", "x1", "2026-09-10T10:00:00Z"),
    item("checkin", "c1", "2026-09-15T10:00:00Z"),
    item("preparation", "p1", "2026-09-12T10:00:00Z"),
  ]);
  assert.deepEqual(rows.map((row) => row.key), ["d1", "req-1", "m1", "c1", "p1"]);
  assert.equal(sentWhen("2026-09-22T13:05:00Z", "2026-09-22"), "hoje, 10:05");
  assert.equal(sentWhen("2026-09-12T13:05:00Z", "2026-09-22"), "12/09");
});

test("a Home não repete a navegação nem promete o que não existe", () => {
  // A grade de 11 cartões saiu; os destinos continuam no menu.
  assert.doesNotMatch(home, /Outras áreas do seu cuidado/);
  assert.doesNotMatch(read("../components/patient-area.tsx"), /available: (true|false)/);
  assert.doesNotMatch(home, /Em desenvolvimento/);
  // Envio é confirmado como "Enviado", nunca como "visto pelo médico".
  assert.match(home, /Enviado \{sentWhen/);
  assert.doesNotMatch(home, /visto|lido pelo/i);
  assert.match(home, /Este não é um canal de urgência\./);
  assert.doesNotMatch(home, /urgente|risco|atenção/i);
  // Falha na leitura dos envios: a seção some, não finge vazio.
  assert.match(page, /patientRecentSent\(tenantId\)\.catch\(\(\) => null\)/);
  assert.match(home, /\{sent && \(/);
});

test("envios do paciente: só da própria autoria, lidos com a sessão dele", () => {
  const service = read("../modules/workspace/patient-sent.ts");
  assert.match(service, /requireClinic\(tenant, \["patient"\]\)/);
  assert.equal((service.match(/\.eq\("patient_id", patient\)/g) ?? []).length, 6);
  assert.match(service, /\.eq\("actor_user_id", user\.id\)/);
  assert.match(service, /\.eq\("uploaded_by", user\.id\)/);
  assert.match(service, /\.eq\("sender_id", user\.id\)/);
});

test("pré-consulta obrigatória e preparo continuam montados na Home", () => {
  assert.match(home, /PatientRequiredPreparation/);
  assert.match(page, /onboarding\?\.status === "draft"/);
  // Só o preparo que ainda espera a pessoa (ou o aberto pelo link) aparece.
  assert.match(page, /\["requested", "draft"\]\.includes\(item\.status\)/);
  assert.match(page, /preparations\.focused/);
});
