import Link from "next/link";
import { ArrowRight, CalendarPlus, Clock3, FileText, MessageCircle, Users, UserPlus } from "lucide-react";
import type { todayWorkspace } from "@/modules/workspace/today";
import { appointmentClock, dayStatusLabels } from "@/modules/workspace/home-day";
import { bucketTotal, nextScheduledToday, type DashboardBucket, type DoctorDashboardMetrics } from "@/modules/workspace/doctor-dashboard";
import { DoctorOutreachCarousel } from "./doctor-outreach-carousel";
import "@/app/doctor-today.css";

type TodayData = Awaited<ReturnType<typeof todayWorkspace>>;
const number = (value: number | null | undefined) => value == null ? "—" : String(value);

function MiniBars({ values, label, warm = false }: { values: DashboardBucket[] | null | undefined; label: string; warm?: boolean }) {
  if (!values) return <p className="dt-chart-unavailable">Dados indisponíveis</p>;
  const max = Math.max(1, ...values.map(item => item.value));
  return <div className={`dt-bars ${warm ? "dt-bars-warm" : ""}`} role="img" aria-label={`${label}. ${values.map(item => `${item.label}: ${item.value}`).join("; ")}`}>
    {values.map(item => <div className="dt-bar" key={item.label} aria-hidden="true"><b>{item.value}</b><div className="dt-bar-track"><span style={{ height: `${item.value / max * 100}%` }} /></div><small>{item.label}</small></div>)}
  </div>;
}

function DashboardMetrics({ metrics, base }: { metrics?: DoctorDashboardMetrics | null; base: string }) {
  const total = (metrics?.active ?? 0) + (metrics?.assigned ?? 0);
  return <section className="dt-metrics" aria-labelledby="today-metrics-title">
    <div className="dt-metrics-heading"><h2 id="today-metrics-title">Visão geral</h2><span>Seu acompanhamento nesta clínica</span></div>
    <div className="dt-metric-grid">
      <article className="dt-metric"><div className="dt-metric-heading"><Users size={22} aria-hidden="true" /><Link href={`${base}/pacientes`}>Pacientes ativos</Link></div><div className="dt-metric-body"><div><strong>{number(metrics?.active)}</strong><small>vínculos ativos agora</small></div><div className="dt-relationship-chart">
        {metrics?.active != null && metrics.assigned != null ? <><div className="dt-relationship-track" role="img" aria-label={`${metrics.active} ativos; ${metrics.assigned} aguardando aceite`}><span style={{ width: total ? `${metrics.active / total * 100}%` : "0%" }} /></div><small>{metrics.assigned} aguardando aceite</small><small>Situação atual, sem histórico</small></> : <small>Contagem indisponível</small>}
      </div></div></article>
      <article className="dt-metric"><div className="dt-metric-heading"><MessageCircle size={22} aria-hidden="true" /><Link href={`${base}/mensagens`}>Mensagens recebidas</Link></div><div className="dt-metric-body"><div><strong>{number(bucketTotal(metrics?.messages))}</strong><small>últimos 7 dias, incluindo hoje</small></div><MiniBars values={metrics?.messages} label="Mensagens recebidas por dia do mês" /></div></article>
      <article className="dt-metric"><div className="dt-metric-heading"><Clock3 size={22} aria-hidden="true" /><Link href={`${base}/acompanhamento`}>Check-ins atrasados</Link></div><div className="dt-metric-body"><div><strong>{number(bucketTotal(metrics?.overdue))}</strong><small>solicitações com prazo vencido</small></div><MiniBars values={metrics?.overdue} label="Solicitações ainda pendentes por tempo de atraso" warm /></div></article>
    </div>
  </section>;
}

export function DoctorToday({ base, data, metrics, outreach = true }: { base: string; data: TodayData; metrics?: DoctorDashboardMetrics | null; outreach?: boolean }) {
  const next = nextScheduledToday(data.appointments, data.now, data.today);
  const count = data.appointments.filter(item => !["cancelled", "no_show"].includes(item.status)).length;
  const completed = data.appointments.filter(item => item.status === "completed").length;
  const receivedMessages = [...data.received.values()].flat().filter(item => item.kind === "messages");
  const messages = data.failed.includes("messages") || receivedMessages.some(item => item.seen == null) ? null : receivedMessages.filter(item => item.seen === false);
  const dayLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(`${data.today}T12:00:00Z`));
  return <div className="dt-workspace">
    <header className="dt-heading"><div><h1>Hoje</h1><p>{dayLabel}</p></div><Link className="button secondary" href={`${base}/pacientes#convidar-paciente`}><UserPlus size={19} aria-hidden="true" />Adicionar paciente</Link></header>
    <DashboardMetrics metrics={metrics} base={base} />
    <div className="dt-day-grid">
      <section className="dt-appointments" aria-labelledby="today-appointments-title">
        <div className="dt-section-heading"><div><h2 id="today-appointments-title">Consultas do dia</h2><p>{count} consulta{count === 1 ? "" : "s"} · {completed} concluída{completed === 1 ? "" : "s"}{data.truncated ? " · lista limitada" : ""}</p></div><Link href={`${base}/agenda`}>Ver agenda<ArrowRight size={18} aria-hidden="true" /></Link></div>
        {!count && <div className="dt-empty-day"><CalendarPlus size={30} strokeWidth={1.5} aria-hidden="true" /><h3>Seu dia está livre de consultas</h3><p>Organize os próximos encontros na agenda ou aproveite para se aproximar dos seus pacientes.</p><Link className="button" href={`${base}/agenda`}>Agendar consulta<ArrowRight size={18} aria-hidden="true" /></Link></div>}
        {data.appointments.length > 0 && <div className="dt-appointment-table"><div className="dt-table-heading" aria-hidden="true"><span>Horário</span><span>Paciente</span><span>Recebidos e revisão</span><span>Ação</span></div><ul className="dt-appointment-list">
          {data.appointments.map(item => {
            const active = data.links.get(item.patient_id)?.status === "active";
            const review = data.work?.find(work => work.kind === "documents" && work.patientId === item.patient_id);
            const documents = review?.unreviewedDocumentIds?.length ?? 0;
            const received = data.received.get(item.patient_id) ?? [];
            const text = !active ? "Sem vínculo ativo" : !data.work || data.failed.length ? "Consulte a ficha para conferir" : documents ? `${documents} documento${documents === 1 ? "" : "s"} para revisar` : received.some(record => record.kind === "preparation") ? "Pré-consulta recebida" : received.length ? `${received.length} envio${received.length === 1 ? "" : "s"} neste recorte` : "Sem novos envios neste recorte";
            const name = item.patients?.display_name ?? "Paciente";
            return <li key={item.id} className={`dt-appointment ${next?.id === item.id ? "dt-appointment-next" : ""}`}>
              <time dateTime={item.starts_at}>{appointmentClock(item.starts_at)}<span>– {appointmentClock(item.ends_at)}</span></time>
              <div className="dt-patient-name"><span className="dt-avatar" aria-hidden="true">{name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()}</span><div><strong>{name}</strong><small>{item.teleconsultation ? "Teleconsulta" : item.kind === "return" ? "Retorno" : "Consulta"} · {dayStatusLabels[item.status] ?? item.status}</small>{next?.id === item.id && <span className="dt-next-label">Próxima</span>}</div></div>
              <span className={`dt-row-context ${documents ? "dt-pending" : ""}`}><FileText size={17} aria-hidden="true" />{text}</span>
              <Link className={`button ${next?.id === item.id ? "" : "secondary"}`} href={`${base}/pacientes/${item.patient_id}`} aria-label={`Abrir paciente ${name}`}>Abrir paciente</Link>
            </li>;
          })}
        </ul></div>}
        {!count && outreach && <DoctorOutreachCarousel key={data.clinic.id} tenantId={data.clinic.id} />}
      </section>
      <aside className="dt-pending-work" aria-labelledby="today-pending-title">
        <div className="dt-section-heading"><h2 id="today-pending-title">Para acompanhar</h2><Link href={`${base}/revisar`}>Ver revisão<ArrowRight size={18} aria-hidden="true" /></Link></div>
        {data.work === null ? <p>Não foi possível carregar o trabalho em aberto. <Link href={base}>Tentar novamente</Link></p> : data.work.length ? <ul className="dt-work-list">{data.work.slice(0, 4).map(item => <li key={`${item.kind}:${item.id}`}><FileText size={22} aria-hidden="true" /><div><strong>{item.patientName}</strong><p>{item.state}</p><Link href={item.href}>{item.action}<ArrowRight size={16} aria-hidden="true" /></Link></div></li>)}</ul> : <p className="dt-clear">Nenhum trabalho em aberto neste momento.</p>}
        {(data.work?.length ?? 0) > 4 && <details className="dt-more-work"><summary>Ver mais {(data.work?.length ?? 0) - 4} pendências</summary><ul className="dt-work-list">{data.work?.slice(4).map(item => <li key={`${item.kind}:${item.id}`}><div><strong>{item.patientName}</strong><p>{item.state}</p><Link href={item.href}>{item.action}</Link></div></li>)}</ul></details>}
        <div className="dt-inbox"><MessageCircle size={22} aria-hidden="true" /><div><strong>Mensagens dos pacientes</strong><p>{messages === null ? "Contagem indisponível agora" : messages.length ? `${messages.length} ainda não aberta${messages.length === 1 ? "" : "s"} desde os últimos atendimentos` : "Confira suas conversas e os envios recentes."}</p><Link href={`${base}/mensagens`}>Abrir mensagens<ArrowRight size={16} aria-hidden="true" /></Link></div></div>
        <p className="dt-scope-note">Pendências por data, sem classificação clínica automática.</p>
      </aside>
    </div>
  </div>;
}
