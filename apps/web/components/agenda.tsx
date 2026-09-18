"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { Appointment, AgendaOptions } from "@/modules/agenda/service";
import { clinicDate, localToInstant } from "@/modules/agenda/validation";
import { focusedAppointment } from "@/modules/agenda/focus";
import { PreparationRequestEditor } from "./preparation-request-editor";
import { sentenceCase } from "@/lib/format";

const statusPresentation: Record<string, { label: string; className: string }> =
  {
    scheduled: { label: "Agendado", className: "scheduled" },
    in_progress: { label: "Em atendimento", className: "in-progress" },
    completed: { label: "Concluído", className: "completed" },
    cancelled: { label: "Cancelado", className: "cancelled" },
    no_show: { label: "Falta", className: "no-show" },
  };

export function AppointmentList({
  appointments,
  currentTime,
  nextId,
  onEdit,
  onCancel,
  onNoShow,
  onStart,
  onPrepare,
  preparationStates = {},
  patientRecordBase,
}: {
  appointments: Appointment[];
  currentTime: string;
  nextId?: string;
  onEdit?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onNoShow?: (appointment: Appointment) => void;
  onStart?: (appointment: Appointment) => void;
  onPrepare?: (appointment: Appointment) => void;
  preparationStates?: Record<string, string>;
  // Only the staff Agenda passes this; a patient viewing their own
  // consultations should never see a link to a "ficha".
  patientRecordBase?: string;
}) {
  if (!appointments.length)
    return (
      <div className="empty">
        <h3>Nenhum agendamento neste período</h3>
        <p>Os horários aparecerão aqui quando forem agendados pela equipe.</p>
      </div>
    );
  return (
    <ul className="list appointment-list">
      {appointments.map((a) => (
        <li
          className={`appointment-row${a.id === nextId ? " is-next" : ""}`}
          id={`consulta-${a.id}`}
          key={a.id}
        >
          <div className="appointment-time">
            <strong>
              {new Date(a.starts_at).toLocaleTimeString("pt-BR", {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </strong>
            <span>
              {new Date(a.starts_at).toLocaleDateString("pt-BR", {
                timeZone: "America/Sao_Paulo",
                day: "2-digit",
                month: "short",
              })}
            </span>
          </div>
          <div className="appointment-patient">
            <span className="patient-avatar" aria-hidden="true">
              {(a.patients?.display_name ?? "Consulta")
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()}
            </span>
            <span>
              <strong>{a.patients?.display_name ?? "Consulta"}</strong>
              <small>
                {a.kind === "return" ? "Retorno" : "Consulta"} ·{" "}
                {new Date(a.starts_at).toLocaleTimeString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                –
                {new Date(a.ends_at).toLocaleTimeString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
              <small>{a.doctor_display_name}</small>
              {patientRecordBase && (
                <Link
                  className="appointment-patient-link"
                  href={`${patientRecordBase}/${a.patient_id}`}
                >
                  Ver ficha do paciente
                </Link>
              )}
            </span>
          </div>
          <span
            className={`badge appointment-status ${statusPresentation[a.status]?.className ?? "unknown"}`}
          >
            {statusPresentation[a.status]?.label ?? "Estado indisponível"}
          </span>
          {a.status === "scheduled" &&
            (onStart || onEdit || onCancel || onNoShow || onPrepare) && (
              <div className="appointment-actions">
                {onStart && (
                  <button onClick={() => onStart(a)}>Abrir atendimento</button>
                )}
                {onPrepare && a.starts_at > currentTime && (
                  <button
                    className="secondary"
                    disabled={Boolean(preparationStates[a.id])}
                    onClick={() => onPrepare(a)}
                  >
                    {preparationStates[a.id] ? "Pré-consulta solicitada" : "Preparar pré-consulta"}
                  </button>
                )}
                {onEdit && (
                  <button className="secondary quiet" onClick={() => onEdit(a)}>
                    Editar
                  </button>
                )}
                {onNoShow && a.starts_at <= currentTime && (
                  <button className="secondary quiet" onClick={() => onNoShow(a)}>
                    Registrar falta
                  </button>
                )}
                {onCancel && (
                  <button className="secondary quiet" onClick={() => onCancel(a)}>
                    Cancelar
                  </button>
                )}
              </div>
            )}
        </li>
      ))}
    </ul>
  );
}

export function Agenda({
  tenantId,
  date,
  today,
  currentTime,
  appointments,
  options,
  truncated,
  canStart = false,
  canManage = false,
  preparationStates = {},
}: {
  tenantId: string;
  date: string;
  today: string;
  currentTime: string;
  appointments: Appointment[];
  options: AgendaOptions;
  truncated: boolean;
  canStart?: boolean;
  canManage?: boolean;
  preparationStates?: Record<string, string>;
}) {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();
  const [editing, setEditing] = useState<Appointment | "new" | null>(null);
  const [closing, setClosing] = useState<{
    appointment: Appointment;
    status: "cancelled" | "no_show";
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [returns, setReturns] = useState(false);
  const [starting, setStarting] = useState<Appointment | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [preparing, setPreparing] = useState<Appointment | null>(null);
  const startPanel = useRef<HTMLElement>(null);
  const activePanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (starting) {
      startPanel.current?.focus();
      startPanel.current?.scrollIntoView({ block: "start" });
    }
  }, [starting]);
  useEffect(() => {
    if (editing || closing) {
      activePanel.current?.focus();
      activePanel.current?.scrollIntoView({ block: "start" });
    }
  }, [editing, closing]);
  async function startCare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!starting || pending || !accepted) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/clinics/${tenantId}/encounters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: starting.id,
          appointment_version: starting.version,
          accept_care: accepted,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ?? "Não foi possível abrir o atendimento.",
        );
      router.push(`/clinicas/${tenantId}/atendimentos/${result.id}`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível abrir o atendimento.",
      );
    } finally {
      setPending(false);
    }
  }
  const month = date.slice(0, 7),
    [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const counts = new Map<string, number>();
  for (const appointment of appointments) {
    const day = clinicDate(new Date(appointment.starts_at));
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const chosen = appointments.filter((a) =>
    returns
      ? a.kind === "return" &&
        a.status === "scheduled" &&
        a.starts_at > currentTime
      : clinicDate(new Date(a.starts_at)) === date,
  );
  const nextAppointment = focusedAppointment(appointments, currentTime, date);
  const edit = editing && editing !== "new" ? editing : null;
  function selectDate(next: string) {
    startTransition(() =>
      router.push(`/clinicas/${tenantId}/agenda?data=${next}`),
    );
  }
  function move(delta: number) {
    selectDate(
      new Date(Date.UTC(year, monthNumber - 1 + delta, 1))
        .toISOString()
        .slice(0, 10),
    );
  }
  function open(value: Appointment | "new") {
    setEditing(value);
    setClosing(null);
    setError("");
    setNotice("");
  }
  async function mutate(body: unknown, appointment?: Appointment) {
    const response = await fetch(
      `/api/v1/clinics/${tenantId}/appointments${appointment ? `/${appointment.id}` : ""}`,
      {
        method: appointment ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error ?? "Não foi possível salvar o agendamento.");
    return data;
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const starts_at = localToInstant(
        String(form.get("date")),
        String(form.get("time")),
      );
      const duration = Number(form.get("duration"));
      if (!Number.isFinite(duration)) throw new Error("Informe a duração.");
      const body = {
        patient_id: form.get("patient_id"),
        doctor_id: form.get("doctor_id"),
        kind: form.get("kind"),
        starts_at,
        ends_at: new Date(
          Date.parse(starts_at) + duration * 60000,
        ).toISOString(),
        ...(edit ? { version: edit.version } : {}),
      };
      await mutate(body, edit ?? undefined);
      setEditing(null);
      setNotice(edit ? "Agendamento atualizado." : "Agendamento criado.");
      selectDate(String(form.get("date")));
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }
  async function closeAppointment() {
    if (!closing) return;
    setPending(true);
    setError("");
    try {
      await mutate(
        { status: closing.status, version: closing.appointment.version },
        closing.appointment,
      );
      const wasNoShow = closing.status === "no_show";
      setClosing(null);
      setNotice(
        wasNoShow
          ? "Falta registrada. O horário e o histórico foram preservados."
          : "Agendamento cancelado. O registro foi preservado no histórico.",
      );
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível atualizar o agendamento.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      {preparing && <PreparationRequestEditor key={preparing.id} tenantId={tenantId} appointmentId={preparing.id} patientName={preparing.patients?.display_name ?? "paciente"} onClose={() => setPreparing(null)} />}
      <div className="page-heading">
        <div>
          <h1>Agenda</h1>
          <p>Consultas e retornos no horário de Brasília (UTC−3).</p>
        </div>
        {canManage && (
          <button onClick={() => open("new")}>Novo agendamento</button>
        )}
      </div>
      {nextAppointment && !returns && (
        <section
          className="agenda-focus-card"
          aria-label="Próximo atendimento do dia"
        >
          <div className="agenda-focus-time">
            <span>Próximo atendimento</span>
            <strong>
              {new Date(nextAppointment.starts_at).toLocaleTimeString("pt-BR", {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </strong>
          </div>
          <div className="agenda-focus-patient">
            <span
              className="patient-avatar patient-avatar-large"
              aria-hidden="true"
            >
              {(nextAppointment.patients?.display_name ?? "Consulta")
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()}
            </span>
            <div>
              <h2>{nextAppointment.patients?.display_name ?? "Consulta"}</h2>
              <p>
                {nextAppointment.kind === "return" ? "Retorno" : "Consulta"}
                {" · "}
                {nextAppointment.doctor_display_name}
              </p>
            </div>
          </div>
          <span
            className={`appointment-status ${statusPresentation[nextAppointment.status]?.className ?? "unknown"}`}
          >
            {statusPresentation[nextAppointment.status]?.label ??
              "Estado indisponível"}
          </span>
        </section>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {truncated && (
        <p className="notice" role="alert">
          Há mais de 500 agendamentos neste mês. A lista está incompleta.
        </p>
      )}
      {editing && (
        <section
          className="panel agenda-form-panel"
          aria-label={edit ? "Editar agendamento" : "Novo agendamento"}
          tabIndex={-1}
          ref={activePanel}
        >
          <h2>{edit ? "Editar agendamento" : "Novo agendamento"}</h2>
          {(!options.patients.length || !options.doctors.length) && (
            <p className="notice">
              É necessário ter um paciente cadastrado e um médico ativo na
              clínica.
            </p>
          )}
          <form key={edit?.id ?? "new"} onSubmit={save}>
            <fieldset disabled={pending} className="agenda-fields">
              <div className="field">
                <label htmlFor="agenda-patient">Paciente</label>
                <select
                  id="agenda-patient"
                  name="patient_id"
                  defaultValue={edit?.patient_id ?? ""}
                  required
                >
                  <option value="" disabled>
                    Selecione um paciente
                  </option>
                  {options.patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="agenda-doctor">Médico</label>
                <select
                  id="agenda-doctor"
                  name="doctor_id"
                  defaultValue={
                    edit?.doctor_id ??
                    (options.doctors.length === 1
                      ? options.doctors[0].user_id
                      : "")
                  }
                  required
                >
                  <option value="" disabled>
                    Selecione um médico
                  </option>
                  {options.doctors.map((d) => (
                    <option key={d.user_id} value={d.user_id}>
                      {d.display_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="agenda-date">Data</label>
                <input
                  id="agenda-date"
                  name="date"
                  type="date"
                  min={today}
                  max="2100-12-31"
                  defaultValue={
                    edit ? clinicDate(new Date(edit.starts_at)) : date
                  }
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="agenda-time">Horário de Brasília</label>
                <input
                  id="agenda-time"
                  name="time"
                  type="time"
                  defaultValue={
                    edit
                      ? new Date(edit.starts_at).toLocaleTimeString("en-GB", {
                          timeZone: "America/Sao_Paulo",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""
                  }
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="agenda-duration">Duração (minutos)</label>
                <input
                  id="agenda-duration"
                  name="duration"
                  type="number"
                  min="5"
                  max="480"
                  step="1"
                  defaultValue={
                    edit
                      ? (Date.parse(edit.ends_at) -
                          Date.parse(edit.starts_at)) /
                        60000
                      : 30
                  }
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="agenda-kind">Tipo</label>
                <select
                  id="agenda-kind"
                  name="kind"
                  defaultValue={edit?.kind ?? "consultation"}
                >
                  <option value="consultation">Consulta</option>
                  <option value="return">Retorno</option>
                </select>
              </div>
            </fieldset>
            {error && (
              <p className="feedback" role="alert">
                {error}
              </p>
            )}
            <div className="agenda-actions">
              <button
                disabled={
                  pending || !options.patients.length || !options.doctors.length
                }
              >
                {pending ? "Salvando…" : "Salvar agendamento"}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={pending}
                onClick={() => setEditing(null)}
              >
                Fechar sem salvar
              </button>
            </div>
          </form>
        </section>
      )}
      {starting && (
        <section
          className="panel agenda-form-panel"
          aria-label="Iniciar cuidado"
          tabIndex={-1}
          ref={startPanel}
        >
          <h2>Abrir atendimento de {starting.patients?.display_name}?</h2>
          <p>
            O registro será interno. Iniciar confirma seu vínculo de cuidado com
            este paciente e bloqueia alterações neste agendamento.
          </p>
          <form onSubmit={startCare}>
            <label className="care-accept">
              <input
                type="checkbox"
                checked={accepted}
                disabled={pending}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              Confirmo que sou responsável por este atendimento.
            </label>
            {error && (
              <p role="alert" className="feedback">
                {error}
              </p>
            )}
            <div className="agenda-actions">
              <button disabled={pending || !accepted}>
                {pending ? "Abrindo…" : "Confirmar e abrir atendimento"}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={pending}
                onClick={() => setStarting(null)}
              >
                Voltar à agenda
              </button>
            </div>
          </form>
        </section>
      )}
      {closing && (
        <section
          className="panel"
          aria-label={
            closing.status === "no_show"
              ? "Confirmar falta"
              : "Confirmar cancelamento"
          }
          tabIndex={-1}
          ref={activePanel}
        >
          <h2>
            {closing.status === "no_show"
              ? "Registrar falta neste agendamento?"
              : "Cancelar este agendamento?"}
          </h2>
          <p>
            {closing.appointment.patients?.display_name} ·{" "}
            {new Date(closing.appointment.starts_at).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            })}
          </p>
          <p>
            {closing.status === "no_show"
              ? "O paciente será identificado como ausente. O registro será mantido no histórico e o horário ficará encerrado."
              : "O horário será liberado. O registro e o histórico serão mantidos."}
          </p>
          {error && (
            <p role="alert" className="feedback">
              {error}
            </p>
          )}
          <div className="agenda-actions">
            <button disabled={pending} onClick={closeAppointment}>
              {pending
                ? "Salvando…"
                : closing.status === "no_show"
                  ? "Confirmar falta"
                  : "Confirmar cancelamento"}
            </button>
            <button
              className="secondary"
              disabled={pending}
              onClick={() => setClosing(null)}
            >
              Voltar sem alterar
            </button>
          </div>
        </section>
      )}
      <div className="agenda-actions agenda-view-controls">
        <button
          className="secondary"
          aria-pressed={!returns}
          onClick={() => setReturns(false)}
        >
          Calendário
        </button>
        <button
          className="secondary"
          aria-pressed={returns}
          onClick={() => setReturns(true)}
        >
          Próximos retornos do mês
        </button>
        <button
          className="secondary"
          disabled={navigating}
          onClick={() => startTransition(() => router.refresh())}
        >
          Atualizar agenda
        </button>
      </div>
      <div className="calendar-workspace" aria-busy={navigating}>
        <section className="calendar-month" aria-label="Calendário">
          <div className="calendar-toolbar">
            <button
              className="secondary"
              aria-label="Mês anterior"
              disabled={navigating || month <= "2020-01"}
              onClick={() => move(-1)}
            >
              ‹
            </button>
            <h2>
              {sentenceCase(
                first.toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }),
              )}
            </h2>
            <button
              className="secondary"
              aria-label="Próximo mês"
              disabled={navigating || month >= "2100-12"}
              onClick={() => move(1)}
            >
              ›
            </button>
          </div>
          <div className="calendar-grid">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
              <span className="calendar-weekday" key={d}>
                {d}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const d = `${month}-${String(i + 1).padStart(2, "0")}`,
                count = counts.get(d) ?? 0;
              return (
                <button
                  key={d}
                  className="calendar-day"
                  disabled={navigating}
                  aria-pressed={date === d}
                  aria-current={d === today ? "date" : undefined}
                  aria-label={`${new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", { dateStyle: "full", timeZone: "UTC" })}${count ? `, ${count} agendamentos` : ""}`}
                  onClick={() => selectDate(d)}
                >
                  {i + 1}
                  {count > 0 && (
                    <span className="agenda-dot" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
          <button
            className="secondary calendar-today"
            onClick={() => selectDate(today)}
          >
            Voltar para hoje
          </button>
        </section>
        <section className="calendar-schedule">
          <h2>
            {returns
              ? "Próximos retornos do mês"
              : sentenceCase(
                  new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    timeZone: "UTC",
                  }),
                )}
          </h2>
          <p className="schedule-caption">
            {chosen.length}{" "}
            {chosen.length === 1 ? "agendamento" : "agendamentos"}
          </p>
          {navigating ? (
            <p role="status">Carregando horários…</p>
          ) : (
            <AppointmentList
              appointments={chosen}
              nextId={nextAppointment?.id}
              currentTime={currentTime}
              preparationStates={preparationStates}
              patientRecordBase={`/clinicas/${tenantId}/pacientes`}
              onPrepare={canStart ? setPreparing : undefined}
              onStart={
                canStart
                  ? (a) => {
                      setStarting(a);
                      setEditing(null);
                      setClosing(null);
                      setAccepted(false);
                      setError("");
                    }
                  : undefined
              }
              onEdit={canManage ? open : undefined}
              onNoShow={
                canManage
                  ? (appointment) => {
                      setClosing({ appointment, status: "no_show" });
                      setEditing(null);
                      setError("");
                      setNotice("");
                    }
                  : undefined
              }
              onCancel={
                canManage
                  ? (appointment) => {
                      setClosing({ appointment, status: "cancelled" });
                      setEditing(null);
                      setError("");
                      setNotice("");
                    }
                  : undefined
              }
            />
          )}
        </section>
      </div>
    </>
  );
}
