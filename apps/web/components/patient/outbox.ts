"use client";

// Envios guardados no celular quando a internet cai. Só o que o servidor já
// torna idempotente entra aqui (check-in, peso e medidas, refeição sem foto):
// cada envio carrega a própria chave, então reenviar nunca duplica.
//
// Cada item leva o dono (a conta que registrou) e a clínica: se outra pessoa
// entrar neste aparelho, os envios guardados não saem em nome dela.

const KEY = "pv-outbox-v1";
const EVENT = "pv-outbox";
const MAX_ITEMS = 30;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type OutboxItem = {
  id: string;
  owner: string;
  url: string;
  body: string;
  label: string;
  createdAt: number;
};

function read(): OutboxItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const items = raw ? (JSON.parse(raw) as OutboxItem[]) : [];
    return Array.isArray(items) ? items.filter((item) => Date.now() - item.createdAt < MAX_AGE_MS) : [];
  } catch {
    return [];
  }
}

function write(items: OutboxItem[]) {
  try {
    if (items.length) window.localStorage.setItem(KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Sem armazenamento (aba privada): o envio simplesmente não fica guardado.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function pendingFor(owner: string) {
  return read().filter((item) => item.owner === owner);
}

export function onOutboxChange(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function enqueue(item: Omit<OutboxItem, "id" | "createdAt">) {
  const items = read();
  write([...items, { ...item, id: crypto.randomUUID(), createdAt: Date.now() }]);
}

// A pessoa da conta atual, publicada pela moldura do paciente.
export function currentOwner() {
  return document.querySelector<HTMLElement>("[data-pv-owner]")?.dataset.pvOwner ?? "";
}

const isNetworkFailure = (reason: unknown) =>
  reason instanceof TypeError || (reason instanceof Error && reason.name === "TimeoutError");

// Envia agora; se não houver internet, guarda e devolve "queued". Erros do
// servidor (dado inválido, sem permissão) voltam como resposta normal.
export async function sendOrQueue(url: string, payload: unknown, label: string) {
  const body = JSON.stringify(payload);
  const owner = currentOwner();
  const queue = () => {
    if (!owner) return false;
    enqueue({ owner, url, body, label });
    return true;
  };
  if (typeof navigator !== "undefined" && navigator.onLine === false && queue()) {
    return { queued: true as const };
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20_000),
      body,
    });
    return { queued: false as const, response };
  } catch (reason) {
    if (isNetworkFailure(reason) && queue()) return { queued: true as const };
    throw reason;
  }
}

let flushing = false;

// Tenta mandar o que ficou guardado, na ordem. Para no primeiro sinal de falta
// de internet; descarta o que o servidor recusar de vez (4xx), para não travar
// a fila — o resto continua.
export async function flushOutbox(owner: string) {
  if (flushing || !owner) return;
  flushing = true;
  try {
    for (const item of pendingFor(owner)) {
      let drop = false;
      try {
        const response = await fetch(item.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(20_000),
          body: item.body,
        });
        if (response.ok) drop = true;
        else if (response.status === 401) break;
        else if (response.status >= 400 && response.status < 500 && ![408, 425, 429].includes(response.status)) drop = true;
        else break;
      } catch {
        break;
      }
      if (drop) write(read().filter((other) => other.id !== item.id));
    }
  } finally {
    flushing = false;
  }
}
