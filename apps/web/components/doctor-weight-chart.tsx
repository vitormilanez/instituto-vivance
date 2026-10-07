"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RetryButton } from "@/components/retry-button";
import { validWeightPoint, weightChartModel, weightVariation, type WeightPoint } from "@/lib/weight-chart";
export type { WeightPoint } from "@/lib/weight-chart";

const weightLabel = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signedLabel = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" });
const dateLabel = (date: string) => date.slice(0, 10).split("-").reverse().join("/");
const shortDate = (date: string) => date.slice(5, 10).split("-").reverse().join("/");

export function DoctorWeightChart({ points, href, initialWeight }: { points: WeightPoint[] | null; href: string; initialWeight?: WeightPoint | null }) {
  const model = points ? weightChartModel(points) : null;
  const [selection, setSelection] = useState<{ key: string; index: number } | null>(null);
  const controls = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const seriesKey = model?.points.map((point) => `${point.date}:${point.value}`).join("|") ?? "";
  const activeIndex = model ? Math.min(selection?.key === seriesKey ? selection.index : model.points.length - 1, model.points.length - 1) : 0;
  const latest = model?.points.at(-1);
  const active = model?.points[activeIndex];
  const baseline = initialWeight && validWeightPoint(initialWeight) ? initialWeight : null;
  const comparison = baseline ?? (model && model.points.length > 1 ? model.points[0] : null);
  const variation = latest ? weightVariation(latest, comparison) : null;
  const select = (index: number, focus = false) => {
    if (!model) return;
    const next = Math.max(0, Math.min(model.points.length - 1, index));
    setSelection({ key: seriesKey, index: next });
    if (focus) controls.current[next]?.focus();
  };
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === "ArrowLeft" ? index - 1 : event.key === "ArrowRight" ? index + 1 : event.key === "Home" ? 0 : event.key === "End" ? (model?.points.length ?? 1) - 1 : null;
    if (next !== null) { event.preventDefault(); select(next, true); }
  };
  return (
    <section className="doctor-weight-trend dweight" aria-labelledby={`${id}-title`}>
      <div className="dweight-heading"><h4 id={`${id}-title`}>Evolução do peso</h4><Link href={href}>Ver evolução</Link></div>
      <p className="dweight-origin">Informado pelo paciente</p>
      {points === null ? <div className="dweight-empty"><p>Histórico de peso indisponível agora.</p><RetryButton /></div> : !model || !latest ? <div className="dweight-empty"><p>{points.length ? "Os registros disponíveis não têm peso e data válidos para exibir o gráfico." : "Nenhum peso informado até agora."}</p><p>Os próximos registros do paciente aparecerão aqui.</p></div> : <>
        <div className="dweight-current"><span>Atual informado</span><strong>{weightLabel.format(latest.value)} <small>kg</small></strong><time dateTime={latest.date}>{dateLabel(latest.date)}</time></div>
        <p className="dweight-variation">{variation ? <><strong>{signedLabel.format(variation.kilograms)} kg · {signedLabel.format(variation.percent)}%</strong><span>{baseline ? "em relação ao cadastro" : "desde o primeiro registro exibido"}</span></> : "Variação ainda sem referência para comparar."}</p>
        <div className="dweight-chart" role="group" aria-label="Gráfico de peso. Selecione um registro ou use as setas do teclado.">
          <span className="dweight-unit">kg</span>
          <div className="dweight-y-axis" aria-hidden="true">{model.ticks.map((tick, index) => <span key={index} style={{ top: `${index * 50}%` }}>{weightLabel.format(tick)}</span>)}</div>
          <div className="dweight-plot">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {[0, 50, 100].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} className="dweight-grid" />)}
              {model.points.length > 1 && <path d={model.coordinates.map((point, index) => `${index ? "L" : "M"}${point.x * 100} ${point.y * 100}`).join(" ")} className="dweight-line" vectorEffect="non-scaling-stroke" />}
            </svg>
            {model.points.map((point, index) => <button key={`${point.date}-${index}`} type="button" ref={(element) => { controls.current[index] = element; }} className={`dweight-point${index === activeIndex ? " is-selected" : ""}`} style={{ left: `${model.coordinates[index].x * 100}%`, top: `${model.coordinates[index].y * 100}%` }} aria-label={`${dateLabel(point.date)}: ${weightLabel.format(point.value)} kg, registro ${index + 1} de ${model.points.length}`} aria-pressed={index === activeIndex} tabIndex={index === activeIndex ? 0 : -1} onFocus={() => select(index)} onClick={() => select(index)} onKeyDown={(event) => navigate(event, index)}><span /></button>)}
          </div>
          <div className="dweight-x-axis" aria-hidden="true">{model.points[0].date.slice(0, 10) === latest.date.slice(0, 10) ? <span className="dweight-single-date">{shortDate(latest.date)}</span> : <><span>{shortDate(model.points[0].date)}</span><span>{shortDate(latest.date)}</span></>}</div>
        </div>
        <div className="dweight-inspector">
          <button type="button" aria-label="Registro anterior" disabled={activeIndex === 0} onClick={() => select(activeIndex - 1)}><ChevronLeft size={17} aria-hidden="true" /></button>
          <p id={`${id}-selection`} aria-live="polite" aria-atomic="true"><strong>{active && weightLabel.format(active.value)} kg</strong><span>{active && dateLabel(active.date)} · {activeIndex + 1}/{model.points.length}</span></p>
          <button type="button" aria-label="Próximo registro" disabled={activeIndex === model.points.length - 1} onClick={() => select(activeIndex + 1)}><ChevronRight size={17} aria-hidden="true" /></button>
        </div>
        {model.points.length === 1 && <p className="dweight-caption">Um registro. A linha aparece quando houver outro peso informado.</p>}
        {points.length > model.points.length && <p className="dweight-caption">{points.length - model.points.length} registro(s) sem peso ou data válidos não aparecem no gráfico.</p>}
        <details className="dweight-details"><summary>Detalhes dos {model.points.length} registros</summary><table><caption className="sr-only">Pesos informados pelo paciente, em ordem de data</caption><thead><tr><th scope="col">Data</th><th scope="col">Peso</th></tr></thead><tbody>{model.points.map((point, index) => <tr key={`${point.date}-${index}`}><td><time dateTime={point.date}>{dateLabel(point.date)}</time></td><td>{weightLabel.format(point.value)} kg</td></tr>)}</tbody></table></details>
      </>}
        <div className="dweight-baseline"><span>Peso inicial · cadastro</span>{baseline ? <p><strong>{weightLabel.format(baseline.value)} kg</strong><time dateTime={baseline.date}>{dateLabel(baseline.date)}</time></p> : <p>Não informado</p>}</div>
    </section>
  );
}
