import assert from "node:assert/strict";
import test from "node:test";
import { patientGoalFacts } from "../modules/workspace/patient-goal-facts.ts";

test("mostra o objetivo declarado com origem, autoria e data disponíveis", () => {
  assert.deepEqual(
    patientGoalFacts({
      expectedOutcome: "  Dormir melhor  ",
      firstPriority: "Retomar caminhadas",
      source: "staff_assisted",
      recordedByName: "Dra. Ana",
      updatedAt: "2026-10-07T15:00:00.000Z",
    }),
    {
      title: "Objetivo atual",
      expectedOutcome: "Dormir melhor",
      firstPriority: "Retomar caminhadas",
      origin: "Registrado com apoio da equipe · Dra. Ana",
      updatedAt: "7 de out. de 2026",
    },
  );
});

test("não inventa origem nem mantém o rótulo atual quando aguarda resposta", () => {
  assert.deepEqual(
    patientGoalFacts({
      expectedOutcome: "Conseguir organizar a rotina",
      firstPriority: null,
      source: null,
      recordedByName: null,
      updatedAt: null,
      awaitingPatient: true,
    }),
    {
      title: "Último objetivo registrado",
      expectedOutcome: "Conseguir organizar a rotina",
      firstPriority: null,
      origin: "Origem indisponível",
      updatedAt: null,
    },
  );
});

test("não apresenta objetivo sem conteúdo", () => {
  assert.equal(
    patientGoalFacts({
      expectedOutcome: " ",
      firstPriority: null,
      source: "patient_reported",
      recordedByName: null,
      updatedAt: null,
    }),
    null,
  );
});
