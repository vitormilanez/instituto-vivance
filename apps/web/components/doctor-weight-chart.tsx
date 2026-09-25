import Link from "next/link";

export type WeightPoint = { value: number; date: string };

const weightLabel = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const dateLabel = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

export function DoctorWeightChart({
  points,
  href,
  initialWeight,
}: {
  points: WeightPoint[] | null;
  href: string;
  initialWeight?: WeightPoint | null;
}) {
  const latest = points?.at(-1);
  const width = 320;
  const height = 100;
  const values = points?.map((point) => point.value) ?? [];
  const low = Math.min(...values) - 0.5;
  const high = Math.max(...values) + 0.5;
  const x = (index: number) => 16 + (index * (width - 32)) / Math.max(1, values.length - 1);
  const y = (value: number) => 12 + ((high - value) / (high - low)) * (height - 24);

  return (
    <section className="doctor-weight-trend" aria-label="Evolução do peso informado pelo paciente">
      <div className="doctor-weight-heading">
        <h4>Peso informado pelo paciente</h4>
        <Link href={href}>Ver evolução</Link>
      </div>
      {points === null ? (
        <p>Histórico de peso indisponível agora.</p>
      ) : !latest ? (
        <p>Nenhum peso informado até agora.</p>
      ) : (
        <>
          <div className="doctor-weight-endpoints">
            <p><span>Peso inicial · cadastro</span><strong>{initialWeight ? `${weightLabel.format(initialWeight.value)} kg` : "Não informado"}</strong><small>{initialWeight ? dateLabel(initialWeight.date) : ""}</small></p>
            <p><span>Atual informado</span><strong>{weightLabel.format(latest.value)} kg</strong><small>{dateLabel(latest.date)}</small></p>
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={points.length > 1 ? `Gráfico dos últimos ${points.length} pesos informados` : "Um peso informado; ainda não há evolução para comparar"}>
            <line x1="16" x2={width - 16} y1={height - 12} y2={height - 12} className="doctor-weight-axis" />
            {points.length > 1 && <path d={points.map((point, index) => `${index ? "L" : "M"}${x(index)} ${y(point.value)}`).join(" ")} className="doctor-weight-line" />}
            {points.map((point, index) => <circle key={`${point.date}-${index}`} cx={x(index)} cy={y(point.value)} r={index === points.length - 1 ? 5 : 3.5} className="doctor-weight-dot" />)}
          </svg>
          <p className="doctor-weight-caption">{points.length === 1 ? "Um registro; a linha aparece com o próximo peso." : `${points.length} registros recentes · ${dateLabel(points[0].date)} a ${dateLabel(latest.date)}`}</p>
          <ol className="sr-only" aria-label="Pesos informados, do mais antigo ao mais recente">
            {points.map((point, index) => <li key={`${point.date}-${index}`}>{dateLabel(point.date)}: {weightLabel.format(point.value)} kg</li>)}
          </ol>
        </>
      )}
    </section>
  );
}
