import assert from "node:assert/strict";
import test from "node:test";
import { weightChartModel, weightVariation, weightDateTime } from "../lib/weight-chart.ts";

test("peso usa tempo real e ordena sem modificar a origem", () => {
  const points = [{ value: 78, date: "2026-10-11" }, { value: 80, date: "2026-10-01" }, { value: 79, date: "2026-10-02" }];
  const model = weightChartModel(points)!;
  assert.deepEqual(model.coordinates.map((point) => point.x), [0, 0.1, 1]);
  assert.equal(points[0].date, "2026-10-11");
});
test("constantes, um registro e dias duplicados permanecem finitos", () => {
  const single = weightChartModel([{ value: 80, date: "2026-10-01" }])!;
  assert.deepEqual(single.coordinates, [{ x: 0.5, y: 0.5 }]);
  const duplicate = weightChartModel([{ value: 80, date: "2026-10-01" }, { value: 80, date: "2026-10-01" }])!;
  assert.equal(duplicate.points.length, 2);
  assert.deepEqual(duplicate.coordinates, [{ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }]);
  const constant = weightChartModel([{ value: 80, date: "2026-10-01" }, { value: 80, date: "2026-10-02" }])!;
  assert.deepEqual(constant.coordinates, [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }]);
});
test("pesos e datas inválidos não produzem geometria nem substitutos", () => {
  assert.equal(weightChartModel([]), null);
  assert.equal(weightChartModel([{ value: NaN, date: "2026-10-01" }, { value: 0, date: "2026-10-01" }, { value: 70, date: "2026-02-30" }]), null);
  assert.equal(weightDateTime("2026-02-30"), null);
  assert.equal(weightDateTime("2026-10-01T23:59:00Z"), Date.parse("2026-10-01T00:00:00Z"));
});
test("variação é objetiva e não mistura cadastro com a série", () => {
  const initial = { value: 100, date: "2026-09-01" };
  const latest = { value: 95, date: "2026-10-01" };
  assert.deepEqual(weightVariation(latest, initial), { kilograms: -5, percent: -5 });
  assert.deepEqual(weightVariation(initial, initial), { kilograms: 0, percent: 0 });
  assert.equal(weightVariation(latest, null), null);
  assert.equal(weightVariation(initial, latest), null);
  const series = weightChartModel([latest])!;
  assert.equal(series.points.length, 1);
  assert.equal(series.points[0], latest);
});
