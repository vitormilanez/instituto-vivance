"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { EncounterDetail } from "@/modules/encounters/service";
export function clinicalTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}
export function EncounterEditor({ initial }: { initial: EncounterDetail }) {
  const [detail, setDetail] = useState(initial);
  const [reason, setReason] = useState(initial.encounter.reason);
  const [evolution, setEvolution] = useState(initial.encounter.evolution);
  const [pending, setPending] = useState(false),
    [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const busy = useRef(false);
  const { encounter: e, canEdit, versions, historyTruncated } = detail;
  const dirty = reason !== e.reason || evolution !== e.evolution;
  // Sensitive drafts stay in memory, never localStorage. Warn on tab close and
  // same-app links; the explicit save button is the persistence boundary.
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const click = (event: MouseEvent) => {
      if (
        (event.target as Element)?.closest("a[href], [data-leave-clinic]") &&
        !window.confirm("Há alterações não salvas. Sair sem salvar?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
  async function save(status: "draft" | "finalized") {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/v1/clinics/${e.tenant_id}/encounters/${e.id}`,
        {
          method: "PATCH",
          signal: AbortSignal.timeout(20000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason,
            evolution,
            status,
            version: e.version,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ?? "Não foi possível salvar. Tente novamente.",
        );
      const next = result as EncounterDetail;
      setDetail(next);
      setReason(next.encounter.reason);
      setEvolution(next.encounter.evolution);
      setConfirming(false);
      setNotice(
        status === "finalized"
          ? "Atendimento finalizado. Registro disponível para leitura."
          : "Rascunho salvo. Você pode sair e continuar depois.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Falha ao salvar. Seu texto permanece nesta tela.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <>
      <Link href={`/clinicas/${e.tenant_id}/atendimentos`}>
        Voltar aos atendimentos
      </Link>
      <div className="page-heading">
        <div>
          <h1>{e.patients?.display_name ?? "Atendimento"}</h1>
          <p>
            {e.status === "finalized"
              ? "Atendimento finalizado"
              : "Registro do atendimento"}{" "}
            · Médico: {e.memberships?.display_name ?? "Médico responsável"}
          </p>
          <p>Iniciado em {clinicalTime(e.created_at)} · Horário de Brasília</p>
        </div>
      </div>
      <section className="panel encounter-record" aria-label="Registro clínico">
        <h2>
          {e.status === "finalized"
            ? "Registro finalizado"
            : "Rascunho clínico"}
        </h2>
        <p>
          Uso interno da equipe autorizada. Finalizar não publica orientações
          para o paciente.
        </p>
        <p role="status" aria-live="polite">
          {pending
            ? "Salvando…"
            : dirty
              ? "Alterações não salvas"
              : `Versão ${e.version} salva em ${clinicalTime(e.updated_at)}`}
        </p>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="feedback" role="alert">
            {error}
          </p>
        )}
        {canEdit ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save("draft");
            }}
          >
            <fieldset disabled={pending || confirming}>
              <div className="field">
                <label htmlFor="encounter-reason">Motivo da consulta</label>
                <textarea
                  id="encounter-reason"
                  rows={3}
                  maxLength={2000}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  aria-describedby="reason-limit"
                />
                <small id="reason-limit">Até 2.000 caracteres.</small>
              </div>
              <div className="field">
                <label htmlFor="encounter-evolution">
                  Evolução e registro da consulta
                </label>
                <textarea
                  id="encounter-evolution"
                  rows={10}
                  maxLength={10000}
                  value={evolution}
                  onChange={(event) => setEvolution(event.target.value)}
                  aria-describedby="evolution-help"
                />
                <small id="evolution-help">
                  Registre as informações avaliadas e suas decisões. Até 10.000
                  caracteres.
                </small>
              </div>
            </fieldset>
            <div className="agenda-actions">
              <button disabled={pending || confirming}>Salvar rascunho</button>
              <button
                type="button"
                className="secondary"
                disabled={
                  pending || confirming || !reason.trim() || !evolution.trim()
                }
                onClick={() => setConfirming(true)}
              >
                Revisar e finalizar
              </button>
            </div>
            {confirming && (
              <div
                className="encounter-confirm"
                role="region"
                aria-label="Confirmar finalização"
              >
                <h3>Finalizar este atendimento?</h3>
                <p>
                  Confira o texto acima. A versão final ficará bloqueada para
                  edição. Retificações serão implementadas em uma próxima etapa.
                </p>
                <div className="agenda-actions">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void save("finalized")}
                  >
                    Confirmar finalização
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={pending}
                    onClick={() => setConfirming(false)}
                  >
                    Continuar revisando
                  </button>
                </div>
              </div>
            )}
          </form>
        ) : (
          <>
            <h3>Motivo da consulta</h3>
            <p className="clinical-text">{e.reason || "Não registrado."}</p>
            <h3>Evolução e registro da consulta</h3>
            <p className="clinical-text">{e.evolution || "Não registrado."}</p>
            <p>
              {e.finalized_at
                ? `Finalizado pelo médico responsável em ${clinicalTime(e.finalized_at)}.`
                : "Somente o médico autor pode editar este rascunho."}
            </p>
          </>
        )}
      </section>
      <section className="panel" aria-label="Histórico clínico">
        <h2>Histórico de versões</h2>
        <p>
          Cada salvamento preserva a versão anterior. Autoria e horário são
          registrados pelo sistema.
        </p>
        {historyTruncated && <p>Exibindo as 100 versões mais recentes.</p>}
        <ul className="list">
          {versions.map((v) => (
            <li key={v.id}>
              <details>
                <summary>
                  Versão {v.version} ·{" "}
                  {v.status === "finalized" ? "Finalizado" : "Rascunho"} ·{" "}
                  {clinicalTime(v.created_at)}
                </summary>
                <p>
                  Autor: {e.memberships?.display_name ?? "Médico responsável"}
                </p>
                <h3>Motivo da consulta</h3>
                <p className="clinical-text">{v.reason || "Não registrado."}</p>
                <h3>Evolução</h3>
                <p className="clinical-text">
                  {v.evolution || "Não registrada."}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
