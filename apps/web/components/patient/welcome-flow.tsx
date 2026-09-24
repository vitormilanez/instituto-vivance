"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reminderSuggestions } from "@/modules/reminders/model";
import { Icon, Mark } from "./icons";
import { pushSupport, subscribeThisDevice } from "./push";

const times = Array.from({ length: 64 }, (_, index) => {
  const minutes = 6 * 60 + index * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

// Primeiro acesso (três telas) e, no modo "lembrete", só a escolha do
// horário. A permissão de notificação é pedida depois que a pessoa escolhe o
// horário — no momento em que faz sentido.
export function WelcomeFlow({
  tenantId,
  base,
  firstName,
  doctorName,
  frequencyDays,
  initialTime,
  mode,
}: {
  tenantId: string;
  base: string;
  firstName: string | null;
  doctorName: string | null;
  frequencyDays: number;
  initialTime: string;
  mode: "welcome" | "reminder";
}) {
  const router = useRouter();
  const [step, setStep] = useState(mode === "welcome" ? 0 : 2);
  const [time, setTime] = useState(initialTime);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState<"install" | "denied" | "unsupported" | "failed" | "">("");
  const doctor = doctorName ?? "seu médico";

  async function save(enabled: boolean) {
    const response = await fetch(`/api/v1/clinics/${tenantId}/reminders`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, time }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar.");
  }

  async function finish(enabled: boolean) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await save(enabled);
      if (enabled) {
        const support = pushSupport();
        if (support === "needs-install") {
          setNote("install");
          setPending(false);
          return;
        }
        const outcome = await subscribeThisDevice(tenantId);
        if (outcome !== "subscribed") {
          setNote(outcome);
          setPending(false);
          return;
        }
      }
      router.push(`${base}/hoje${enabled ? "?enviado=lembrete" : ""}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar.");
      setPending(false);
    }
  }

  if (note)
    return (
      <div className="pv-stack">
        <h2 className="pv-big">
          {note === "install" ? "Falta um passo no iPhone" :
            note === "denied" ? "Notificações não foram permitidas" :
              note === "unsupported" ? "Este aparelho não oferece notificações" :
                "Não conseguimos ativar neste aparelho"}
        </h2>
        {note === "install" ? (
          <>
            <p className="pv-lead">Seu horário foi salvo, mas as notificações ainda não estão ativas neste aparelho.</p>
            <ol className="pv-steps">
              <li>Toque em <strong>Compartilhar</strong> (o quadrado com a seta) no Safari.</li>
              <li>Escolha <strong>Adicionar à Tela de Início</strong>.</li>
              <li>Abra o Vivance pelo ícone novo e ative em <strong>Meu cuidado › Lembretes</strong>.</li>
            </ol>
          </>
        ) : (
          <p className="pv-lead">
            Seu horário foi salvo, mas as notificações não estão ativas neste aparelho. {note === "denied"
              ? "Se mudar de ideia, permita as notificações do site nas configurações do navegador e tente novamente em Meu cuidado › Lembretes."
              : note === "unsupported"
                ? "Você ainda pode acompanhar os check-ins ao abrir o Vivance."
                : "Confira sua conexão e tente novamente em Meu cuidado › Lembretes."}
          </p>
        )}
        <button type="button" className="pv-button is-center" onClick={() => router.push(`${base}/hoje`)}>
          Ir para o início
        </button>
      </div>
    );

  if (step === 0)
    return (
      <div className="pv-welcome pv-welcome-dark">
        <Mark size={56} />
        <h2>Olá{firstName ? `, ${firstName}` : ""}. Que bom ter você aqui.</h2>
        <p>No Instituto Vivance, {doctor} acompanha seu tratamento também entre as consultas.</p>
        <button type="button" className="pv-button is-gold" onClick={() => setStep(1)}>
          Começar
          <Icon name="arrow" size={22} />
        </button>
      </div>
    );

  if (step === 1)
    return (
      <div className="pv-stack">
        <p className="pv-eyebrow">O nosso combinado</p>
        <h2 className="pv-big">Assim funciona o seu acompanhamento</h2>
        <ol className="pv-promise">
          <li>
            <span>1</span>
            <div><strong>Responda o check-in quando o app lembrar</strong><small>Leva cerca de 1 minuto, com toques.</small></div>
          </li>
          <li>
            <span>2</span>
            <div><strong>Registre peso e refeições quando quiser</strong><small>Tudo fica guardado do jeito que você enviou.</small></div>
          </li>
          <li>
            <span>3</span>
            <div><strong>{doctor.charAt(0).toUpperCase() + doctor.slice(1)} acompanha seus registros</strong><small>E conversa com você na consulta. O app não é canal de urgência.</small></div>
          </li>
        </ol>
        <button type="button" className="pv-button is-center" onClick={() => setStep(2)}>Entendi</button>
      </div>
    );

  return (
    <div className="pv-stack">
      <p className="pv-eyebrow">Lembretes</p>
      <h2 className="pv-big">Quando podemos lembrar você do check-in?</h2>
      <p className="pv-lead">
        Um lembrete gentil, {frequencyDays === 3 ? "a cada 3 dias" : "uma vez por dia"}. Se um dia não der, tudo bem — é só responder no próximo.
      </p>
      <div className="pv-time-grid">
        {reminderSuggestions.map((item) => (
          <button key={item.time} type="button" className="pv-time" aria-pressed={time === item.time} onClick={() => setTime(item.time)}>
            <strong>{item.time}</strong>
            <small>{item.label}</small>
          </button>
        ))}
      </div>
      <label className="pv-field">
        Outro horário
        <select value={time} onChange={(event) => setTime(event.target.value)}>
          {times.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </label>
      {error && <p className="pv-form-error" role="alert">{error}</p>}
      <button type="button" className="pv-button is-center" disabled={pending} onClick={() => finish(true)}>
        {pending ? "Salvando…" : "Ativar lembretes"}
      </button>
      <button type="button" className="pv-link pv-center-self" disabled={pending} onClick={() => finish(false)}>
        {mode === "welcome" ? "Agora não" : "Desligar lembretes"}
      </button>
    </div>
  );
}
