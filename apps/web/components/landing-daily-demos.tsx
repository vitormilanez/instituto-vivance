"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, ImagePlus, MessageSquare, Moon, Toilet, Utensils, Zap } from "lucide-react";
import { bowelStatusLabels, type CheckInAnswers } from "@/modules/daily-check-ins/model";
import { coreCheckInTopics, momentQuestions, topicLabels } from "@/modules/daily-check-ins/experience";
import { MomentArtwork, MomentScale } from "./patient/moment-choices";
import { MealKinds } from "./patient/meal-kinds";

const topics = [...coreCheckInTopics, "note"] as const;
const symbols = { energy: Zap, sleep: Moon, hunger: Utensils, bowel: Toilet, note: MessageSquare };

// Public examples deliberately have no persistence, outbox, API or login state.
export function LandingCheckInDemo() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<CheckInAnswers>({});
  const [done, setDone] = useState(false);
  const interacted = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const topic = topics[index];
  const changeStep = (value: number) => { interacted.current = true; setIndex(value); };
  useEffect(() => { if (interacted.current) heading.current?.focus({ preventScroll: true }); }, [index, done]);

  return <div className="moment-demo">
    <nav className="moment-steps" aria-label="Perguntas de exemplo">
      {topics.map((item, position) => {
        const Symbol = symbols[item];
        return <button type="button" key={item} aria-current={position === index ? "step" : undefined} onClick={() => { setDone(false); changeStep(position); }}><Symbol size={18} aria-hidden="true" /><span>{topicLabels[item]}</span></button>;
      })}
    </nav>
    <div className="moment-question-heading">
      <div><p className="moment-kicker">{done ? "Demonstração concluída" : `${index + 1} de 5 · ${topicLabels[topic]}`}</p>
        <h3 tabIndex={-1} ref={heading}>{done ? "É assim: poucos toques." : topic === "note" ? "Quer acrescentar algo?" : momentQuestions[topic]}</h3>
        <p>{done ? "No seu cuidado, as respostas ficam no histórico para conversar com o médico." : topic === "note" ? "O recado é opcional." : "Toque em uma opção para continuar."}</p>
      </div>
      {(topic === "sleep" || topic === "hunger" || topic === "bowel") && !done && <MomentArtwork name={topic === "bowel" ? "bathroom" : topic} />}
    </div>
    {!done && (topic === "energy" || topic === "sleep" || topic === "hunger") && <MomentScale topic={topic} value={answers[topic]} advance onChoose={(value) => { setAnswers({ ...answers, [topic]: value }); changeStep(index + 1); }} />}
    {!done && topic === "bowel" && <div className="moment-bowel-options" role="group" aria-label="Intestino: exemplo">
      {(["poor", "regular", "good"] as const).map((key) => <button type="button" key={key} aria-pressed={answers.bowel_status === key} onClick={() => { setAnswers({ ...answers, bowel_status: key }); changeStep(4); }}><strong>{bowelStatusLabels[key]}</strong><span>Escolher e continuar</span></button>)}
    </div>}
    {!done && topic === "note" && <label>Seu recado <textarea rows={3} maxLength={2000} value={answers.note ?? ""} onChange={(event) => setAnswers({ ...answers, note: event.target.value })} placeholder="Escreva aqui, se quiser." /></label>}
    <div className="moment-demo-actions">
      {index > 0 && !done ? <button type="button" onClick={() => changeStep(index - 1)}>Voltar</button> : <span />}
      {done ? <button type="button" onClick={() => { setAnswers({}); setDone(false); changeStep(0); }}>Experimentar de novo</button> : topic === "note" ? <button type="button" className="moment-primary" onClick={() => { interacted.current = true; setDone(true); }}>Concluir exemplo</button> : <button type="button" onClick={() => changeStep(index + 1)}>Pular</button>}
    </div>
  </div>;
}

export function LandingMealDemo() {
  const [kind, setKind] = useState("lunch");
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  useEffect(() => { if (preview) return () => URL.revokeObjectURL(preview); }, [preview]);
  const pick = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage("Escolha uma imagem JPG ou PNG de até 5 MB."); return;
    }
    setPreview(URL.createObjectURL(file)); setMessage("");
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setMessage(description.trim() || preview ? "Exemplo concluído. No seu cuidado, basta tocar em Salvar refeição." : "Escreva o que comeu ou escolha uma foto para experimentar.");
  };
  return <form className="moment-demo moment-meal" onSubmit={submit}>
    <div className="moment-meal-heading"><div><h3>O que teve na sua refeição?</h3><p>Uma foto, uma descrição ou os dois.</p></div><MomentArtwork name="meal" /></div>
    <fieldset className="pv-fieldset"><legend className="pv-scale-label">Qual refeição?</legend><MealKinds value={kind} onChange={setKind} /></fieldset>
    <label>{preview ? "Quer acrescentar algo?" : "O que você comeu?"}<textarea rows={3} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: arroz, feijão, frango e salada." /></label>
    {preview ? <div className="moment-demo-photo">
      {/* eslint-disable-next-line @next/next/no-img-element -- preview of the local file; no upload in the demo */}
      <img src={preview} alt="Prévia local da refeição" />
      <div className="moment-demo-actions"><button type="button" onClick={() => gallery.current?.click()}>Trocar foto</button><button type="button" onClick={() => { setPreview(""); if (gallery.current) gallery.current.value = ""; if (camera.current) camera.current.value = ""; }}>Remover foto</button></div>
    </div> : <div className="moment-photo-actions"><button type="button" onClick={() => camera.current?.click()}><Camera size={22} aria-hidden="true" />Tirar foto</button><button type="button" onClick={() => gallery.current?.click()}><ImagePlus size={22} aria-hidden="true" />Da galeria</button></div>}
    <input ref={camera} hidden type="file" accept="image/jpeg,image/png" capture="environment" aria-label="Tirar foto de exemplo" onChange={(event) => pick(event.target.files?.[0])} />
    <input ref={gallery} hidden type="file" accept="image/jpeg,image/png" aria-label="Escolher foto de exemplo" onChange={(event) => pick(event.target.files?.[0])} />
    <div className="moment-demo-actions"><span /><button className="moment-primary">Concluir exemplo</button></div>
    {message && <p role="status">{message}</p>}
    <p>Esta é uma demonstração. Texto e foto ficam só nesta tela; nada é salvo ou enviado.</p>
  </form>;
}
