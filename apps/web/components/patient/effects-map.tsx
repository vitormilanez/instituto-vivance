import { intensityLabels, intensityLetters, type Intensity } from "@/modules/daily-check-ins/model";

type EffectsMapData = {
  dates: string[];
  checkInDays: number;
  rows: { key: string; label: string; cells: { day: string; state: "none" | "clear" | Intensity }[] }[];
};

const dayMonth = (day: string) => day.split("-").reverse().slice(0, 2).join("/");

// Os efeitos marcados nos check-ins, dia a dia. Letra além do tom (L/M/F),
// para nada depender só de cor; "sem check-in" é diferente de "não marcado".
export function EffectsMap({ data, emptyText }: { data: EffectsMapData; emptyText: string }) {
  if (data.checkInDays === 0) return <p className="pv-lead">{emptyText}</p>;
  if (data.rows.length === 0)
    return (
      <p className="pv-lead">
        Nenhum efeito marcado nos {data.checkInDays} check-ins de {dayMonth(data.dates[0])} a {dayMonth(data.dates.at(-1)!)}.
      </p>
    );
  return (
    <div className="pv-stack pv-tight">
      <p className="pv-muted">
        {dayMonth(data.dates[0])} a {dayMonth(data.dates.at(-1)!)} · {data.checkInDays}{" "}
        {data.checkInDays === 1 ? "check-in" : "check-ins"}
      </p>
      <div className="pv-map" role="table" aria-label="Efeitos marcados por dia">
        {data.rows.map((row) => (
          <div key={row.key} className="pv-map-row" role="row">
            <span role="rowheader">{row.label}</span>
            {row.cells.map((cell) => (
              <span
                key={cell.day}
                role="cell"
                className={`pv-map-cell is-${cell.state}`}
                aria-label={`${dayMonth(cell.day)}: ${
                  cell.state === "none" ? "sem check-in" : cell.state === "clear" ? "não marcado" : intensityLabels[cell.state]
                }`}
              >
                {cell.state === "none" ? "·" : cell.state === "clear" ? "" : intensityLetters[cell.state]}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="pv-map-legend">
        <span>L leve</span>
        <span>M moderado</span>
        <span>F forte</span>
        <span>□ não marcado</span>
        <span>· sem check-in</span>
      </p>
    </div>
  );
}
