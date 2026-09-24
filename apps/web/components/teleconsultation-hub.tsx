"use client";
import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Video } from "lucide-react";
import type { Appointment, AgendaOptions } from "@/modules/agenda/service";
import { localToInstant } from "@/modules/agenda/validation";
import { MEET_ACCOUNT, meetNewRoomUrl } from "@/modules/teleconsultations/meet-account";

const statusLabel: Record<string, string> = {
  scheduled: "Agendada",
  in_progress: "Em atendimento",
};

function when(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TeleconsultationHub({
  tenantId,
  today,
  role,
  options,
  appointments,
}: {
  tenantId: string;
  today: string;
  role: string;
  options: AgendaOptions;
  appointments: Appointment[];
}) {
  const router = useRouter();
  const isDoctor = role === "doctor";
  const [mode, setMode] = useState<"now" | "scheduled">(
    isDoctor ? "now" : "scheduled",
  );
  const [patientMode, setPatientMode] = useState<"existing" | "new">(
    options.patients.length ? "existing" : "new",
  );
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ name: string; url: string } | null>(
    null,
  );
  const [opening, setOpening] = useState<string | null>(null);
  const [openAccepted, setOpenAccepted] = useState(false);
  const [listError, setListError] = useState("");
  const [copied, setCopied] = useState("");
  const noDoctor = !options.doctors.length;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setCreated(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const patientName =
        patientMode === "new"
          ? String(form.get("new_name") ?? "")
          : (options.patients.find((p) => p.id === form.get("patient_id"))
              ?.display_name ?? "paciente");
      const body = {
        when: mode,
        ...(patientMode === "new"
          ? {
              new_patient: {
                display_name: String(form.get("new_name") ?? ""),
                birth_date: String(form.get("new_birth") ?? ""),
              },
            }
          : { patient_id: form.get("patient_id") }),
        doctor_id: form.get("doctor_id"),
        kind: form.get("kind"),
        join_url: String(form.get("join_url") ?? ""),
        duration_minutes: Number(form.get("duration")),
        ...(mode === "scheduled"
          ? {
              starts_at: localToInstant(
                String(form.get("date")),
                String(form.get("time")),
              ),
            }
          : { accept_care: accepted }),
      };
      const response = await fetch(
        `/api/v1/clinics/${tenantId}/teleconsultations`,
        {
          method: "POST",
          signal: AbortSignal.timeout(30000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ?? "Não foi possível criar a teleconsulta.",
        );
      const saved = result.teleconsultation as {
        encounterId: string | null;
      };
      if (saved.encounterId) {
        router.push(
          `/clinicas/${tenantId}/atendimentos/${saved.encounterId}?modo=teleconsulta&etapa=consulta`,
        );
        return;
      }
      formElement.reset();
      setCreated({ name: patientName, url: body.join_url });
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível criar a teleconsulta. Tente novamente.",
      );
      if (mode === "now") router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function openEncounter(appointment: Appointment) {
    setPending(true);
    setListError("");
    try {
      const response = await fetch(`/api/v1/clinics/${tenantId}/encounters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: appointment.id,
          appointment_version: appointment.version,
          accept_care: true,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Não foi possível abrir o atendimento.");
      router.push(
        `/clinicas/${tenantId}/atendimentos/${result.id}?modo=teleconsulta&etapa=consulta`,
      );
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : "Não foi possível abrir o atendimento.",
      );
      setPending(false);
    }
  }

  async function copy(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
    } catch {
      setCopied("");
    }
  }

  return (
    <div className="teleconsultation-hub">
      <div className="page-heading">
        <div>
          <h1>Teleconsulta</h1>
          <p>
            Consultas por vídeo pelo Google Meet. A chamada abre em outra aba;
            o registro clínico continua aqui.
          </p>
        </div>
      </div>

      <section className="panel tele-hub-form" aria-labelledby="tele-new">
        <h2 id="tele-new">Nova teleconsulta</h2>
        <div className="tele-hub-switch" role="group" aria-label="Quando">
          {isDoctor && (
            <button
              type="button"
              className="secondary"
              aria-pressed={mode === "now"}
              onClick={() => setMode("now")}
            >
              Iniciar agora
            </button>
          )}
          <button
            type="button"
            className="secondary"
            aria-pressed={mode === "scheduled"}
            onClick={() => setMode("scheduled")}
          >
            Agendar
          </button>
        </div>
        {!isDoctor && (
          <p className="tele-hub-hint">
            Só o médico inicia uma teleconsulta na hora. Aqui você agenda e
            deixa o link pronto.
          </p>
        )}
        {noDoctor && (
          <p className="notice">É necessário um médico ativo na clínica.</p>
        )}
        <form onSubmit={submit}>
          <fieldset disabled={pending} className="tele-hub-fields">
            <legend className="sr-only">Dados da teleconsulta</legend>

            <div className="tele-hub-step">
              <span className="tele-hub-step-number" aria-hidden="true">1</span>
              <div>
                <h3>Paciente</h3>
                <div className="teleconsultation-mode-options">
                  <label>
                    <input
                      type="radio"
                      name="patient-mode"
                      checked={patientMode === "existing"}
                      disabled={!options.patients.length}
                      onChange={() => setPatientMode("existing")}
                    />
                    Já cadastrado
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="patient-mode"
                      checked={patientMode === "new"}
                      onChange={() => setPatientMode("new")}
                    />
                    Novo paciente
                  </label>
                </div>
                {patientMode === "existing" ? (
                  <div className="field">
                    <label htmlFor="tele-patient">Paciente</label>
                    <select
                      id="tele-patient"
                      name="patient_id"
                      defaultValue=""
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
                ) : (
                  <div className="tele-hub-row">
                    <div className="field">
                      <label htmlFor="tele-new-name">Nome completo</label>
                      <input
                        id="tele-new-name"
                        name="new_name"
                        required
                        minLength={2}
                        maxLength={160}
                        autoComplete="off"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="tele-new-birth">
                        Data de nascimento (opcional)
                      </label>
                      <input
                        id="tele-new-birth"
                        name="new_birth"
                        type="date"
                        max={today}
                      />
                    </div>
                    <p className="tele-hub-hint">
                      A ficha é criada agora. Para o link aparecer no app do
                      paciente, convide-o depois em Pacientes; até lá, envie o
                      link por mensagem.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="tele-hub-step">
              <span className="tele-hub-step-number" aria-hidden="true">2</span>
              <div>
                <h3>{mode === "now" ? "Consulta" : "Horário"}</h3>
                <div className="tele-hub-row">
                  <div
                    className="field"
                    hidden={options.doctors.length === 1}
                  >
                    <label htmlFor="tele-doctor">Médico</label>
                    <select
                      id="tele-doctor"
                      name="doctor_id"
                      defaultValue={
                        options.doctors.length === 1
                          ? options.doctors[0].user_id
                          : ""
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
                  {mode === "scheduled" && (
                    <>
                      <div className="field">
                        <label htmlFor="tele-date">Data</label>
                        <input
                          id="tele-date"
                          name="date"
                          type="date"
                          min={today}
                          max="2100-12-31"
                          defaultValue={today}
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="tele-time">Horário de Brasília</label>
                        <input id="tele-time" name="time" type="time" required />
                      </div>
                    </>
                  )}
                  <div className="field">
                    <label htmlFor="tele-duration">Duração (minutos)</label>
                    <input
                      id="tele-duration"
                      name="duration"
                      type="number"
                      min="5"
                      max="480"
                      step="1"
                      defaultValue={30}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="tele-kind">Tipo</label>
                    <select id="tele-kind" name="kind" defaultValue="consultation">
                      <option value="consultation">Consulta</option>
                      <option value="return">Retorno</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="tele-hub-step">
              <span className="tele-hub-step-number" aria-hidden="true">3</span>
              <div>
                <h3>Sala do Google Meet</h3>
                <p className="tele-hub-hint">
                  Abre uma sala nova na conta {MEET_ACCOUNT}. Copie o link da
                  sala e cole aqui. Use uma sala para cada consulta.
                </p>
                <a
                  className="button secondary tele-hub-meet"
                  href={meetNewRoomUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-external-call
                >
                  <Video size={18} aria-hidden="true" /> Criar sala no Google
                  Meet <ExternalLink size={15} aria-hidden="true" />
                </a>
                <div className="field">
                  <label htmlFor="tele-link">Link da sala</label>
                  <input
                    id="tele-link"
                    name="join_url"
                    type="url"
                    inputMode="url"
                    required
                    maxLength={200}
                    placeholder="https://meet.google.com/abc-defg-hij"
                  />
                </div>
              </div>
            </div>

            {mode === "now" && (
              <label className="care-accept">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                Confirmo que sou responsável por este atendimento.
              </label>
            )}
          </fieldset>
          {error && (
            <p className="feedback" role="alert">
              {error}
            </p>
          )}
          <div className="agenda-actions">
            <button
              disabled={pending || noDoctor || (mode === "now" && !accepted)}
            >
              {pending
                ? mode === "now"
                  ? "Abrindo…"
                  : "Salvando…"
                : mode === "now"
                  ? "Iniciar teleconsulta"
                  : "Agendar teleconsulta"}
            </button>
          </div>
        </form>
        {created && (
          <div className="notice tele-hub-created" role="status">
            <p>
              Teleconsulta agendada com {created.name}. Envie o link ao
              paciente se ele ainda não usa o app.
            </p>
            <button
              type="button"
              className="secondary"
              onClick={() => void copy(created.url, "created")}
            >
              <Copy size={16} aria-hidden="true" />{" "}
              {copied === "created" ? "Link copiado" : "Copiar link"}
            </button>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="tele-next">
        <h2 id="tele-next">Próximas teleconsultas</h2>
        {listError && (
          <p className="feedback" role="alert">
            {listError}
          </p>
        )}
        {!appointments.length ? (
          <div className="empty">
            <h3>Nenhuma teleconsulta nos próximos 30 dias</h3>
            <p>As consultas por vídeo aparecem aqui quando forem criadas.</p>
          </div>
        ) : (
          <ul className="list tele-hub-list">
            {appointments.map((a) => (
              <li key={a.id}>
                <div className="tele-hub-item">
                  <div>
                    <strong>{a.patients?.display_name ?? "Consulta"}</strong>
                    <small>
                      {when(a.starts_at)} ·{" "}
                      {a.kind === "return" ? "Retorno" : "Consulta"} ·{" "}
                      {a.doctor_display_name}
                    </small>
                  </div>
                  <span
                    className={`badge appointment-status ${a.status === "in_progress" ? "in-progress" : "scheduled"}`}
                  >
                    {statusLabel[a.status] ?? a.status}
                  </span>
                </div>
                <div className="tele-hub-actions">
                  {a.teleconsultation?.join_url && (
                    <>
                      <a
                        className="button secondary"
                        href={a.teleconsultation.join_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-external-call
                      >
                        <Video size={16} aria-hidden="true" /> Abrir Meet
                      </a>
                      <button
                        type="button"
                        className="secondary quiet"
                        onClick={() =>
                          void copy(a.teleconsultation!.join_url!, a.id)
                        }
                      >
                        <Copy size={16} aria-hidden="true" />{" "}
                        {copied === a.id ? "Link copiado" : "Copiar link"}
                      </button>
                    </>
                  )}
                  {isDoctor && a.status === "in_progress" && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void openEncounter(a)}
                    >
                      Voltar ao atendimento
                    </button>
                  )}
                  {isDoctor && a.status === "scheduled" && opening !== a.id && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setOpening(a.id);
                        setOpenAccepted(false);
                        setListError("");
                      }}
                    >
                      Abrir atendimento
                    </button>
                  )}
                  {!isDoctor && (
                    <Link
                      href={`/clinicas/${tenantId}/agenda?data=${new Date(
                        a.starts_at,
                      ).toLocaleDateString("en-CA", {
                        timeZone: "America/Sao_Paulo",
                      })}`}
                    >
                      Ver na agenda
                    </Link>
                  )}
                </div>
                {opening === a.id && (
                  <div className="tele-hub-confirm">
                    <label className="care-accept">
                      <input
                        type="checkbox"
                        checked={openAccepted}
                        onChange={(e) => setOpenAccepted(e.target.checked)}
                      />
                      Confirmo que sou responsável por este atendimento.
                    </label>
                    <div className="agenda-actions">
                      <button
                        type="button"
                        disabled={pending || !openAccepted}
                        onClick={() => void openEncounter(a)}
                      >
                        {pending ? "Abrindo…" : "Confirmar e abrir"}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={pending}
                        onClick={() => setOpening(null)}
                      >
                        Voltar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
