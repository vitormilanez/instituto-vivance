import Link from "next/link";
import type {
  todayWorkspace,
  patientCareContext,
} from "@/modules/workspace/today";

const time = (date: string) =>
  new Date(date).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
const states: Record<string, string> = {
  scheduled: "Agendado",
  in_progress: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Falta",
};

export function PatientCareLinks({
  base,
  patientId,
  context,
  recordBase,
}: {
  base: string;
  patientId: string;
  context: Awaited<ReturnType<typeof patientCareContext>>;
  recordBase?: string;
}) {
  return (
    <div className="care-context-links">
      {context.encounter ? (
        <Link href={`${base}/atendimentos/${context.encounter.id}`}>
          <strong>Última consulta</strong>
          <span>
            Registro finalizado ·{" "}
            {new Date(context.encounter.finalized_at!).toLocaleDateString(
              "pt-BR",
              { timeZone: "America/Sao_Paulo" },
            )}
          </span>
          <span>Abrir registro</span>
        </Link>
      ) : (
        <div>
          <strong>Última consulta</strong>
          <span>Nenhum registro finalizado disponível para este acesso.</span>
        </div>
      )}
      {context.publications.slice(0, 5).map((p) => (
        <Link
          className="care-context-plan"
          key={p.id}
          href={`${base}/planos/${p.plan_id}`}
        >
          <strong>{p.title}</strong>
          <span>Plano publicado · revisão {p.revision}</span>
          <span>Ver plano</span>
        </Link>
      ))}
      {!context.publications.length && (
        <div>
          <strong>Plano de cuidado</strong>
          <span>Nenhum plano publicado disponível para este acesso.</span>
        </div>
      )}
      <Link href={`${base}/pacientes/${patientId}`}>
        <strong>Contexto do paciente</strong>
        <span>Cadastro e registros disponíveis.</span>
        <span>Abrir ficha</span>
      </Link>
      <Link href={recordBase ? `${recordBase}?aba=Documentos` : `${base}/documentos`}>
        <strong>Acompanhamento e exames</strong>
        <span>
          Check-ins e documentos privados disponíveis conforme o vínculo de cuidado.
        </span>
        <span>Abrir documentos</span>
      </Link>
    </div>
  );
}

// Prototype-led: consultation first, patient context next, human action, then the day.
// Navy/white incumbent palette; green indicates the next consultation, never clinical risk.
export function TodayWorkspace({
  base,
  data,
}: {
  base: string;
  data: Awaited<ReturnType<typeof todayWorkspace>>;
}) {
  const { next } = data;
  const active = next && data.drafts.find((p) => p.appointment_id === next.id);
  const attentionCount = data.checkIns.length + data.drafts.length;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{data.clinic.role === "doctor" ? "Painel médico" : "Hoje"}</h1>
          <p>
            {new Date(`${data.today}T12:00:00Z`).toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            })}{" "}
            · {data.appointments.length}
            {data.truncated ? "+" : ""} agendamentos
          </p>
        </div>
        <Link className="button secondary" href={`${base}/agenda`}>
          Abrir agenda
        </Link>
      </div>
      <div className="today-workspace">
        <section className="panel today-next" aria-labelledby="next-title">
          <h2 id="next-title">
            {next?.status === "in_progress"
              ? "Atendimento em andamento"
              : "Próxima consulta"}
          </h2>
          {next ? (
            <>
              <div className="today-patient">
                <span
                  className="patient-avatar patient-avatar-xl"
                  aria-hidden="true"
                >
                  {(next.patients?.display_name ?? "Paciente")
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((s) => s[0])
                    .join("")}
                </span>
                <div>
                  <h3>{next.patients?.display_name ?? "Paciente"}</h3>
                  <p>
                    {states[next.status]} ·{" "}
                    {next.kind === "return" ? "Retorno" : "Consulta"}
                  </p>
                </div>
              </div>
              <div className="today-consultation-meta">
                <strong>
                  {time(next.starts_at)}–{time(next.ends_at)}
                </strong>
                <span>{next.doctor_display_name}</span>
                <span>Atendimento manual disponível</span>
              </div>
              <div className="today-context">
                <h3>Antes de atender</h3>
                <p>Contexto disponível para o seu vínculo de cuidado.</p>
                {data.context && (
                  <PatientCareLinks
                    base={base}
                    patientId={next.patient_id}
                    context={data.context}
                  />
                )}
              </div>
              <div className="today-primary-action">
                <span>Pré-consulta e IA ainda não conectadas.</span>
                <Link
                  className="button"
                  href={
                    active
                      ? `${base}/atendimentos/${active.id}`
                      : `${base}/agenda?data=${data.today}#consulta-${next.id}`
                  }
                >
                  {active ? "Retomar atendimento" : "Preparar atendimento"}
                </Link>
              </div>
            </>
          ) : (
            <div className="empty">
              <h3>Nenhuma próxima consulta neste dia</h3>
              <p>
                Confira os horários abaixo ou organize a próxima consulta na
                Agenda.
              </p>
              <Link className="button secondary" href={`${base}/agenda`}>
                Organizar agenda
              </Link>
            </div>
          )}
        </section>
        <aside
          className="panel today-attention"
          aria-labelledby="attention-title"
        >
          <div className="section-heading">
            <h2 id="attention-title">Precisa de atenção</h2>
            {attentionCount > 0 && (
              <span className="quiet-label">{attentionCount}</span>
            )}
          </div>
          <p>
            Relatos para revisão e registros seus em rascunho. Pendências de
            trabalho, não alertas de risco clínico.
          </p>
          {attentionCount ? (
            <ul>
              {data.checkIns.map((item) => (
                <li key={item.id}>
                  <strong>{item.patients?.display_name ?? "Paciente"}</strong>
                  <p>Check-in enviado e aguardando revisão humana.</p>
                  <Link href={`${base}/acompanhamento#check-in-${item.id}`}>
                    Revisar relato
                  </Link>
                </li>
              ))}
              {data.drafts
                .slice(0, Math.max(0, 5 - data.checkIns.length))
                .map((p) => (
                  <li key={p.id}>
                    <strong>{p.patients?.display_name ?? "Paciente"}</strong>
                    <p>Atendimento iniciado, ainda não finalizado.</p>
                    <Link href={`${base}/atendimentos/${p.id}`}>
                      Retomar registro
                    </Link>
                  </li>
                ))}
            </ul>
          ) : (
            <div className="empty">
              <h3>Nenhuma pendência</h3>
              <p>
                Novos check-ins enviados e atendimentos em rascunho aparecerão
                aqui.
              </p>
            </div>
          )}
          <Link href={`${base}/acompanhamento`}>Ver acompanhamento</Link>
        </aside>
        <section
          className="panel today-schedule"
          aria-labelledby="today-schedule-title"
        >
          <div className="section-heading">
            <h2 id="today-schedule-title">Consultas de hoje</h2>
            <Link href={`${base}/agenda`}>Ver agenda completa</Link>
          </div>
          {!data.appointments.length ? (
            <p>Nenhuma consulta agendada hoje.</p>
          ) : (
            <ol className="today-timeline">
              {data.appointments.map((a) => (
                <li
                  key={a.id}
                  className={a.id === next?.id ? "is-next" : undefined}
                >
                  <time dateTime={a.starts_at}>{time(a.starts_at)}</time>
                  <div>
                    <Link
                      href={`${base}/agenda?data=${data.today}#consulta-${a.id}`}
                    >
                      <strong>{a.patients?.display_name ?? "Paciente"}</strong>
                    </Link>
                    <p>
                      {a.kind === "return" ? "Retorno" : "Consulta"} ·{" "}
                      {states[a.status]}
                    </p>
                  </div>
                  {a.id === next?.id && (
                    <span className="badge">
                      {a.status === "in_progress" ? "Em andamento" : "Próxima"}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
          {data.truncated && (
            <p>Lista limitada. Abra a Agenda para consultar o período.</p>
          )}
        </section>
      </div>
    </>
  );
}
