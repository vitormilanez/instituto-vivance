"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { CalendarPlus, LockKeyhole, X } from "lucide-react";
import type { AgendaOptions } from "@/modules/agenda/service";
import { localToInstant } from "@/modules/agenda/validation";
import { normalizeMeetUrl } from "@/modules/teleconsultations/validation";
import type { MeetStatus } from "@/modules/google-meet/types";
import { TeleconsultationLink } from "./teleconsultation-link";

export function AgendaSlotEditor({ tenantId, date, time, today, options, isDoctor, onClose, onSaved, onBusyChange }: {
  tenantId: string; date: string; time: string; today: string; options: AgendaOptions; isDoctor: boolean;
  onClose: () => void; onSaved: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [action, setAction] = useState<"book" | "block">("book");
  const [mode, setMode] = useState<"in_person" | "video">("in_person");
  const [manual, setManual] = useState(!isDoctor);
  const [meet, setMeet] = useState<MeetStatus | null>(null);
  const [meetError, setMeetError] = useState("");
  const [patientId, setPatientId] = useState("");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ id: string; mode: "in_person" | "video"; manualUrl: string } | null>(null);
  const [success, setSuccess] = useState<{ text: string; url?: string } | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { onBusyChange(pending); return () => onBusyChange(false); }, [pending, onBusyChange]);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, []);
  useEffect(() => {
    if (!isDoctor || mode !== "video" || action !== "book") return;
    const controller = new AbortController();
    fetch(`/api/v1/clinics/${tenantId}/google-meet/status`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error(); return response.json() as Promise<MeetStatus>; })
      .then(setMeet)
      .catch(() => { if (!controller.signal.aborted) setMeetError("Não foi possível verificar a conexão Google. Você pode colar um link do Meet."); });
    return () => controller.abort();
  }, [tenantId, isDoctor, mode, action]);

  async function post(path: string, body: unknown, method = "POST") {
    const response = await fetch(`/api/v1/clinics/${tenantId}/${path}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar este horário.");
    return result;
  }
  async function finishVideo(appointment: NonNullable<typeof saved>) {
    // Read back before retry: a lost response must not duplicate configuration
    // or create another meeting for the same saved appointment.
    const response = await fetch(`/api/v1/clinics/${tenantId}/appointments/${appointment.id}/teleconsultation`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
    const existing = await response.json();
    if (!response.ok) throw new Error(existing.error ?? "Não foi possível conferir o link salvo.");
    let url = existing.teleconsultation?.delivery_mode === "video" ? existing.teleconsultation.join_url : null;
    if (!url) {
      const result = appointment.manualUrl
        ? await post(`appointments/${appointment.id}/teleconsultation`, { delivery_mode: "video", join_url: appointment.manualUrl, version: existing.teleconsultation?.version ?? 0 }, "PUT")
        : await post(`google-meet/appointments/${appointment.id}/room`, {});
      url = appointment.manualUrl || result.meetingUri || result.meeting_uri;
    }
    if (!url) throw new Error("O Google ainda não confirmou o link. Confira o agendamento antes de tentar novamente.");
    setSuccess({ text: "Consulta online agendada. O link do Meet está salvo na consulta.", url });
    onSaved();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || saved || uncertain) return;
    setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    let created = false;
    try {
      const starts_at = localToInstant(String(form.get("date")), String(form.get("time")));
      const ends_at = new Date(Date.parse(starts_at) + Number(form.get("duration")) * 60000).toISOString();
      const doctor_id = String(form.get("doctor_id"));
      if (action === "block") {
        await post("agenda-blocks", { doctor_id, starts_at, ends_at });
        setSuccess({ text: "Horário bloqueado. Novas consultas não poderão ocupar esse período." });
        onSaved();
      } else {
        if (!patientId) throw new Error("Busque e selecione o paciente.");
        const manualUrl = mode === "video" && manual ? normalizeMeetUrl(String(form.get("join_url") ?? "")) : "";
        const result = await post("appointments", { patient_id: patientId, doctor_id, starts_at, ends_at, kind: form.get("kind") });
        created = true;
        const appointment = { id: result.appointment.id as string, mode, manualUrl };
        setSaved(appointment);
        if (mode === "video") await finishVideo(appointment);
        else { setSuccess({ text: "Consulta presencial agendada." }); onSaved(); }
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível salvar.";
      // A response lost after a write is not safe to retry as another booking.
      if (!created && (cause instanceof TypeError || cause instanceof DOMException || cause instanceof SyntaxError)) setUncertain(true);
      setError(created ? `O agendamento foi salvo, mas o link não foi confirmado. ${message}` : message);
      if (created) onSaved();
    } finally { setPending(false); }
  }
  const matches = options.patients.filter(patient => patient.display_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())).slice(0, 8);
  const selected = options.patients.find(patient => patient.id === patientId);
  const canAuto = isDoctor && meet?.connected && meet.available;
  return <aside className="agenda-slot-editor" aria-label="Ações do horário">
    <div className="agenda-slot-editor-heading">
      <div><h3 ref={heading} tabIndex={-1}>{time} · {new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" })}</h3><p>Escolha o que fazer neste horário.</p></div>
      <button type="button" className="secondary agenda-icon-button" aria-label="Fechar ações do horário" disabled={pending} onClick={onClose}><X size={18} aria-hidden="true" /></button>
    </div>
    {success ? <div className="agenda-slot-result"><p role="status">{success.text}</p>{success.url && <TeleconsultationLink url={success.url} patientName={selected?.display_name} />}<button type="button" className="secondary" onClick={onClose}>Voltar aos horários</button></div> : <>
      <div className="agenda-slot-actions" aria-label="Ação do horário">
        <button type="button" aria-pressed={action === "book"} disabled={pending || Boolean(saved) || uncertain} onClick={() => { setAction("book"); setError(""); }}><CalendarPlus size={17} aria-hidden="true" />Agendar consulta</button>
        <button type="button" aria-pressed={action === "block"} disabled={pending || Boolean(saved) || uncertain} onClick={() => { setAction("block"); setError(""); }}><LockKeyhole size={17} aria-hidden="true" />Bloquear horário</button>
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={pending || Boolean(saved) || uncertain}>
          {action === "book" && <div className="field agenda-patient-search"><label htmlFor="slot-patient">Paciente</label><input id="slot-patient" type="search" placeholder="Buscar pelo nome" autoComplete="off" value={query} onChange={event => { setQuery(event.target.value); setPatientId(""); }} aria-describedby="slot-patient-selection" />
            <p id="slot-patient-selection" className="agenda-field-hint">{selected ? `Selecionado: ${selected.display_name}` : "Selecione um paciente abaixo."}</p>
            {!selected && <div className="agenda-patient-results">{matches.map(patient => <button type="button" className="secondary" key={patient.id} onClick={() => { setPatientId(patient.id); setQuery(patient.display_name); }}>{patient.display_name}</button>)}{!matches.length && <p>Nenhum paciente encontrado.</p>}</div>}
          </div>}
          <div className="field"><label htmlFor="slot-doctor">Médico</label><select id="slot-doctor" name="doctor_id" defaultValue={options.doctors.length === 1 ? options.doctors[0].user_id : ""} required><option value="" disabled>Selecione o médico</option>{options.doctors.map(doctor => <option key={doctor.user_id} value={doctor.user_id}>{doctor.display_name}</option>)}</select></div>
          <div className="agenda-slot-fields"><div className="field"><label htmlFor="slot-date">Data</label><input id="slot-date" name="date" type="date" defaultValue={date} min={today} max="2100-12-31" required /></div><div className="field"><label htmlFor="slot-time">Horário</label><input id="slot-time" name="time" type="time" defaultValue={time} required /></div></div>
          <div className="agenda-slot-fields"><div className="field"><label htmlFor="slot-duration">Duração (min)</label><input id="slot-duration" name="duration" type="number" min="5" max="480" step="1" defaultValue={30} required /></div>{action === "book" && <div className="field"><label htmlFor="slot-kind">Tipo</label><select id="slot-kind" name="kind"><option value="consultation">Consulta</option><option value="return">Retorno</option></select></div>}</div>
          {action === "book" && <fieldset className="agenda-slot-mode"><legend>Modalidade</legend><label><input type="radio" name="slot-mode" checked={mode === "in_person"} onChange={() => setMode("in_person")} />Presencial</label><label><input type="radio" name="slot-mode" checked={mode === "video"} onChange={() => setMode("video")} />Online · Google Meet</label></fieldset>}
          {action === "book" && mode === "video" && <div className="agenda-slot-meet">
            {isDoctor && !meet && !meetError && <p role="status">Verificando conexão Google…</p>}
            {canAuto && <p>O link do Meet será criado automaticamente na sua conta Google.</p>}
            {isDoctor && meet && !canAuto && <p>Conecte sua conta Google em <Link href={`/clinicas/${tenantId}/teleconsulta`}>Teleconsulta</Link> para criar o link automaticamente, ou cole um link existente.</p>}
            {meetError && <p role="status">{meetError}</p>}
            <label className="agenda-manual-meet"><input type="checkbox" checked={manual} onChange={event => setManual(event.target.checked)} disabled={!isDoctor} />Usar um link do Meet já criado</label>
            {manual && <div className="field"><label htmlFor="slot-link">Link do Google Meet</label><input id="slot-link" name="join_url" type="url" pattern="https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}.*" placeholder="https://meet.google.com/abc-defg-hij" maxLength={200} required /></div>}
          </div>}
          <button className="agenda-slot-submit" disabled={!options.doctors.length || action === "book" && (!patientId || mode === "video" && !manual && !canAuto)}>{pending ? "Salvando…" : action === "block" ? "Confirmar bloqueio" : mode === "video" ? "Agendar online" : "Agendar presencial"}</button>
        </fieldset>
      </form>
      {error && <p className="feedback" role="alert">{error}</p>}
      {saved?.mode === "video" && <button type="button" disabled={pending} onClick={async () => { setPending(true); setError(""); try { await finishVideo(saved); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível confirmar o link."); } finally { setPending(false); } }}>Confirmar link do agendamento salvo</button>}
      {uncertain && <p role="alert">Não foi possível confirmar o salvamento. Feche este painel e confira a agenda antes de tentar novamente.</p>}
    </>}
  </aside>;
}
