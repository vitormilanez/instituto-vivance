"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { maxDocumentBytes } from "@/modules/documents/validation";
import { DocumentUploadError, uploadDocument } from "@/lib/document-upload";

export type OnboardingDraft = {
  tenantId: string;
  patientId: string;
  status: "draft" | "submitted";
  currentStep: "profile" | "measurements" | "questions" | "exams" | "review";
  skippedSteps: string[];
  version: number;
  profile: { photoDocumentId: string | null; birthDate: string | null };
  measurements: {
    weightKg: number | null;
    heightCm: number | null;
    waistCm: number | null;
    measuredOn: string | null;
  };
  answers: {
    goal: string;
    history: string;
    routine: string;
    treatments: string;
    questions: string;
  };
  examDocumentIds: string[];
  shareConsent: boolean;
  submittedAt: string | null;
  updatedAt: string;
};

type Step = "welcome" | OnboardingDraft["currentStep"];
const questionFields = [
  [
    "goal",
    "O que trouxe você à Vivance e o que gostaria de melhorar?",
    "Conte do seu jeito; você pode deixar para conversar na consulta.",
  ],
  [
    "history",
    "Há quanto tempo isso acontece e o que mudou recentemente?",
    "Um ponto de partida simples já ajuda a equipe a ouvir você melhor.",
  ],
  [
    "routine",
    "Como estão seu sono, alimentação, movimento e disposição? O que mais pesa no seu dia a dia?",
    "Fale só do que fizer sentido para você hoje.",
  ],
  [
    "treatments",
    "O que já tentou e quais tratamentos, medicamentos ou suplementos usa hoje?",
    "Liste apenas o que lembrar. O médico revisará isso com você.",
  ],
  [
    "questions",
    "Quais dúvidas ou preocupações você quer conversar com o médico nesta consulta?",
    "Suas perguntas ajudam a preparar a conversa.",
  ],
] as const;

function dateValue(value: string | null) {
  return value ?? "";
}
function numberValue(value: number | null) {
  return value ?? "";
}
function hasProgress(draft: OnboardingDraft) {
  return (
    draft.version > 1 ||
    draft.currentStep !== "profile" ||
    draft.skippedSteps.length > 0 ||
    Boolean(
      draft.profile.photoDocumentId ||
      draft.profile.birthDate ||
      draft.measurements.weightKg ||
      draft.measurements.heightCm ||
      draft.measurements.waistCm ||
      draft.measurements.measuredOn ||
      draft.examDocumentIds.length ||
      Object.values(draft.answers).some(Boolean),
    )
  );
}

export function OnboardingWorkspace({
  tenantId,
  clinicName,
  doctorName,
  initial,
}: {
  tenantId: string;
  clinicName: string;
  doctorName: string;
  initial: OnboardingDraft;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState<Step>(
    hasProgress(initial) ? initial.currentStep : "welcome",
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [photoConsent, setPhotoConsent] = useState(false);
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const draftRef = useRef(draft);
  const changed = useRef(false);
  const revision = useRef(0);

  function update(next: Partial<OnboardingDraft>) {
    const merged = { ...draftRef.current, ...next };
    changed.current = true;
    revision.current += 1;
    draftRef.current = merged;
    setDraft(merged);
    setSaveState("idle");
    setMessage("");
  }
  function payload(next: OnboardingDraft) {
    return {
      version: next.version,
      currentStep: next.currentStep,
      skippedSteps: next.skippedSteps,
      profile: next.profile,
      measurements: next.measurements,
      answers: next.answers,
      examDocumentIds: next.examDocumentIds,
      shareConsent: next.shareConsent,
    };
  }
  const persist = useCallback(async () => {
    if (!changed.current) return true;
    setSaveState("saving");
    const request = async (): Promise<boolean> => {
      const snapshot = draftRef.current;
      const snapshotRevision = revision.current;
      const response = await fetch(`/api/v1/clinics/${tenantId}/onboarding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(snapshot)),
      });
      const body = (await response.json()) as {
        onboarding?: OnboardingDraft;
        error?: string;
      };
      if (!response.ok) {
        if (response.status === 409)
          throw new Error(
            "Este cadastro foi alterado em outra sessão. Atualize a página para continuar sem substituir alterações.",
          );
        throw new Error(body.error ?? "Não foi possível salvar agora.");
      }
      if (!body.onboarding)
        throw new Error("Não recebemos a confirmação do salvamento.");
      if (snapshotRevision === revision.current) {
        changed.current = false;
        draftRef.current = body.onboarding;
        setDraft(body.onboarding);
      } else {
        const merged = {
          ...draftRef.current,
          version: body.onboarding.version,
          updatedAt: body.onboarding.updatedAt,
        };
        draftRef.current = merged;
        setDraft(merged);
      }
      setSaveState("saved");
      return true;
    };
    queue.current = queue.current
      .then(request, request)
      .catch((error: unknown) => {
        setSaveState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível salvar agora.",
        );
        return false;
      });
    return queue.current;
  }, [tenantId]);
  useEffect(() => {
    if (!changed.current || saveState === "saving" || saveState === "error")
      return;
    const timeout = window.setTimeout(() => void persist(), 700);
    return () => window.clearTimeout(timeout);
  }, [draft, persist, saveState]);

  async function move(next: Step, skipped?: string) {
    const nextDraft = {
      ...draftRef.current,
      currentStep: next === "welcome" ? "profile" : next,
      skippedSteps:
        skipped && !draftRef.current.skippedSteps.includes(skipped)
          ? [...draftRef.current.skippedSteps, skipped]
          : draftRef.current.skippedSteps,
    };
    update({
      currentStep: nextDraft.currentStep,
      skippedSteps: nextDraft.skippedSteps,
    });
    const saved = await persist();
    if (saved) setStep(next);
  }
  async function uploadPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png"].includes(file.type) ||
      file.size > maxDocumentBytes
    ) {
      setMessage("Escolha uma foto JPG ou PNG de até 5 MB.");
      setSaveState("error");
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const { documentId } = await uploadDocument({
        tenantId,
        patientId: draftRef.current.patientId,
        file,
        category: "clinical_document",
        visibility: "internal",
      }).catch((reason) => {
        throw reason instanceof DocumentUploadError
          ? new Error(
              reason.stage === "upload"
                ? "A foto não foi recebida. Tente novamente."
                : (reason.serverMessage ??
                  (reason.stage === "prepare"
                    ? "Não foi possível preparar a foto."
                    : "Não foi possível conferir a foto.")),
            )
          : reason;
      });
      const next = {
        ...draftRef.current,
        profile: {
          ...draftRef.current.profile,
          photoDocumentId: documentId,
        },
      };
      update({ profile: next.profile });
      await persist();
    } catch (reason) {
      setSaveState("error");
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Não foi possível enviar a foto.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }
  async function submit() {
    const saved = await persist();
    if (!saved) return;
    setSaveState("saving");
    setMessage("");
    try {
      const response = await fetch(
        `/api/v1/clinics/${tenantId}/onboarding/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version: draftRef.current.version,
            shareConsent: true,
          }),
        },
      );
      const body = (await response.json()) as {
        onboarding?: OnboardingDraft;
        error?: string;
      };
      if (!response.ok || !body.onboarding)
        throw new Error(body.error ?? "Não foi possível concluir agora.");
      setDraft(body.onboarding);
      draftRef.current = body.onboarding;
      setSaveState("saved");
      setMessage(
        "Informações enviadas para a equipe. Você pode seguir para o início.",
      );
    } catch (reason) {
      setSaveState("error");
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Não foi possível concluir agora.",
      );
    }
  }
  async function leave() {
    const saved = await persist();
    if (saved) router.push(`/clinicas/${tenantId}/meu-cuidado/hoje`);
  }
  const progress =
    step === "welcome"
      ? 0
      : step === "profile"
        ? 1
        : step === "measurements"
          ? 2
          : step === "questions"
            ? 3
            : step === "exams"
              ? 4
              : 5;
  const question = questionFields[questionIndex];

  return (
    <section className="onboarding-workspace">
      <header className="onboarding-header">
        <div>
          <h1>Seu começo na {clinicName}</h1>
          <p>
            Vamos reunir o que você quiser compartilhar antes da conversa com{" "}
            {doctorName}. Você pode pular e voltar quando precisar.
          </p>
        </div>
        <button
          className="secondary"
          type="button"
          onClick={() => void leave()}
          disabled={saveState === "saving" || uploading}
        >
          Sair para o início
        </button>
      </header>
      <ol className="onboarding-progress" aria-label="Etapas do cadastro">
        {["Perfil", "Medidas", "Pré-consulta", "Exames", "Revisão"].map(
          (label, index) => (
            <li
              key={label}
              className={
                index === progress - 1
                  ? "current"
                  : index < progress
                    ? "complete"
                    : ""
              }
            >
              <span>{index + 1}</span>
              {label}
            </li>
          ),
        )}
      </ol>
      <p
        className={
          saveState === "error" ? "feedback save-feedback" : "save-feedback"
        }
        role={saveState === "error" ? "alert" : "status"}
      >
        {message ||
          (saveState === "saving"
            ? "Salvando rascunho…"
            : saveState === "saved"
              ? "Rascunho salvo"
              : "")}
      </p>
      <section className="panel onboarding-card">
        {step === "welcome" ? (
          <>
            <h2>Bem-vindo(a)</h2>
            <p>
              Conte o que importa para você. Seu médico usará essas informações
              para preparar a primeira conversa.
            </p>
            <ul className="onboarding-welcome-expectations">
              <li>Leva cerca de 5 minutos, no seu ritmo.</li>
              <li>
                Tudo é salvo automaticamente; você pode pausar e continuar
                quando quiser.
              </li>
              <li>Cada etapa é opcional — pule o que preferir conversar pessoalmente.</li>
            </ul>
            <button type="button" onClick={() => void move("profile")}>
              Começar
            </button>
          </>
        ) : null}
        {step === "profile" ? (
          <>
            <h2>Um pouco sobre você</h2>
            <p>
              Preencha se quiser. Você decide o que compartilhar na última
              etapa.
            </p>
            <div className="onboarding-fields">
              <div className="field">
                <label htmlFor="birth-date">Data de nascimento</label>
                <input
                  id="birth-date"
                  type="date"
                  value={dateValue(draft.profile.birthDate)}
                  onChange={(event) =>
                    update({
                      profile: {
                        ...draft.profile,
                        birthDate: event.target.value || null,
                      },
                    })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="profile-photo">Foto opcional</label>
                <label className="publication-confirm">
                  <input
                    type="checkbox"
                    checked={photoConsent}
                    onChange={(event) => setPhotoConsent(event.target.checked)}
                    disabled={uploading}
                  />
                  Quero adicionar uma foto ao meu cadastro.
                </label>
                <input
                  id="profile-photo"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={uploadPhoto}
                  disabled={uploading || !photoConsent}
                />
                <small>
                  {draft.profile.photoDocumentId
                    ? "Foto privada recebida."
                    : "JPG ou PNG, até 5 MB."}
                </small>
              </div>
            </div>
            <div className="onboarding-actions">
              <button
                type="button"
                disabled={uploading}
                onClick={() => void move("measurements")}
              >
                Continuar
              </button>
              <button
                className="secondary"
                type="button"
                disabled={uploading}
                onClick={() => void move("measurements", "profile")}
              >
                Pular por enquanto
              </button>
            </div>
          </>
        ) : null}
        {step === "measurements" ? (
          <>
            <h2>Medidas, se quiser registrar</h2>
            <p>
              Você pode preencher valores aproximados ou deixar para conversar
              na consulta.
            </p>
            <div className="onboarding-fields measurement-fields">
              <div className="field">
                <label htmlFor="weight">Peso (kg)</label>
                <input
                  id="weight"
                  type="number"
                  min="1"
                  max="500"
                  step="0.1"
                  value={numberValue(draft.measurements.weightKg)}
                  onChange={(event) =>
                    update({
                      measurements: {
                        ...draft.measurements,
                        weightKg:
                          event.target.value === ""
                            ? null
                            : Number(event.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="height">Altura (cm)</label>
                <input
                  id="height"
                  type="number"
                  min="30"
                  max="300"
                  value={numberValue(draft.measurements.heightCm)}
                  onChange={(event) =>
                    update({
                      measurements: {
                        ...draft.measurements,
                        heightCm:
                          event.target.value === ""
                            ? null
                            : Number(event.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="waist">Cintura (cm)</label>
                <input
                  id="waist"
                  type="number"
                  min="1"
                  max="300"
                  step="0.1"
                  value={numberValue(draft.measurements.waistCm)}
                  onChange={(event) =>
                    update({
                      measurements: {
                        ...draft.measurements,
                        waistCm:
                          event.target.value === ""
                            ? null
                            : Number(event.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="measured-on">Data da medida</label>
                <input
                  id="measured-on"
                  type="date"
                  value={dateValue(draft.measurements.measuredOn)}
                  onChange={(event) =>
                    update({
                      measurements: {
                        ...draft.measurements,
                        measuredOn: event.target.value || null,
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className="onboarding-actions">
              <button type="button" onClick={() => void move("questions")}>
                Continuar
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => void move("questions", "measurements")}
              >
                Pular por enquanto
              </button>
            </div>
          </>
        ) : null}
        {step === "questions" ? (
          <>
            <p className="question-counter">
              Pergunta {questionIndex + 1} de {questionFields.length}
            </p>
            <h2>{question[1]}</h2>
            <p>{question[2]}</p>
            <div className="field">
              <label className="sr-only" htmlFor="preconsult-answer">
                Sua resposta
              </label>
              <textarea
                id="preconsult-answer"
                value={draft.answers[question[0]]}
                maxLength={4000}
                onChange={(event) =>
                  update({
                    answers: {
                      ...draft.answers,
                      [question[0]]: event.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="onboarding-actions">
              {questionIndex > 0 ? (
                <button
                  className="secondary"
                  type="button"
                  onClick={() => setQuestionIndex(questionIndex - 1)}
                >
                  Voltar
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  questionIndex === questionFields.length - 1
                    ? void move("exams")
                    : setQuestionIndex(questionIndex + 1)
                }
              >
                {questionIndex === questionFields.length - 1
                  ? "Continuar"
                  : "Próxima pergunta"}
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => void move("exams", "questions")}
              >
                Pular pré-consulta por enquanto
              </button>
            </div>
          </>
        ) : null}
        {step === "exams" ? (
          <>
            <h2>Exames para a equipe</h2>
            <p>
              Se desejar, envie exames em PDF, JPG ou PNG. Os arquivos ficam
              privados e só serão disponibilizados ao médico responsável depois
              que você enviar esta versão com consentimento.
            </p>
            <OnboardingExamUpload
              onPendingChange={setUploading}
              tenantId={tenantId}
              patientId={draft.patientId}
              receivedIds={draft.examDocumentIds}
              onComplete={async (ids) => {
                update({
                  examDocumentIds: [
                    ...draftRef.current.examDocumentIds,
                    ...ids,
                  ],
                });
                if (!(await persist()))
                  throw new Error(
                    "O arquivo foi recebido, mas falta salvar sua associação ao cadastro. Tente salvar novamente antes de sair.",
                  );
                setSaveState("saved");
                setMessage(
                  `${ids.length} exame${ids.length > 1 ? "s" : ""} recebido${ids.length > 1 ? "s" : ""}.`,
                );
              }}
            />
            <div className="onboarding-actions">
              <button
                type="button"
                disabled={uploading}
                onClick={() => void move("review")}
              >
                Revisar informações
              </button>
              <button
                className="secondary"
                type="button"
                disabled={uploading}
                onClick={() => void move("review", "exams")}
              >
                Pular por enquanto
              </button>
            </div>
          </>
        ) : null}
        {step === "review" && draft.status === "submitted" ? (
          <>
            <h2>Informações enviadas</h2>
            <p>
              Esta versão foi compartilhada com a equipe para preparar sua
              consulta. Ela permanece registrada como foi enviada.
            </p>
            <div className="onboarding-actions">
              <a
                className="button"
                href={`/clinicas/${tenantId}/meu-cuidado/hoje`}
              >
                Ir para meu cuidado
              </a>
              <a
                className="button secondary"
                href={`/clinicas/${tenantId}/meu-cuidado/documentos`}
              >
                Ver documentos
              </a>
            </div>
          </>
        ) : null}
        {step === "review" && draft.status !== "submitted" ? (
          <>
            <h2>Revise antes de enviar</h2>
            <p>
              Confira o que será compartilhado com a equipe para preparar sua
              consulta.
            </p>
            <dl className="onboarding-review">
              <div>
                <dt>Perfil</dt>
                <dd>
                  {draft.profile.birthDate
                    ? `Nascimento: ${new Date(`${draft.profile.birthDate}T12:00:00`).toLocaleDateString("pt-BR")}`
                    : "Ainda não informado"}
                  {draft.profile.photoDocumentId
                    ? " · Foto privada adicionada"
                    : ""}
                </dd>
              </div>
              <div>
                <dt>Medidas</dt>
                <dd>
                  {[
                    [
                      "Peso",
                      draft.measurements.weightKg &&
                        `${draft.measurements.weightKg} kg`,
                    ],
                    [
                      "Altura",
                      draft.measurements.heightCm &&
                        `${draft.measurements.heightCm} cm`,
                    ],
                    [
                      "Cintura",
                      draft.measurements.waistCm &&
                        `${draft.measurements.waistCm} cm`,
                    ],
                    ["Data", draft.measurements.measuredOn],
                  ]
                    .filter(([, value]) => value)
                    .map(([label, value]) => `${label}: ${value}`)
                    .join(" · ") || "Ainda não informado"}
                </dd>
              </div>
              {questionFields.map(([key, title]) => (
                <div key={key}>
                  <dt>{title}</dt>
                  <dd
                    style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                  >
                    {draft.answers[key] || "Deixado para conversar na consulta"}
                  </dd>
                </div>
              ))}
              <div>
                <dt>Exames</dt>
                <dd>
                  {draft.examDocumentIds.length
                    ? `${draft.examDocumentIds.length} arquivo${draft.examDocumentIds.length > 1 ? "s" : ""} recebido${draft.examDocumentIds.length > 1 ? "s" : ""}`
                    : "Nenhum arquivo enviado"}
                </dd>
              </div>
            </dl>
            <label className="publication-confirm">
              <input
                type="checkbox"
                checked={draft.shareConsent}
                onChange={(event) =>
                  update({ shareConsent: event.target.checked })
                }
              />
              Confirmo que quero compartilhar estas informações com a equipe da
              clínica para preparar minha consulta.
            </label>
            <div className="onboarding-actions">
              <button
                type="button"
                disabled={!draft.shareConsent || saveState === "saving"}
                onClick={() => void submit()}
              >
                Enviar para a equipe
              </button>
              <button
                className="secondary"
                type="button"
                disabled={saveState === "saving"}
                onClick={() => void move("profile")}
              >
                Editar informações
              </button>
            </div>
          </>
        ) : null}
      </section>
    </section>
  );
}

function OnboardingExamUpload({
  tenantId,
  patientId,
  receivedIds,
  onComplete,
  onPendingChange,
}: {
  tenantId: string;
  patientId: string;
  receivedIds: string[];
  onPendingChange: (pending: boolean) => void;
  onComplete: (ids: string[]) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const files = Array.from(new FormData(form).getAll("files")).filter(
      (value): value is File => value instanceof File && value.size > 0,
    );
    if (!files.length) {
      setError("Escolha ao menos um arquivo para enviar.");
      return;
    }
    if (files.some((file) => file.size > maxDocumentBytes)) {
      setError("Cada arquivo deve ter até 5 MB.");
      return;
    }
    setPending(true);
    onPendingChange(true);
    setError("");
    try {
      for (const file of files) {
        const { documentId } = await uploadDocument({
          tenantId,
          patientId,
          file,
          category: "exam",
          visibility: "internal",
        }).catch((reason) => {
          throw reason instanceof DocumentUploadError
            ? new Error(
                `${file.name}: ${
                  reason.stage === "upload"
                    ? "o arquivo não foi recebido."
                    : (reason.serverMessage ??
                      (reason.stage === "prepare"
                        ? "não foi possível preparar o envio."
                        : "não foi possível conferir o arquivo."))
                }`,
              )
            : reason;
        });
        await onComplete([documentId]);
      }
      form.reset();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível enviar os exames.",
      );
    } finally {
      setPending(false);
      onPendingChange(false);
    }
  }
  return (
    <form className="onboarding-upload" onSubmit={submit}>
      <label className="field" htmlFor="onboarding-exam">
        Arquivos
      </label>
      <input
        id="onboarding-exam"
        name="files"
        type="file"
        multiple
        accept="application/pdf,image/jpeg,image/png"
        disabled={pending}
      />
      <label className="publication-confirm">
        <input name="consent" type="checkbox" required disabled={pending} />
        Confirmo que selecionei estes exames para compartilhar com a equipe após
        enviar esta versão.
      </label>
      {receivedIds.length ? (
        <p role="status">
          {receivedIds.length} arquivo{receivedIds.length > 1 ? "s" : ""}{" "}
          recebido{receivedIds.length > 1 ? "s" : ""} nesta etapa.
        </p>
      ) : null}
      <button className="secondary" type="submit" disabled={pending}>
        {pending ? "Enviando arquivos…" : "Enviar exames"}
      </button>
      {error ? (
        <p className="feedback" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
