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
  const [addendumReason, setAddendumReason] = useState("");
  const [addendumContent, setAddendumContent] = useState("");
  const [pending, setPending] = useState(false),
    [confirming, setConfirming] = useState(false);
  const [addendumPending, setAddendumPending] = useState(false),
    [addendumConfirming, setAddendumConfirming] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [addendumError, setAddendumError] = useState(""),
    [addendumNotice, setAddendumNotice] = useState("");
  const busy = useRef(false);
  const addendumBusy = useRef(false);
  const {
    encounter: e,
    canEdit,
    canAddendum,
    versions,
    versionCursor,
    nextVersionCursor,
    addenda,
    addendumCursor,
    nextAddendumCursor,
  } = detail;
  const doctorName = e.doctor_display_name;
  function historyHref(
    beforeVersion: number | null,
    beforeAddendum: number | null,
  ) {
    const params = new URLSearchParams();
    if (beforeVersion !== null)
      params.set("versoes_antes_de", String(beforeVersion));
    if (beforeAddendum !== null)
      params.set("adendos_antes_de", String(beforeAddendum));
    const query = params.toString();
    return `/clinicas/${e.tenant_id}/atendimentos/${e.id}${query ? `?${query}` : ""}`;
  }
  const recordDirty = reason !== e.reason || evolution !== e.evolution;
  const addendumDirty =
    addendumReason.length > 0 || addendumContent.length > 0;
  const dirty = recordDirty || addendumDirty;
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
  async function saveAddendum() {
    if (addendumBusy.current) return;
    addendumBusy.current = true;
    setAddendumPending(true);
    setAddendumError("");
    setAddendumNotice("");
    try {
      const response = await fetch(
        `/api/v1/clinics/${e.tenant_id}/encounters/${e.id}/addenda`,
        {
          method: "POST",
          signal: AbortSignal.timeout(20000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            encounter_version: e.version,
            reason: addendumReason,
            content: addendumContent,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ?? "Não foi possível registrar o adendo.",
        );
      setDetail(result as EncounterDetail);
      setAddendumReason("");
      setAddendumContent("");
      setAddendumConfirming(false);
      setAddendumNotice(
        "Adendo registrado. O atendimento original permanece inalterado.",
      );
    } catch (error) {
      setAddendumConfirming(false);
      setAddendumError(
        error instanceof Error
          ? error.message
          : "Falha ao registrar. Seu texto permanece nesta tela.",
      );
    } finally {
      addendumBusy.current = false;
      setAddendumPending(false);
    }
  }
  return (
    <>
      <Link className="back-link" href={`/clinicas/${e.tenant_id}/atendimentos`}>
        Voltar aos atendimentos
      </Link>
      <header className="clinical-patient-header">
        <span className="patient-avatar patient-avatar-xl" aria-hidden="true">
          {(e.patients?.display_name ?? "Atendimento")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase()}
        </span>
        <div className="clinical-patient-title">
          <h1>{e.patients?.display_name ?? "Atendimento"}</h1>
          <p>
            {e.status === "finalized"
              ? "Atendimento finalizado"
              : "Registro do atendimento"}{" "}
            · Médico: {doctorName}
          </p>
          <p>Iniciado em {clinicalTime(e.created_at)} · Horário de Brasília</p>
        </div>
        <span
          className={`appointment-status ${
            e.status === "finalized" ? "completed" : "in-progress"
          }`}
        >
          {e.status === "finalized" ? "Concluído" : "Em atendimento"}
        </span>
      </header>
      <dl className="encounter-context-strip" aria-label="Contexto do atendimento">
        <div>
          <dt>Paciente</dt>
          <dd>{e.patients?.display_name ?? "Não identificado"}</dd>
        </div>
        <div>
          <dt>Profissional responsável</dt>
          <dd>{doctorName}</dd>
        </div>
        <div>
          <dt>Registro atual</dt>
          <dd>Versão {e.version}</dd>
        </div>
      </dl>
      {detail.clinic.role === "doctor" && (
        <p>
          <Link
            href={`/clinicas/${e.tenant_id}/planos/novo?paciente=${e.patient_id}&atendimento=${e.id}`}
          >
            Criar plano de cuidado para este paciente
          </Link>
        </p>
      )}
      <section className="panel encounter-record" aria-label="Registro clínico">
        <div className="section-heading encounter-record-heading">
          <div>
            <h2>
              {e.status === "finalized"
                ? "Registro finalizado"
                : "Registro da consulta"}
            </h2>
            <p>
              Uso interno da equipe autorizada. Finalizar não publica
              orientações para o paciente.
            </p>
          </div>
          <span className={`record-save-state ${recordDirty ? "unsaved" : ""}`} role="status" aria-live="polite">
            {pending
              ? "Salvando…"
              : recordDirty
                ? "Alterações não salvas"
                : `Versão ${e.version} · ${clinicalTime(e.updated_at)}`}
          </span>
        </div>
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
                  edição. Uma correção posterior deverá ser registrada como
                  adendo, sem alterar este conteúdo.
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
      {e.status === "finalized" && (
        <section
          className="panel encounter-addenda clinical-history-panel"
          aria-label="Adendos ao registro final"
        >
          <h2>Adendos ao registro final</h2>
          <p>
            Cada adendo identifica motivo, correção, autoria e horário. O
            registro final e os adendos anteriores não podem ser editados ou
            excluídos pela aplicação.
          </p>
          {addendumNotice && (
            <p className="notice" role="status">
              {addendumNotice}
            </p>
          )}
          {addendumError && (
            <p className="feedback" role="alert">
              {addendumError}
            </p>
          )}
          {addenda.length ? (
            <ul className="list addendum-list">
              {addenda.map((addendum) => (
                <li key={addendum.id}>
                  <h3>
                    Adendo {addendum.addendum_number} ·{" "}
                    {clinicalTime(addendum.created_at)}
                  </h3>
                  <p>
                    Autor: {doctorName}
                    {" · "}referente à versão {addendum.encounter_version}
                  </p>
                  <h4>Motivo do adendo</h4>
                  <p className="clinical-text">{addendum.reason}</p>
                  <h4>Correção ou complemento</h4>
                  <p className="clinical-text">{addendum.content}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhum adendo registrado.</p>
          )}
          {(nextAddendumCursor || addendumCursor) && (
            <div className="pagination">
              {nextAddendumCursor && (
                <Link
                  href={historyHref(versionCursor, nextAddendumCursor)}
                >
                  Ver adendos anteriores
                </Link>
              )}
              {addendumCursor && (
                <Link href={historyHref(versionCursor, null)}>
                  Voltar aos adendos mais recentes
                </Link>
              )}
            </div>
          )}
          {canAddendum && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setAddendumConfirming(true);
              }}
            >
              <h3>Registrar novo adendo</h3>
              <fieldset disabled={addendumPending || addendumConfirming}>
                <div className="field">
                  <label htmlFor="addendum-reason">Motivo do adendo</label>
                  <textarea
                    id="addendum-reason"
                    rows={3}
                    required
                    maxLength={1000}
                    value={addendumReason}
                    onChange={(event) => setAddendumReason(event.target.value)}
                    aria-describedby="addendum-reason-help"
                  />
                  <small id="addendum-reason-help">
                    Explique por que a correção é necessária. Até 1.000
                    caracteres.
                  </small>
                </div>
                <div className="field">
                  <label htmlFor="addendum-content">
                    Correção ou complemento
                  </label>
                  <textarea
                    id="addendum-content"
                    rows={7}
                    required
                    maxLength={10000}
                    value={addendumContent}
                    onChange={(event) => setAddendumContent(event.target.value)}
                    aria-describedby="addendum-content-help"
                  />
                  <small id="addendum-content-help">
                    Registre somente o que precisa ser acrescentado ou
                    corrigido. Até 10.000 caracteres.
                  </small>
                </div>
              </fieldset>
              <button
                disabled={
                  addendumPending ||
                  addendumConfirming ||
                  !addendumReason.trim() ||
                  !addendumContent.trim()
                }
              >
                Revisar adendo
              </button>
              {addendumConfirming && (
                <div
                  className="encounter-confirm"
                  role="region"
                  aria-label="Confirmar adendo"
                >
                  <h3>Registrar este adendo permanentemente?</h3>
                  <p>
                    Confira o motivo e a correção acima. Depois de registrado,
                    o adendo não poderá ser editado nem excluído pela aplicação.
                  </p>
                  <div className="agenda-actions">
                    <button
                      type="button"
                      disabled={addendumPending}
                      onClick={() => void saveAddendum()}
                    >
                      Confirmar adendo
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={addendumPending}
                      onClick={() => setAddendumConfirming(false)}
                    >
                      Continuar revisando
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </section>
      )}
      <section className="panel clinical-history-panel" aria-label="Histórico clínico">
        <h2>Histórico de versões</h2>
        <p>
          Cada salvamento preserva a versão anterior. Autoria e horário são
          registrados pelo sistema.
        </p>
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
                  Autor: {doctorName}
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
        {(nextVersionCursor || versionCursor) && (
          <div className="pagination">
            {nextVersionCursor && (
              <Link href={historyHref(nextVersionCursor, addendumCursor)}>
                Ver versões anteriores
              </Link>
            )}
            {versionCursor && (
              <Link href={historyHref(null, addendumCursor)}>
                Voltar às versões mais recentes
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
}
