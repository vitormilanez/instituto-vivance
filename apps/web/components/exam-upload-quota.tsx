"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExamUploadQuotaState } from "@/modules/documents/quota-service";
import "./exam-flow.css";

export function ExamUploadQuota({ tenantId, patientId, canManage = false, documents = [], refreshKey = 0 }: {
  tenantId: string; patientId: string; canManage?: boolean;
  documents?: { id: string; original_filename: string }[]; refreshKey?: number;
}) {
  const router = useRouter();
  const [quota, setQuota] = useState<ExamUploadQuotaState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const grantKey = useRef<string | null>(null);
  const endpoint = `/api/v1/clinics/${tenantId}/patients/${patientId}/exam-quota`;
  const load = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store" });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error ?? "Não foi possível conferir a capacidade de envio.");
    setQuota(value);
  }, [endpoint]);
  useEffect(() => { void Promise.resolve().then(load).catch(reason => setError(reason instanceof Error ? reason.message : "Não foi possível conferir os envios.")); }, [load, refreshKey]);
  useEffect(() => { grantKey.current = null; }, [quota?.cycle_id]);

  async function perform(url: string, body: unknown, message: string) {
    if (busy.current) return;
    busy.current = true;
    setPending(true); setError(""); setNotice("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error ?? "Não foi possível concluir a ação.");
      await load(); setNotice(message); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível concluir a ação."); }
    finally { busy.current = false; setPending(false); }
  }

  return <section className="exam-upload-quota" aria-label="Capacidade de envio de exames">
    {quota && <>
      <p><strong>{quota.received} de 15 arquivos recebidos</strong> · {quota.remaining} vagas disponíveis{quota.reserved > 0 ? ` · ${quota.reserved} envios em andamento` : ""}</p>
      <p className="muted">Arquivos idênticos já recebidos não usam outra vaga. A capacidade também se aplica a documentos clínicos.</p>
      {!quota.eligible && <p>Originais recebidos. O processamento aguarda habilitação médica no ambiente de teste.</p>}
      {quota.request_pending && <p role="status">Solicitação de mais envios aguardando o médico.</p>}
      {!canManage && quota.remaining === 0 && <button type="button" disabled={pending || quota.request_pending} onClick={() => void perform(endpoint, { action: "request" }, "Solicitação registrada para o médico.")}>{quota.request_pending ? "Solicitação registrada" : "Solicitar mais envios"}</button>}
      {canManage && <details>
        <summary>Gerenciar recebimento e processamento</summary>
        {documents.length > 0 && <form onSubmit={event => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const ids = data.getAll("document_id");
          if (!ids.length || ids.length > 15) { setError("Selecione de 1 a 15 arquivos para processar."); return; }
          void perform(`/api/v1/clinics/${tenantId}/patients/${patientId}/exam-authorization`, { document_ids: ids, confirmed_synthetic: data.get("synthetic") === "on" }, "Exames de teste habilitados e encaminhados à fila. Novos envios elegíveis deste ciclo entram automaticamente.");
        }}>
          <fieldset disabled={pending}>
            <legend>Selecionar originais para processamento (até 15)</legend>
            {documents.map(document => <label className="publication-confirm" key={document.id}><input type="checkbox" name="document_id" value={document.id} />{document.original_filename}</label>)}
            <label className="publication-confirm"><input type="checkbox" name="synthetic" required />Confirmo que este paciente e estes documentos são de teste.</label>
            <button>Habilitar e processar selecionados</button>
          </fieldset>
        </form>}
        <form onSubmit={event => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          grantKey.current ??= crypto.randomUUID();
          void perform(endpoint, { action: "grant", cycle_id: quota.cycle_id, reason: data.get("reason"), confirmed: data.get("confirmed") === "on", idempotency_key: grantKey.current }, "Novo ciclo de 15 envios liberado.");
        }}>
          <fieldset disabled={pending}>
            <legend>Liberar novo ciclo de 15 arquivos</legend>
            <p>O ciclo atual será fechado. Confira as pendências; o motivo registra por que novos arquivos são necessários.</p>
            <label className="field">Motivo<textarea name="reason" required minLength={3} maxLength={1000} /></label>
            <label className="publication-confirm"><input name="confirmed" type="checkbox" required />Confirmo o fechamento do ciclo atual e a liberação de mais 15 envios.</label>
            <button>Liberar mais 15 envios</button>
          </fieldset>
        </form>
      </details>}
    </>}
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
