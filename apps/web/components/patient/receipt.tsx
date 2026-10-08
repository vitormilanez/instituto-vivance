import type { PatientReceipt } from "@/modules/workspace/patient-receipts";

function receiptDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function PatientReceiptView({ receipt, tenantId }: { receipt: PatientReceipt; tenantId: string }) {
  return <article className="pv-card pv-receipt">
    <h2 className="pv-h2">{receipt.sharedByTeam ? "Documento compartilhado pela equipe" : `${receipt.title} · seu registro`}</h2>
    <p className="pv-muted">{receipt.sharedByTeam ? "Disponibilizado" : "Enviado"} em <time dateTime={receipt.at}>{receiptDateTime(receipt.at)}</time></p>
    <p>{receipt.sharedByTeam ? "Documento disponibilizado pela equipe para você consultar." : "Registro preservado como foi enviado. O envio não confirma leitura ou revisão médica."}</p>
    {receipt.documentId && !receipt.sharedByTeam && <p className="pv-muted" role="status">
      {receipt.requestAt ? `Resposta ao pedido de ${new Date(receipt.requestAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}. ` : ""}
      {receipt.reviewStatus === "review_recorded" ? "Revisão registrada pela equipe. Isso não equivale a uma nova orientação médica." :
        receipt.reviewStatus === "received" ? "Arquivo disponível para revisão da equipe." :
          "Não foi possível conferir o estado da revisão agora. Seu arquivo continua disponível aqui."}
    </p>}
    {receipt.rows.length ? <dl>{receipt.rows.map((row, index) => <div key={`${row.label}-${index}`}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl> : <p>Nenhuma resposta preenchida neste envio.</p>}
    {receipt.documentId && <a className="pv-button is-outline" href={`/api/v1/clinics/${tenantId}/documents/${receipt.documentId}/download`} target="_blank" rel="noreferrer">Abrir arquivo original</a>}
  </article>;
}
