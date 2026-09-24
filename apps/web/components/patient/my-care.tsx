import Link from "next/link";
import type { ClinicPhone } from "@/modules/workspace/alert-signs";
import { documentTitle } from "@/modules/documents/title";
import type { Appointment } from "@/modules/agenda/service";
import { logout } from "@/app/actions";
import { appointmentWhen } from "@/modules/workspace/patient-home";
import { Icon } from "./icons";

type Publication = {
  id: string;
  title: string;
  revision: number;
  published_at: string;
  doctor_display_name: string;
  care_plan_receipts: { acknowledged_at: string | null }[];
};

type DocumentRow = { id: string; original_filename: string; created_at: string };

const dayMonth = (at: string) =>
  new Date(at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

// Meu cuidado: uma página com seções, sem abas internas. Orientações só
// depois de publicadas; vazio honesto quando não há. "Tratamento" fica fora
// até existir.
export function PatientMyCare({
  base,
  clinicId,
  today,
  currentTime,
  publications,
  appointments,
  documents,
  reminderLabel = null,
  clinicPhone = null,
}: {
  base: string;
  clinicId: string;
  today: string;
  currentTime: string;
  publications: Publication[];
  appointments: Appointment[];
  documents: DocumentRow[] | null;
  reminderLabel?: string | null;
  clinicPhone?: ClinicPhone | null;
}) {
  const upcoming = appointments
    .filter((item) => ["scheduled", "in_progress"].includes(item.status) && item.ends_at >= currentTime)
    .slice(0, 3);
  const past = appointments
    .filter((item) => item.status === "completed")
    .slice(-2)
    .reverse();

  return (
    <div className="pv-stack">
      <section className="pv-section" id="orientacoes" aria-labelledby="pv-care-plans">
        <h2 id="pv-care-plans" className="pv-h2">Orientações do seu médico</h2>
        {publications.length ? (
          <div className="pv-card pv-card-list">
            {publications.slice(0, 5).map((item) => (
              <Link key={item.id} className="pv-row-link" href={`${base}/plano#plano-${item.id}`}>
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.care_plan_receipts[0] ? "" : "Nova · "}
                    Publicada em {dayMonth(item.published_at)} · {item.doctor_display_name}
                  </small>
                </span>
                <Icon name="chevR" size={22} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="pv-card">
            <p className="pv-big is-small">Ainda não há orientações publicadas</p>
            <p className="pv-lead">
              Quando seu médico publicar uma orientação para você, ela aparece aqui.
            </p>
          </div>
        )}
      </section>

      <section className="pv-section" id="consultas" aria-labelledby="pv-care-appointments">
        <h2 id="pv-care-appointments" className="pv-h2">Consultas</h2>
        <div className="pv-card pv-card-list">
          {upcoming.length === 0 && past.length === 0 && (
            <p className="pv-lead">Nenhuma consulta marcada. A clínica avisa quando agendar.</p>
          )}
          {[...upcoming, ...past].map((item) => {
            const when = appointmentWhen(item.starts_at, item.ends_at, today);
            return (
              <div key={item.id} className="pv-row-link">
                <span className="pv-date-badge" aria-hidden="true">
                  <b>{when.day}</b>
                  <i>{when.month}</i>
                </span>
                <span>
                  <strong>{item.status === "completed" ? "Consulta realizada" : when.line}</strong>
                  <small>
                    {item.status === "in_progress" ? "Acontecendo agora · " : ""}
                    {item.doctor_display_name}
                  </small>
                </span>
              </div>
            );
          })}
          {clinicPhone ? (
            <p className="pv-muted">
              Para marcar ou alterar um horário, fale com a clínica:{" "}
              <a className="pv-link" href={`tel:${clinicPhone.tel}`}>{clinicPhone.display}</a>
              {clinicPhone.hours ? ` · ${clinicPhone.hours}` : ""}
            </p>
          ) : (
            <p className="pv-muted">Para marcar ou alterar um horário, fale com a clínica.</p>
          )}
          <Link className="pv-link" href={`${base}/consultas`}>Ver todas as consultas</Link>
        </div>
      </section>

      <section className="pv-section" aria-labelledby="pv-care-docs">
        <h2 id="pv-care-docs" className="pv-h2">Documentos</h2>
        <div className="pv-card pv-card-list">
          {documents && documents.length > 0 ? (
            <ul className="pv-list">
              {documents.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <span className="pv-doc">
                    <Icon name="file" size={20} />
                    <Link className="pv-link pv-ellipsis" href={`${base}/envios/document/${item.id}`}>{documentTitle(item)}</Link>
                  </span>
                  <span className="pv-sent-when">Enviado {dayMonth(item.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pv-lead">Exames e documentos que você enviar aparecem aqui.</p>
          )}
          <Link className="pv-button is-outline" href={`${base}/documentos#enviar-documento`}>
            Enviar exame ou documento
            <Icon name="plus" size={20} />
          </Link>
          {documents && documents.length > 0 && (
            <Link className="pv-link" href={`${base}/documentos`}>Ver todos os documentos</Link>
          )}
        </div>
      </section>

      {reminderLabel && (
        <section className="pv-section" aria-labelledby="pv-care-reminders">
          <h2 id="pv-care-reminders" className="pv-h2">Lembretes</h2>
          <div className="pv-card pv-card-list">
            <Link className="pv-row-link" href={`${base}/lembretes`}>
              <Icon name="bell" size={22} />
              <span>
                <strong>Check-in</strong>
                <small>{reminderLabel}</small>
              </span>
              <span className="pv-link-text">Alterar</span>
            </Link>
          </div>
        </section>
      )}

      <section className="pv-section" aria-labelledby="pv-care-more">
        <h2 id="pv-care-more" className="pv-h2">Mais</h2>
        <div className="pv-card pv-card-list">
          <Link className="pv-row-link" href={`${base}/metas`}>Metas e expectativas <Icon name="chevR" size={22} /></Link>
          <Link className="pv-row-link" href={`${base}/diario`}>
            <span>
              <strong>Diário</strong>
              <small>Refeições e respostas às perguntas da equipe</small>
            </span>
            <Icon name="chevR" size={22} />
          </Link>
          <Link className="pv-row-link" href={`${base}/relatorios`}>
            <span>
              <strong>Relatórios</strong>
              <small>Sínteses que seu médico revisou e compartilhou</small>
            </span>
            <Icon name="chevR" size={22} />
          </Link>
          <Link className="pv-row-link" href={`/clinicas/${clinicId}/meu-perfil`}>
            <span>
              <strong>Meu perfil</strong>
              <small>Seus dados de acesso</small>
            </span>
            <Icon name="chevR" size={22} />
          </Link>
          <Link className="pv-row-link" href="/clinicas?gerenciar=1">
            <span>
              <strong>Clínicas e convites</strong>
              <small>Ver outros vínculos e convites pendentes</small>
            </span>
            <Icon name="chevR" size={22} />
          </Link>
        </div>
        <form action={logout}>
          <button type="submit" className="pv-link" data-leave-clinic>Sair da conta</button>
        </form>
      </section>
    </div>
  );
}
