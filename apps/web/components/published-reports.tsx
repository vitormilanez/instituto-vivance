import Link from "next/link";
import type { PatientReportPublications } from "@/modules/reports/publication-service";

function date(value: string) {
  const instant = /^\d{4}-\d{2}-\d{2}$/u.test(value)
    ? new Date(`${value}T12:00:00Z`)
    : new Date(value);
  return instant.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function PublishedReports({
  initial,
}: {
  initial: PatientReportPublications;
}) {
  const base = `/clinicas/${initial.clinic.id}/meu-cuidado/relatorios`;
  return (
    <section className="panel published-reports" aria-labelledby="published-reports-title">
      <div className="section-heading">
        <div>
          <span className="quiet-label">Compartilhados com você</span>
          <h2 id="published-reports-title">Seus relatórios</h2>
          <p>Leia com calma ou guarde uma cópia em PDF.</p>
        </div>
      </div>
      {initial.publications.length ? (
        <div className="published-report-list">
          {initial.publications.map((publication) => (
            <article className="published-report-card" key={publication.id}>
              <div>
                <span className="quiet-label">Publicado em {date(publication.published_at)}</span>
                <h3>{publication.patient_title}</h3>
                <p className="published-report-summary">{publication.patient_summary}</p>
              </div>
              <dl className="published-report-facts">
                <div>
                  <dt>Médico responsável</dt>
                  <dd>{publication.doctor_display_name}</dd>
                </div>
                <div>
                  <dt>Período</dt>
                  <dd>{date(publication.period_start)} a {date(publication.period_end)}</dd>
                </div>
              </dl>
              <a
                className="button secondary"
                href={`/api/v1/clinics/${initial.clinic.id}/report-publications/${publication.id}/pdf`}
              >
                Baixar PDF
              </a>
            </article>
          ))}
        </div>
      ) : (
        <div className="module-empty">
          <h3>Nenhum relatório compartilhado</h3>
          <p>Quando seu médico publicar uma síntese para você, ela aparecerá aqui.</p>
        </div>
      )}
      {(initial.page > 1 || initial.hasNext) && (
        <nav className="pagination" aria-label="Páginas dos relatórios">
          {initial.page > 1 && <Link href={`${base}?pagina=${initial.page - 1}`}>Anterior</Link>}
          {initial.hasNext && <Link href={`${base}?pagina=${initial.page + 1}`}>Próxima</Link>}
        </nav>
      )}
    </section>
  );
}
