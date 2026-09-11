import assert from "node:assert/strict";
import test from "node:test";
import { measurementSeries } from "../modules/longitudinal/project.ts";

test("groups persisted measures by label and unit without deriving a trend", () => {
  const series = measurementSeries([
    {
      measure_label: "Peso",
      measure_value: 78.4,
      measure_unit: "kg",
      reported_on: "2026-09-10",
      submitted_at: "2026-09-10T12:00:00Z",
    },
    {
      measure_label: " peso ",
      measure_value: 78.1,
      measure_unit: "KG",
      reported_on: "2026-09-11",
      submitted_at: "2026-09-11T12:00:00Z",
    },
    {
      measure_label: "Peso",
      measure_value: 172,
      measure_unit: "lb",
      reported_on: "2026-09-11",
      submitted_at: "2026-09-11T13:00:00Z",
    },
    {
      measure_label: null,
      measure_value: null,
      measure_unit: null,
      reported_on: "2026-09-11",
      submitted_at: "2026-09-11T14:00:00Z",
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
