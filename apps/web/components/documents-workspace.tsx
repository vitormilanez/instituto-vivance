"use client";

import Link from "next/link";
import { useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { maxDocumentBytes } from "@/modules/documents/validation";
import { uploadDocument } from "@/lib/document-upload";
import { uploadPatientDocumentBatch } from "@/modules/documents/batch";
import {
  examFileLabel,
  examSelectionConsented,
  examSelectionReady,
  examSelectionReducer,
  examStateLabel,
  initialExamSelection,
  type ExamSelectionItem,
} from "@/modules/onboarding/exam-selection";
import type {
  PatientDocuments,
  StaffDocuments,
} from "@/modules/documents/service";
import { clinicalTime } from "./encounter-editor";

type DocumentItem =
  | StaffDocuments["documents"][number]
  | PatientDocuments["documents"][number];

const categoryLabels: Record<string, string> = {
  exam: "Exame",
  clinical_document: "Documento clínico",
};
const visibilityLabels: Record<string, string> = {
  internal: "Uso interno da equipe",
  shared: "Compartilhado com o paciente",
};
const reviewLabels: Record<string, string> = {
  approved: "Conferido",
  rejected: "Não utilizável",
  needs_follow_up: "Precisa de acompanhamento",
};

export function byteLimit() {
  return `${maxDocumentBytes / (1024 * 1024)} MB`;
}

export function DocumentUploadForm({
  tenant,
  patients,
  ownPatientId,
  category,
}: {
  tenant: string;
  patients?: StaffDocuments["patients"];
  ownPatientId?: string | null;
  // Quando o envio acontece dentro de um contexto que já define o tipo do
  // arquivo (a foto de uma refeição, por exemplo), o seletor sai da tela e
  // o valor vem daqui. Sem ela, o formulário segue como sempre foi.
  category?: "exam" | "clinical_document";
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const patientUpload = Boolean(ownPatientId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || !file.size) {
      setError("Escolha um arquivo para enviar.");
      return;
    }
    if (file.size > maxDocumentBytes) {
      setError(`Escolha um arquivo de até ${byteLimit()}.`);
      return;
    }
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      await uploadDocument({
        tenantId: tenant,
        patientId: String(ownPatientId ?? data.get("patient_id") ?? ""),
        file,
        // A categoria fixa vem do contexto (a foto de uma refeição, por
        // exemplo); sem ela, vale a escolha do formulário.
        category: category ?? String(data.get("category") ?? ""),
        visibility: patientUpload
          ? "shared"
          : String(data.get("visibility") ?? ""),
      });
      form.reset();
      setNotice("Documento enviado e disponibilizado para as pessoas autorizadas.");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error && reason.name !== "TimeoutError"
          ? reason.message
          : "A conexão demorou. Atualize a página antes de tentar novamente.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  if (!patientUpload && !patients?.length)
    return <p>Nenhum paciente com vínculo ativo está disponível para envio.</p>;
  if (ownPatientId) return <PatientMultiDocumentUpload tenant={tenant} patientId={ownPatientId} category={category} />;

  return (
    <form className="document-upload-form" onSubmit={submit}>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!patientUpload && (
        <label className="field">
          Paciente
          <select name="patient_id" required disabled={pending}>
            {patients?.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.display_name}
              </option>
            ))}
          </select>
        </label>
      )}
      {!category && (
        <label className="field">
          Tipo de documento
          <select name="category" defaultValue="exam" disabled={pending}>
            <option value="exam">Exame</option>
            <option value="clinical_document">Documento clínico</option>
          </select>
        </label>
      )}
      {!patientUpload && (
        <label className="field">
          Visibilidade
          <select name="visibility" defaultValue="internal" disabled={pending}>
            <option value="internal">Uso interno da equipe</option>
            <option value="shared">Compartilhar com o paciente</option>
          </select>
        </label>
      )}
      <label className="field">
        Arquivo
        <input
          name="file"
          type="file"
          required
          accept="application/pdf,image/jpeg,image/png"
          disabled={pending}
        />
      </label>
      {patientUpload && (
        <label className="publication-confirm">
          <input name="confirmed" type="checkbox" required disabled={pending} />
          Confirmo que selecionei este arquivo para compartilhar com a equipe.
        </label>
      )}
      <button disabled={pending}>
        {pending ? "Enviando e conferindo…" : "Enviar documento"}
      </button>
    </form>
  );
}

function PatientMultiDocumentUpload({ tenant, patientId, category }: {
  tenant: string;
  patientId: string;
  category?: "exam" | "clinical_document";
}) {
  const router = useRouter();
  const [selection, dispatch] = useReducer(examSelectionReducer, undefined, () => initialExamSelection());
  const [chosenCategory, setChosenCategory] = useState<"exam" | "clinical_document">(category ?? "exam");
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState("");
  const ready = examSelectionReady(selection);
  const consented = examSelectionConsented(selection);
  const failedCount = selection.items.filter((item) => item.state === "failed").length;
  const sentCount = selection.items.filter((item) => item.state === "sent").length;

  async function send(items: ExamSelectionItem[]) {
    if (busy.current || !items.length) return;
    busy.current = true;
    setSending(true);
    setError("");
    try {
      for (const item of items) dispatch({ type: "sending", key: item.key });
      const sent = await uploadPatientDocumentBatch({ tenantId: tenant, patientId, category: chosenCategory, files: items },
        ({ key, documentId, error: reason }) => {
          if (documentId) {
            dispatch({ type: "uploaded", key, documentId });
            dispatch({ type: "sent", key });
          } else {
            const message = reason instanceof Error && reason.name !== "TimeoutError"
              ? reason.message
              : "Não foi possível confirmar este envio. Confira Meus documentos antes de tentar novamente.";
            dispatch({ type: "failed", key, error: message });
          }
        });
      if (sent) router.refresh();
    } finally {
      busy.current = false;
      setSending(false);
    }
  }

  return <form className="document-upload-form" onSubmit={(event) => {
    event.preventDefault();
    if (!ready.length) { setError("Escolha ao menos um arquivo para enviar."); return; }
    if (!consented) { setError("Confirme os arquivos que deseja compartilhar."); return; }
    void send(ready);
  }}>
    {!category && <label className="field">Tipo para todos os arquivos
      <select value={chosenCategory} onChange={(event) => setChosenCategory(event.target.value as "exam" | "clinical_document")} disabled={sending}>
        <option value="exam">Exame</option>
        <option value="clinical_document">Documento clínico</option>
      </select>
    </label>}
    <label className="field">Arquivos
      <input type="file" multiple accept="application/pdf,image/jpeg,image/png" disabled={sending}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) dispatch({ type: "add", files });
        }} />
    </label>
    <p>Selecione vários PDF, JPG ou PNG de até {byteLimit()} cada.</p>
    <p role="status">{failedCount
      ? `${failedCount} arquivo${failedCount === 1 ? "" : "s"} precisa${failedCount === 1 ? "" : "m"} de atenção`
      : ready.length
        ? `${ready.length} arquivo${ready.length === 1 ? "" : "s"} selecionado${ready.length === 1 ? "" : "s"}`
        : sentCount
          ? `${sentCount} arquivo${sentCount === 1 ? "" : "s"} enviado${sentCount === 1 ? "" : "s"}`
          : "Nenhum arquivo selecionado"}</p>
    {selection.rejected.length > 0 && <div role="alert">
      <p>Estes arquivos não foram adicionados:</p>
      <ul>{selection.rejected.map((item, index) => <li key={`${item.name}-${index}`}>{item.name}: {item.reason}</li>)}</ul>
      <button type="button" className="secondary" onClick={() => dispatch({ type: "dismissRejections" })}>Entendi</button>
    </div>}
    {selection.items.length > 0 && <ul className="exam-selection">
      {selection.items.map((item) => <li key={item.key} data-state={item.state}>
        <div className="exam-file"><strong>{item.file.name}</strong><span>{examFileLabel(item)}</span></div>
        <span className="exam-file-state">{examStateLabel(item.state)}</span>
        {item.error && <p className="exam-file-error" role="alert">{item.error}</p>}
        {(item.state === "ready" || item.state === "failed") && <div className="exam-file-actions">
          {item.state === "failed" && <button type="button" className="secondary" disabled={sending}
            onClick={() => void send([item])}>Reenviar este arquivo</button>}
          <button type="button" className="secondary" disabled={sending}
            onClick={() => dispatch({ type: "remove", key: item.key })}>Remover</button>
        </div>}
      </li>)}
    </ul>}
    <label className="publication-confirm">
      <input type="checkbox" checked={consented} disabled={sending || !ready.length}
        onChange={(event) => dispatch({ type: "consent", consented: event.target.checked })} />
      Confirmo que selecionei {ready.length} arquivo{ready.length === 1 ? "" : "s"} para compartilhar com a equipe.
    </label>
    {error && <p role="alert">{error}</p>}
    <button type="submit" disabled={sending || !ready.length || !consented}>
      {sending ? "Enviando arquivos…" : ready.length ? `Enviar ${ready.length} arquivo${ready.length === 1 ? "" : "s"}` : "Enviar arquivos"}
    </button>
  </form>;
}

function DocumentList({
  documents,
  tenant,
  showPatient,
  reviews = [],
  canReview = false,
}: {
  documents: DocumentItem[];
  tenant: string;
  showPatient: boolean;
  reviews?: StaffDocuments["reviews"];
  canReview?: boolean;
}) {
  if (!documents.length)
    return (
      <section className="panel empty">
        <h2>Nenhum documento disponível</h2>
        <p>Os arquivos autorizados aparecerão aqui depois do envio e da conferência.</p>
      </section>
    );
  return (
    <div className="document-list" aria-label="Documentos disponíveis">
      {documents.map((document) => {
        const staffDocument = document as StaffDocuments["documents"][number];
        const documentReviews = reviews.filter(
          (review) => review.document_id === document.id,
        );
        return (
          <article className="document-row" key={document.id}>
            <div className="document-summary">
              <h3>{document.original_filename}</h3>
              <p>
                {categoryLabels[document.category] ?? "Documento"}
                {showPatient && staffDocument.patients
                  ? ` · ${staffDocument.patients.display_name}`
                  : ""}
              </p>
              <small>
                Disponibilizado em {clinicalTime(document.available_at ?? document.created_at)}
                {showPatient && document.visibility
                  ? ` · ${visibilityLabels[document.visibility] ?? document.visibility}`
                  : ""}
              </small>
              {canReview && (
                <span className="document-review-status">
                  {documentReviews.length
                    ? `${reviewLabels[documentReviews[0].decision] ?? "Revisado"} · ${documentReviews.length} ${documentReviews.length === 1 ? "revisão" : "revisões"}`
                    : "Aguardando revisão médica"}
                </span>
              )}
            </div>
            <div className="document-actions">
              <a
                className="button secondary"
                href={`/api/v1/clinics/${tenant}/documents/${document.id}/download`}
              >
                Abrir original
              </a>
            </div>
            {canReview && (
              <DocumentReviewPanel
                tenant={tenant}
                documentId={document.id}
                reviews={documentReviews}
              />
            )}
          </article>
        );
      })}
    </div>
  );
}

function DocumentReviewPanel({
  tenant,
  documentId,
  reviews,
}: {
  tenant: string;
  documentId: string;
  reviews: StaffDocuments["reviews"];
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/v1/clinics/${tenant}/documents/${documentId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(20_000),
          body: JSON.stringify({
            decision: data.get("decision"),
            internal_note: data.get("internal_note"),
            confirmed: data.get("confirmed") === "on",
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Não foi possível registrar a revisão.");
      form.reset();
      setNotice("Revisão registrada no histórico interno.");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error && reason.name !== "TimeoutError"
          ? reason.message
          : "A conexão demorou. Sua nota continua no formulário; tente novamente.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <details className="document-review-panel">
      <summary>{reviews.length ? "Ver histórico e revisar" : "Registrar revisão"}</summary>
      {reviews.length > 0 && (
        <ol className="document-review-history" aria-label="Histórico de revisões">
          {reviews.map((review) => (
            <li key={review.id}>
              <strong>{reviewLabels[review.decision] ?? review.decision}</strong>
              <span>
                {review.memberships?.display_name?.trim() || "Médico responsável"} ·{" "}
                {clinicalTime(review.reviewed_at)}
              </span>
              <p>{review.internal_note}</p>
            </li>
          ))}
        </ol>
      )}
      <form className="document-review-form" onSubmit={submit}>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        <label className="field">
          Resultado da revisão
          <select name="decision" defaultValue="approved" disabled={pending}>
            <option value="approved">Conferido</option>
            <option value="needs_follow_up">Precisa de acompanhamento</option>
            <option value="rejected">Arquivo não utilizável</option>
          </select>
        </label>
        <label className="field">
          Nota interna
          <textarea
            name="internal_note"
            required
            minLength={1}
            maxLength={2000}
            disabled={pending}
            placeholder="Registre o que foi conferido e o próximo passo necessário."
          />
        </label>
        <label className="publication-confirm">
          <input name="confirmed" type="checkbox" required disabled={pending} />
          Confirmo que revisei o arquivo original. Esta nota ficará somente para
          médicos autorizados.
        </label>
        <button disabled={pending}>
          {pending ? "Registrando…" : "Registrar no histórico"}
        </button>
      </form>
    </details>
  );
}

export function StaffPatientDocumentsPanel({
  initial,
  base,
}: {
  initial: StaffDocuments;
  base: string;
}) {
  const pageHref = (page: number) => `${base}&pagina=${page}`;
  return (
    <section className="document-board" aria-labelledby="patient-documents-title">
      <div className="section-heading">
        <div>
          <h2 id="patient-documents-title">Documentos privados</h2>
          <p>Arquivos disponíveis para este paciente e seu vínculo de cuidado.</p>
        </div>
        <span className="quiet-label">{initial.documents.length} nesta página</span>
      </div>
      <DocumentList
        documents={initial.documents}
        tenant={initial.clinic.id}
        showPatient={false}
        reviews={initial.reviews}
        canReview={initial.canReview}
      />
      <nav className="agenda-actions" aria-label="Páginas de documentos deste paciente">
        {initial.page > 1 && <Link href={pageHref(initial.page - 1)}>Anterior</Link>}
        {initial.hasNext && <Link href={pageHref(initial.page + 1)}>Próxima</Link>}
      </nav>
      <p className="module-footnote">
        Disponível não significa revisado pela equipe. O arquivo não é
        interpretado ou altera o plano de cuidado automaticamente.
      </p>
    </section>
  );
}

export function StaffDocumentsWorkspace({ initial }: { initial: StaffDocuments }) {
  const base = `/clinicas/${initial.clinic.id}/documentos`;
  const filter = initial.patient ? `&paciente=${initial.patient}` : "";
  return (
    <>
      <details className="panel document-upload-panel">
        <summary>Adicionar documento</summary>
        <p>
          Aceita PDF, JPG e PNG de até {byteLimit()}. O arquivo fica privado e
          só aparece após a conferência de formato e tamanho.
        </p>
        <DocumentUploadForm tenant={initial.clinic.id} patients={initial.patients} />
      </details>
      {initial.patients.length > 1 ? (
        <form className="document-filter" method="get" action={base}>
          <label htmlFor="document-patient">Paciente</label>
          <select id="document-patient" name="paciente" defaultValue={initial.patient ?? ""}>
            <option value="">Todos os pacientes</option>
            {initial.patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.display_name}
              </option>
            ))}
          </select>
          <button type="submit" className="secondary">
            Filtrar
          </button>
        </form>
      ) : null}
      <section className="document-board">
        <div className="section-heading">
          <div>
            <h2>Documentos disponíveis</h2>
            <p>Somente arquivos dos pacientes sob sua responsabilidade ativa.</p>
          </div>
          <span className="quiet-label">{initial.documents.length} nesta página</span>
        </div>
        <DocumentList
          documents={initial.documents}
          tenant={initial.clinic.id}
          showPatient
          reviews={initial.reviews}
          canReview={initial.canReview}
        />
      </section>
      <nav className="agenda-actions" aria-label="Páginas de documentos">
        {initial.page > 1 && <Link href={`${base}?pagina=${initial.page - 1}${filter}`}>Anterior</Link>}
        {initial.hasNext && <Link href={`${base}?pagina=${initial.page + 1}${filter}`}>Próxima</Link>}
      </nav>
      <p className="module-footnote">
        Este espaço não é um canal de urgência. O arquivo não é interpretado,
        resumido nem altera o plano de cuidado automaticamente.
      </p>
    </>
  );
}

export function PatientDocumentsWorkspace({ initial }: { initial: PatientDocuments }) {
  const base = `/clinicas/${initial.clinic.id}/meu-cuidado/documentos`;
  return (
    <>
      {initial.patientId ? (
        // Para o paciente, enviar é a ação principal desta página: o
        // formulário já vem aberto, sem um clique a mais.
        <details className="panel document-upload-panel" id="enviar-documento" open>
          <summary>Enviar exame, foto ou documento para a equipe</summary>
          <p>
            Aceita PDF, JPG e PNG de até {byteLimit()} cada. Os arquivos ficam privados,
            disponíveis para o médico responsável revisar e não alteram suas
            orientações automaticamente.
          </p>
          <DocumentUploadForm tenant={initial.clinic.id} ownPatientId={initial.patientId} />
        </details>
      ) : (
        <p className="notice">
          A equipe ainda precisa vincular sua conta à ficha antes que você possa
          enviar documentos.
        </p>
      )}
      <section className="document-board">
        <div className="section-heading">
          <div>
            <h2>Meus documentos</h2>
            <p>Arquivos compartilhados entre você e a equipe autorizada.</p>
          </div>
        </div>
        <DocumentList documents={initial.documents} tenant={initial.clinic.id} showPatient={false} />
      </section>
      <nav className="agenda-actions" aria-label="Páginas de documentos">
        {initial.page > 1 && <Link href={`${base}?pagina=${initial.page - 1}`}>Anterior</Link>}
        {initial.hasNext && <Link href={`${base}?pagina=${initial.page + 1}`}>Próxima</Link>}
      </nav>
      <p className="module-footnote">
        O envio de documentos não substitui contato com a clínica em caso de
        urgência.
      </p>
    </>
  );
}
