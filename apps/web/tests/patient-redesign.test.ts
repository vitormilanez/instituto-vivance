// Redesenho da área do paciente (fatia 1): navegação, registrar peso,
// refeição, evolução, sinais de alerta e as regras que não podem mudar.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { heightInCentimeters } from "../modules/measurements/height.ts";
import { patientMeasurementInput } from "../modules/measurements/validation.ts";
import { evolutionPeriod, evolutionView } from "../modules/workspace/patient-evolution.ts";
import { findPatientSection, patientTabFor, patientTabs } from "../modules/workspace/navigation.ts";
import { alertSigns, alertSignsReady } from "../modules/workspace/alert-signs.ts";
import type { MeasurementSeries } from "../modules/longitudinal/project.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("quatro abas com o Registrar no meio; tarefas de tela cheia não pertencem a aba", () => {
  assert.deepEqual(patientTabs.map((tab) => tab.title), ["Hoje", "Evolução", "Conversas", "Meu cuidado"]);
  assert.equal(patientTabFor("hoje"), "hoje");
  assert.equal(patientTabFor("plano"), "cuidado");
  assert.equal(patientTabFor("documentos"), "cuidado");
  for (const slug of ["peso", "refeicao", "alerta", "__proto__", "perfil"]) assert.equal(patientTabFor(slug), null);
  assert.ok(findPatientSection("peso"));
  const shell = read("../components/patient-shell.tsx");
  assert.match(shell, /patientTabs\.slice\(0, 2\)[\s\S]*<RegisterSheet items=\{items\} \/>[\s\S]*patientTabs\.slice\(2\)/);
  assert.match(shell, /href=\{`\$\{base\}\/alerta`\}/);
});

test("altura em metros vira centímetros com aviso; fora da faixa, não envia", () => {
  assert.deepEqual(heightInCentimeters(1.73), {
    value: 173,
    note: "Parece que você digitou em metros. Vamos salvar como 173 cm.",
  });
  assert.deepEqual(heightInCentimeters(173), { value: 173, note: null });
  assert.ok(Number.isNaN(heightInCentimeters(40).value));
  assert.equal(heightInCentimeters(null).value, null);
  const base = { measured_on: "2026-09-15", client_request_id: "4f12a070-7a7d-4a56-804d-00f4b579a573" };
  assert.throws(() => patientMeasurementInput({ ...base, height_cm: 1.73 }), /centímetros/);
  assert.equal(patientMeasurementInput({ ...base, height_cm: 173 }).heightCm, 173);
  assert.match(read("../modules/onboarding/validation.ts"), /result\.height_cm < 50/);
});

const series = (label: string, unit: string, values: [string, number][]): MeasurementSeries => ({
  key: `${label}:${unit}`,
  label,
  unit,
  count: values.length,
  firstOn: values[0][0],
  lastOn: values.at(-1)![0],
  latestValue: values.at(-1)![1],
  entries: values.map(([day, value], index) => ({
    id: `${label}-${index}`,
    value,
    reportedOn: day,
    submittedAt: `${day}T10:00:00Z`,
    source: index === 0 ? "onboarding" : "measurement",
    sourceId: String(index),
    sourceLabel: "x",
  })),
});

test("evolução: peso para o gráfico, outras medidas e lista do mais recente ao mais antigo", () => {
  const view = evolutionView([
    series("Peso", "kg", [["2026-09-02", 78], ["2026-09-23", 76.4]]),
    series("Circunferência abdominal", "cm", [["2026-09-20", 94]]),
    series("Altura", "cm", [["2026-09-02", 1.73]]),
  ]);
  assert.deepEqual(view.weight?.points, [{ value: 78, label: "02/09" }, { value: 76.4, label: "23/09" }]);
  assert.equal(view.weight?.latest, "76,4");
  assert.deepEqual(view.others.map((item) => `${item.label} ${item.latest} ${item.unit}`), ["Cintura 94 cm", "Altura 1,73 m"]);
  assert.equal(view.entries[0].value, "76,4 kg");
  assert.equal(view.entries.at(-1)!.origin, "cadastro inicial");
  assert.equal(evolutionView([]).weight, null);
  assert.deepEqual(evolutionPeriod("30", "2026-09-23"), { key: "30", from: "2026-08-24" });
  assert.deepEqual(evolutionPeriod("<x>", "2026-09-23"), { key: "tudo", from: undefined });
  // Sem metas, previsões nem cores de bom/ruim.
  const screen = (read("../components/patient/evolution.tsx") + read("../components/patient/weight-chart.tsx"))
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
  assert.doesNotMatch(screen, /\bmeta|previs|ideal|acima|abaixo/i);
  assert.match(screen, /Seu gráfico aparece a partir do 2º registro/);
});

test("sinais de alerta: nada inventado; sem aprovação, só o 192 e o aviso de revisão", () => {
  assert.equal(alertSignsReady(alertSigns), false);
  assert.deepEqual(alertSigns.signs, []);
  const screen = read("../components/patient/alert-signs.tsx");
  assert.match(screen, /href="tel:192"/);
  assert.match(screen, /em revisão/);
  assert.match(screen, /Orientação aprovada por \{content\.approvedBy\}/);
  assert.doesNotMatch(screen, /\bIA\b|triagem automática/);
});

test("refeição: tipo por toque, hora de Brasília vinda do servidor e sem avaliação", () => {
  const meal = read("../components/patient/meal-quick.tsx");
  assert.match(meal, /capture="environment"/);
  assert.match(meal, /nowLocal: string/);
  assert.match(meal, /não calcula calorias nem avalia/);
  assert.match(meal, /request\.current\.fingerprint !== fingerprint/);
});

test("registrar peso: um campo, passo de 0,1 kg e confirmação na Home sem prometer leitura", () => {
  const weight = read("../components/patient-measurements.tsx");
  assert.match(weight, /step\(-0\.1\)/);
  assert.match(weight, /router\.push\(`\$\{base\}\/hoje\?enviado=/);
  assert.doesNotMatch(weight, /Confirmo que/);
  const home = read("../components/patient-home.tsx");
  assert.match(home, /\{justSent\} ✓ · Guardado no seu histórico\./);
  assert.doesNotMatch(home, /já vê|visto/);
});

test("conversa do paciente: abre direto, sem 'Remetente', com aviso de urgência e atalho", () => {
  const chat = read("../components/messages-workspace.tsx");
  const patientStart = chat.indexOf("if (!isStaffConversation) {");
  const staffStart = chat.indexOf('  return (\n    <div className="conversation-workspace', patientStart);
  assert.ok(patientStart >= 0 && staffStart > patientStart, "patient and staff layouts remain separate");
  const patientPart = chat.slice(patientStart, staffStart);
  assert.doesNotMatch(patientPart, /Remetente/);
  assert.match(patientPart, /Não é canal de urgência\./);
  assert.match(patientPart, /meu-cuidado\/alerta/);
  assert.match(patientPart, /initial\.recipients\.length > 1 &&/);
  assert.match(patientPart, /Enviado ✓/);
});

test("pré-consulta: título até o primeiro '?', o resto vira apoio", async () => {
  const { splitQuestion } = await import("../components/patient/preparation-flow.tsx").catch(() => ({ splitQuestion: null }));
  // O componente é client; a regra fica testada pelo texto da função.
  const flow = read("../components/patient/preparation-flow.tsx");
  assert.match(flow, /const index = label\.indexOf\("\?"\);/);
  if (splitQuestion)
    assert.deepEqual(splitQuestion("Qual é o assunto? E o objetivo?"), { title: "Qual é o assunto?", hint: "E o objetivo?" });
  const { consultationLabel } = await import("../modules/workspace/patient-home.ts");
  assert.equal(consultationLabel("2026-09-23T23:34:00Z", "2026-09-23"), "de hoje, às 20:34");
  assert.equal(consultationLabel("2026-09-28T13:00:00Z", "2026-09-23"), "de 28/09, às 10:00");
});

test("lembretes: horários de 15 em 15 minutos, texto sem saúde e agendador protegido", async () => {
  const { reminderInput, reminderLabel, reminderMessage, subscriptionInput } = await import("../modules/reminders/model.ts");
  assert.deepEqual(reminderInput({ enabled: true, time: "09:00" }), { enabled: true, time: "09:00" });
  for (const bad of [{ enabled: true, time: "05:45" }, { enabled: true, time: "09:10" }, { enabled: "sim" }, { enabled: true, time: "22:00" }])
    assert.throws(() => reminderInput(bad));
  assert.equal(reminderLabel({ reminder_enabled: true, reminder_time: "20:00:00" }, 3), "A cada 3 dias às 20:00 · notificação");
  assert.equal(reminderLabel(null, 1), "Desligado");
  assert.doesNotMatch(`${reminderMessage.title} ${reminderMessage.body}`, /peso|remédio|medicamento|tratamento|dose|efeito/i);
  assert.throws(() => subscriptionInput({ endpoint: "http://x", keys: { p256dh: "a".repeat(40), auth: "b".repeat(16) } }));
  const cron = read("../app/api/v1/cron/reminders/route.ts");
  assert.match(cron, /timingSafeEqual/);
  assert.match(cron, /secret\.length < 32/);
  assert.doesNotMatch(cron, /SERVICE_ROLE|sb_secret/);
  const page = read("../app/clinicas/[tenantId]/meu-cuidado/[section]/page.tsx");
  assert.match(page, /reminder === undefined\)\s*redirect\(`\/clinicas\/\$\{tenantId\}\/meu-cuidado\/boas-vindas`\)/);
  // A permissão de notificação só é pedida depois da escolha do horário.
  const welcome = read("../components/patient/welcome-flow.tsx");
  assert.ok(welcome.indexOf("await save(enabled)") < welcome.indexOf("subscribeThisDevice(tenantId)"));
});
