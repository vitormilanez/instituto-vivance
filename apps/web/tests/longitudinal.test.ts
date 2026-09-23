import assert from "node:assert/strict";
import test from "node:test";
import { checkInSourceHref, longitudinalPeriod, measurementPageHref, measurementSeries, onboardingSourceHref, paginateMeasurementPoints, patientMeasurementSourceHref } from "../modules/longitudinal/project.ts";

test("groups persisted measures by label and unit without deriving a trend", () => {
  const series = measurementSeries([
    {
      measure_label: "Peso",
      measure_value: 78.4,
      measure_unit: "kg",
      reported_on: "2026-09-10",
      submitted_at: "2026-09-10T12:00:00Z",
      source: "check_in",
      source_id: "check-in-1",
      source_label: "Check-in enviado",
    },
    {
      measure_label: " peso ",
      measure_value: 78.1,
      measure_unit: "KG",
      reported_on: "2026-09-11",
      submitted_at: "2026-09-11T12:00:00Z",
      source: "check_in",
      source_id: "check-in-2",
      source_label: "Check-in enviado",
    },
    {
      measure_label: "Peso",
      measure_value: 172,
      measure_unit: "lb",
      reported_on: "2026-09-11",
      submitted_at: "2026-09-11T13:00:00Z",
      source: "check_in",
      source_id: "check-in-3",
      source_label: "Check-in enviado",
    },
    {
      measure_label: null,
      measure_value: null,
      measure_unit: null,
      reported_on: "2026-09-11",
      submitted_at: "2026-09-11T14:00:00Z",
      source: "check_in",
      source_id: "check-in-4",
      source_label: "Check-in enviado",
    },
  ]);

  assert.equal(series.length, 2);
  assert.deepEqual(
    {
      label: series[0].label,
      unit: series[0].unit,
      count: series[0].count,
      firstOn: series[0].firstOn,
      lastOn: series[0].lastOn,
      latestValue: series[0].latestValue,
      hasTrend: "trend" in series[0],
    },
    {
      label: "Peso",
      unit: "kg",
      count: 2,
      firstOn: "2026-09-10",
      lastOn: "2026-09-11",
      latestValue: 78.1,
      hasTrend: false,
    },
  );
  assert.equal(series[1].unit, "lb");
});

test("filters only persisted points in the chosen period and retains their source", () => {
  const rows = [
    { measure_label: "Peso", measure_value: 70, measure_unit: "kg", reported_on: "2026-08-01", submitted_at: "2026-08-01T12:00:00Z", source: "onboarding" as const, source_id: "onboarding-1", source_label: "Onboarding enviado" },
    { measure_label: "Peso", measure_value: 69, measure_unit: "kg", reported_on: "2026-09-01", submitted_at: "2026-09-01T12:00:00Z", source: "check_in" as const, source_id: "check-in-1", source_label: "Check-in enviado" },
  ];
  const series = measurementSeries(rows, { from: "2026-09-01", to: "2026-09-30" });
  assert.equal(series[0].entries.length, 1);
  assert.equal(series[0].entries[0].sourceLabel, "Check-in enviado");
  assert.equal(series[0].entries[0].sourceId, "check-in-1");
});

test("uses a stable point cursor without mixing incompatible units", () => {
  const series = measurementSeries([
    { measure_label: "Peso", measure_value: 70, measure_unit: "kg", reported_on: "2026-09-01", submitted_at: "2026-09-01T12:00:00Z", source: "onboarding" as const, source_id: "onboarding-1", source_label: "Onboarding enviado" },
    { measure_label: "Peso", measure_value: 154, measure_unit: "lb", reported_on: "2026-09-02", submitted_at: "2026-09-02T12:00:00Z", source: "check_in" as const, source_id: "check-in-1", source_label: "Check-in enviado" },
    { measure_label: "Peso", measure_value: 69, measure_unit: "kg", reported_on: "2026-09-03", submitted_at: "2026-09-03T12:00:00Z", source: "check_in" as const, source_id: "check-in-2", source_label: "Check-in enviado" },
  ]);
  assert.equal(series.length, 2);
  const first = paginateMeasurementPoints(series, undefined, 2);
  assert.equal(first.points.length, 2);
  assert.ok(first.nextCursor);
  assert.equal(paginateMeasurementPoints(series, first.nextCursor!, 2).points.length, 1);
  assert.throws(() => paginateMeasurementPoints(series, "cursor-desconhecido", 2));
});

test("keeps the selected route, patient and period in the next cursor URL", () => {
  const period = { from: "2026-09-01", to: "2026-09-30" };
  assert.equal(
    measurementPageHref({ base: "/clinicas/tenant/acompanhamento", patient: false, patientId: "patient-1", period, cursor: "cursor-1" }),
    "/clinicas/tenant/acompanhamento?cursor=cursor-1&aba=evolucao&paciente=patient-1&inicio=2026-09-01&fim=2026-09-30",
  );
  assert.equal(
    measurementPageHref({ base: "/clinicas/tenant/meu-cuidado", patient: true, period, cursor: "cursor-1" }),
    "/clinicas/tenant/meu-cuidado/evolucao?cursor=cursor-1&inicio=2026-09-01&fim=2026-09-30",
  );
  assert.equal(
    measurementPageHref({ base: "/clinicas/tenant/pacientes/patient-1", patient: false, patientId: "patient-1", period, cursor: "cursor-1" }),
    "/clinicas/tenant/pacientes/patient-1?cursor=cursor-1&aba=Evolu%C3%A7%C3%A3o&paciente=patient-1&inicio=2026-09-01&fim=2026-09-30",
  );
});

test("links onboarding points to a submitted onboarding destination, never the table row", () => {
  assert.equal(
    onboardingSourceHref("/clinicas/tenant/acompanhamento", false, "patient-1"),
    "/clinicas/tenant/pacientes/patient-1?aba=Visão%20geral#onboarding-summary",
  );
  assert.equal(onboardingSourceHref("/clinicas/tenant/meu-cuidado", true), "/clinicas/tenant/primeiros-passos");
  assert.equal(
    checkInSourceHref("/clinicas/tenant/acompanhamento", false, "check-in-1"),
    "/clinicas/tenant/acompanhamento?aba=check-ins#check-in-check-in-1",
  );
  assert.equal(
    checkInSourceHref("/clinicas/tenant/pacientes/patient-1", false, "check-in-1"),
    "/clinicas/tenant/pacientes/patient-1?aba=Linha%20do%20tempo#check-in-check-in-1",
  );
  assert.equal(
    patientMeasurementSourceHref("/clinicas/tenant/meu-cuidado", true),
    "/clinicas/tenant/meu-cuidado/peso",
  );
});

test("rejects inverted or malformed periods before database access", () => {
  assert.deepEqual(longitudinalPeriod({ from: "2026-09-01", to: "2026-09-30" }), { from: "2026-09-01", to: "2026-09-30" });
  assert.throws(() => longitudinalPeriod({ from: "2026-09-31" }));
  assert.throws(() => longitudinalPeriod({ from: "2026-10-01", to: "2026-09-01" }));
});
