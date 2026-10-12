"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { uploadDocument } from "@/lib/document-upload";
import Link from "next/link";
import { Icon } from "./icons";
import { sendOrQueue } from "./outbox";
import { Camera, ImagePlus } from "lucide-react";
import { MomentArtwork } from "./moment-choices";
import { MealKinds } from "./meal-kinds";

const acceptedPhotoTypes = ["image/jpeg", "image/png"];
const maxPhotoBytes = 5 * 1024 * 1024;

// O tipo mais provável pela hora: a pessoa quase sempre registra na hora.
export function mealKindForHour(hour: number) {
  if (hour >= 5 && hour < 10) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 18 && hour < 23) return "dinner";
  return "snack";
}

const localDateTime = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const clock = (value: string) => value.slice(11, 16);

// Registrar refeição: tipo por toque, "agora" já preenchido e a foto como ação
// principal. Nada de calorias nem avaliação — é o relato da pessoa.
export function PatientMealQuick({
  tenantId,
  patientId,
  base,
  nowLocal,
}: {
  tenantId: string;
  patientId: string;
  base: string;
  // "AAAA-MM-DDTHH:MM" no horário de Brasília, calculado no servidor.
  nowLocal: string;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const request = useRef<{ key: string; fingerprint: string } | null>(null);
  const uploaded = useRef<{ fingerprint: string; documentId: string } | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<string>(() => mealKindForHour(Number(nowLocal.slice(11, 13))));
  const [eatenAt, setEatenAt] = useState(nowLocal);
  const [timeChanged, setTimeChanged] = useState(false);
  const [editTime, setEditTime] = useState(false);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [pending, setPending] = useState<"" | "photo" | "meal">("");
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function clearPhoto() {
    setFile(null);
    setPreview("");
    uploaded.current = null;
    if (cameraInput.current) cameraInput.current.value = "";
    if (galleryInput.current) galleryInput.current.value = "";
  }

  function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    const chosen = event.target.files?.[0] ?? null;
    if (!chosen) return;
    if (!acceptedPhotoTypes.includes(chosen.type)) {
      setError("Use uma foto JPG ou PNG.");
      return;
    }
    if (chosen.size > maxPhotoBytes) {
      setError("A foto precisa ter até 5 MB.");
      return;
    }
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
    uploaded.current = null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (!description.trim() && !file) {
      setError("Tire uma foto do prato ou conte em poucas palavras o que comeu.");
      return;
    }
    if (!eatenAt || Number.isNaN(new Date(eatenAt).getTime())) {
      setError("Confira a data e o horário da refeição.");
      setEditTime(true);
      return;
    }
    busy.current = true;
    setError("");
    const payload = {
      meal_type: kind,
      eaten_at: new Date(eatenAt || localDateTime(new Date())).toISOString(),
      description: description.trim() ? description : null,
    };
    const photoFingerprint = file ? `${file.name}:${file.size}:${file.lastModified}` : "";
    const fingerprint = JSON.stringify({ ...payload, photo: photoFingerprint });
    if (!request.current || request.current.fingerprint !== fingerprint)
      request.current = { key: crypto.randomUUID(), fingerprint };
    try {
      let documentId: string | null = null;
      if (file) {
        documentId =
          uploaded.current?.fingerprint === photoFingerprint ? uploaded.current.documentId : null;
        if (!documentId) {
          setPending("photo");
          try {
            const sent = await uploadDocument({
              tenantId,
              patientId,
              file,
              category: "clinical_document",
              purpose: "meal_log",
              visibility: "shared",
            });
            documentId = sent.documentId;
            uploaded.current = { fingerprint: photoFingerprint, documentId };
          } catch {
            setError(
              typeof navigator !== "undefined" && navigator.onLine === false
                ? "Sem internet, a foto não pode ser enviada agora. Salve sem foto ou tente quando a conexão voltar."
                : "A foto não foi enviada. Tente de novo ou salve sem foto.",
            );
            return;
          }
        }
      }
      setPending("meal");
      const sent = await sendOrQueue(
        `/api/v1/clinics/${tenantId}/meals`,
        { request_key: request.current.key, photo_document_id: documentId, ...payload },
        "Refeição",
      );
      if (sent.queued) {
        request.current = null;
        setQueued(true);
        return;
      }
      const result = await sent.response.json();
      if (!sent.response.ok) throw new Error(result.error ?? "Não foi possível registrar a refeição.");
      router.push(`${base}/hoje?enviado=refeicao`);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error && reason.name !== "TimeoutError"
          ? reason.message
          : "A conexão demorou. Confira no Diário se já foi registrada antes de enviar de novo.",
      );
    } finally {
      busy.current = false;
      setPending("");
    }
  }

  const disabled = pending !== "";

  if (queued)
    return (
      <div className="pv-stack pv-done" role="status">
        <span className="pv-done-icon" aria-hidden="true"><Icon name="wifiOff" size={32} /></span>
        <h2 className="pv-big">Salvo no seu celular</h2>
        <p className="pv-lead">Sem internet agora. Enviamos sozinhos assim que a conexão voltar — não precisa fazer nada.</p>
        <p className="pv-sent-when"><Icon name="wifiOff" size={16} /> Aguardando conexão</p>
        <Link className="pv-button" href={`${base}/hoje`}>Voltar para o início<Icon name="arrow" /></Link>
      </div>
    );

  return (
    <form className="pv-stack moment-meal" onSubmit={submit} noValidate aria-busy={disabled}>
      <div className="moment-meal-heading">
        <div><h2>O que teve na sua refeição?</h2><p>Uma foto, uma descrição ou os dois.</p></div>
        <MomentArtwork name="meal" />
      </div>
      {error && <p className="pv-form-error" role="alert">{error}</p>}
      <fieldset className="pv-fieldset">
        <legend className="pv-eyebrow">Qual refeição?</legend>
        <MealKinds value={kind} onChange={setKind} disabled={disabled} />
      </fieldset>

      <div className="pv-inline">
        <span className="pv-muted">
          {editTime || !eatenAt ? "Quando" : timeChanged ? `${eatenAt.slice(0, 10).split("-").reverse().join("/")}, ${clock(eatenAt)}` : `Hoje, ${clock(eatenAt)}`}
        </span>
        {editTime ? (
          <label className="pv-field pv-grow">
            <span className="pv-visually-hidden">Data e horário</span>
            <input type="datetime-local" value={eatenAt} onChange={(event) => { setEatenAt(event.target.value); setTimeChanged(true); }} disabled={disabled} />
          </label>
        ) : (
          <button type="button" className="pv-link" onClick={() => setEditTime(true)} disabled={disabled}>
            Alterar
          </button>
        )}
      </div>

      <label className="pv-field">
        {file ? "Quer acrescentar algo?" : "O que você comeu?"}
        <textarea name="description" aria-label={file ? "Quer acrescentar algo?" : "O que você comeu?"} maxLength={2000} rows={3} placeholder="Ex.: arroz, feijão, frango e salada."
          value={description} onChange={(event) => setDescription(event.target.value)} disabled={disabled} aria-describedby="meal-quick-text-hint" />
        <small id="meal-quick-text-hint">{file ? "Opcional: a foto já é suficiente." : "Pode escrever ou adicionar uma foto abaixo."}</small>
      </label>

      {preview ? (
        <div className="pv-photo-preview">
          {/* eslint-disable-next-line @next/next/no-img-element -- prévia local do arquivo escolhido */}
          <img src={preview} alt="Foto do prato escolhida" />
          <span>
            <strong>Foto adicionada</strong>
          </span>
          <div className="pv-inline">
            <button type="button" className="pv-link" onClick={() => galleryInput.current?.click()} disabled={disabled}>Trocar foto</button>
            <button type="button" className="pv-link" onClick={clearPhoto} disabled={disabled}>Remover foto</button>
          </div>
        </div>
      ) : (
        <div className="moment-photo-actions">
          <button type="button" onClick={() => cameraInput.current?.click()} disabled={disabled}><Camera size={22} aria-hidden="true" />Tirar foto</button>
          <button type="button" onClick={() => galleryInput.current?.click()} disabled={disabled}><ImagePlus size={22} aria-hidden="true" />Da galeria</button>
        </div>
      )}
      <input ref={cameraInput} hidden type="file" accept="image/jpeg,image/png" capture="environment" onChange={pickPhoto} disabled={disabled} aria-label="Tirar foto do prato" />
      <input ref={galleryInput} hidden type="file" accept="image/jpeg,image/png" onChange={pickPhoto} disabled={disabled} aria-label="Escolher foto da galeria" />
      <p className="pv-muted">JPG ou PNG, até 5 MB. Compartilhada com sua equipe de cuidado.</p>

      <button className="pv-button is-center" disabled={disabled}>
        {pending === "photo" ? "Enviando a foto…" : pending === "meal" ? "Salvando…" : "Salvar refeição"}
      </button>
      <p className="pv-muted">É o seu relato: não calcula calorias nem avalia a alimentação.</p>
    </form>
  );
}
