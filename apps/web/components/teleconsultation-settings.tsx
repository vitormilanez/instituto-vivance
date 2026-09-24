"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { TeleconsultationLink } from "./teleconsultation-link";

type Configuration = {
  delivery_mode: "in_person" | "video";
  join_url: string | null;
  version: number;
};

export function TeleconsultationSettings({
  tenantId,
  appointmentId,
  patientName,
  editable,
  onClose,
  onSaved,
}: {
  tenantId: string;
  appointmentId: string;
  patientName: string;
  editable: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [current, setCurrent] = useState<Configuration | null>(null);
  const [mode, setMode] = useState<"in_person" | "video">("in_person");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const panel = useRef<HTMLElement>(null);
  const endpoint = `/api/v1/clinics/${tenantId}/appointments/${appointmentId}/teleconsultation`;
  useEffect(() => {
    panel.current?.focus();
    panel.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(endpoint, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error ?? "Não foi possível carregar a modalidade.",
          );
        const configuration: Configuration | null = result.teleconsultation;
        setCurrent(configuration);
        setMode(configuration?.delivery_mode ?? "in_person");
        setUrl(configuration?.join_url ?? "");
        setLoaded(true);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Falha ao carregar.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [endpoint, retry]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loaded || pending) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        signal: AbortSignal.timeout(20000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivery_mode: mode,
          join_url: mode === "video" ? url.trim() : null,
          version: current?.version ?? 0,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ?? "Não foi possível salvar a modalidade.",
        );
      setCurrent(result.teleconsultation);
      setNotice("Modalidade salva. O paciente pode consultar os dados no app.");
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível confirmar o salvamento. Confira a versão atual antes de tentar novamente.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section
      className="panel teleconsultation-settings"
      aria-label="Modalidade da consulta"
      tabIndex={-1}
      ref={panel}
    >
      <div className="section-heading">
        <div>
          <h2>Como será a consulta?</h2>
          <p>{patientName}</p>
        </div>
        <button
          className="secondary"
          type="button"
          onClick={onClose}
          disabled={pending}
        >
          Fechar
        </button>
      </div>
      {loading ? (
        <p role="status">Carregando modalidade…</p>
      ) : (
        loaded && (
          <form onSubmit={save}>
            <fieldset disabled={!editable || pending}>
              <legend className="sr-only">Modalidade</legend>
              <div className="teleconsultation-mode-options">
                <label>
                  <input
                    type="radio"
                    name="delivery-mode"
                    checked={mode === "in_person"}
                    onChange={() => setMode("in_person")}
                  />{" "}
                  Presencial
                </label>
                <label>
                  <input
                    type="radio"
                    name="delivery-mode"
                    checked={mode === "video"}
                    onChange={() => setMode("video")}
                  />{" "}
                  Teleconsulta · Google Meet
                </label>
              </div>
              {mode === "video" && (
                <label className="field">
                  Link da chamada
                  <input
                    type="url"
                    required
                    maxLength={100}
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://meet.google.com/abc-defg-hij"
                    aria-describedby="teleconsultation-link-help"
                  />
                  <small id="teleconsultation-link-help">
                    Cole o link de uma reunião criada no Google Meet. Use uma
                    reunião diferente para cada consulta.
                  </small>
                </label>
              )}
              {editable && (
                <button type="submit">
                  {pending ? "Salvando…" : "Salvar modalidade"}
                </button>
              )}
            </fieldset>
            {!editable && (
              <p>
                A modalidade só pode ser alterada antes de iniciar o
                atendimento.
              </p>
            )}
          </form>
        )
      )}
      {error && (
        <div className="feedback" role="alert">
          <p>{error}</p>
          <button
            className="secondary"
            type="button"
            disabled={pending}
            onClick={() => {
              setLoading(true);
              setLoaded(false);
              setError("");
              setRetry((value) => value + 1);
            }}
          >
            Recarregar configuração salva
          </button>
        </div>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {loaded && current?.delivery_mode === "video" && current.join_url && (
        <TeleconsultationLink url={current.join_url} patientName={patientName} />
      )}
    </section>
  );
}
