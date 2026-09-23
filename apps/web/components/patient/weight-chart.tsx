"use client";

import { useState } from "react";

export type ChartPoint = { value: number; label: string };

const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Gráfico de peso: linha simples, sem metas, faixas nem cores de bom/ruim.
// Tocar num ponto mostra o valor. A lista de registros abaixo é a versão em
// texto dos mesmos números.
export function WeightChart({ points }: { points: ChartPoint[] }) {
  const [selected, setSelected] = useState(points.length - 1);
  const width = 350;
  const height = 180;
  const values = points.map((point) => point.value);
  const min = Math.min(...values) - 0.4;
  const max = Math.max(...values) + 0.4;
  const left = 40;
  const right = 14;
  const top = 14;
  const bottom = 26;
  const x = (index: number) => left + (index * (width - left - right)) / Math.max(1, points.length - 1);
  const y = (value: number) => top + ((max - value) / (max - min)) * (height - top - bottom);
  const ticks = [Math.ceil(min * 2) / 2, Math.round(min + max) / 2, Math.floor(max * 2) / 2];
  const current = points[selected] ?? points.at(-1)!;

  return (
    <div className="pv-chart">
      <p className="pv-chart-value" aria-live="polite">
        <strong>{decimal.format(current.value)}</strong> kg <span>· {current.label}</span>
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico do seu peso. Os valores estão listados em Seus registros.">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} className="pv-chart-grid" />
            <text x={0} y={y(tick) + 4} className="pv-chart-tick">{decimal.format(tick)}</text>
          </g>
        ))}
        <path
          className="pv-chart-line"
          d={points.map((point, index) => `${index ? "L" : "M"}${x(index)} ${y(point.value)}`).join(" ")}
        />
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle
              cx={x(index)}
              cy={y(point.value)}
              r={18}
              className="pv-chart-hit"
              onClick={() => setSelected(index)}
            />
            <circle
              cx={x(index)}
              cy={y(point.value)}
              r={index === selected ? 7 : 4.5}
              className={index === selected ? "pv-chart-dot is-selected" : "pv-chart-dot"}
              pointerEvents="none"
            />
          </g>
        ))}
        <text x={left} y={height - 4} className="pv-chart-tick">{points[0].label}</text>
        <text x={width - right} y={height - 4} className="pv-chart-tick" textAnchor="end">
          {points.at(-1)!.label}
        </text>
      </svg>
    </div>
  );
}
