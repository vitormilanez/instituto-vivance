import Link from "next/link";
import type {
  PatientLongitudinal,
  StaffLongitudinal,
} from "@/modules/longitudinal/service";
import { checkInSourceHref, measurementPageHref, onboardingSourceHref, type MeasurementPoint, type MeasurementSeries } from "@/modules/longitudinal/project";

const date = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
const instant = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });

function measureHref(base: string, point: MeasurementPoint, patient: boolean, onboardingHref: string) {
  if (point.source === "check_in")
    return checkInSourceHref(base, patient, point.sourceId);
  return onboardingHref;
}

function Measures({
  measures, points, nextCursor, period, base, patient, selectedPatient, truncated, onboardingHref,
}: {
  measures: MeasurementSeries[];
  points: MeasurementPoint[];
  nextCursor: string | null;
  period: { from: string | null; to: string | null };
  base: string;
  patient: boolean;
  selectedPatient?: string;
  truncated: boolean;
  onboardingHref: string;
}) {
  const nextHref = nextCursor
    ? measurementPageHref({ base, patient, patientId: selectedPatient, period, cursor: nextCursor })
    : null;
  return (
    <section className="longitudinal-section" aria-labelledby="measures-title">
      <div className="section-heading">
        <div>
          <h2 id="measures-title">Medidas informadas</h2>
          <p>Valores registrados pelo paciente, sem metas ou interpretação.</p>
        </div>
      </div>
      <form className="longitudinal-period" method="get">
        {selectedPatient && <input type="hidden" name="paciente" value={selectedPatient} />}
        {!patient && (
          <input
            type="hidden"
            name="aba"
            value={base.includes("/acompanhamento") ? "evolucao" : "Evolução"}
          />
        )}
        <label>De<input type="date" name="inicio" defaultValue={period.from ?? ""} /></label>
        <label>Até<input type="date" name="fim" defaultValue={period.to ?? ""} /></label>
        <button className="secondary">Aplicar período</button>
      </form>
      {measures.length ? (
        <>
          <div className="measurement-grid">
            {measures.map((measure) => (
              <article className="measurement-card" key={measure.key}>
                <span>{measure.label}</span>
                <strong>{measure.latestValue} {measure.unit}</strong>
                <p>{measure.count} {measure.count === 1 ? "registro" : "registros"} · {date(measure.firstOn)}{measure.firstOn !== measure.lastOn ? ` a ${date(measure.lastOn)}` : ""}</p>
                <small>Série separada em {measure.unit}</small>
              </article>
            ))}
          </div>
          <div className="measurement-charts" aria-label="Gráficos de medidas registradas">
            {measures.map((measure) => {
              const values = measure.entries.map((entry) => entry.value);
              const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
              const path = measure.entries.map((entry, index) => `${16 + (index * 268) / Math.max(measure.entries.length - 1, 1)},${96 - ((entry.value - min) / range) * 72}`).join(" ");
              return <figure className="measurement-chart" key={measure.key}><figcaption>{measure.label} · {measure.unit}</figcaption><svg viewBox="0 0 300 112" role="img" aria-label={`${measure.label} em ${measure.unit}`}><line x1="16" y1="96" x2="284" y2="96" /><polyline points={path} /><text x="16" y="109">{date(measure.firstOn)}</text><text x="220" y="109">{date(measure.lastOn)}</text>{measure.entries.map((entry, index) => <circle key={entry.id} cx={16 + (index * 268) / Math.max(measure.entries.length - 1, 1)} cy={96 - ((entry.value - min) / range) * 72} r="4"><title>{`${entry.value} ${measure.unit} · ${date(entry.reportedOn)} · ${entry.sourceLabel}`}</title></circle>)}</svg></figure>;
            })}
          </div>
          <div className="measurement-table-wrap"><table className="measurement-table"><caption>Registros no período selecionado</caption><thead><tr><th>Data</th><th>Medida</th><th>Valor</th><th>Fonte</th></tr></thead><tbody>{points.map((point) => { const series = measures.find((item) => item.entries.some((entry) => entry.id === point.id)); return <tr key={point.id}><td>{date(point.reportedOn)}</td><td>{series?.label}</td><td>{point.value} {series?.unit}</td><td><Link href={measureHref(base, point, patient, onboardingHref)}>{point.sourceLabel}</Link></td></tr>; })}</tbody></table></div>
          {nextHref && <nav className="agenda-actions" aria-label="Mais medidas"><Link href={nextHref}>Ver mais registros</Link></nav>}
          {truncated && <p className="notice">Foram carregadas até 500 medidas para este período. Refine o período para consultar registros anteriores.</p>}
        </>
      ) : (
        <div className="empty longitudinal-empty">
          <h3>Nenhuma medida registrada</h3>
          <p>A área permanece vazia até o paciente informar um valor real.</p>
        </div>
      )}
    </section>
  );
}

export function StaffLongitudinalWorkspace({
  initial,
  base,
  showPatientPicker = true,
  showMeasures = true,
  showTimeline = true,
  backHref,
  backLabel = "Voltar para a fila de check-ins",
}: {
  initial: StaffLongitudinal;
  base: string;
  showPatientPicker?: boolean;
  showMeasures?: boolean;
  showTimeline?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  const events = [
    ...initial.checkIns.flatMap((item) =>
      item.submission
        ? [
            {
              id: `check-in-${item.id}`,
              at: item.submission.submitted_at,
              kind: "Relato do paciente",
              title: item.prompt,
              body: item.submission.report,
              meta: `${date(item.submission.reported_on)} · solicitado por ${initial.professionalNames.get(item.requested_by) ?? "profissional vinculado"}`,
              review: item.review
                ? `${initial.professionalNames.get(item.review.reviewer_id) ?? "Equipe vinculada"} · ${item.review.note}`
                : null,
            },
          ]
        : [],
    ),
    ...initial.publications.map((item) => ({
      id: `publication-${item.id}`,
      at: item.published_at,
      kind: "Publicação médica",
      title: item.title,
      body: `Revisão ${item.revision} · ${item.status === "published" ? "vigente" : "histórico preservado"}`,
      meta: `${instant(item.published_at)} · ${item.doctor_display_name}`,
      review: null,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  if (!initial.selectedPatient)
    return (
      <section className="panel empty">
        <h2>Nenhum paciente vinculado</h2>
        <p>A evolução aparece após a atribuição ativa de cuidado.</p>
      </section>
    );
  return (
    <div className="longitudinal-workspace">
      {showPatientPicker && (
        <form className="panel longitudinal-patient-picker" method="get">
          <input type="hidden" name="aba" value="evolucao" />
          <label className="field">
            Paciente
            <select name="paciente" defaultValue={initial.selectedPatient.id}>
              {initial.patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.display_name}
                </option>
              ))}
            </select>
          </label>
          <button className="secondary">Abrir evolução</button>
        </form>
      )}
      {showMeasures && <Measures measures={initial.measures} points={initial.measurementPoints} nextCursor={initial.measurementNextCursor} period={initial.period} base={base} patient={false} selectedPatient={initial.selectedPatient.id} truncated={initial.measurementsTruncated} onboardingHref={onboardingSourceHref(base, false, initial.selectedPatient.id)} />}
      {showTimeline && (
        <section
          className="longitudinal-section"
          aria-labelledby="staff-timeline-title"
        >
          <div className="section-heading">
          <div>
            <h2 id="staff-timeline-title">Linha do tempo</h2>
            <p>Registros de {initial.selectedPatient.display_name}, com data e origem.</p>
          </div>
          <span className="quiet-label">Até 50 registros recentes</span>
        </div>
        {events.length ? (
          <ol className="longitudinal-timeline">
            {events.map((event) => (
              <li key={event.id}>
                <time dateTime={event.at}>{instant(event.at)}</time>
                <div>
                  <span>{event.kind}</span>
                  <h3>{event.title}</h3>
                  <p>{event.body}</p>
                  <small>{event.meta}</small>
                  {event.review && (
                    <div className="timeline-internal-note">
                      <strong>Revisão interna</strong>
                      <p>{event.review}</p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty longitudinal-empty">
            <h3>Nenhum registro longitudinal</h3>
            <p>Relatos enviados e publicações aparecerão aqui.</p>
          </div>
        )}
        {initial.truncated && (
          <p className="notice">
            Período limitado aos registros mais recentes. Consulte o histórico
            específico para itens anteriores.
          </p>
        )}
        </section>
      )}
      <Link href={backHref ?? `${base}?aba=check-ins`}>{backLabel}</Link>
    </div>
  );
}

export function PatientLongitudinalWorkspace({
  initial,
  base,
}: {
  initial: PatientLongitudinal;
  base: string;
}) {
  const events = [
    ...initial.checkIns.flatMap((item) =>
      item.submission
        ? [
            {
              id: `check-in-${item.id}`,
              at: item.submission.submitted_at,
              kind: "Seu relato",
              title: item.prompt,
              body: item.submission.report,
              meta: `${date(item.submission.reported_on)} · origem: você`,
            },
          ]
        : [],
    ),
    ...initial.publications.map((item) => ({
      id: `publication-${item.id}`,
      at: item.published_at,
      kind: "Orientação publicada",
      title: item.title,
      body: `Revisão ${item.revision} publicada por ${item.doctor_display_name}`,
      meta: `${instant(item.published_at)} · origem: equipe médica`,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <div className="longitudinal-workspace patient-longitudinal">
      <Measures measures={initial.measures} points={initial.measurementPoints} nextCursor={initial.measurementNextCursor} period={initial.period} base={base} patient truncated={initial.measurementsTruncated} onboardingHref={onboardingSourceHref(base, true)} />
      <section
        className="longitudinal-section"
        aria-labelledby="patient-timeline-title"
      >
        <div className="section-heading">
          <div>
            <h2 id="patient-timeline-title">Sua linha do tempo</h2>
            <p>Registros enviados por você e orientações disponíveis.</p>
          </div>
        </div>
        {events.length ? (
          <ol className="longitudinal-timeline">
            {events.map((event) => (
              <li key={event.id}>
                <time dateTime={event.at}>{instant(event.at)}</time>
                <div>
                  <span>{event.kind}</span>
                  <h3>{event.title}</h3>
                  <p>{event.body}</p>
                  <small>{event.meta}</small>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty longitudinal-empty">
            <h3>Seu histórico começará aqui</h3>
            <p>Não exibimos exemplos ou resultados estimados.</p>
          </div>
        )}
        {initial.truncated && (
          <p className="notice">Exibindo os registros mais recentes.</p>
        )}
      </section>
      <div className="agenda-actions">
        <Link href={`${base}/diario`}>Abrir Diário</Link>
        <Link href={`${base}/plano`}>Ver orientações</Link>
      </div>
    </div>
  );
}
