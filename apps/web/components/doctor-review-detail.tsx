import Link from "next/link";
import { FileText, UserRound } from "lucide-react";
import { requireClinic } from "@/modules/identity/service";
import type { ReceivedItem } from "@/modules/workspace/received-items";
import { receivedItemLabels } from "@/modules/workspace/received-items";
import { staffReturnPreparations } from "@/modules/return-preparation/service";
import { StaffReturnPreparationWorkspace } from "./return-preparation-workspace";
import { checkInSummary, type CheckInAnswers } from "@/modules/daily-check-ins/model";

// The caller resolves the selection from receivedForPatients, after the active
// relationship and per-patient cutoff checks. Queries retain tenant/patient/id
// filters and the session's RLS; no service-role client or clinical inference.
export async function DoctorReviewDetail({ tenantId, patientId, item }: {
  tenantId: string; patientId: string; item: ReceivedItem;
}) {
  const content = await loadContent(tenantId, patientId, item).catch(() => null);
  return <>
    <section className="dv-original">
      <header><h2><FileText size={19} aria-hidden="true" />{receivedItemLabels[item.kind]}</h2><span className="dv-source"><UserRound size={14} aria-hidden="true" />Original do paciente</span></header>
      <p className="dv-original-date">Enviado em {new Date(item.at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}</p>
      {content ?? <div className="notice" role="status">Não foi possível carregar este conteúdo. Tente novamente ou abra o registro original.</div>}
    </section>
    <div className="dv-review-detail-actions">
      <Link className="button secondary" href={item.href}>Abrir registro completo</Link>
      <Link className="button secondary" href={`/clinicas/${tenantId}/mensagens?paciente=${patientId}`}>Responder ao paciente</Link>
    </div>
  </>;
}

async function loadContent(tenantId: string, patientId: string, item: ReceivedItem) {
  if (item.kind === "preparation") {
    const initial = await staffReturnPreparations(tenantId, undefined, item.id);
    // Keep the existing review form, confirmation and version contract intact.
    initial.preparations = initial.preparations.filter((row) => row.patient_id === patientId);
    if (!initial.preparations.length) return null;
    return <StaffReturnPreparationWorkspace initial={initial} />;
  }
  const { client } = await requireClinic(tenantId, ["doctor"]);
  if (item.kind === "messages") {
    const { data, error } = await client.from("care_messages").select("content")
      .eq("tenant_id", tenantId).eq("patient_id", patientId).eq("id", item.id).maybeSingle();
    return error || !data ? null : <blockquote>{data.content}</blockquote>;
  }
  if (item.kind === "documents") {
    const { data, error } = await client.from("patient_documents").select("original_filename,content_type,byte_size")
      .eq("tenant_id", tenantId).eq("patient_id", patientId).eq("id", item.id).eq("status", "available").eq("attached_to", "documents").maybeSingle();
    return error || !data ? null : <div className="dv-document-original"><FileText size={40} strokeWidth={1.3} aria-hidden="true" /><div><h3>{data.original_filename}</h3><p>{data.content_type} · {Math.ceil(data.byte_size / 1024)} KB</p><a className="button secondary" href={`/api/v1/clinics/${tenantId}/documents/${item.id}/download`} target="_blank" rel="noreferrer">Abrir original</a></div></div>;
  }
  if (item.kind === "measurements") {
    const { data, error } = await client.from("patient_measurements").select("measure_label,measure_value,measure_unit,reported_on")
      .eq("tenant_id", tenantId).eq("patient_id", patientId).eq("id", item.id).maybeSingle();
    return error || !data ? null : <dl className="dv-original-facts"><div><dt>{data.measure_label}</dt><dd>{data.measure_value.toLocaleString("pt-BR")} {data.measure_unit}</dd></div><div><dt>Data informada</dt><dd>{data.reported_on.split("-").reverse().join("/")}</dd></div></dl>;
  }
  if (item.kind === "daily_checkins") {
    const { data, error } = await client.from("patient_daily_check_ins").select("*")
      .eq("tenant_id", tenantId).eq("patient_id", patientId).eq("id", item.id).maybeSingle();
    if (error || !data) return null;
    const answers = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== null)) as CheckInAnswers;
    return <dl className="dv-original-facts">{checkInSummary(answers).map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>;
  }
  const [request, submission, review] = await Promise.all([
    client.from("care_check_ins").select("prompt,status").eq("tenant_id", tenantId).eq("patient_id", patientId).eq("id", item.id).maybeSingle(),
    client.from("care_check_in_submissions").select("report,measure_label,measure_value,measure_unit").eq("tenant_id", tenantId).eq("patient_id", patientId).eq("check_in_id", item.id).maybeSingle(),
    client.from("care_check_in_reviews").select("note,reviewed_at").eq("tenant_id", tenantId).eq("patient_id", patientId).eq("check_in_id", item.id).maybeSingle(),
  ]);
  if (request.error || submission.error || review.error || !request.data || !submission.data) return null;
  return <><h3>{request.data.prompt}</h3><blockquote>{submission.data.report}</blockquote>{submission.data.measure_label && <p>{submission.data.measure_label}: {submission.data.measure_value} {submission.data.measure_unit}</p>}{review.data ? <div className="dv-review-note"><h3>Revisão interna registrada</h3><p>{review.data.note}</p></div> : <Link className="button" href={item.href}>Registrar revisão</Link>}</>;
}
