import type { PatientReceipt } from "@/modules/workspace/patient-receipts";

export function PatientReceiptView({ receipt, tenantId }: { receipt: PatientReceipt; tenantId: string }) {
  return <article className="pv-card pv-receipt">
    <h2 className="pv-h2">{receipt.sharedByTeam ? "Documento compartilhado pela equipe" : `${receipt.title} · seu registro`}</h2>
    <p className="pv-muted">{receipt.sharedByTeam ? "Disponibilizado" : "Enviado"} em <time dateTime={receipt.at}>{new Date(receipt.at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time></p>
    <p>{receipt.sharedByTeam ? "Documento disponibilizado pela equipe para você consultar." : "Registro preservado como foi enviado. O envio não confirma leitura ou revisão médica."}</p>
    {receipt.rows.length ? <dl>{receipt.rows.map((row, index) => <div key={`${row.label}-${index}`}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl> : <p>Nenhuma resposta preenchida neste envio.</p>}
    {receipt.documentId && <a className="pv-button is-outline" href={`/api/v1/clinics/${tenantId}/documents/${receipt.documentId}/download`} target="_blank" rel="noreferrer">Abrir arquivo original</a>}
  </article>;
}
