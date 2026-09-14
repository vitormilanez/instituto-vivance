import Link from "next/link";
import type {
  PatientLongitudinal,
  StaffLongitudinal,
} from "@/modules/longitudinal/service";
import type { MeasurementSeries } from "@/modules/longitudinal/project";

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

function Measures({ measures }: { measures: MeasurementSeries[] }) {
  return (
    <section className="longitudinal-section" aria-labelledby="measures-title">
      <div className="section-heading">
        <div>
          <h2 id="measures-title">Medidas informadas</h2>
          <p>Valores registrados pelo paciente, sem metas ou interpretação.</p>
        </div>
      </div>
      {measures.length ? (
        <div className="measurement-grid">
          {measures.map((measure) => (
            <article className="measurement-card" key={measure.key}>
              <span>{measure.label}</span>
              <strong>
                {measure.latestValue} {measure.unit}
              </strong>
              <p>
                {measure.count} {measure.count === 1 ? "registro" : "registros"}
                {" · "}
                {date(measure.firstOn)}
                {measure.firstOn !== measure.lastOn
                  ? ` a ${date(measure.lastOn)}`
                  : ""}
              </p>
              <small>Origem: relato do paciente</small>
            </article>
          ))}
        </div>
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
      {showMeasures && <Measures measures={initial.measures} />}
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
      <Measures measures={initial.measures} />
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
