import { InputError } from "../../lib/validation.ts";

// Horários oferecidos: das 6h às 21h45, de 15 em 15 minutos (o agendador
// passa a cada 15 minutos). As quatro sugestões da tela vêm primeiro.
export const reminderSuggestions = [
  { time: "08:00", label: "Ao acordar" },
  { time: "09:00", label: "Manhã" },
  { time: "12:00", label: "Almoço" },
  { time: "20:00", label: "Noite" },
] as const;

export function reminderInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("Lembrete inválido.");
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => key !== "enabled" && key !== "time")) throw new InputError("Lembrete inválido.");
  if (typeof body.enabled !== "boolean") throw new InputError("Lembrete inválido.");
  const time = typeof body.time === "string" ? body.time : "09:00";
  const match = /^([01]\d|2[0-3]):(00|15|30|45)$/.exec(time);
  if (!match || time < "06:00" || time > "21:45") throw new InputError("Escolha um horário entre 6h e 21h45.");
  return { enabled: body.enabled, time };
}

export function subscriptionInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("Inscrição inválida.");
  const body = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const endpoint = body.endpoint;
  const p256dh = body.keys?.p256dh;
  const auth = body.keys?.auth;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 1000)
    throw new InputError("Inscrição inválida.");
  if (typeof p256dh !== "string" || !/^[A-Za-z0-9_-]{20,200}$/.test(p256dh)) throw new InputError("Inscrição inválida.");
  if (typeof auth !== "string" || !/^[A-Za-z0-9_-]{8,100}$/.test(auth)) throw new InputError("Inscrição inválida.");
  return { endpoint, p256dh, auth };
}

export function reminderLabel(pref: { reminder_enabled: boolean; reminder_time: string } | null, frequencyDays: number) {
  if (!pref || !pref.reminder_enabled) return "Desligado";
  const time = pref.reminder_time.slice(0, 5);
  return `${frequencyDays === 3 ? "A cada 3 dias" : "Todos os dias"} às ${time} · notificação`;
}

// O texto do lembrete: nada de saúde, nada que alguém ao lado leia e entenda
// sobre o tratamento.
export const reminderMessage = {
  title: "Instituto Vivance",
  body: "Seu check-in de hoje está esperando. Leva cerca de 1 minuto.",
};
