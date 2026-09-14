export type MeasurementSource = {
  measure_label: string | null;
  measure_value: number | null;
  measure_unit: string | null;
  reported_on: string | null;
  submitted_at: string;
  source: "onboarding" | "check_in";
  source_id: string;
  source_label: string;
};

export type MeasurementPoint = {
  id: string;
  value: number;
  reportedOn: string;
  submittedAt: string;
  source: MeasurementSource["source"];
  sourceId: string;
  sourceLabel: string;
};

export type MeasurementSeries = {
  key: string;
  label: string;
  unit: string;
  count: number;
  firstOn: string;
  lastOn: string;
  latestValue: number;
  entries: MeasurementPoint[];
};

export type MeasurementPeriod = { from: string | null; to: string | null };

export function measurementPageHref({
  base, patient, patientId, period, cursor,
}: {
  base: string;
  patient: boolean;
  patientId?: string;
  period: MeasurementPeriod;
  cursor: string;
}) {
  const query = new URLSearchParams({ cursor });
  if (!patient)
    query.set("aba", base.includes("/acompanhamento") ? "evolucao" : "Evolução");
  if (patientId) query.set("paciente", patientId);
  if (period.from) query.set("inicio", period.from);
  if (period.to) query.set("fim", period.to);
  return `${patient ? `${base}/evolucao` : base}?${query}`;
}

export function onboardingSourceHref(base: string, patient: boolean, patientId?: string) {
  if (patient) return base.replace(/\/meu-cuidado$/, "/primeiros-passos");
  return base.includes("/acompanhamento")
    ? base.replace("/acompanhamento", `/pacientes/${patientId}?aba=Visão%20geral#onboarding-summary`)
    : `${base}?aba=Visão%20geral#onboarding-summary`;
}

export function checkInSourceHref(base: string, patient: boolean, sourceId: string) {
  if (patient) return `${base}/diario#check-in-${sourceId}`;
  return base.includes("/acompanhamento")
    ? `${base}?aba=check-ins#check-in-${sourceId}`
    : `${base}?aba=Linha%20do%20tempo#check-in-${sourceId}`;
}

export function longitudinalPeriod(input: { from?: string; to?: string }): MeasurementPeriod {
  const valid = (value: string | undefined) => {
    if (!value) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T12:00:00Z`)) || new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value)
      throw new Error("Período inválido.");
    return value;
  };
  const from = valid(input.from), to = valid(input.to);
  if (from && to && from > to) throw new Error("Período inválido.");
  return { from, to };
}

function withinPeriod(value: string, period: MeasurementPeriod) {
  return (!period.from || value >= period.from) && (!period.to || value <= period.to);
}

// Neutral projection only: no targets, trend judgement or clinical thresholds.
export function measurementSeries(
  rows: MeasurementSource[],
  period: MeasurementPeriod = { from: null, to: null },
) {
  const groups = new Map<string, MeasurementSeries>();
  for (const row of rows) {
    if (
      !row.measure_label ||
      row.measure_value === null ||
      !row.measure_unit ||
      !row.reported_on ||
      !withinPeriod(row.reported_on, period)
    )
      continue;
    const key = `${row.measure_label.trim().toLocaleLowerCase("pt-BR")}\u0000${row.measure_unit.trim().toLocaleLowerCase("pt-BR")}`;
    const entry: MeasurementPoint = {
      id: `${row.source}-${row.source_id}-${row.measure_label}-${row.measure_unit}`,
      value: row.measure_value,
      reportedOn: row.reported_on,
      submittedAt: row.submitted_at,
      source: row.source,
      sourceId: row.source_id,
      sourceLabel: row.source_label,
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
          a.reportedOn.localeCompare(b.reportedOn) ||
          a.submittedAt.localeCompare(b.submittedAt) ||
          a.id.localeCompare(b.id),
      );
      return {
        ...group,
        count: group.entries.length,
        firstOn: group.entries[0].reportedOn,
        lastOn: group.entries.at(-1)!.reportedOn,
        latestValue: group.entries.at(-1)!.value,
      };
    })
    .sort(
      (a, b) =>
        b.lastOn.localeCompare(a.lastOn) || a.label.localeCompare(b.label),
    );
}

export function paginateMeasurementPoints(
  series: MeasurementSeries[],
  cursor?: string,
  size = 20,
) {
  const points = series
    .flatMap((item) => item.entries.map((entry) => ({ ...entry, series: item.key })))
    .sort(
      (a, b) =>
        b.reportedOn.localeCompare(a.reportedOn) ||
        b.submittedAt.localeCompare(a.submittedAt) ||
        b.id.localeCompare(a.id),
    );
  const index = cursor ? points.findIndex((point) => point.id === cursor) : -1;
  if (cursor && index < 0) throw new Error("Cursor de medidas inválido.");
  const start = cursor ? index + 1 : 0;
  const page = points.slice(Math.max(start, 0), Math.max(start, 0) + size);
  return {
    points: page,
    nextCursor: start + size < points.length ? page.at(-1)?.id ?? null : null,
  };
}
