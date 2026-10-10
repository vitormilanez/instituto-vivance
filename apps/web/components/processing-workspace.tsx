import Link from "next/link";
import type { ProcessingJobs } from "@/modules/processing/service";

const dateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));

function jobType(type: string) {
  if (type === "exam_text_extraction") return "Leitura de exame";
  if (type === "audio_transcription") return "Transcrição de áudio";
  if (type === "clinical_draft") return "Rascunho assistido";
  return "Processamento";
}

function statusCopy(status: string, type: string) {
  if (status === "pending")
    return {
      label: "Pendente",
      detail: "Aguardando um executor autorizado.",
    };
  if (status === "processing")
    return {
      label: "Em processamento",
      detail: "A tarefa tem uma reserva temporária de execução.",
    };
  if (status === "completed")
    return { label: "Concluído", detail: "A execução registrada terminou." };
  return {
    label: "Falhou",
    detail: type === "exam_text_extraction"
      ? "A leitura foi encerrada sem sucesso. Confira o arquivo original em Documentos; a falha não confirma nenhum resultado para uso clínico."
      : "A tarefa foi encerrada sem sucesso. Confira o fluxo de origem com a equipe.",
  };
}

function pageHref(clinicId: string, page: number) {
  return `/clinicas/${clinicId}/processamentos${page > 1 ? `?pagina=${page}` : ""}`;
}

export function ProcessingWorkspace({ initial }: { initial: ProcessingJobs }) {
  const failedExams = initial.jobs.filter((job) =>
    job.job_type === "exam_text_extraction" && job.status === "failed"
  ).length;
  return (
    <section className="processing-workspace" aria-label="Processamentos privados">
      <div className="processing-boundary">
        <strong>Base privada de processamento</strong>
        <p>
          A fila registra somente estado, tentativas e contexto autorizado. Ela
          não exibe áudio, conteúdo clínico, prompt, resposta de fornecedor ou
          erro técnico.
        </p>
      </div>
      {failedExams > 0 && (
        <div className="processing-failure-notice" role="status">
          <strong>{failedExams} {failedExams === 1 ? "leitura de exame falhou" : "leituras de exame falharam"} nesta página</strong>
          <p>Confira os originais em Documentos e encaminhe a falha à equipe técnica. Nenhum resultado foi publicado ao paciente por esta fila.</p>
        </div>
      )}
      {initial.jobs.length ? (
        <div className="processing-list">
          {initial.jobs.map((job) => {
            const state = statusCopy(job.status, job.job_type);
            return (
              <article className="processing-row" key={job.id}>
                <div>
                  <span className="processing-kind">{jobType(job.job_type)}</span>
                  <h2>{state.label}</h2>
                  <p>{state.detail}</p>
                </div>
                <div className="processing-meta">
                  <span>
                    Tentativa {job.attempt_count} de {job.max_attempts}
                  </span>
                  <time dateTime={job.created_at}>{dateTime(job.created_at)}</time>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="processing-empty">
          <h2>Nenhum processamento nesta página</h2>
          <p>
            Nenhuma tarefa foi registrada nesta página. Leituras de exames
            sintéticos do piloto aparecem aqui quando forem enfileiradas.
          </p>
        </div>
      )}
      <nav className="agenda-actions" aria-label="Páginas de processamentos">
        {initial.page > 1 && (
          <Link href={pageHref(initial.clinic.id, initial.page - 1)}>
            Anterior
          </Link>
        )}
        {initial.hasNext && (
          <Link href={pageHref(initial.clinic.id, initial.page + 1)}>
            Próxima
          </Link>
        )}
      </nav>
    </section>
  );
}
