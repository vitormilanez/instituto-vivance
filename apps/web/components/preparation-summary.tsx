import Link from "next/link";
import type { EncounterPreparation } from "@/modules/return-preparation/service";
import { priorityLabel } from "@/modules/return-preparation/questionnaire";

export function PreparationPriorities({ priorities = [] }: { priorities?: string[] }) {
  return <div className="preparation-priorities">
    <h3>Prioridades declaradas pelo paciente</h3>
    {priorities.length ? <ol>{priorities.map((id, index) => <li key={id}>
      <strong>{index === 0 ? "Principal" : "Secundária"}:</strong> {priorityLabel(id)}
    </li>)}</ol> : <p>Nenhuma prioridade informada. Isso não indica desinteresse.</p>}
    <p className="module-footnote">Assuntos para a conversa, não classificação de risco ou avaliação clínica.</p>
  </div>;
}

export function EncounterPreparationSummary({ preparation, tenantId }: { preparation: NonNullable<EncounterPreparation>; tenantId: string }) {
  const answers = preparation.submission.answers as Record<string, string>;
  return <section className="panel preparation-card" aria-label="Respostas da pré-consulta">
    <div className="preparation-heading"><div><h2>O que o paciente compartilhou para esta consulta</h2>
      <p>Enviado em {new Date(preparation.submission.submitted_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · roteiro v{preparation.questionnaire_version}</p>
    </div><span className="preparation-status">{preparation.status === "reviewed" ? "Revisado" : "Revisão pendente"}</span></div>
    <PreparationPriorities priorities={preparation.submission.priorities} />
    <div className="preparation-readonly">{preparation.questionnaire.questions.map((question) => <div key={question.id}>
      <h3>{question.label}</h3><p>{answers[question.id] || "Pergunta pulada"}</p>
    </div>)}</div>
    <Link href={`/clinicas/${tenantId}/preparo?solicitacao=${preparation.id}#preparo-${preparation.id}`}>Abrir relato original e revisão</Link>
    <p className="module-footnote">Relato preservado. Não preenche nem modifica o registro clínico automaticamente.</p>
  </section>;
}
