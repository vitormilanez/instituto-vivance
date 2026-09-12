import Link from "next/link";
import type { ProcessingJobs } from "@/modules/processing/service";

const dateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));

function jobType(type: string) {
  return type === "audio_transcription"
    ? "Transcrição de áudio"
    : "Rascunho assistido";
}

function statusCopy(status: string) {
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
    detail: "A tentativa foi encerrada sem expor detalhes técnicos aqui.",
  };
}

function pageHref(clinicId: string, page: number) {
  return `/clinicas/${clinicId}/processamentos${page > 1 ? `?pagina=${page}` : ""}`;
}

export function ProcessingWorkspace({ initial }: { initial: ProcessingJobs }) {
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
      {initial.jobs.length ? (
        <div className="processing-list">
          {initial.jobs.map((job) => {
            const state = statusCopy(job.status);
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
            Áudio e IA ainda não criam tarefas nesta etapa. Quando uma futura
            ação autorizada exigir processamento, o estado aparecerá aqui.
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
