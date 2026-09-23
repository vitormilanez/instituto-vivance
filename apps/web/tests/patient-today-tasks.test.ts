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
      ["measurements", `${base}/peso`],
    ],
  );
});

test("a required pre-consultation comes before every other patient task", () => {
  assert.deepEqual(
    patientTodayTasks({
      base: "/clinicas/tenant/meu-cuidado",
      hasRequiredPreparation: true,
      pendingCheckInId: "check-in-1",
      hasMeasurement: true,
    }).map((task) => task.id),
    ["required-preparation", "check-in-check-in-1"],
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

test("o pedido do médico vira tarefa que abre direto o formulário", () => {
  const base = "/clinicas/tenant/meu-cuidado";
  const tasks = patientTodayTasks({
    base,
    onboardingHref: "/clinicas/tenant/primeiros-passos",
    hasMeasurement: true,
    careRequests: [
      { kind: "preparation", requested_at: "2026-09-22T12:00:00Z" },
      { kind: "exams", requested_at: "2026-09-22T12:00:00Z" },
      { kind: "goals", requested_at: "2026-09-22T12:00:00Z" },
      { kind: "measurements", requested_at: "2026-09-22T12:00:00Z" },
    ],
  });
  assert.deepEqual(tasks.map((task) => task.id), [
    "care-request-preparation",
    "care-request-exams",
    "care-request-goals",
    "care-request-measurements",
  ]);
  assert.deepEqual(tasks.map((task) => task.href), [
    `${base}/preparo`,
    "/clinicas/tenant/primeiros-passos",
    "/clinicas/tenant/primeiros-passos",
    `${base}/peso`,
  ]);
  // Cada tarefa diz de onde veio, com a data do pedido — nunca risco.
  for (const task of tasks) {
    assert.match(task.detail, /Pedido em 22\/09\./);
    assert.doesNotMatch(task.detail, /urgente|risco|gravidade/i);
  }
});

test("o pedido substitui o lembrete genérico da mesma pendência", () => {
  const base = "/clinicas/tenant/meu-cuidado";
  const tasks = patientTodayTasks({
    base,
    hasMeasurement: false,
    preparationPending: { count: 1, first: { id: "preparation-1", status: "requested" } },
    careRequests: [
      { kind: "measurements", requested_at: "2026-09-22T12:00:00Z" },
      { kind: "preparation", requested_at: "2026-09-22T12:00:00Z" },
    ],
  });
  // A mesma pendência não aparece em dois vocabulários.
  assert.deepEqual(tasks.map((task) => task.id), [
    "care-request-measurements",
    "care-request-preparation",
  ]);
});

test("um tipo fora do contrato não inventa tarefa", () => {
  assert.deepEqual(
    patientTodayTasks({
      base: "/clinicas/tenant/meu-cuidado",
      hasMeasurement: true,
      careRequests: [
        { kind: "plan", requested_at: "2026-09-22T12:00:00Z" },
        { kind: "encounter", requested_at: "2026-09-22T12:00:00Z" },
      ],
    }),
    [],
    "registros da clínica nunca viram tarefa do paciente",
  );
});
