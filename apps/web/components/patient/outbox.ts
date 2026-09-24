"use client";

// Fila local apenas para os POSTs idempotentes do paciente. O corpo é mantido
// exatamente como foi criado: uma recuperação nunca troca a chave da
// solicitação nem tenta enviar em outra conta ou clínica.

const KEY = "pv-outbox-v1";
const EVENT = "pv-outbox";
const MAX_ITEMS = 30;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type OutboxStatus = "pending" | "sent" | "failed";
export type OutboxItem = {
  id: string;
  owner: string;
  tenantId: string;
  url: string;
  body: string;
  label: string;
  createdAt: number;
  status: OutboxStatus;
  failure?: "expired" | "rejected";
  sentAt?: number;
};

export type OutboxSnapshot = { items: OutboxItem[]; storageError: boolean };

export class OutboxStorageError extends Error {
  constructor(message = "Não foi possível guardar este registro no celular. Libere espaço ou tente novamente com internet.") {
    super(message);
    this.name = "OutboxStorageError";
  }
}

const tenantFromUrl = (url: string) => {
  const match = /^\/api\/v1\/clinics\/([^/]+)\//.exec(url);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
};

function currentTenant() {
  const match = /^\/clinicas\/([^/]+)\//.exec(window.location?.pathname ?? "");
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

function normalize(value: unknown): OutboxItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<OutboxItem>;
  if (
    typeof item.id !== "string" || typeof item.owner !== "string" || typeof item.url !== "string" ||
    typeof item.body !== "string" || typeof item.label !== "string" || typeof item.createdAt !== "number"
  ) return null;
  const tenantId = typeof item.tenantId === "string" ? item.tenantId : tenantFromUrl(item.url);
  if (!tenantId) return null;
  const status: OutboxStatus = item.status === "sent" || item.status === "failed" ? item.status : "pending";
  if (status === "pending" && Date.now() - item.createdAt >= MAX_AGE_MS)
    return { ...item, tenantId, status: "failed", failure: "expired" } as OutboxItem;
  return { ...item, tenantId, status } as OutboxItem;
}

function load(): { items: OutboxItem[]; error: boolean; changed: boolean } {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { items: [], error: false, changed: false };
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return { items: [], error: true, changed: false };
    const items = parsed.map(normalize);
    if (items.some((item) => item === null)) return { items: [], error: true, changed: false };
    const normalized = items as OutboxItem[];
    return { items: normalized, error: false, changed: JSON.stringify(normalized) !== raw };
  } catch {
    return { items: [], error: true, changed: false };
  }
}

function store(items: OutboxItem[], notify = true) {
  try {
    if (items.length) window.localStorage.setItem(KEY, JSON.stringify(items));
    else window.localStorage.removeItem(KEY);
    if (notify) window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    if (notify) window.dispatchEvent(new Event(EVENT));
    return false;
  }
}

function scoped(owner: string, tenantId: string) {
  const loaded = load();
  const normalizationFailed = !loaded.error && loaded.changed && !store(loaded.items, false);
  return {
    ...loaded,
    error: loaded.error || normalizationFailed,
    items: loaded.items.filter((item) => item.owner === owner && item.tenantId === tenantId),
  };
}

export function outboxSnapshot(owner: string, tenantId = currentTenant()): OutboxSnapshot {
  const result = scoped(owner, tenantId);
  return { items: result.items, storageError: result.error };
}

export function pendingFor(owner: string, tenantId = currentTenant()) {
  return outboxSnapshot(owner, tenantId).items.filter((item) => item.status === "pending");
}

export function onOutboxChange(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function enqueue(item: Omit<OutboxItem, "id" | "createdAt" | "status">) {
  const loaded = load();
  if (loaded.error) throw new OutboxStorageError("Há registros locais que não conseguimos ler. Não apagamos esses dados; tente novamente com internet.");
  if (loaded.items.length >= MAX_ITEMS)
    throw new OutboxStorageError("A fila do celular está cheia. Revise os envios pendentes antes de registrar outro item sem internet.");
  const next = [...loaded.items, { ...item, id: crypto.randomUUID(), createdAt: Date.now(), status: "pending" as const }];
  if (!store(next)) throw new OutboxStorageError();
}

export function currentOwner() {
  return document.querySelector<HTMLElement>("[data-pv-owner]")?.dataset.pvOwner ?? "";
}

const isNetworkFailure = (reason: unknown) =>
  reason instanceof TypeError || (reason instanceof Error && reason.name === "TimeoutError");

export async function sendOrQueue(url: string, payload: unknown, label: string) {
  const body = JSON.stringify(payload);
  const owner = currentOwner();
  const tenantId = tenantFromUrl(url);
  const queue = () => {
    if (!owner || !tenantId) throw new OutboxStorageError("Não foi possível confirmar a conta e a clínica deste registro.");
    enqueue({ owner, tenantId, url, body, label });
    return { queued: true as const };
  };
  if (typeof navigator !== "undefined" && navigator.onLine === false) return queue();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20_000),
      body,
    });
    return { queued: false as const, response };
  } catch (reason) {
    if (isNetworkFailure(reason)) return queue();
    throw reason;
  }
}

let flushing = false;

export async function flushOutbox(owner: string, tenantId = currentTenant()) {
  if (flushing || !owner || !tenantId) return;
  flushing = true;
  try {
    const loaded = load();
    if (loaded.error) return;
    if (loaded.changed && !store(loaded.items, false)) return;
    const candidateIds = loaded.items
      .filter((entry) => entry.owner === owner && entry.tenantId === tenantId && entry.status === "pending")
      .map((entry) => entry.id);
    for (const id of candidateIds) {
      // A sessão ou a rota pode mudar enquanto uma resposta está no ar. Nunca
      // continue a sequência no contexto de outra conta ou clínica.
      if (currentOwner() !== owner || currentTenant() !== tenantId) break;
      const beforeSend = load();
      if (beforeSend.error) break;
      const item = beforeSend.items.find((entry) =>
        entry.id === id && entry.owner === owner && entry.tenantId === tenantId && entry.status === "pending",
      );
      // Pode ter sido descartado ou alterado enquanto outro envio terminava.
      if (!item) continue;
      try {
        const response = await fetch(item.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(20_000),
          body: item.body,
        });
        if (response.status === 401) {
          break;
        }
        const latest = load();
        if (latest.error) break;
        const stillQueued = latest.items.some((entry) =>
          entry.id === id && entry.owner === owner && entry.tenantId === tenantId && entry.status === "pending",
        );
        // Um descarte feito durante o fetch vence; a resposta não o recria.
        if (!stillQueued) continue;
        let next: OutboxItem[];
        if (response.ok) {
          next = latest.items.map((other) => other.id === id ? {
            ...other,
            body: "",
            status: "sent" as const,
            sentAt: Date.now(),
            failure: undefined,
          } : other);
        } else if (response.status >= 400 && response.status < 500 && ![408, 425, 429].includes(response.status)) {
          next = latest.items.map((other) => other.id === id ? { ...other, status: "failed" as const, failure: "rejected" as const } : other);
        } else {
          break;
        }
        if (!store(next)) break;
      } catch {
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

export async function retryOutboxItem(id: string, owner: string, tenantId = currentTenant()) {
  const loaded = load();
  if (loaded.error) throw new OutboxStorageError("Não foi possível ler os registros guardados neste celular.");
  const item = loaded.items.find((entry) => entry.id === id);
  if (!item || item.owner !== owner || item.tenantId !== tenantId) return false;
  const next = loaded.items.map((entry) => entry.id === id ? { ...entry, status: "pending" as const, failure: undefined, createdAt: Date.now() } : entry);
  if (!store(next)) throw new OutboxStorageError();
  await flushOutbox(owner, tenantId);
  return true;
}

export function discardOutboxItem(id: string, owner: string, tenantId = currentTenant()) {
  const loaded = load();
  if (loaded.error) throw new OutboxStorageError("Não foi possível ler os registros guardados neste celular.");
  const item = loaded.items.find((entry) => entry.id === id);
  if (!item || item.owner !== owner || item.tenantId !== tenantId) return false;
  if (!store(loaded.items.filter((entry) => entry.id !== id))) throw new OutboxStorageError();
  return true;
}
