"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import type { PlanDetail } from "@/modules/care-plans/service";
import { clinicalTime } from "./encounter-editor";
import { planFields } from "@/modules/care-plans/validation";
const labels: Record<string, string> = {
  published: "Publicada",
  superseded: "Substituída",
  withdrawn: "Retirada",
};
export function PlanPublication({
  detail,
  locked,
  onUpdated,
}: {
  detail: PlanDetail;
  locked: boolean;
  onUpdated: (next: PlanDetail) => void;
}) {
  const [confirm, setConfirm] = useState(false),
    [withdrawing, setWithdrawing] = useState(false),
    [reason, setReason] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const busy = useRef(false),
    p = detail.plan,
    current = detail.currentPublication;
  async function submit(withdraw: boolean) {
    if (busy.current || locked || !confirm) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/v1/clinics/${p.tenant_id}/plans/${p.id}/publication`,
        {
          method: withdraw ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify(
            withdraw
              ? { publication_id: current?.id, reason, confirmed: true }
              : {
                  version: p.version,
                  previous_publication: current?.id ?? null,
                  confirmed: true,
                },
          ),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Não foi possível concluir.");
      onUpdated(data as PlanDetail);
      setConfirm(false);
      setWithdrawing(false);
      setReason("");
      setNotice(
        withdraw
          ? "Publicação retirada. O histórico foi preservado."
          : "Plano publicado. Esta versão já está disponível ao paciente.",
      );
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "TimeoutError"
          ? e.message
          : "A conexão demorou. Atualize a página e confira a publicação antes de tentar novamente.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  const canPublish =
    detail.canEdit &&
    p.status === "approved" &&
    current?.source_version !== p.version;
  const base = `/clinicas/${p.tenant_id}/planos/${p.id}`;
  return (
    <section
      className="panel clinical-history-panel"
      aria-label="Publicação ao paciente"
    >
      <div className="section-heading">
        <div>
          <h2>O que o paciente vê</h2>
          <p>
            {current
              ? `Revisão ${current.revision} publicada em ${clinicalTime(current.published_at)}.`
              : "Este plano não tem publicação vigente no portal do paciente."}
          </p>
        </div>
      </div>
      {current && (
        <>
          <p>
            <strong>{current.title}</strong>
          </p>
          <p>
            {current.care_plan_receipts[0]
              ? `Paciente confirmou leitura em ${clinicalTime(current.care_plan_receipts[0].acknowledged_at)}.`
              : "Sem confirmação de leitura do paciente."}{" "}
            Ciência não comprova adesão ao cuidado.
          </p>
          {current.source_version !== p.version && (
            <p>
              Esta revisão continua vigente enquanto a nova revisão é preparada
              e aprovada.
            </p>
          )}
        </>
      )}
      {error && (
        <p role="alert">
          {error} <a href={base}>Atualizar publicação</a>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {locked && detail.canEdit && (
        <p>Salve ou conclua a edição antes de alterar a publicação.</p>
      )}
      {canPublish && !withdrawing && (
        <div className="plan-approval">
          <p>
            {current
              ? `Publicar a revisão ${p.revision} substituirá a revisão ${current.revision} neste plano.`
              : `Publicar a revisão ${p.revision} torna suas orientações visíveis ao paciente.`}{" "}
            A confirmação abaixo é separada da aprovação médica.
          </p>
          <label className="publication-confirm">
            <input
              type="checkbox"
              checked={confirm}
              disabled={pending || locked}
              onChange={(e) => setConfirm(e.target.checked)}
            />{" "}
            Confirmo a publicação desta revisão aprovada para{" "}
            {p.patients?.display_name ?? "o paciente"}.
          </label>
          <button
            disabled={!confirm || pending || locked}
            onClick={() => void submit(false)}
          >
            {pending ? "Publicando…" : `Publicar revisão ${p.revision}`}
          </button>
        </div>
      )}
      {detail.canEdit && current && !withdrawing && (
        <p>
          <button
            disabled={pending || locked}
            onClick={() => {
              setWithdrawing(true);
              setConfirm(false);
              setError("");
            }}
          >
            Retirar publicação
          </button>
        </p>
      )}
      {withdrawing && current && (
        <div className="plan-approval">
          <h3>Retirar revisão {current.revision} do portal</h3>
          <p>
            Estas orientações deixarão de aparecer para o paciente. Avise-o
            pelos canais habituais da clínica. O histórico interno será
            preservado.
          </p>
          <label className="field">
            Motivo da retirada · registro interno
            <textarea
              name="withdrawal_reason"
              rows={3}
              maxLength={1000}
              value={reason}
              disabled={pending || locked}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <label className="publication-confirm">
            <input
              type="checkbox"
              checked={confirm}
              disabled={pending || locked}
              onChange={(e) => setConfirm(e.target.checked)}
            />{" "}
            Confirmo a retirada desta publicação.
          </label>
          <div className="agenda-actions">
            <button
              disabled={pending || locked || !confirm || !reason.trim()}
              onClick={() => void submit(true)}
            >
              {pending ? "Retirando…" : "Confirmar retirada"}
            </button>
            <button
              disabled={pending}
              onClick={() => {
                setWithdrawing(false);
                setConfirm(false);
              }}
            >
              Manter publicação
            </button>
          </div>
        </div>
      )}
      {!!detail.publications.length && (
        <div className="plan-approval">
          <h3>Histórico de publicação</h3>
          {detail.publications.map((pub) => (
            <details className="plan-history" key={pub.id}>
              <summary>
                Revisão {pub.revision} · {labels[pub.status]} ·{" "}
                {clinicalTime(pub.published_at)}
              </summary>
              <p>
                Publicada por {pub.doctor_display_name}. Aprovação em{" "}
                {clinicalTime(pub.approved_at)}.
              </p>
              {pub.closed_at && (
                <p>
                  {labels[pub.status]} em {clinicalTime(pub.closed_at)}.
                </p>
              )}
              {pub.withdrawal_reason && (
                <p>Motivo interno: {pub.withdrawal_reason}</p>
              )}
              <p>
                {pub.care_plan_receipts[0]
                  ? `Leitura confirmada em ${clinicalTime(pub.care_plan_receipts[0].acknowledged_at)}.`
                  : "Sem confirmação de leitura."}
              </p>
              <div className="plan-summary">
                {planFields.map(([key, label]) => (
                  <section key={key}>
                    <h4>{label}</h4>
                    <p>{pub[key]}</p>
                  </section>
                ))}
                <p>
                  Revisão prevista:{" "}
                  {pub.review_on.split("-").reverse().join("/")}
                </p>
              </div>
            </details>
          ))}
          <nav className="agenda-actions" aria-label="Histórico de publicação">
            {detail.publicationPage > 1 && (
              <Link
                href={`${base}?publicacoes_pagina=${detail.publicationPage - 1}`}
              >
                Publicações mais recentes
              </Link>
            )}
            {detail.hasMorePublications && (
              <Link
                href={`${base}?publicacoes_pagina=${detail.publicationPage + 1}`}
              >
                Publicações mais antigas
              </Link>
            )}
          </nav>
        </div>
      )}
    </section>
  );
}
