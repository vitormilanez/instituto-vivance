import Link from "next/link";
import type { PatientLongitudinal } from "@/modules/longitudinal/service";
import { evolutionView } from "@/modules/workspace/patient-evolution";
import { Icon } from "./icons";
import { WeightChart } from "./weight-chart";

// Evolução: o peso em destaque, as outras medidas e a lista do que a pessoa
// registrou. Sem metas, previsões ou cores de bom/ruim; com um registro só,
// o número — o gráfico começa no segundo.
export function PatientEvolution({
  data,
  base,
  period,
}: {
  data: PatientLongitudinal;
  base: string;
  period: string;
}) {
  const view = evolutionView(data.measures);
  const periods = [
    { key: "30", label: "30 dias" },
    { key: "90", label: "90 dias" },
    { key: "tudo", label: "Tudo" },
  ];

  if (!view.weight && view.others.length === 0 && period === "tudo")
    return (
      <div className="pv-stack">
        <section className="pv-card" aria-labelledby="pv-evo-empty">
          <h2 id="pv-evo-empty" className="pv-big">Seu histórico começa com o primeiro registro</h2>
          <p className="pv-lead">
            Aqui você vai ver seu peso e suas medidas ao longo do tempo. Não mostramos exemplos nem estimativas.
          </p>
          <Link className="pv-button" href={`${base}/peso`}>
            Registrar meu peso
            <Icon name="arrow" size={22} />
          </Link>
        </section>
      </div>
    );

  return (
    <div className="pv-stack">
      <nav className="pv-segments" aria-label="Período">
        {periods.map((item) => (
          <Link
            key={item.key}
            href={`${base}/evolucao${item.key === "tudo" ? "?periodo=tudo" : `?periodo=${item.key}`}`}
            aria-current={period === item.key ? "page" : undefined}
            className="pv-segment-link"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <section className="pv-card" aria-labelledby="pv-weight-card">
        <h2 id="pv-weight-card" className="pv-eyebrow">Peso{view.weight && view.weight.points.length > 1 ? " · toque num ponto" : ""}</h2>
        {!view.weight ? (
          <p className="pv-lead">Nenhum peso registrado neste período.</p>
        ) : view.weight.points.length === 1 ? (
          <>
            <p className="pv-evo-number">
              <strong>{view.weight.latest}</strong> kg
            </p>
            <p className="pv-muted">Registrado em {view.weight.points[0].label}</p>
            <p className="pv-notice">Seu gráfico aparece a partir do 2º registro.</p>
          </>
        ) : (
          <>
            <WeightChart points={view.weight.points} />
            <p className="pv-muted">
              {view.weight.points.length} registros · primeiro {view.weight.first} kg em {view.weight.points[0].label}
            </p>
          </>
        )}
        <Link className="pv-button is-outline" href={`${base}/peso`}>
          Registrar peso de hoje
          <Icon name="plus" size={20} />
        </Link>
      </section>

      {view.others.length > 0 && (
        <div className="pv-tiles">
          {view.others.map((item) => (
            <section key={item.label} className="pv-card pv-tile">
              <h2 className="pv-eyebrow">{item.label}</h2>
              <p className="pv-evo-number is-small">
                <strong>{item.latest}</strong> {item.unit}
              </p>
              <p className="pv-muted">
                {item.lastOn} · {item.count} {item.count === 1 ? "registro" : "registros"}
              </p>
            </section>
          ))}
        </div>
      )}

      <section className="pv-card" aria-labelledby="pv-feel-title">
        <h2 id="pv-feel-title" className="pv-eyebrow">Como você se sentiu</h2>
        <p className="pv-lead">Os efeitos que você marcar no check-in aparecem aqui, dia a dia.</p>
      </section>

      {view.entries.length > 0 && (
        <section className="pv-card" aria-labelledby="pv-regs-title">
          <h2 id="pv-regs-title" className="pv-eyebrow">Seus registros · enviados por você</h2>
          <ul className="pv-list">
            {view.entries.map((entry) => (
              <li key={entry.id}>
                <span>
                  <strong>{entry.label}</strong>
                  <small className="pv-muted pv-block">{entry.on}{entry.origin ? ` · ${entry.origin}` : ""}</small>
                </span>
                <span className="pv-value">{entry.value}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
