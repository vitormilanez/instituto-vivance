import type { PublishedExamSummary } from "@/modules/exam-summary/publication-service";
export function PublishedExamSummaries({ summaries }: { summaries: PublishedExamSummary[] }) {
  if (!summaries.length) return null;
  return <section className="panel" aria-label="Resultados conferidos pelo médico">
    <h2>Resultados conferidos pelo médico</h2>
    <p>Informações revisadas e compartilhadas pelo seu médico.</p>
    {summaries.map(summary=><details key={summary.id}>
      <summary>Publicado em {new Date(summary.published_at).toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"})}</summary>
      <ul>{summary.factual_claims.map((claim,index)=><li key={index}>{claim.text}</li>)}</ul>
    </details>)}
  </section>;
}
