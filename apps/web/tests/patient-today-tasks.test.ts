import assert from "node:assert/strict";
import test from "node:test";
import { patientTodayTasks } from "../modules/workspace/patient-today-tasks.ts";

test("patient today lists only unresolved actions in their expected order", () => {
  const base = "/clinicas/tenant/meu-cuidado";
  assert.deepEqual(
    patientTodayTasks({
      base,
      pendingCheckInId: "check-in-1",
      preparationPending: { count: 2, first: { id: "preparation-1", status: "requested" } },
      unreadPlan: { title: "Orientações de setembro", revision: 2 },
      onboardingHref: "/clinicas/tenant/primeiros-passos",
      hasMeasurement: false,
    }).map((task) => [task.id, task.href]),
    [
      ["check-in-check-in-1", `${base}/diario#check-in-check-in-1`],
      ["preparation-preparation-1", `${base}/hoje?preparo=preparation-1#preparo-preparation-1`],
      ["published-plan", `${base}/plano`],
      ["onboarding", "/clinicas/tenant/primeiros-passos"],
      ["measurements", `${base}/evolucao#atualizar-medidas`],
    ],
  );
});

test("a published plan is a patient task only until the patient confirms its reading", () => {
  const [task] = patientTodayTasks({
    base: "/clinicas/tenant/meu-cuidado",
    unreadPlan: { title: "Orientações de setembro", revision: 2 },
    hasMeasurement: true,
  });
  assert.equal(task.title, "Ler uma nova orientação");
  assert.match(task.detail, /revisão 2 publicada/);
});

test("patient today distinguishes a saved preparation draft from medical review", () => {
  const [task] = patientTodayTasks({
    base: "/clinicas/tenant/meu-cuidado",
    preparationPending: { count: 1, first: { id: "preparation-1", status: "draft" } },
    hasMeasurement: true,
  });
  assert.equal(task.title, "Continuar sua pré-consulta");
  assert.match(task.detail, /rascunho foi salvo/);
  assert.doesNotMatch(task.detail, /revisão médica/i);
});

test("patient today has no generic task after every tracked action is complete", () => {
  assert.deepEqual(
    patientTodayTasks({
      base: "/clinicas/tenant/meu-cuidado",
      hasMeasurement: true,
    }),
    [],
  );
});
