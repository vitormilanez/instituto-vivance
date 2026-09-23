"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import type { PatientMeals } from "@/modules/meals/service";
import { mealTypeLabels } from "@/modules/meals/validation";
import { uploadDocument } from "@/lib/document-upload";
import { clinicalTime } from "./encounter-editor";

const choices = Object.entries(mealTypeLabels);
const acceptedPhotoTypes = ["image/jpeg", "image/png"];
const maxPhotoBytes = 5 * 1024 * 1024;
const currentLocalDateTime = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export function PatientMealLogs({ initial }: { initial: PatientMeals }) {
  const router = useRouter();
  const busy = useRef(false);
  const request = useRef<{ key: string; fingerprint: string } | null>(null);
  // A photo already uploaded during this page visit: a failed meal registration
  // is retried without asking for the file again.
  const uploaded = useRef<{ fingerprint: string; documentId: string } | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [pending, setPending] = useState<"" | "photo" | "meal">("");
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [success, setSuccess] = useState("");

  // O objeto de URL da prévia é revogado quando a prévia muda ou a tela sai.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function clearPhoto() {
    setFile(null);
    setPreview("");
    uploaded.current = null;
    if (photoInput.current) photoInput.current.value = "";
  }

  function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    setPhotoError("");
    setSuccess("");
    const chosen = event.target.files?.[0] ?? null;
    if (!chosen) {
      clearPhoto();
      return;
    }
    if (!acceptedPhotoTypes.includes(chosen.type)) {
      setPhotoError("Use uma foto JPG ou PNG.");
      clearPhoto();
      return;
    }
    if (chosen.size > maxPhotoBytes) {
      setPhotoError("A foto precisa ter até 5 MB.");
      clearPhoto();
      return;
    }
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
    uploaded.current = null;
  }

  async function send(
    formElement: HTMLFormElement,
    options: { withoutPhoto?: boolean } = {},
  ) {
    if (busy.current) return;
    busy.current = true;
    setError("");
    setPhotoError("");
    setSuccess("");
    const form = new FormData(formElement);
    const localDateTime = form.get("eaten_at");
    const payload = {
      meal_type: form.get("meal_type"),
      eaten_at:
        typeof localDateTime === "string"
          ? new Date(localDateTime).toISOString()
          : localDateTime,
      description: form.get("description"),
    };
    const chosen = options.withoutPhoto ? null : file;
    // The key follows the selected file, not the upload result, so retrying the
    // same content keeps the same request_key.
    const photoFingerprint = chosen
      ? `${chosen.name}:${chosen.size}:${chosen.lastModified}`
      : "";
    const fingerprint = JSON.stringify({ ...payload, photo: photoFingerprint });
    if (!request.current || request.current.fingerprint !== fingerprint)
      request.current = { key: crypto.randomUUID(), fingerprint };
    try {
      let documentId: string | null = null;
      if (chosen) {
        documentId =
          uploaded.current?.fingerprint === photoFingerprint
            ? uploaded.current.documentId
            : null;
        if (!documentId) {
          setPending("photo");
          try {
            const sent = await uploadDocument({
              tenantId: initial.clinic.id,
              patientId: initial.patientId ?? "",
              file: chosen,
              category: "clinical_document",
              visibility: "shared",
            });
            documentId = sent.documentId;
            uploaded.current = { fingerprint: photoFingerprint, documentId };
          } catch (reason) {
            setPhotoError(
              reason instanceof Error && reason.name !== "TimeoutError"
                ? "A foto não foi enviada. Seu texto continua aqui."
                : "A foto demorou demais para ser enviada. Seu texto continua aqui.",
            );
            return;
          }
        }
      }
      setPending("meal");
      const response = await fetch(`/api/v1/clinics/${initial.clinic.id}/meals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({
          request_key: request.current.key,
          photo_document_id: documentId,
          ...payload,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Não foi possível registrar a refeição.");
      formElement.reset();
      request.current = null;
      clearPhoto();
      setSuccess("Refeição registrada no seu diário.");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível registrar a refeição.",
      );
    } finally {
      busy.current = false;
      setPending("");
    }
  }

  return (
    <section id="registrar-refeicao" className="meal-log-workspace" aria-labelledby="meal-log-title">
      <article className="panel meal-log-entry">
        <div className="section-heading">
          <div>
            <h2 id="meal-log-title">Registrar refeição</h2>
            <p>Registre o que comeu para que a equipe tenha contexto na próxima conversa.</p>
          </div>
        </div>
        <form
          aria-busy={pending !== ""}
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void send(event.currentTarget);
          }}
        >
          <div className="meal-log-fields">
            <label className="field">
              Tipo de refeição
              <select name="meal_type" defaultValue="lunch" disabled={pending !== ""}>
                {choices.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Data e horário
              <input
                name="eaten_at"
                type="datetime-local"
                required
                disabled={pending !== ""}
                defaultValue={currentLocalDateTime()}
              />
            </label>
          </div>
          <label className="field">
            O que você comeu?
            <textarea
              name="description"
              rows={4}
              required
              maxLength={2000}
              disabled={pending !== ""}
              aria-describedby="meal-log-note"
              placeholder="Ex.: arroz, frango, salada e água."
            />
          </label>
          <div className="meal-log-photo-field">
            <label className="field" htmlFor="meal-photo">
              Foto da refeição (opcional)
              <input
                id="meal-photo"
                ref={photoInput}
                name="photo"
                type="file"
                accept="image/jpeg,image/png"
                disabled={pending !== ""}
                onChange={pickPhoto}
                aria-describedby={`meal-log-photo-hint${photoError ? " meal-log-photo-error" : ""}`}
              />
            </label>
            <p className="module-footnote" id="meal-log-photo-hint">
              JPG ou PNG de até 5 MB. A imagem fica guardada com o seu relato e é vista
              por você e pela equipe com vínculo ativo.
            </p>
            {preview && (
              <div className="meal-log-photo">
                {/* Prévia local: nada é enviado antes de registrar. */}
                {/* eslint-disable-next-line @next/next/no-img-element -- blob local da prévia, não passa pelo otimizador */}
                <img src={preview} alt="Prévia da foto escolhida" />
                <div className="meal-log-photo-actions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={pending !== ""}
                    onClick={() => photoInput.current?.click()}
                  >
                    Trocar foto
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={pending !== ""}
                    onClick={() => {
                      clearPhoto();
                      setPhotoError("");
                    }}
                  >
                    Remover foto
                  </button>
                </div>
              </div>
            )}
            {photoError && (
              <p className="feedback" id="meal-log-photo-error" role="alert">
                {photoError}
              </p>
            )}
            {photoError && (
              <div className="meal-log-photo-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={pending !== ""}
                  onClick={() => photoInput.current?.click()}
                >
                  Tentar foto novamente
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={pending !== ""}
                  onClick={(event) => {
                    const formElement = event.currentTarget.closest("form");
                    if (!formElement) return;
                    clearPhoto();
                    setPhotoError("");
                    void send(formElement, { withoutPhoto: true });
                  }}
                >
                  Salvar sem foto
                </button>
              </div>
            )}
          </div>
          <p className="module-footnote" id="meal-log-note">
            Este é um relato seu. Não calcula calorias, não avalia sua alimentação e não
            altera orientações médicas.
          </p>
          {pending === "photo" && (
            <p className="meal-log-progress" role="status">
              Enviando a foto…
            </p>
          )}
          {pending === "meal" && (
            <p className="meal-log-progress" role="status">
              Registrando a refeição…
            </p>
          )}
          {error && (
            <p className="feedback" id="meal-log-error" role="alert">
              {error}
            </p>
          )}
          {error && preview && !photoError && (
            <p className="module-footnote">
              A foto já foi enviada. Tentar de novo não envia outra.
            </p>
          )}
          {success && (
            <p className="meal-log-success" role="status">
              {success}
            </p>
          )}
          <button disabled={pending !== ""}>
            {pending === "photo"
              ? "Enviando foto…"
              : pending === "meal"
                ? "Registrando…"
                : error
                  ? "Tentar novamente"
                  : "Registrar refeição"}
          </button>
        </form>
      </article>
      <section className="meal-log-history" aria-labelledby="meal-history-title">
        <div className="section-heading">
          <div>
            <h2 id="meal-history-title">Registros recentes</h2>
            <p>Seus últimos 20 relatos, preservados como foram enviados.</p>
          </div>
        </div>
        {initial.meals.length ? (
          initial.meals.map((meal) => (
            <article className="panel meal-log-item" key={meal.id}>
              <div>
                <strong>
                  {mealTypeLabels[meal.meal_type as keyof typeof mealTypeLabels] ?? "Refeição"}
                </strong>
                <span>{clinicalTime(meal.eaten_at)}</span>
              </div>
              <p>{meal.description}</p>
              {meal.photo_document_id && (
                <a
                  className="meal-log-photo"
                  href={`/api/v1/clinics/${initial.clinic.id}/documents/${meal.photo_document_id}/download`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- rota protegida com redirecionamento; o otimizador não tem a sessão */}
                  <img
                    src={`/api/v1/clinics/${initial.clinic.id}/documents/${meal.photo_document_id}/download`}
                    alt="Foto enviada com este relato"
                    loading="lazy"
                  />
                  <span className="quiet-label">Abrir foto em tamanho maior</span>
                </a>
              )}
            </article>
          ))
        ) : (
          <section className="panel empty">
            <h3>Seu primeiro registro começa aqui</h3>
            <p>Quando quiser, conte uma refeição do seu dia.</p>
          </section>
        )}
      </section>
    </section>
  );
}
