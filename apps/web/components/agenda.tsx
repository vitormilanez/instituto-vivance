"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, LockKeyhole, MoreHorizontal, RefreshCw, Video } from "lucide-react";
import type { Appointment, AgendaOptions } from "@/modules/agenda/service";
import { clinicDate, localToInstant } from "@/modules/agenda/validation";
import { focusedAppointment } from "@/modules/agenda/focus";
import { PreparationRequestEditor } from "./preparation-request-editor";
import { TeleconsultationSettings } from "./teleconsultation-settings";
import { TeleconsultationLink } from "./teleconsultation-link";
import { sentenceCase } from "@/lib/format";
import { appointmentPresentation, needsAppointmentOutcome } from "@/modules/agenda/presentation";
import { useAgendaClock } from "./use-agenda-clock";
import { MedicalSelector } from "@/components/medical-selector";
import { MedicalPageHeader } from "@/components/medical-page-header";
import "@/app/doctor-agenda.css";
import { AgendaSlotEditor } from "./agenda-slot-editor";
import { agendaClock, daySlots, slotOccupied } from "@/modules/agenda/slots";
import type { AgendaBlock } from "@/modules/agenda/blocks";

export function AppointmentList({
  showDate = true,
  compact = false,
  appointments,
  currentTime,
  nextId,
  onEdit,
  onCancel,
  onNoShow,
  onStart,
  onPrepare,
  onTeleconsultation,
  preparationStates = {},
  patientRecordBase,
  consentBase,
}: {
  appointments: Appointment[];
  currentTime: string;
  nextId?: string;
  onEdit?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onNoShow?: (appointment: Appointment) => void;
  onStart?: (appointment: Appointment) => void;
  onPrepare?: (appointment: Appointment) => void;
  onTeleconsultation?: (appointment: Appointment) => void;
  preparationStates?: Record<string, string>;
  // Na agenda de um dia escolhido a data já está no título da lista; ela só
  // acompanha cada linha quando a lista mistura dias (próximos retornos).
  showDate?: boolean;
  compact?: boolean;
  // Only the staff Agenda passes this; a patient viewing their own
  // consultations should never see a link to a "ficha".
  patientRecordBase?: string;
  consentBase?: string;
}) {
  if (!appointments.length)
    return (
      <div className="empty">
        <h3>Nenhum agendamento neste período</h3>
        <p>Os horários aparecerão aqui quando forem agendados pela equipe.</p>
      </div>
    );
  return (
    <ul className={`list appointment-list${compact ? " is-compact" : ""}`}>
      {appointments.map((a) => {
        const presentation = appointmentPresentation(a, currentTime, Boolean(patientRecordBase));
        const overdue = Boolean(patientRecordBase) && needsAppointmentOutcome(a, currentTime);
        return (
        <li
          className={`appointment-row${a.id === nextId ? " is-next" : ""}`}
          id={`consulta-${a.id}`}
          key={a.id}
        >
          {!compact && <div className="appointment-time">
            <strong>
              {new Date(a.starts_at).toLocaleTimeString("pt-BR", {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </strong>
            {showDate && (
              <span>
                {new Date(a.starts_at).toLocaleDateString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            )}
          </div>}
          <div className="appointment-patient">
            {!compact && <span className="patient-avatar" aria-hidden="true">
              {(a.patients?.display_name ?? "Consulta")
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()}
            </span>}
            <div>
              {!compact && <><strong>{a.patients?.display_name ?? "Consulta"}</strong>
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
              </small></>}
              <small className="appointment-doctor-context">{compact ? `${a.kind === "return" ? "Retorno" : "Consulta"} · ` : ""}{a.doctor_display_name}</small>
              {!compact && a.teleconsultation?.delivery_mode === "video" && <span className="teleconsultation-row-mode">Teleconsulta · Google Meet</span>}
              {!patientRecordBase && a.teleconsultation?.join_url && ["scheduled", "in_progress"].includes(a.status) && <TeleconsultationLink url={a.teleconsultation.join_url} compact />}
              {consentBase && ["scheduled", "in_progress"].includes(a.status) && <Link className="button secondary" href={`${consentBase}/${a.id}`}>Minha escolha para o resumo da consulta</Link>}
              {onTeleconsultation && ["scheduled", "in_progress"].includes(a.status) && <button type="button" className="secondary quiet" onClick={() => onTeleconsultation(a)}>{a.teleconsultation?.delivery_mode === "video" ? "Ver teleconsulta" : compact ? "Modalidade" : "Modalidade / teleconsulta"}</button>}
              {patientRecordBase && (
                <Link
                  className="appointment-patient-link"
                  href={`${patientRecordBase}/${a.patient_id}`}
                >
                  {compact ? "Ficha do paciente" : "Ver ficha do paciente"}
                </Link>
              )}
              {overdue && !compact && <small className="appointment-outcome-note">O horário terminou. Registre o atendimento ou confirme a falta.</small>}
            </div>
          </div>
          {!compact && <span
            className={`badge appointment-status ${presentation.className}`}
          >
            {presentation.label}
          </span>}
          {patientRecordBase && a.encounter && ["in_progress", "completed"].includes(a.status) && (
            <div className="appointment-actions">
              <Link className="button" href={`${patientRecordBase.replace(/\/pacientes$/, "")}/atendimentos/${a.encounter.id}${a.encounter.status === "draft" && a.teleconsultation?.delivery_mode === "video" ? "?modo=teleconsulta&etapa=consulta" : ""}`}>
                {a.encounter.status === "finalized" ? "Ver registro da consulta" : "Retomar atendimento"}
              </Link>
              <small>{a.encounter.status === "finalized" ? "Registro finalizado" : "Registro salvo em rascunho"}</small>
            </div>
          )}
          {patientRecordBase && canExplainMissingRecord(a) && <small className="appointment-record-unavailable">Registro não disponível para sua conta.</small>}
          {a.status === "scheduled" &&
            (onStart || onEdit || onCancel || onNoShow || onPrepare) && (
              <div className="appointment-actions">
                {onStart && (
                  <button onClick={() => onStart(a)}>{overdue ? "Registrar atendimento" : "Abrir atendimento"}</button>
                )}
                {overdue && onNoShow && !compact && <button className="secondary" onClick={() => onNoShow(a)}>Registrar falta</button>}
                {onPrepare && a.starts_at > currentTime && (
                  <button
                    className="secondary"
                    disabled={Boolean(preparationStates[a.id])}
                    onClick={() => onPrepare(a)}
                  >
                    {preparationStates[a.id] ? "Pré-consulta solicitada" : "Preparar pré-consulta"}
                  </button>
                )}
                {onStart ? <details className="appointment-more-actions"><summary aria-label="Mais ações do agendamento"><MoreHorizontal size={18} aria-hidden="true" /></summary><div>
                {onEdit && (
                  <button className="secondary quiet" onClick={() => onEdit(a)}>
                    Editar
                  </button>
                )}
                {compact && overdue && onNoShow && <button className="secondary quiet" onClick={() => onNoShow(a)}>Registrar falta</button>}
                {!overdue && onNoShow && a.starts_at <= currentTime && (
                  <button className="secondary quiet" onClick={() => onNoShow(a)}>
                    Registrar falta
                  </button>
                )}
                {onCancel && (
                  <button className="secondary quiet" onClick={() => onCancel(a)}>
                    Cancelar
                  </button>
                )}
                </div></details> : <>
                {onEdit && (
                  <button className="secondary quiet" onClick={() => onEdit(a)}>
                    Editar
                  </button>
                )}
                {!overdue && onNoShow && a.starts_at <= currentTime && (
                  <button className="secondary quiet" onClick={() => onNoShow(a)}>
                    Registrar falta
                  </button>
                )}
                {onCancel && (
                  <button className="secondary quiet" onClick={() => onCancel(a)}>
                    Cancelar
                  </button>
                )}
                </>}
              </div>
            )}
        </li>
      );})}
    </ul>
  );
}

function canExplainMissingRecord(appointment: Appointment) {
  return !appointment.encounter && ["in_progress", "completed"].includes(appointment.status);
}

export function Agenda({
  tenantId,
  date,
  today,
  currentTime: serverTime,
  appointments,
  options,
  truncated,
  canStart = false,
  canManage = false,
  preparationStates = {},
  blocks = [],
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
  blocks?: AgendaBlock[];
}) {
  const router = useRouter();
  const currentTime = useAgendaClock(serverTime);
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
  const [scheduleView, setScheduleView] = useState<"day" | "week">("day");
  const [starting, setStarting] = useState<Appointment | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [teleconsultation, setTeleconsultation] = useState<Appointment | null>(null);
  const [preparing, setPreparing] = useState<Appointment | null>(null);
  const [slot, setSlot] = useState<{ date: string; time: string } | null>(null);
  const [slotBusy, setSlotBusy] = useState(false);
  const [showPastSlots, setShowPastSlots] = useState(false);
  const [expandedAppointment, setExpandedAppointment] = useState<string | null>(null);
  const [unblocking, setUnblocking] = useState<AgendaBlock | null>(null);
  const slotTrigger = useRef<HTMLButtonElement | null>(null);
  const startPanel = useRef<HTMLElement>(null);
  const activePanel = useRef<HTMLElement>(null);
  useEffect(() => {
    // Refresh status from other tabs without interrupting an open form.
    if (editing || closing || starting || preparing || teleconsultation || slot || pending) return;
    const refresh = () => {
      if (document.visibilityState === "visible") startTransition(() => router.refresh());
    };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [router, editing, closing, starting, preparing, teleconsultation, slot, pending]);
  useEffect(() => {
    if (starting) {
      startPanel.current?.focus({ preventScroll: true });
      startPanel.current?.scrollIntoView({
        block: "nearest",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    }
  }, [starting]);
  useEffect(() => {
    if (editing || closing) {
      activePanel.current?.focus({ preventScroll: true });
      activePanel.current?.scrollIntoView({
        block: "nearest",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
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
      router.push(`/clinicas/${tenantId}/atendimentos/${result.id}${starting.teleconsultation?.delivery_mode === "video" ? "?modo=teleconsulta&etapa=consulta" : ""}`);
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
  const dayEnd = new Date(`${date}T12:00:00Z`);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const chosenBlocks = blocks.filter(block => block.status === "active" && block.starts_at < localToInstant(dayEnd.toISOString().slice(0, 10), "00:00") && block.ends_at > localToInstant(date, "00:00"));
  const times = daySlots(date, [...chosen, ...chosenBlocks]);
  const selectedDay = new Date(`${date}T12:00:00Z`);
  const selectedDayOffset = (selectedDay.getUTCDay() + 6) % 7;
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const value = new Date(selectedDay);
    value.setUTCDate(selectedDay.getUTCDate() - selectedDayOffset + index);
    return value.toISOString().slice(0, 10);
  });
  const weekStart = weekDays[0];
  const weekEnd = weekDays.at(-1)!;
  const isDoctorView = canStart;
  const uncoveredWeekDays = weekDays.filter((weekDay) =>
    !weekDay.startsWith(month),
  );
  const hasPartialWeek = isDoctorView && scheduleView === "week" && uncoveredWeekDays.length > 0;
  const scheduleTitle = returns
    ? "Próximos retornos do mês"
    : isDoctorView && scheduleView === "week"
      ? `${new Date(`${weekStart}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" })} a ${new Date(`${weekEnd}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" })}`
      : sentenceCase(
          selectedDay.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "UTC",
          }),
        );
  const scheduleAppointments = returns
    ? chosen
    : isDoctorView && scheduleView === "week"
      ? appointments.filter((appointment) =>
          weekDays.includes(clinicDate(new Date(appointment.starts_at))),
        )
      : chosen;
  const nextAppointment = focusedAppointment(appointments, currentTime, date);
  const edit = editing && editing !== "new" ? editing : null;
  function selectDate(next: string) {
    if (slotBusy) return;
    setSlot(null);
    setShowPastSlots(false);
    setExpandedAppointment(null);
    startTransition(() =>
      router.push(`/clinicas/${tenantId}/agenda?data=${next}`, { scroll: false }),
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
    if (slotBusy) return;
    setSlot(null);
    setTeleconsultation(null);
    setEditing(value);
    setClosing(null);
    setError("");
    setNotice("");
  }
  function closeSlot() {
    setSlot(null);
    slotTrigger.current?.focus({ preventScroll: true });
  }
  function openSlot(time: string, trigger?: HTMLButtonElement) {
    if (slotBusy) return;
    slotTrigger.current = trigger ?? null;
    setSlot({ date, time });
    setEditing(null); setTeleconsultation(null); setStarting(null); setClosing(null);
    setUnblocking(null); setError(""); setNotice(""); setReturns(false); setScheduleView("day");
  }
  async function unblock(block: AgendaBlock) {
    if (pending) return;
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/v1/clinics/${tenantId}/agenda-blocks/${block.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: block.version, status: "cancelled" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível desbloquear o horário.");
      setNotice("Horário desbloqueado."); setUnblocking(null); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível desbloquear o horário."); }
    finally { setPending(false); }
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
      const saved = await mutate(body, edit ?? undefined);
      if (!edit) setTeleconsultation(saved.appointment);
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
    <div className="doctor-agenda">
      {preparing && <PreparationRequestEditor key={preparing.id} tenantId={tenantId} appointmentId={preparing.id} patientName={preparing.patients?.display_name ?? "paciente"} onClose={() => setPreparing(null)} />}
      <MedicalPageHeader className="page-heading" title="Agenda" description="Consultas e retornos no horário de Brasília (UTC−3)." actions={canManage && (
          <div className="agenda-heading-actions">
            <Link
              className="button secondary"
              href={`/clinicas/${tenantId}/teleconsulta`}
            >
              <Video size={18} aria-hidden="true" />Nova teleconsulta
            </Link>
            <button disabled={slotBusy} onClick={event => canStart ? openSlot(times.find(time => localToInstant(date, time) > currentTime && !slotOccupied(date, time, options.doctors[0]?.user_id ?? "", [...chosen, ...chosenBlocks])) ?? "09:00", event.currentTarget) : open("new")}><CalendarPlus size={18} aria-hidden="true" />Novo agendamento</button>
          </div>
        )} />
      {nextAppointment && !returns && !isDoctorView && (
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
            className={`appointment-status ${appointmentPresentation(nextAppointment, currentTime, true).className}`}
          >
            {appointmentPresentation(nextAppointment, currentTime, true).label}
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
      {teleconsultation && <TeleconsultationSettings
        key={teleconsultation.id}
        tenantId={tenantId}
        appointmentId={teleconsultation.id}
        patientName={teleconsultation.patients?.display_name ?? "Consulta"}
        editable={canManage && teleconsultation.status === "scheduled"}
        onClose={() => setTeleconsultation(null)}
        onSaved={() => router.refresh()}
      />}
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
        {isDoctorView ? <MedicalSelector label="Formato da agenda" options={[{ value: "day", label: "Dia" }, { value: "week", label: "Semana" }, { value: "returns", label: "Próximos retornos do mês" }]} value={returns ? "returns" : scheduleView} onChange={(value) => { if (value === "returns") setReturns(true); else { setReturns(false); setScheduleView(value as "day" | "week"); } }} /> : <button
          className="secondary"
          aria-pressed={!returns}
          onClick={() => setReturns(false)}
        >
          Calendário
        </button>}
        {isDoctorView && <button
          className="secondary agenda-date-nav"
          aria-label={scheduleView === "week" ? "Semana anterior" : "Dia anterior"}
          disabled={navigating}
          onClick={() => {
            const previous = new Date(selectedDay);
            previous.setUTCDate(selectedDay.getUTCDate() - (scheduleView === "week" ? 7 : 1));
            selectDate(previous.toISOString().slice(0, 10));
          }}
        >
          <ChevronLeft aria-hidden="true" size={18} />
        </button>}
        {isDoctorView && <button
          className="secondary agenda-today-button"
          disabled={navigating}
          onClick={() => selectDate(today)}
        >
          Hoje
        </button>}
        {isDoctorView && <button
          className="secondary agenda-date-nav"
          aria-label={scheduleView === "week" ? "Próxima semana" : "Próximo dia"}
          disabled={navigating}
          onClick={() => {
            const next = new Date(selectedDay);
            next.setUTCDate(selectedDay.getUTCDate() + (scheduleView === "week" ? 7 : 1));
            selectDate(next.toISOString().slice(0, 10));
          }}
        >
          <ChevronRight aria-hidden="true" size={18} />
        </button>}
        {!isDoctorView && <button
          className="secondary"
          aria-pressed={returns}
          onClick={() => setReturns(true)}
        >
          Próximos retornos do mês
        </button>}
        <button
          className="secondary agenda-refresh"
          disabled={navigating}
          onClick={() => startTransition(() => router.refresh())}
        >
          <RefreshCw size={16} aria-hidden="true" />Atualizar agenda
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
              <ChevronLeft size={18} aria-hidden="true" />
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
              <ChevronRight size={18} aria-hidden="true" />
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
                  onClick={() => { setReturns(false); setScheduleView("day"); selectDate(d); }}
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
          <h2>{scheduleTitle}</h2>
          <p className="schedule-caption">
            {scheduleAppointments.length}{" "}
            {scheduleAppointments.length === 1 ? "agendamento" : "agendamentos"}
            {hasPartialWeek ? " no mês carregado" : ""}
          </p>
          {isDoctorView && !returns && scheduleView === "day" && <p className="agenda-slot-help">Escolha um horário para agendar, bloquear ou ver a consulta.</p>}
          {hasPartialWeek && (
            <p className="agenda-week-coverage" role="status">
              Esta semana inclui outro mês. Abra o dia para consultar seus horários.
            </p>
          )}
          {navigating ? (
            <p role="status">Carregando horários…</p>
          ) : isDoctorView && !returns && scheduleView === "day" ? (
            <div className={`agenda-day-workspace${slot ? " has-slot-editor" : ""}`}>
              <div className="agenda-day-overview">
                <div className="agenda-hours-heading"><h3>Horários</h3>{date <= today && <button type="button" className="secondary quiet" disabled={slotBusy} aria-pressed={showPastSlots} onClick={() => setShowPastSlots(value => !value)}>{showPastSlots ? "Ocultar anteriores" : "Ver anteriores"}</button>}</div>
                <div className="agenda-hour-grid" aria-label="Horários do dia">
                {times.filter(time => showPastSlots || localToInstant(date, time) > currentTime).map(time => {
                  const selectedDoctor = options.doctors.length === 1 ? options.doctors[0].user_id : "";
                  const instant = localToInstant(date, time);
                  const appointment = chosen.find(item => (!selectedDoctor || item.doctor_id === selectedDoctor) && !["cancelled", "no_show"].includes(item.status) && item.starts_at <= instant && item.ends_at > instant);
                  const block = chosenBlocks.find(item => (!selectedDoctor || item.doctor_id === selectedDoctor) && item.starts_at <= instant && item.ends_at > instant);
                  const past = localToInstant(date, time) <= currentTime;
                  const label = block ? "Bloqueado" : appointment ? "Consulta" : past ? "Encerrado" : "Agendar";
                  const selected = slot?.time === time && slot.date === date;
                  return <button key={time} type="button" className={`agenda-hour-button${block ? " is-blocked" : appointment ? " is-booked" : ""}`} disabled={slotBusy || !canManage && !appointment && !block || past && !appointment && !block} aria-pressed={selected || Boolean(appointment && expandedAppointment === appointment.id)} aria-label={`${time} · ${label}${!appointment && !block && !past ? " ou bloquear" : ""}`} onClick={event => {
                    if (appointment) { setExpandedAppointment(value => value === appointment.id ? null : appointment.id); setUnblocking(null); setSlot(null); }
                    else if (block) { setUnblocking(block); setSlot(null); setError(""); }
                    else openSlot(time, event.currentTarget);
                  }}><strong>{time}</strong><span>{label}</span></button>;
                })}
                </div>
                {!showPastSlots && !times.some(time => localToInstant(date, time) > currentTime) && <p className="agenda-slot-help">Os horários deste dia já passaram.</p>}
                <div className="agenda-day-bookings" aria-label="Consultas e bloqueios do dia">
                  {chosen.length > 0 && <h3>Consultas do dia</h3>}
                  {chosen.map(appointment => <div className="agenda-compact-appointment" key={appointment.id}>
                    <button type="button" className="agenda-booking-summary" disabled={slotBusy} aria-expanded={expandedAppointment === appointment.id} aria-controls={`agenda-detail-${appointment.id}`} onClick={() => { setExpandedAppointment(value => value === appointment.id ? null : appointment.id); }}>
                      <strong className="agenda-booking-time">{agendaClock(appointment.starts_at)}</strong><span className="agenda-booking-person"><strong>{appointment.patients?.display_name ?? "Consulta"}</strong><small>{agendaClock(appointment.starts_at)}–{agendaClock(appointment.ends_at)} · {appointment.teleconsultation?.delivery_mode === "video" ? "Online" : "Presencial"}</small></span><span className={`appointment-status ${appointmentPresentation(appointment, currentTime, true).className}`}>{appointmentPresentation(appointment, currentTime, true).label}</span><ChevronRight size={16} aria-hidden="true" />
                    </button>
                    {expandedAppointment === appointment.id && <div id={`agenda-detail-${appointment.id}`} className="agenda-booking-detail"><AppointmentList compact appointments={[appointment]} currentTime={currentTime} showDate={false} nextId={nextAppointment?.id} patientRecordBase={`/clinicas/${tenantId}/pacientes`} preparationStates={preparationStates}
                        onStart={canStart ? appointment => { setSlot(null); setStarting(appointment); setAccepted(false); setError(""); } : undefined}
                        onEdit={canManage ? open : undefined}
                        onTeleconsultation={canManage ? appointment => { setSlot(null); setTeleconsultation(appointment); } : undefined}
                        onPrepare={canStart ? setPreparing : undefined}
                        onNoShow={canManage ? appointment => { setSlot(null); setClosing({ appointment, status: "no_show" }); setError(""); } : undefined}
                        onCancel={canManage ? appointment => { setSlot(null); setClosing({ appointment, status: "cancelled" }); setError(""); } : undefined}
                      /></div>}
                  </div>)}
                  {chosenBlocks.map(block => <div className="agenda-block-row" key={block.id}><LockKeyhole size={17} aria-hidden="true" /><div><strong>Horário bloqueado</strong><span>{clinicDate(new Date(block.starts_at)) !== date ? `${new Date(block.starts_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })} ` : ""}{agendaClock(block.starts_at)}–{clinicDate(new Date(block.ends_at)) !== date ? `${new Date(block.ends_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })} ` : ""}{agendaClock(block.ends_at)} · {block.doctor_display_name}</span></div>{canManage && <button type="button" className="secondary" disabled={pending || slotBusy} onClick={() => { setUnblocking(block); setError(""); }}>Desbloquear</button>}
                        {unblocking?.id === block.id && <div className="agenda-unblock-confirm"><p>Liberar este período para novos agendamentos?</p><button type="button" disabled={pending} onClick={() => void unblock(block)}>Confirmar desbloqueio</button><button type="button" className="secondary" disabled={pending} onClick={() => setUnblocking(null)}>Manter bloqueio</button>{error && <p role="alert">{error}</p>}</div>}
                  </div>)}
                  {!chosen.length && !chosenBlocks.length && <p className="agenda-slot-help">Nenhuma consulta ou bloqueio neste dia.</p>}
                </div>
              </div>
              {slot && <AgendaSlotEditor key={`${slot.date}:${slot.time}`} tenantId={tenantId} date={slot.date} time={slot.time} today={today} options={options} isDoctor={canStart} onClose={closeSlot} onSaved={() => router.refresh()} onBusyChange={setSlotBusy} />}
            </div>
          ) : isDoctorView && !returns && scheduleView === "week" ? (
            <div className="agenda-week-grid" aria-label="Agenda semanal">
              {weekDays.map((weekDay) => {
                const isCovered = weekDay.startsWith(month);
                const dayAppointments = appointments.filter(
                  (appointment) => clinicDate(new Date(appointment.starts_at)) === weekDay,
                );
                return (
                  <section className="agenda-week-day" key={weekDay}>
                    <button
                      className="agenda-week-day-heading"
                      onClick={() => { setScheduleView("day"); selectDate(weekDay); }}
                    >
                      <span>{new Date(`${weekDay}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" })}</span>
                      <strong>{new Date(`${weekDay}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", timeZone: "UTC" })}</strong>
                    </button>
                    {isCovered ? <AppointmentList
                      showDate={false}
                      appointments={dayAppointments}
                      nextId={nextAppointment?.id}
                      currentTime={currentTime}
                      preparationStates={preparationStates}
                      patientRecordBase={`/clinicas/${tenantId}/pacientes`}
                      onTeleconsultation={canManage ? (appointment) => { setTeleconsultation(appointment); setEditing(null); setStarting(null); setClosing(null); } : undefined}
                      onPrepare={canStart ? setPreparing : undefined}
                      onStart={canStart ? (appointment) => { setStarting(appointment); setTeleconsultation(null); setEditing(null); setClosing(null); setAccepted(false); setError(""); } : undefined}
                      onEdit={canManage ? open : undefined}
                      onNoShow={canManage ? (appointment) => { setClosing({ appointment, status: "no_show" }); setEditing(null); setError(""); setNotice(""); } : undefined}
                      onCancel={canManage ? (appointment) => { setClosing({ appointment, status: "cancelled" }); setEditing(null); setError(""); setNotice(""); } : undefined}
                    /> : <p className="agenda-week-unavailable">Abra este dia para ver os horários.</p>}
                  </section>
                );
              })}
            </div>
          ) : (
            <AppointmentList
              showDate={returns}
              appointments={chosen}
              nextId={nextAppointment?.id}
              currentTime={currentTime}
              preparationStates={preparationStates}
              patientRecordBase={`/clinicas/${tenantId}/pacientes`}
              onTeleconsultation={canManage ? (appointment) => { setTeleconsultation(appointment); setEditing(null); setStarting(null); setClosing(null); } : undefined}
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
    </div>
  );
}
