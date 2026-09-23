import type { MeasurementSeries } from "../longitudinal/project.ts";

const one = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const plain = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const dayMonth = (iso: string) => {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
};

const shortLabels: Record<string, string> = {
  "Circunferência abdominal": "Cintura",
};

// Altura escrita em metros antes da correção (1,73) continua guardada como
// foi enviada; na tela, mostramos a unidade que a pessoa quis dizer.
function shown(label: string, value: number, unit: string) {
  if (label === "Altura" && unit === "cm" && value > 0 && value < 3)
    return { value: plain.format(value), unit: "m" };
  return { value: label === "Peso" ? one.format(value) : plain.format(value), unit };
}

const origins: Record<string, string | null> = {
  onboarding: "cadastro inicial",
  check_in: "check-in",
  measurement: null,
};

// O que a tela de Evolução mostra, sem interpretar: a série de peso para o
// gráfico, as outras medidas (último valor) e a lista cronológica, do mais
// recente ao mais antigo.
export function evolutionView(measures: MeasurementSeries[]) {
  const weightSeries = measures.find((item) => item.label === "Peso" && item.unit === "kg");
  const weight = weightSeries
    ? {
        points: weightSeries.entries.map((entry) => ({ value: entry.value, label: dayMonth(entry.reportedOn) })),
        latest: one.format(weightSeries.latestValue),
        first: one.format(weightSeries.entries[0].value),
      }
    : null;
  const others = measures
    .filter((item) => item !== weightSeries)
    .map((item) => {
      const value = shown(item.label, item.latestValue, item.unit);
      return {
        label: shortLabels[item.label] ?? item.label,
        latest: value.value,
        unit: value.unit,
        lastOn: dayMonth(item.lastOn),
        count: item.count,
      };
    });
  const entries = measures
    .flatMap((item) =>
      item.entries.map((entry) => {
        const value = shown(item.label, entry.value, item.unit);
        return {
          id: entry.id,
          label: shortLabels[item.label] ?? item.label,
          value: `${value.value} ${value.unit}`,
          on: dayMonth(entry.reportedOn),
          sort: `${entry.reportedOn}${entry.submittedAt}`,
          origin: origins[entry.source] ?? null,
        };
      }),
    )
    .sort((a, b) => b.sort.localeCompare(a.sort))
    .slice(0, 30);
  return { weight, others, entries };
}

// Período pedido pela URL (?periodo=30|90|tudo) vira o intervalo de datas.
export function evolutionPeriod(value: string | undefined, today: string) {
  const key = value === "30" || value === "90" ? value : "tudo";
  if (key === "tudo") return { key, from: undefined as string | undefined };
  const start = new Date(`${today}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - Number(key));
  return { key, from: start.toISOString().slice(0, 10) };
}
