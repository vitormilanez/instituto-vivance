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
const nextDayLabel = (date: string, today: string) => {
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const formatted = new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return date === tomorrow.toISOString().slice(0, 10)
    ? `Amanhã, ${formatted}`
    : formatted;
};
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
  density = "full",
}: {
  base: string;
  patientId: string;
  context: NonNullable<Awaited<ReturnType<typeof patientCareContext>>>;
  recordBase?: string;
  density?: "compact" | "full";
}) {
  const publications = context.publications.slice(
    0,
    density === "compact" ? 1 : 5,
  );
  return (
    <div className={`care-context-links care-context-links-${density}`}>
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
      {publications.map((p) => (
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
      <Link
        href={
          recordBase ? `${recordBase}?aba=Documentos` : `${base}/documentos`
        }
      >
        <strong>Acompanhamento e exames</strong>
        <span>
          Check-ins e documentos privados disponíveis conforme o vínculo de cuidado.
        </span>
        <span>Abrir documentos</span>
      </Link>
    </div>
  );
}

// Consultation first, patient context next, human action, then the day.
// Navy is structural; clinical state is always stated in text.
export function TodayWorkspace({
  base,
  data,
}: {
  base: string;
  data: Awaited<ReturnType<typeof todayWorkspace>>;
}) {
  const { next } = data;
  const nextDate = data.nextDate ?? data.today;
  const isFutureDay = Boolean(next && nextDate !== data.today);
  const active = next && data.drafts.find((p) => p.appointment_id === next.id);
  const attentionCount = data.checkIns.length + data.drafts.length + data.preparations.length;
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
          Ver agenda completa
        </Link>
      </div>
      <div className="today-workspace">
        <section className="panel today-next" aria-labelledby="next-title">
          {next ? (
            <>
              <div className="today-next-summary">
                <div className="today-next-heading">
                  <h2 id="next-title">
                    {next.status === "in_progress"
                      ? "Atendimento em andamento"
                      : "Próxima consulta"}
                  </h2>
                  <span>{states[next.status]}</span>
                </div>
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
                    <p>{next.kind === "return" ? "Retorno" : "Consulta"}</p>
                  </div>
                </div>
                <div className="today-consultation-meta">
                  <div className="today-consultation-when">
                    {isFutureDay && (
                      <span>{nextDayLabel(nextDate, data.today)}</span>
                    )}
                    <strong>
                      {time(next.starts_at)}–{time(next.ends_at)}
                    </strong>
                  </div>
                  <span className="today-consultation-doctor">
                    {next.doctor_display_name}
                  </span>
                  <span className="today-consultation-mode">
                    Atendimento manual disponível
                  </span>
                </div>
                <div className="today-primary-action">
                  <span>
                    {isFutureDay
                      ? "Sua próxima consulta já está agendada. Confira o dia e o horário."
                      : "Revise o contexto disponível e siga para o atendimento."}
                  </span>
                  <Link
                    className="button"
                    href={
                      active
                        ? `${base}/atendimentos/${active.id}`
                        : `${base}/agenda?data=${nextDate}#consulta-${next.id}`
                    }
                  >
                    {active ? "Retomar atendimento" : "Preparar atendimento"}
                  </Link>
                </div>
              </div>
              <div className="today-context">
                <h3>Contexto para esta consulta</h3>
                <p>
                  {data.context
                    ? "Registros essenciais para orientar a próxima conversa."
                    : "Não há contexto clínico disponível para este vínculo."}
                </p>
                {data.context && (
                  <PatientCareLinks
                    base={base}
                    patientId={next.patient_id}
                    context={data.context}
                    recordBase={`${base}/pacientes/${next.patient_id}`}
                    density="compact"
                  />
                )}
              </div>
            </>
          ) : (
            <>
              <h2 id="next-title">Próxima consulta</h2>
              <div className="empty">
                <h3>Nenhuma consulta futura agendada</h3>
                <p>
                  Organize o próximo atendimento na Agenda.
                </p>
                <Link className="button secondary" href={`${base}/agenda`}>
                  Organizar agenda
                </Link>
              </div>
            </>
          )}
        </section>
        <aside
          className="panel today-attention"
          aria-labelledby="attention-title"
        >
          <div className="section-heading">
            <h2 id="attention-title">Para revisar</h2>
            {attentionCount > 0 && (
              <span className="quiet-label">{attentionCount}</span>
            )}
          </div>
          <p>
            Relatos recebidos e registros seus em rascunho. Esta é uma fila de
            trabalho, sem classificação de risco clínico.
          </p>
          {attentionCount ? (
            <ul>
              {data.preparations.map((item) => (
                <li key={item.id}>
                  <strong>{item.patients?.display_name ?? "Paciente"}</strong>
                  <p>Preparo do retorno enviado e aguardando revisão.</p>
                  <Link href={`${base}/preparo#preparo-${item.id}`}>Revisar preparo</Link>
                </li>
              ))}
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
                .slice(0, Math.max(0, 5 - data.checkIns.length - data.preparations.length))
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
