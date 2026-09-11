export type MeasurementSource = {
  measure_label: string | null;
  measure_value: number | null;
  measure_unit: string | null;
  reported_on: string;
  submitted_at: string;
};

export type MeasurementSeries = {
  key: string;
  label: string;
  unit: string;
  count: number;
  firstOn: string;
  lastOn: string;
  latestValue: number;
  entries: Array<{ value: number; reportedOn: string; submittedAt: string }>;
};

// Neutral projection only: no targets, trend judgement or clinical thresholds.
export function measurementSeries(rows: MeasurementSource[]) {
  const groups = new Map<string, MeasurementSeries>();
  for (const row of rows) {
    if (
      !row.measure_label ||
      row.measure_value === null ||
      !row.measure_unit
    )
      continue;
    const key = `${row.measure_label.trim().toLocaleLowerCase("pt-BR")}\u0000${row.measure_unit.trim().toLocaleLowerCase("pt-BR")}`;
    const entry = {
      value: row.measure_value,
      reportedOn: row.reported_on,
      submittedAt: row.submitted_at,
    };
    const current = groups.get(key);
    if (current) current.entries.push(entry);
    else
      groups.set(key, {
        key,
        label: row.measure_label.trim(),
        unit: row.measure_unit.trim(),
        count: 0,
        firstOn: row.reported_on,
        lastOn: row.reported_on,
        latestValue: row.measure_value,
        entries: [entry],
      });
  }
  return [...groups.values()]
    .map((group) => {
      group.entries.sort(
        (a, b) =>
          b.reportedOn.localeCompare(a.reportedOn) ||
          b.submittedAt.localeCompare(a.submittedAt),
      );
      return {
        ...group,
        count: group.entries.length,
        firstOn: group.entries.at(-1)!.reportedOn,
        lastOn: group.entries[0].reportedOn,
        latestValue: group.entries[0].value,
      };
    })
    .sort(
      (a, b) =>
        b.lastOn.localeCompare(a.lastOn) || a.label.localeCompare(b.label),
    );
}
