import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  checkInDue,
  checkInSteps,
  checkInSummary,
  dailyCheckInInput,
  effectsMap,
  hasStrongEffect,
  nextCheckInLabel,
} from "../modules/daily-check-ins/model.ts";
import { mealInput } from "../modules/meals/validation.ts";

const key = "4f12a070-7a7d-4a56-804d-00f4b579a573";
const today = "2026-09-23";

test("etapas: nove com a aplicação ativada pelo médico, oito sem", () => {
  assert.equal(checkInSteps(true).length, 9);
  assert.deepEqual(checkInSteps(false).includes("application"), false);
  assert.equal(checkInSteps(false).at(-1), "note");
});

test("envio: pulado é ausência, nunca zero; opções fora da lista são recusadas", () => {
  const { answers } = dailyCheckInInput({ request_key: key, answers: { feeling: 4, effects: { nausea: "mild" }, water_glasses: 0 } }, today);
  assert.deepEqual(answers, { feeling: 4, effects: { nausea: "mild" }, water_glasses: 0 });
  assert.deepEqual(dailyCheckInInput({ request_key: key, answers: {} }, today).answers, {});
  for (const bad of [
    { feeling: 0 },
    { feeling: 2.5 },
    { effects: { nausea: "extreme" } },
    { effects: { nausea: "mild" }, no_effects: true },
    { bowel_status: "moderate" },
    { adherence: "yes", adherence_reason: "forgot" },
    { application_on: "2099-01-01" },
    { application_time: "25:00" },
    { weight_kg: 900 },
    { risco: "alto" },
  ])
    assert.throws(() => dailyCheckInInput({ request_key: key, answers: bad }, today), JSON.stringify(bad));
  assert.throws(() => dailyCheckInInput({ request_key: "x", answers: {} }, today));
  assert.throws(() => dailyCheckInInput({ request_key: key, answers: {}, extra: 1 }, today));
  // Recado só de espaços vira ausência, não erro.
  assert.deepEqual(dailyCheckInInput({ request_key: key, answers: { note: "  " } }, today).answers, {});
});

test("intestino usa Bom/Regular/Ruim sem alterar efeitos antigos", () => {
  const { answers } = dailyCheckInInput({ request_key: key, answers: { no_effects: true, bowel_status: "regular" } }, today);
  assert.deepEqual(answers, { no_effects: true, bowel_status: "regular" });
  assert.deepEqual(checkInSummary(answers), [
    { label: "Efeitos", value: "Nenhum" },
    { label: "Intestino", value: "Regular" },
  ]);
  assert.deepEqual(checkInSummary({ effects: { bowel: "moderate" } }), [
    { label: "Efeitos", value: "Intestino (moderado)" },
  ]);
  const flow = readFileSync(new URL("../components/patient/check-in-flow.tsx", import.meta.url), "utf8");
  assert.match(flow, /selectableEffectKeys/);
  assert.match(flow, /Como está seu intestino hoje/);
});

test("pendência: diário se não houve hoje; a cada 3 dias conta a partir do último", () => {
  assert.deepEqual(checkInDue(null, 1, today), { due: true, nextOn: today });
  assert.deepEqual(checkInDue(today, 1, today), { due: false, nextOn: "2026-09-24" });
  assert.deepEqual(checkInDue("2026-09-22", 1, today), { due: true, nextOn: today });
  assert.deepEqual(checkInDue("2026-09-21", 3, today), { due: false, nextOn: "2026-09-24" });
  assert.deepEqual(checkInDue("2026-09-20", 3, today), { due: true, nextOn: today });
  assert.equal(nextCheckInLabel("2026-09-24", today), "amanhã");
  assert.equal(nextCheckInLabel("2026-09-26", today), "sábado, 26/09");
});

test("mapa de efeitos: sem check-in é diferente de não marcado; vale a intensidade mais forte do dia", () => {
  const map = effectsMap(
    [
      { check_in_on: "2026-09-23", effects: { nausea: "mild" } },
      { check_in_on: "2026-09-23", effects: { nausea: "strong" } },
      { check_in_on: "2026-09-21", effects: {} },
    ],
    today,
  );
  assert.equal(map.dates.length, 14);
  assert.equal(map.checkInDays, 2);
  assert.deepEqual(map.rows.map((row) => row.label), ["Náusea"]);
  const cells = map.rows[0].cells;
  assert.equal(cells.at(-1)!.state, "strong");
  assert.equal(cells.at(-3)!.state, "clear");
  assert.equal(cells.at(-2)!.state, "none");
});

test("conclusão repete o que foi enviado, sem interpretar", () => {
  const answers = { weight_kg: 76.4, feeling: 4, effects: { nausea: "strong" as const }, water_glasses: 1, adherence: "no" as const, adherence_reason: "forgot" as const };
  assert.deepEqual(checkInSummary(answers), [
    { label: "Peso", value: "76,4 kg" },
    { label: "Como se sentiu", value: "Bem" },
    { label: "Efeitos", value: "Náusea (forte)" },
    { label: "Água", value: "1 copo" },
    { label: "Tratamento", value: "Não · esqueci" },
  ]);
  assert.equal(hasStrongEffect(answers), true);
  const flow = readFileSync(new URL("../components/patient/check-in-flow.tsx", import.meta.url), "utf8");
  assert.match(flow, /Pronto, obrigado!/);
  assert.match(flow, /\/alerta`/);
  assert.doesNotMatch(flow, /risco|grave|preocupante|normal para/i);
});

test("refeição: com foto o texto é opcional; sem foto, continua obrigatório", () => {
  const base = { request_key: key, meal_type: "lunch", eaten_at: "2026-09-23T12:00:00Z" };
  assert.equal(mealInput({ ...base, description: null, photo_document_id: key }).description, null);
  assert.equal(mealInput({ ...base, description: "  ", photo_document_id: key }).description, null);
  assert.throws(() => mealInput({ ...base, description: null }));
  assert.throws(() => mealInput({ ...base, description: "   " }));
  assert.equal(mealInput({ ...base, description: " Arroz " }).description, " Arroz ");
});
