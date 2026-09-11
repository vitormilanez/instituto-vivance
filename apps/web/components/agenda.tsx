"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { Appointment, AgendaOptions } from "@/modules/agenda/service";
import { clinicDate, localToInstant } from "@/modules/agenda/validation";

export function AppointmentList({
  appointments,
  onEdit,
  onCancel,
}: {
  appointments: Appointment[];
  onEdit?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
}) {
  if (!appointments.length)
    return (
      <div className="empty">
        <h3>Nenhum agendamento neste período</h3>
        <p>Os horários aparecerão aqui quando forem agendados pela equipe.</p>
      </div>
    );
  return (
    <ul className="list">
      {appointments.map((a) => (
        <li key={a.id}>
          <strong>
            {a.patients?.display_name ?? "Consulta"} ·{" "}
            {a.kind === "return" ? "Retorno" : "Consulta"}
          </strong>
          <p>
            {new Date(a.starts_at).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              dateStyle: "short",
              timeStyle: "short",
            })}
            –
            {new Date(a.ends_at).toLocaleTimeString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <small>
            Médico: {a.memberships?.display_name ?? "Profissional da clínica"}
          </small>
          <span className="badge">
            {a.status === "cancelled" ? "Cancelado" : "Agendado"}
          </span>
          {a.status === "scheduled" && onEdit && onCancel && (
            <div className="agenda-actions">
              <button className="secondary" onClick={() => onEdit(a)}>
                Editar agendamento
              </button>
              <button className="secondary" onClick={() => onCancel(a)}>
                Cancelar agendamento
              </button>
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
  appointments,
  options,
  truncated,
}: {
  tenantId: string;
  date: string;
  today: string;
  appointments: Appointment[];
  options: AgendaOptions;
  truncated: boolean;
}) {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();
  const [editing, setEditing] = useState<Appointment | "new" | null>(null);
  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [returns, setReturns] = useState(false);
  const month = date.slice(0, 7),
    [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const counts = new Map<string, number>();
  for (const appointment of appointments) {
    if (appointment.status !== "scheduled") continue;
    const day = clinicDate(new Date(appointment.starts_at));
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const chosen = appointments.filter((a) =>
    returns
      ? a.kind === "return" &&
        a.status === "scheduled" &&
        a.starts_at > new Date().toISOString()
      : clinicDate(new Date(a.starts_at)) === date,
  );
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
    setCancelling(null);
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
  async function cancel() {
    if (!cancelling) return;
    setPending(true);
    setError("");
    try {
      await mutate(
        { status: "cancelled", version: cancelling.version },
        cancelling,
      );
      setCancelling(null);
      setNotice(
        "Agendamento cancelado. O registro foi preservado no histórico.",
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível cancelar.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Agenda</h1>
          <p>Consultas e retornos · horário de Brasília (UTC−3).</p>
        </div>
        <button onClick={() => open("new")}>Agendar consulta</button>
      </div>
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
          className="panel"
          aria-label={edit ? "Editar agendamento" : "Novo agendamento"}
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
                      {d.display_name ?? `Médico ${d.user_id.slice(0, 8)}`}
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
      {cancelling && (
        <section className="panel" aria-label="Confirmar cancelamento">
          <h2>Cancelar este agendamento?</h2>
          <p>
            {cancelling.patients?.display_name} ·{" "}
            {new Date(cancelling.starts_at).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            })}
          </p>
          <p>
            O horário será liberado. O registro e o histórico serão mantidos.
          </p>
          {error && (
            <p role="alert" className="feedback">
              {error}
            </p>
          )}
          <div className="agenda-actions">
            <button disabled={pending} onClick={cancel}>
              {pending ? "Cancelando…" : "Confirmar cancelamento"}
            </button>
            <button
              className="secondary"
              disabled={pending}
              onClick={() => setCancelling(null)}
            >
              Manter agendamento
            </button>
          </div>
        </section>
      )}
      <div className="agenda-actions">
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
              {first.toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
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
              : new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "long",
                  timeZone: "UTC",
                })}
          </h2>
          {navigating ? (
            <p role="status">Carregando horários…</p>
          ) : (
            <AppointmentList
              appointments={chosen}
              onEdit={open}
              onCancel={(a) => {
                setCancelling(a);
                setEditing(null);
                setError("");
                setNotice("");
              }}
            />
          )}
        </section>
      </div>
    </>
  );
}
