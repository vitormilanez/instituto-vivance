import { documentTitle } from "@/modules/documents/title";
import type { PatientExamOverview } from "@/modules/exams/overview-service";

function receivedDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function ExamOverviewPanel({ overview, tenant }: {
  overview: PatientExamOverview;
  tenant: string;
}) {
  return <section className="panel" aria-labelledby="exam-overview-title">
    <div className="section-heading">
      <div>
        <h2 id="exam-overview-title">Exames recebidos</h2>
        <p>Visão de todos os arquivos disponíveis do paciente, inclusive os que estão em outras páginas de Documentos.</p>
      </div>
    </div>
    <p className="module-footnote">
      {overview.totalFiles} {overview.totalFiles === 1 ? "arquivo" : "arquivos"} recebido{overview.totalFiles === 1 ? "" : "s"}
      {` · ${overview.examFiles} marcado${overview.examFiles === 1 ? "" : "s"} como exame`}
      {` · ${overview.extractedFiles} com texto integral`}
      {` · ${overview.toCheckFiles} a conferir`}
      {overview.latestReceivedAt ? ` · último envio em ${receivedDate(overview.latestReceivedAt)}` : ""}
    </p>
    {overview.toCheckFiles > 0 && <details>
      <summary>A conferir ou sem extração ({overview.toCheckFiles})</summary>
      <p className="module-footnote">Fila de qualidade dos arquivos; não indica urgência clínica. Arquivos marcados como documento clínico também aparecem para evitar omissão de exames classificados incorretamente.</p>
      <ul>
        {overview.toCheck.map(({ document, extraction }) => <li key={document.id}>
          <strong>{documentTitle(document)}</strong>{" · "}
          {extraction?.status === "failed"
            ? "Falha na leitura"
            : extraction?.status === "requires_review"
              ? `${extraction.review_page_count + extraction.failed_page_count} página(s) para conferência`
              : extraction ? "Estado do processamento a conferir" : "Texto ainda não extraído"}
          {document.category !== "exam" ? " · classificado como documento clínico" : ""}
          {" · "}<a href={`/api/v1/clinics/${tenant}/documents/${document.id}/download`} target="_blank" rel="noreferrer">Abrir original</a>
        </li>)}
      </ul>
    </details>}
    {overview.totalFiles === 0 && <p>Nenhum arquivo disponível para este paciente.</p>}
    {overview.totalFiles > 0 && <p className="module-footnote">O texto extraído ainda não é um resultado clínico estruturado. Confira sempre o original antes de usar um dado.</p>}
  </section>;
}
