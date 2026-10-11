import assert from "node:assert/strict";
import test from "node:test";
import { widgetCalendar } from "../modules/workspace/widget-calendar.ts";

test("semana da clínica começa na segunda e destaca o domingo correto", () => {
  const calendar = widgetCalendar("2026-10-11");
  assert.equal(calendar.day, 11);
  assert.equal(calendar.weekday, "domingo");
  assert.deepEqual(calendar.days.map(day => day.day), [5, 6, 7, 8, 9, 10, 11]);
  assert.deepEqual(calendar.days.filter(day => day.current).map(day => day.iso), ["2026-10-11"]);
});

test("semana atravessa ano sem deslocamento de fuso", () => {
  const calendar = widgetCalendar("2027-01-01");
  assert.equal(calendar.days[0].iso, "2026-12-28");
  assert.equal(calendar.days[6].iso, "2027-01-03");
  assert.equal(calendar.days[4].current, true);
});
