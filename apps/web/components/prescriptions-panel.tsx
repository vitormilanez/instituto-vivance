"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { uploadDocument } from "@/lib/document-upload";
import type {
  PrescriptionArchive,
  PrescriptionArchiveItem,
  PrescriptionCursor,
} from "@/modules/prescriptions/types";
import { prescriptionDraftInput } from "@/modules/prescriptions/validation";

const acceptedTypes = ["application/pdf", "image/jpeg"];
const maxFileBytes = 5 * 1024 * 1024;

function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(`${value}T12:00:00`),
  );
}

async function fetchArchive(
  tenantId: string,
  patientId: string,
  cursor: PrescriptionCursor | null = null,
) {
  const search = new URLSearchParams({ patient_id: patientId });
  if (cursor) {
    search.set("before_prescribed_on", cursor.prescribedOn);
    search.set("before_created_at", cursor.createdAt);
    search.set("before_id", cursor.id);
  }
  const response = await fetch(`/api/v1/clinics/${tenantId}/prescriptions?${search}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const body = (await response.json()) as PrescriptionArchive & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar o histórico.");
  return body;
}

function loadErrorMessage(reason: unknown) {
  return reason instanceof Error && reason.name !== "TimeoutError"
    ? reason.message
    : "Não foi possível carregar o histórico agora. Tente novamente.";
}

export function PrescriptionsPanel({
  tenantId,
  patientId,
  patientView = false,
  embedded = false,
}: {
  tenantId: string;
  patientId: string;
  patientView?: boolean;
  embedded?: boolean;
}) {
  return (
    <PrescriptionsPanelContent
      key={`${tenantId}/${patientId}`}
      tenantId={tenantId}
      patientId={patientId}
      patientView={patientView}
      embedded={embedded}
    />
  );
}

function PrescriptionsPanelContent({
  tenantId,
  patientId,
  patientView,
  embedded,
}: {
  tenantId: string;
  patientId: string;
  patientView: boolean;
  embedded: boolean;
}) {
  const headingId = useId();
  const titleId = useId();
  const dateId = useId();
  const sourceId = useId();
  const fileId = useId();
  const urlId = useId();
  const consentId = useId();
  const sectionId = useId();
  const [section, setSection] = useState<"history" | "send">("history");
  const sectionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [archive, setArchive] = useState<PrescriptionArchive | null>(null);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sourceType, setSourceType] = useState<"document" | "memed">("document");
  const request = useRef<{ fingerprint: string; key: string } | null>(null);
  const uploaded = useRef<{ fingerprint: string; documentId: string } | null>(null);
  const formDisabled = pending || archive?.available !== true;

  const load = useCallback(async () => {
    setArchive(null);
    setLoadError("");
    try {
      setArchive(await fetchArchive(tenantId, patientId));
    } catch (reason) {
      setLoadError(loadErrorMessage(reason));
    }
  }, [patientId, tenantId]);

  async function loadMore() {
    if (!archive?.available || !archive.nextCursor || loadingMore) return;
    setLoadingMore(true);
    setPageError("");
    try {
      const next = await fetchArchive(tenantId, patientId, archive.nextCursor);
      if (!next.available) {
        setPageError("Histórico de receitas ainda indisponível.");
        return;
      }
      setArchive({
        available: true,
        prescriptions: [
          ...archive.prescriptions,
          ...next.prescriptions.filter(
            (item) => !archive.prescriptions.some((current) => current.id === item.id),
          ),
        ],
        nextCursor: next.nextCursor,
      });
    } catch (reason) {
      setPageError(loadErrorMessage(reason));
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    let active = true;
    void fetchArchive(tenantId, patientId).then(
      (result) => {
        if (active) setArchive(result);
      },
      (reason) => {
        if (active) setLoadError(loadErrorMessage(reason));
      },
    );
    return () => {
      active = false;
    };
  }, [patientId, tenantId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (sourceType === "document") {
      if (!(file instanceof File) || !file.size) {
        setSubmitError("Escolha um PDF ou JPG da receita.");
        return;
      }
      if (!acceptedTypes.includes(file.type) || file.size > maxFileBytes) {
        setSubmitError("Use um arquivo PDF ou JPG de até 5 MB.");
        return;
      }
    }
    if (patientView && data.get("patient_consent") !== "on") {
      setSubmitError("Confirme o compartilhamento desta receita.");
      return;
    }
    setPending(true);
    setSubmitError("");
    setNotice("");
    try {
      const title = String(data.get("title") ?? "");
      const prescribedOn = String(data.get("prescribed_on") ?? "");
      const memedUrl = String(data.get("memed_url") ?? "");
      prescriptionDraftInput({
        title,
        prescribed_on: prescribedOn,
        source_type: sourceType,
        memed_url: sourceType === "memed" ? memedUrl : null,
      });
      const fileFingerprint =
        file instanceof File
          ? `${file.name}:${file.size}:${file.lastModified}`
          : "";
      const fingerprint = JSON.stringify({
        patientId,
        title,
        prescribedOn,
        sourceType,
        fileFingerprint,
        memedUrl,
      });
      if (!request.current || request.current.fingerprint !== fingerprint)
        request.current = { fingerprint, key: crypto.randomUUID() };
      let documentId: string | null = null;
      if (sourceType === "document" && file instanceof File) {
        documentId =
          uploaded.current?.fingerprint === fileFingerprint
            ? uploaded.current.documentId
            : null;
        if (!documentId) {
          const result = await uploadDocument({
            tenantId,
            patientId,
            file,
            category: "clinical_document",
            visibility: "shared",
          });
          documentId = result.documentId;
          uploaded.current = { fingerprint: fileFingerprint, documentId };
        }
      }
      const response = await fetch(`/api/v1/clinics/${tenantId}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(12_000),
        body: JSON.stringify({
          patient_id: patientId,
          request_key: request.current.key,
          title,
          prescribed_on: prescribedOn,
          source_type: sourceType,
          document_id: documentId,
          memed_url: sourceType === "memed" ? memedUrl : null,
          visibility: "shared",
          patient_consent: data.get("patient_consent") === "on",
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(body.error ?? "Não foi possível adicionar ao histórico.");
      form.reset();
      request.current = null;
      uploaded.current = null;
      setNotice("Receita anterior adicionada ao histórico.");
      await load();
      setSection("history");
      sectionRefs.current[0]?.focus();
    } catch (reason) {
      setSubmitError(
        reason instanceof Error && reason.name !== "TimeoutError"
          ? reason.message
          : "A conexão demorou. Confira o histórico antes de tentar novamente.",
      );
    } finally {
      setPending(false);
    }
  }

  function onSectionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
    setSection(next === 0 ? "history" : "send");
    sectionRefs.current[next]?.focus();
  }

  return (
    <section className={embedded ? "prescriptions-panel prescriptions-panel--embedded" : "card prescriptions-panel"} aria-labelledby={headingId}>
      <div className="section-heading">
        <div>
          {!embedded && <p className="eyebrow">Histórico clínico</p>}
          {embedded ? <h3 id={headingId}>Receitas</h3> : <h2 id={headingId}>Receitas anteriores</h2>}
          <p>A Vivance organiza este histórico; não emite nem valida receitas.</p>
        </div>
      </div>

      <div className="prescriptions-panel__tabs" role="tablist" aria-label="Receitas">
        {(["history", "send"] as const).map((tab, index) => (
          <button
            key={tab}
            ref={(node) => { sectionRefs.current[index] = node; }}
            id={`${sectionId}-tab-${tab}`}
            type="button"
            role="tab"
            aria-selected={section === tab}
            aria-controls={`${sectionId}-panel-${tab}`}
            tabIndex={section === tab ? 0 : -1}
            onClick={() => setSection(tab)}
            onKeyDown={(event) => onSectionKeyDown(event, index)}
          >
            {tab === "history" ? "Já enviadas" : "Enviar"}
          </button>
        ))}
      </div>

      <div id={`${sectionId}-panel-history`} className="prescriptions-panel__section" role="tabpanel" aria-labelledby={`${sectionId}-tab-history`} hidden={section !== "history"} tabIndex={0}>
        {notice && <p role="status">{notice}</p>}
        {loadError ? (
        <div role="alert">
          <p>{loadError}</p>
          <button type="button" className="secondary" onClick={() => void load()}>
            Tentar novamente
          </button>
        </div>
        ) : archive === null ? (
        <p role="status">Carregando histórico…</p>
        ) : !archive.available ? (
        <p role="status">Histórico de receitas ainda indisponível.</p>
        ) : archive.prescriptions.length ? (
        <div className="prescriptions-panel__history">
          <PrescriptionList tenantId={tenantId} items={archive.prescriptions} />
          {pageError && <p role="alert">{pageError}</p>}
          {archive.nextCursor && (
            <button
              type="button"
              className="secondary prescriptions-panel__load-more"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? "Carregando…" : "Carregar receitas anteriores"}
            </button>
          )}
        </div>
        ) : (
        <p>Nenhuma receita anterior foi adicionada.</p>
        )}
      </div>

      <div id={`${sectionId}-panel-send`} className="prescriptions-panel__section" role="tabpanel" aria-labelledby={`${sectionId}-tab-send`} hidden={section !== "send"} tabIndex={0}>
        <form className="document-upload-form prescriptions-panel__form" onSubmit={submit}>
        <h3>Enviar receita anterior</h3>
        <p className="prescriptions-panel__form-help">PDF, JPG ou link da Memed. A receita será compartilhada com a equipe de cuidado.</p>
        {submitError && <p role="alert">{submitError}</p>}
        <label className="field prescriptions-panel__title-field" htmlFor={titleId}>
          Título
          <input id={titleId} name="title" maxLength={160} required disabled={formDisabled} placeholder="Ex.: Receita da consulta de retorno" />
        </label>
        <label className="field prescriptions-panel__date-field" htmlFor={dateId}>
          Data da receita
          <input id={dateId} name="prescribed_on" type="date" max={localToday()} required disabled={formDisabled} />
        </label>
        <label className="field prescriptions-panel__source-field" htmlFor={sourceId}>
          Origem
          <select
            id={sourceId}
            value={sourceType}
            disabled={formDisabled}
            onChange={(event) => {
              setSourceType(event.target.value as "document" | "memed");
              setSubmitError("");
            }}
          >
            <option value="document">Arquivo PDF ou JPG</option>
            <option value="memed">Link da Memed</option>
          </select>
        </label>
        {sourceType === "document" ? (
          <>
            <label className="field prescriptions-panel__source-detail" htmlFor={fileId}>
              Arquivo da receita
              <input id={fileId} name="file" type="file" accept="application/pdf,image/jpeg" required disabled={formDisabled} />
            </label>
          </>
        ) : (
          <label className="field prescriptions-panel__source-detail" htmlFor={urlId}>
            Link HTTPS da Memed
            <input id={urlId} name="memed_url" type="url" inputMode="url" required disabled={formDisabled} placeholder="https://…memed.com.br/…" />
          </label>
        )}
        {patientView && (
          <label className="publication-confirm" htmlFor={consentId}>
            <input id={consentId} name="patient_consent" type="checkbox" required disabled={formDisabled} />
            Confirmo que escolhi esta receita para compartilhar com minha equipe de cuidado.
          </label>
        )}
        <button disabled={formDisabled}>
          {pending ? "Adicionando…" : "Adicionar receita anterior"}
        </button>
        </form>
      </div>
    </section>
  );
}

function PrescriptionList({
  tenantId,
  items,
}: {
  tenantId: string;
  items: PrescriptionArchiveItem[];
}) {
  return (
    <ul className="document-list prescriptions-panel__list">
      {items.map((item) => {
        const href =
          item.sourceType === "document" && item.documentId
            ? `/api/v1/clinics/${tenantId}/documents/${item.documentId}/download`
            : item.memedUrl;
        return (
          <li key={item.id} className="prescriptions-panel__item">
            <div className="prescriptions-panel__item-copy">
              <strong>{item.title}</strong>
              <p>
                {dateLabel(item.prescribedOn)} · {item.sourceType === "memed" ? "Memed" : "Arquivo"}
              </p>
            </div>
            {href && (
              <a href={href} target="_blank" rel="noopener noreferrer">
                Abrir
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
