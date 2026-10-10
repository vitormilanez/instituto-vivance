"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDocument, DocumentUploadError } from "@/lib/document-upload";
import { examByteLimit, examFileLabel, examSelectionConsented, examSelectionPhrase,
  examSelectionReady, examSelectionReducer, examSentPhrase, examStateLabel,
  initialExamSelection, maxExamFiles, type ExamSelectionItem } from "@/modules/onboarding/exam-selection";
import type { OnboardingRecord } from "@/modules/onboarding/types";
import { onboardingMeasurements } from "@/modules/onboarding/display";
import { Icon, Mark } from "./patient/icons";

export type OnboardingDraft = Omit<OnboardingRecord, "questionnaireVersion"> & {
  questionnaireVersion?: OnboardingRecord["questionnaireVersion"];
};
type Health = OnboardingRecord["healthContext"];
type HealthKey = keyof Health;
type Step = "welcome" | "profile" | "medications" | "history" | "family" | "goal" | "review";
const steps: Exclude<Step, "welcome">[] = ["profile", "medications", "history", "family", "goal", "review"];
const labels = ["Sobre você", "Medicamentos", "Sua saúde", "Sua família", "Seu objetivo", "Conferir"];
const emptyHealth = (): Health => ({
  medications: { status: "", details: "" }, conditions: { status: "", details: "" },
  allergies: { status: "", details: "" }, surgeries: { status: "", details: "" },
  familyHistory: { status: "", details: "" },
});
const healthLabels: Record<HealthKey, string> = {
  medications: "Medicamentos e suplementos", conditions: "Condições de saúde",
  allergies: "Alergias", surgeries: "Cirurgias", familyHistory: "Saúde na família",
};
const healthStatusLabels: Record<Health[HealthKey]["status"], string> = {
  "": "Não informado", yes: "Sim", no: "Não", unknown: "Não sei", discuss: "Prefiro conversar",
};
function initialStep(initial: OnboardingDraft): Step {
  if (initial.status === "submitted" || initial.currentStep === "review") return "review";
  if (["medications","history","family","goal"].includes(initial.currentStep)) return initial.currentStep as Step;
  if (initial.currentStep === "questions") {
    const health = initial.healthContext ?? emptyHealth();
    if (!health.medications.status || !health.allergies.status) return "medications";
    if (!health.conditions.status || !health.surgeries.status) return "history";
    if (!health.familyHistory.status) return "family";
    return "goal";
  }
  if (["measurements", "exams"].includes(initial.currentStep)) return initial.currentStep === "exams" ? "goal" : "profile";
  return initial.version > 1 ? "profile" : "welcome";
}

export function OnboardingWorkspace({ tenantId, doctorName, initial }: {
  tenantId: string; doctorName: string; initial: OnboardingDraft;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<OnboardingDraft>({ ...initial, healthContext: initial.healthContext ?? emptyHealth(), measurements:{...initial.measurements, heightCm:initial.measurements.heightCm && initial.measurements.heightCm<3 ? Math.round(initial.measurements.heightCm*100) : initial.measurements.heightCm} });
  const [step, setStep] = useState<Step>(initialStep(initial));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error" | "validation" | "submit-error">("idle");
  const [message, setMessage] = useState("");
  const [navigating, setNavigating] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [returnToReview, setReturnToReview] = useState(false);
  const [editingMeasure, setEditingMeasure] = useState(false);
  const draftRef = useRef(draft);
  const changed = useRef(false);
  const revision = useRef(0);
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const heading = useRef<HTMLHeadingElement>(null);
  const busy = useRef(false);
  const home = `/clinicas/${tenantId}/meu-cuidado/hoje`;

  function update(next: Partial<OnboardingDraft>) {
    const merged = { ...draftRef.current, ...next };
    draftRef.current = merged; changed.current = true; revision.current += 1;
    setDraft(merged); setState("idle"); setMessage("");
  }
  const persist = useCallback(async (): Promise<boolean> => {
    if (!changed.current) return true;
    setState("saving");
    const request = async () => {
      const snapshot = draftRef.current;
      const snapshotRevision = revision.current;
      const response = await fetch(`/api/v1/clinics/${tenantId}/onboarding`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: snapshot.version, currentStep: snapshot.currentStep,
          skippedSteps: snapshot.skippedSteps, profile: snapshot.profile, measurements: snapshot.measurements,
          answers: snapshot.answers, healthContext: snapshot.healthContext,
          examDocumentIds: snapshot.examDocumentIds, shareConsent: snapshot.shareConsent }),
      });
      const body = await response.json() as { onboarding?: OnboardingDraft; error?: string };
      if (!response.ok || !body.onboarding) throw new Error(response.status === 409
        ? "Seu cadastro mudou em outra tela. Atualize a página para continuar."
        : body.error ?? "Não conseguimos salvar. Tente novamente.");
      const saved = body.onboarding;
      if (revision.current === snapshotRevision) { changed.current = false; draftRef.current = saved; setDraft(saved); }
      else { const merged = { ...draftRef.current, version: saved.version, updatedAt: saved.updatedAt }; draftRef.current = merged; setDraft(merged); }
      setState("saved"); return true;
    };
    queue.current = queue.current.then(request, request).catch((reason: unknown) => {
      setState("error"); setMessage(reason instanceof Error ? reason.message : "Não conseguimos salvar. Tente novamente."); return false;
    });
    return queue.current;
  }, [tenantId]);
  useEffect(() => {
    if (!changed.current || ["saving", "error", "validation", "submit-error"].includes(state) || editingMeasure || draft.status === "submitted") return;
    const timer = window.setTimeout(() => void persist(), 900);
    return () => window.clearTimeout(timer);
  }, [draft, persist, state, editingMeasure]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step, justCompleted]);

  async function move(next: Step) {
    if (busy.current) return false;
    busy.current = true; setNavigating(true);
    update({ currentStep: next === "welcome" ? "profile" : next });
    const saved = await persist();
    if (saved) { setStep(next); window.scrollTo({ top: 0, behavior: "instant" }); }
    busy.current = false; setNavigating(false);
    return saved;
  }
  async function edit(next: Step) { setReturnToReview(true); await move(next); }
  async function advance() {
    if (step === "goal" && !draftRef.current.answers.goal.trim()) { setMessage("Conte seu objetivo em uma frase para a equipe conhecer o que importa para você."); setState("validation"); heading.current?.focus(); return; }
    if (await move(returnToReview ? "review" : steps[index + 1])) setReturnToReview(false);
  }
  async function leave() {
    if (busy.current) return;
    busy.current = true; setNavigating(true);
    if (draft.status === "submitted" || await persist()) { router.push(home); router.refresh(); }
    busy.current = false; setNavigating(false);
  }
  async function submit() {
    if (!draftRef.current.answers.goal.trim()) { await edit("goal"); return; }
    if (busy.current || !draft.shareConsent) return;
    busy.current = true; setNavigating(true); setMessage("");
    try {
      if (!(await persist())) return;
      setState("saving");
      const response = await fetch(`/api/v1/clinics/${tenantId}/onboarding/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: draftRef.current.version, shareConsent: true }),
      });
      const body = await response.json() as { onboarding?: OnboardingDraft; error?: string };
      if (!response.ok || !body.onboarding) throw new Error(body.error ?? "Seu cadastro não foi enviado. Tente novamente.");
      draftRef.current = body.onboarding; setDraft(body.onboarding); changed.current = false;
      setState("saved"); setJustCompleted(true);
    } catch (reason) { setState("submit-error"); setMessage(reason instanceof Error ? reason.message : "Não conseguimos concluir. Tente novamente."); }
    finally { busy.current = false; setNavigating(false); }
  }
  function updateHealth(key: HealthKey, value: Partial<Health[HealthKey]>) {
    update({ healthContext: { ...draftRef.current.healthContext, [key]: { ...draftRef.current.healthContext[key], ...value } } });
  }
  const disabled = navigating || state === "saving";
  const index = steps.indexOf(step as Exclude<Step, "welcome">);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const completed = draft.status === "submitted";

  if (completed) return <section className={`vi-intake vi-complete${justCompleted ? " vi-complete-new" : ""}`}>
    <div className="vi-success-art" aria-hidden="true">
      <svg viewBox="0 0 180 150" fill="none"><path className="vi-success-route" d="M15 116C15 58 66 106 90 58C114 106 165 58 165 116"/><path className="vi-success-check" d="m69 51 14 14 29-31"/></svg>
    </div>
    <h1 ref={heading} tabIndex={-1}>Seu primeiro passo está dado.</h1>
    <p className="vi-lead">Agora vamos avançar juntos, no seu ritmo, em direção ao que importa para você.</p>
    {draft.answers.goal && <blockquote className="vi-goal-quote"><span>Seu objetivo</span><p>{draft.answers.goal}</p></blockquote>}
    <p className="vi-support">Seu contexto inicial foi compartilhado com {doctorName} e a equipe que cuida de você. Agora, você pode completar alimentação, fotos e exames pela tela Hoje.</p>
    <button type="button" className="vi-primary" onClick={() => { router.replace(`${home}?enviado=cadastro`); router.refresh(); }}>Ir para Hoje <Icon name="arrow" size={20}/></button>
  </section>;

  return <section className="vi-intake">
    <header className="vi-intake-header"><Mark size={34}/><span>Seu começo na Vivance</span><button type="button" className="vi-text-button" onClick={() => void leave()} disabled={disabled}>Salvar e sair</button></header>
    {step !== "welcome" && <div className="vi-progress">
      <div className="vi-progress-line" role="progressbar" aria-label="Progresso do cadastro" aria-valuemin={0} aria-valuemax={6} aria-valuenow={index + 1}><span style={{ transform: `scaleX(${(index + 1) / 6})` }}/></div>
      <p><span>{labels[index]}</span><span>{index + 1} de 6</span></p>
    </div>}
    <div key={step} className="vi-intake-body">
      {step === "welcome" ? <>
        <h1 ref={heading} tabIndex={-1}>Um cuidado que começa por conhecer você.</h1>
        <p className="vi-lead">Conte um pouco sobre sua saúde e o que busca com a Vivance. A equipe terá um ponto de partida para a primeira conversa.</p>
        <div className="vi-welcome-route"><span><Icon name="user"/>Sobre você</span><span><Icon name="heart"/>Sua saúde</span><span><Icon name="arrow"/>Seu objetivo</span></div>
        <p className="vi-support">Só o essencial agora. Alimentação, fotos e exames ficam para depois. Seu rascunho é salvo enquanto você avança.</p>
        <button type="button" className="vi-primary" disabled={disabled} onClick={() => void move("profile")}>{disabled ? "Salvando…" : "Vamos começar"}<Icon name="arrow" size={20}/></button>
      </> : step === "profile" ? <>
        <h1 ref={heading} tabIndex={-1}>Vamos começar por você.</h1><p className="vi-lead">Sua idade e suas medidas ajudam a contextualizar o acompanhamento. Tudo bem deixar em branco o que não souber agora.</p>
        <div className="vi-basics"><label className="vi-field vi-birth">Data de nascimento<input type="date" max={today} min="1900-01-01" value={draft.profile.birthDate ?? ""} onChange={event => update({profile:{...draft.profile,birthDate:event.target.value || null}})}/><small>A idade será calculada pela sua data de nascimento.</small></label>
          <div className="vi-measure-grid">{([['weightKg','Peso','kg',500],['heightCm','Altura','cm',300],['waistCm','Cintura','cm',400]] as const).map(([key,label,unit,max]) => <label className="vi-field" key={key}>{label}<div className="vi-unit-input"><input type="number" inputMode="decimal" min={key === 'heightCm' ? 50 : 1} max={max} step="0.1" value={draft.measurements[key] ?? ""} aria-label={`${label} em ${unit}`} onFocus={() => setEditingMeasure(true)} onBlur={() => setEditingMeasure(false)} onChange={event => update({measurements:{...draft.measurements,[key]:event.target.value === "" ? null : Number(event.target.value)}})}/><span>{unit}</span></div>{key === 'heightCm' && <small>Ex.: 173 cm</small>}</label>)}</div>
          <details className="vi-help"><summary>Como medir a cintura?</summary><p>Use uma fita entre a última costela e o topo do quadril. Mantenha-a reta, sem apertar, e meça ao soltar o ar naturalmente. Se não tiver fita, deixe para depois.</p></details>
          <label className="vi-field">Quando você mediu?<input type="date" max={today} value={draft.measurements.measuredOn ?? ""} onChange={event => update({measurements:{...draft.measurements,measuredOn:event.target.value || null}})}/><small>Essa é a data das medidas, não do preenchimento.</small></label>
        </div>
      </> : step === "medications" ? <>
        <h1 ref={heading} tabIndex={-1}>O que faz parte do seu cuidado hoje?</h1><p className="vi-lead">Um nome já ajuda. Os detalhes podem ficar para a consulta.</p>
        <HealthQuestion id="medications" title="Usa algum medicamento ou suplemento?" hint="Nome e dose, se souber. Inclua os de uso eventual." value={draft.healthContext.medications} onChange={value => updateHealth('medications',value)}/>
        <HealthQuestion id="allergies" title="Tem alguma alergia conhecida?" hint="Medicamentos, alimentos ou outras substâncias. Conte qual reação costuma ter." value={draft.healthContext.allergies} onChange={value => updateHealth('allergies',value)}/>
      </> : step === "history" ? <>
        <h1 ref={heading} tabIndex={-1}>Sua história ajuda a cuidar de você.</h1><p className="vi-lead">Compartilhe o que já sabe sobre sua saúde.</p>
        <HealthQuestion id="conditions" title="Tem alguma condição de saúde diagnosticada?" hint="Ex.: pressão alta, diabetes ou uma condição da tireoide. Não precisa usar termos médicos." value={draft.healthContext.conditions} onChange={value => updateHealth('conditions',value)}/>
        <HealthQuestion id="surgeries" title="Já passou por alguma cirurgia?" hint="Qual cirurgia e quando, se lembrar. Inclua cirurgia bariátrica." value={draft.healthContext.surgeries} onChange={value => updateHealth('surgeries',value)}/>
      </> : step === "family" ? <>
        <h1 ref={heading} tabIndex={-1}>E a saúde na sua família?</h1><p className="vi-lead">Pense em pais, irmãos e avós. Pode compartilhar só o que lembrar.</p>
        <HealthQuestion id="familyHistory" title="Há alguma condição de saúde frequente na família?" hint="Ex.: diabetes, pressão alta, doenças do coração ou câncer. Diga a condição e o parentesco, sem precisar informar nomes." value={draft.healthContext.familyHistory} onChange={value => updateHealth('familyHistory',value)}/>
      </> : step === "goal" ? <>
        <h1 ref={heading} tabIndex={-1}>O que você quer conquistar com a Vivance?</h1><p className="vi-lead">Em uma ou duas frases, conte o que deseja melhorar e o que faria diferença na sua vida.</p>
        <label className="vi-field">Seu objetivo<textarea rows={5} maxLength={Math.max(600,draft.answers.goal.length)} value={draft.answers.goal} placeholder="Quero cuidar do meu peso e ter mais disposição para brincar com meus filhos." onChange={event => update({answers:{...draft.answers,goal:event.target.value}})}/></label>
        <p className="vi-support">Pode ser cuidar do peso, ter mais energia, envelhecer com saúde ou entender melhor seu corpo. O objetivo é seu; os próximos passos serão construídos com a equipe.</p>
      </> : <>
        <h1 ref={heading} tabIndex={-1}>Um último olhar antes de começar.</h1><p className="vi-lead">Confira seu ponto de partida. Você pode voltar a qualquer parte para ajustar.</p>
        <dl className="vi-review"><div><dt>Sobre você<button type="button" onClick={() => void edit('profile')}>Editar</button></dt><dd>{draft.profile.birthDate ? `Nascimento: ${draft.profile.birthDate.split('-').reverse().join('/')}` : 'Nascimento não informado'}<br/>{onboardingMeasurements(draft.measurements)}</dd></div>{(['medications','conditions','allergies','surgeries','familyHistory'] as const).map(key => <div key={key}><dt>{healthLabels[key]}<button type="button" onClick={() => void edit(key === 'familyHistory' ? 'family' : ['conditions','surgeries'].includes(key) ? 'history' : 'medications')}>Editar</button></dt><dd>{healthStatusLabels[draft.healthContext[key].status]}{draft.healthContext[key].details && ` · ${draft.healthContext[key].details}`}</dd></div>)}<div><dt>Seu objetivo<button type="button" onClick={() => void edit('goal')}>Editar</button></dt><dd>{draft.answers.goal || 'Para conversar com a equipe'}</dd></div></dl>
        <label className="vi-consent"><input type="checkbox" checked={draft.shareConsent} onChange={event => update({shareConsent:event.target.checked})}/><span>Quero compartilhar estas informações com minha equipe de cuidado.</span></label>
      </>}
    </div>
    {step !== 'welcome' && <footer className="vi-intake-actions"><button type="button" className="vi-primary" disabled={disabled || (step === 'review' && !draft.shareConsent)} onClick={() => step === 'review' ? void submit() : void advance()}>{disabled ? 'Salvando…' : step === 'review' ? 'Começar meu cuidado' : 'Continuar'}<Icon name="arrow" size={20}/></button><button type="button" className="vi-text-button" disabled={disabled} onClick={() => void move(index === 0 ? 'welcome' : steps[index - 1])}>Voltar</button></footer>}
    <p className={`vi-save-state${['error', 'validation', 'submit-error'].includes(state) ? ' is-error' : ''}`} role={['error', 'validation', 'submit-error'].includes(state) ? 'alert' : 'status'}>{message || (state === 'saving' ? 'Salvando…' : state === 'saved' ? 'Salvo' : '')}{state === 'error' && <button type="button" onClick={() => void persist()}>Tentar salvar novamente</button>}</p>
  </section>;
}
function HealthQuestion({ id,title,hint,value,onChange }: {id:string;title:string;hint:string;value:Health[HealthKey];onChange:(value:Partial<Health[HealthKey]>)=>void}) {
  return <fieldset className="vi-health-question"><legend>{title}</legend><div className="vi-choices">{(['yes','no','unknown','discuss'] as const).map(status => <button type="button" key={status} aria-pressed={value.status === status} onClick={() => onChange({status})}>{healthStatusLabels[status]}</button>)}</div>{(value.status === 'yes' || Boolean(value.details)) && <label className="vi-field">{value.status === 'yes' ? 'Conte um pouco' : 'Observação que você já registrou'}<textarea rows={3} maxLength={2000} value={value.details} placeholder={hint} onChange={event => onChange({details:event.target.value})}/></label>}</fieldset>;
}

// O motivo da falha no vocabulário do estágio que falhou. Quando o arquivo já
// chegou e só faltou salvar a associação, a mensagem vem de quem persistiu.
function examFailure(reason: unknown): string {
  if (reason instanceof DocumentUploadError) {
    if (reason.stage === "upload")
      return "O arquivo não foi recebido. Tente reenviar este arquivo.";
    if (reason.serverMessage) return reason.serverMessage;
    return reason.stage === "prepare"
      ? "Não foi possível preparar o envio. Tente reenviar este arquivo."
      : "Não foi possível conferir o arquivo. Tente reenviar este arquivo.";
  }
  if (reason instanceof Error && reason.name === "TimeoutError")
    return "A conexão demorou. Tente reenviar este arquivo.";
  return reason instanceof Error
    ? reason.message
    : "Não foi possível enviar este arquivo. Tente reenviar este arquivo.";
}

// Um arquivo por linha, cada um com o próprio estado, erro e reenvio: um arquivo
// que falha não derruba os outros, e remover um não perde os demais. O
// consentimento vale para a lista efetivamente selecionada.
export function OnboardingExamUpload({
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
  const [selection, dispatch] = useReducer(
    examSelectionReducer,
    receivedIds,
    initialExamSelection,
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const consented = examSelectionConsented(selection);
  const ready = examSelectionReady(selection);
  const unsent = selection.items.filter((item) => item.state !== "sent");
  const sent = selection.sent.length;

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // Limpar o campo permite escolher o mesmo arquivo de novo depois de removê-lo.
    event.target.value = "";
    if (files.length) dispatch({ type: "add", files });
  }

  // Envia um arquivo por vez. Quando os bytes já chegaram e faltou apenas salvar
  // a associação ao cadastro, o reenvio conclui a associação sem subir o arquivo
  // outra vez.
  async function send(items: ExamSelectionItem[]) {
    if (sending || !items.length) return;
    setSending(true);
    onPendingChange(true);
    setError("");
    try {
      for (const item of items) {
        dispatch({ type: "sending", key: item.key });
        try {
          let documentId = item.documentId;
          if (!documentId) {
            const uploaded = await uploadDocument({
              tenantId,
              patientId,
              file: item.file,
              category: "exam",
              visibility: "internal",
            });
            documentId = uploaded.documentId;
            dispatch({ type: "uploaded", key: item.key, documentId });
          }
          await onComplete([documentId]);
          dispatch({ type: "sent", key: item.key });
        } catch (reason) {
          dispatch({ type: "failed", key: item.key, error: examFailure(reason) });
        }
      }
    } finally {
      setSending(false);
      onPendingChange(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready.length) {
      setError("Escolha ao menos um arquivo para enviar.");
      return;
    }
    if (!consented) {
      setError(
        "Confirme que selecionou estes arquivos para compartilhar com a equipe.",
      );
      return;
    }
    await send(ready);
  }

  return (
    <form className="onboarding-upload" onSubmit={submit}>
      <p className="exam-state" role="status">
        {examSelectionPhrase(selection)}
      </p>
      <label className="field" htmlFor="onboarding-exam">
        Arquivos
      </label>
      <input
        id="onboarding-exam"
        type="file"
        multiple
        accept="application/pdf,image/jpeg,image/png"
        onChange={choose}
        disabled={sending}
      />
      <p className="exam-hint">
        PDF, JPG ou PNG, até {examByteLimit()} cada. Limite de {maxExamFiles}{" "}
        exames nesta etapa.
      </p>
      {selection.rejected.length ? (
        <div className="exam-rejected" role="alert">
          <p>Estes arquivos não foram adicionados:</p>
          <ul>
            {selection.rejected.map((item) => (
              <li key={`${item.name}-${item.reason}`}>
                <strong>{item.name}</strong>
                <span>{item.reason}</span>
              </li>
            ))}
          </ul>
          <button
            className="secondary"
            type="button"
            onClick={() => dispatch({ type: "dismissRejections" })}
          >
            Entendi
          </button>
        </div>
      ) : null}
      {selection.items.length ? (
        <ul className="exam-selection">
          {selection.items.map((item) => (
            <li key={item.key} data-state={item.state}>
              <div className="exam-file">
                <strong>{item.file.name}</strong>
                <span>{examFileLabel(item)}</span>
              </div>
              <span className="exam-file-state">{examStateLabel(item.state)}</span>
              {item.error ? (
                <p className="exam-file-error" role="alert">
                  {item.error}
                </p>
              ) : null}
              {item.state === "failed" || item.state === "ready" ? (
                <div className="exam-file-actions">
                  {item.state === "failed" ? (
                    <button
                      className="secondary"
                      type="button"
                      disabled={sending}
                      onClick={() => void send([item])}
                    >
                      Reenviar este arquivo
                    </button>
                  ) : null}
                  <button
                    className="secondary"
                    type="button"
                    disabled={sending}
                    onClick={() => dispatch({ type: "remove", key: item.key })}
                  >
                    Remover
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {unsent.length > 0 && sent > 0 ? (
        <p className="exam-sent" role="status">
          {examSentPhrase(sent)} nesta etapa.
        </p>
      ) : null}
      <label className="publication-confirm">
        <input
          type="checkbox"
          checked={consented}
          onChange={(event) =>
            dispatch({ type: "consent", consented: event.target.checked })
          }
          disabled={sending || !ready.length}
          required
        />
        Confirmo que selecionei {ready.length} arquivo
        {ready.length > 1 ? "s" : ""} para compartilhar com a equipe depois de
        enviar esta versão.
      </label>
      <button
        className="secondary"
        type="submit"
        disabled={sending || !ready.length || !consented}
      >
        {sending
          ? "Enviando arquivos…"
          : ready.length
            ? `Enviar ${ready.length} arquivo${ready.length > 1 ? "s" : ""}`
            : "Enviar exames"}
      </button>
      {error ? (
        <p className="feedback" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
