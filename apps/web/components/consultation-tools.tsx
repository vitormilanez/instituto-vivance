"use client";

import { useId, useRef, useState } from "react";
import { X, Plus, FileText, ChevronDown } from "lucide-react";
import { CareRequestAction } from "./care-request-action";
import { PrescriptionsPanel } from "./prescriptions-panel";
import type { CareRequestKind } from "@/modules/workspace/patient-context-cards";

const requestLabels: Record<CareRequestKind, string> = { preparation: "Pré-consulta", exams: "Exames", measurements: "Medidas", goals: "Metas e expectativas" };

export function ConsultationRequests({ tenantId, patientId, requests }: { tenantId: string; patientId: string; requests: { kind: string; requested_at: string }[] }) {
  const [kind, setKind] = useState<CareRequestKind>("preparation");
  const id = useId();
  return <details className="brief-requests">
    <summary className="button secondary">Solicitar… <ChevronDown size={16} aria-hidden="true" /></summary>
    <div className="brief-request-form">
      <label className="field" htmlFor={id}>O que solicitar
        <select id={id} value={kind} onChange={(event) => setKind(event.target.value as CareRequestKind)}>
          {Object.entries(requestLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <CareRequestAction key={kind} tenantId={tenantId} patientId={patientId} kind={kind} requestedAt={requests.find((item) => item.kind === kind)?.requested_at ?? null} />
    </div>
  </details>;
}

export function ConsultationPrescriptions({ tenantId, patientId, total, available }: { tenantId: string; patientId: string; total: number | null; available: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);
  const heading = useId();
  return <>
    <div className="brief-fact brief-prescription-fact">
      <FileText size={18} aria-hidden="true" />
      <div><strong>Receitas</strong><span>{!available || total === null ? "Histórico indisponível agora" : total ? `${total} no histórico` : "Nenhuma adicionada"}</span></div>
      <button type="button" className="brief-text-action" onClick={() => { setOpened(true); dialog.current?.showModal(); }}><Plus size={16} aria-hidden="true" />{total === 0 && available ? "Adicionar" : "Abrir"}</button>
    </div>
    <dialog ref={dialog} className="brief-prescription-drawer" aria-labelledby={heading} onClose={() => setOpened(false)}>
      <header><h2 id={heading}>Receitas anteriores</h2><button className="secondary" type="button" aria-label="Fechar receitas" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button></header>
      {opened && <PrescriptionsPanel tenantId={tenantId} patientId={patientId} embedded continuous />}
    </dialog>
  </>;
}
