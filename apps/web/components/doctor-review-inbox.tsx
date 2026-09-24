"use client";
import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, ClipboardList, FileText, MessageCircle, Ruler, Search } from "lucide-react";
import { doctorReviewGroups, type DoctorReviewPatient, type DoctorReviewStatus } from "@/modules/workspace/doctor-review";
import { receivedItemLabels, type ReceivedItemKind } from "@/modules/workspace/received-items";

const icons = { preparation: ClipboardList, documents: FileText, messages: MessageCircle, checkins: Activity, daily_checkins: Activity, measurements: Ruler };
const filters = [
  { key: "all", label: "Tudo" }, { key: "preparation", label: "Pré-consultas" },
  { key: "documents", label: "Exames" }, { key: "daily_checkins", label: "Check-ins diários" },
  { key: "checkins", label: "Respostas" }, { key: "messages", label: "Mensagens" }, { key: "measurements", label: "Medidas" },
] as const;
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
const arrival = (at: string) => new Date(at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export function DoctorReviewInbox({ tenantId, patients, failed, selectedKey = null, children }: {
  tenantId: string; patients: DoctorReviewPatient[]; failed: ReceivedItemKind[];
  selectedKey?: string | null; children?: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [requestedKey, setRequestedKey] = useState<string | null>(selectedKey);
  const [kind, setKind] = useState<ReceivedItemKind | "all">("all");
  const [status, setStatus] = useState<DoctorReviewStatus>("all");
  const [search, setSearch] = useState("");
  const [mobileDetail, setMobileDetail] = useState(false);
  const groups = doctorReviewGroups(patients, { kind, status, search });
  const total = groups.reduce((count, patient) => count + patient.items.length, 0);
  const activeKey = pending ? requestedKey : selectedKey;
  const selectedPatient = groups.find((patient) => patient.items.some((item) => `${item.kind}:${item.id}` === activeKey));
  const selected = selectedPatient?.items.find((item) => `${item.kind}:${item.id}` === activeKey);
  const base = `/clinicas/${tenantId}`;
  function select(itemKey: string) {
    setRequestedKey(itemKey);
    setMobileDetail(true);
    const item = patients.flatMap((patient) => patient.items).find((entry) => `${entry.kind}:${entry.id}` === itemKey);
    startTransition(async () => {
      if (item?.seen === false) {
        await fetch(`/api/v1/clinics/${tenantId}/received/read`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: item.kind, item_id: item.id }),
        }).catch(() => undefined);
      }
      router.replace(`${base}/revisar?${new URLSearchParams({ item: itemKey })}`, { scroll: false });
    });
  }
  function reset() { setKind("all"); setStatus("all"); setSearch(""); }
  return <div className={`dv-inbox${mobileDetail && selectedPatient ? " is-detail-open" : ""}`}>
    <section className="dv-inbox-list" aria-label="Envios dos pacientes">
      <header className="dv-inbox-filters">
        <h1>{total} {total === 1 ? "envio para conferir" : "envios para conferir"}{failed.length ? " · parcial" : ""}</h1>
        <p>Por paciente, do mais antigo para o mais recente.</p>
        <div className="dv-inbox-kinds" role="group" aria-label="Tipo de envio">{filters.map((filter) => <button key={filter.key} type="button" aria-pressed={kind === filter.key} onClick={() => { setKind(filter.key); setMobileDetail(false); }}>{filter.label}</button>)}</div>
        <div className="dv-inbox-search"><Search size={16} aria-hidden="true" /><label className="sr-only" htmlFor="review-search">Buscar paciente na revisão</label><input id="review-search" type="search" placeholder="Buscar paciente" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={80} /><label className="sr-only" htmlFor="review-state">Abertura do registro</label><select id="review-state" value={status} onChange={(event) => setStatus(event.target.value as DoctorReviewStatus)}><option value="all">Todos</option><option value="unopened">Não abertos</option><option value="opened">Já abertos</option></select></div>
      </header>
      {failed.length > 0 && <div className="notice" role="status">Indisponível: {failed.map((item) => receivedItemLabels[item]).join(", ")}. <a href={`${base}/revisar`}>Tentar novamente</a></div>}
      <div className="dv-inbox-results">{groups.map((patient) => <section className="dv-inbox-group" key={patient.patientId} aria-labelledby={`review-${patient.patientId}`}>
        <h2 id={`review-${patient.patientId}`}><span className="dv-avatar" aria-hidden="true">{initials(patient.name)}</span>{patient.name}<small>{patient.items.length} {patient.items.length === 1 ? "envio" : "envios"}</small></h2>
        <ul>{patient.items.map((item) => { const key = `${item.kind}:${item.id}`; const Icon = icons[item.kind]; return <li key={key}><button type="button" className="dv-inbox-item" aria-current={key === selectedKey ? "true" : undefined} onClick={() => select(key)}><Icon size={18} aria-hidden="true" /><span><strong>{receivedItemLabels[item.kind]}</strong><small>{item.seen === true ? "Já aberto" : item.seen === false ? "Ainda não aberto" : "Abertura não confirmada"}</small></span><time dateTime={item.at}>{arrival(item.at)}</time></button></li>; })}</ul>
      </section>)}
      {!groups.length && <div className="dv-inbox-empty"><h2>Nenhum envio nesta seleção</h2><p>{patients.some((p) => p.items.length) ? "Experimente outro nome ou filtro." : "Os envios dos seus pacientes aparecerão aqui."}</p>{(kind !== "all" || status !== "all" || search) && <button className="secondary" type="button" onClick={reset}>Limpar filtros</button>}</div>}</div>
      <p className="dv-inbox-footnote">Abrir um registro não o marca como revisado.</p>
    </section>
    <section className="dv-inbox-detail" aria-label="Conteúdo do envio" aria-busy={pending}>
      {selectedPatient && selected ? <>
        <button className="dv-inbox-back secondary" type="button" onClick={() => setMobileDetail(false)}><ArrowLeft size={16} aria-hidden="true" />Voltar aos envios</button>
        <header className="dv-inbox-person"><span className="dv-avatar" aria-hidden="true">{initials(selectedPatient.name)}</span><div><h2>{selectedPatient.name}</h2><p>{receivedItemLabels[selected.kind]} · {arrival(selected.at)}</p></div><Link className="button secondary" href={`${base}/pacientes/${selectedPatient.patientId}`}>Abrir ficha</Link></header>
        {pending ? <p className="dv-detail-loading" role="status">Carregando o registro…</p> : children}
      </> : <div className="dv-inbox-empty"><ClipboardList size={32} strokeWidth={1.4} aria-hidden="true" /><h2>Selecione um envio</h2><p>Leia o conteúdo original sem perder a lista de pacientes.</p></div>}
    </section>
  </div>;
}
