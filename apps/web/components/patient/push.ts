"use client";

// Inscrição do aparelho para receber o lembrete. Tudo opcional: sem suporte
// ou sem permissão, o app segue igual.
export type PushSupport = "ok" | "needs-install" | "unsupported";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const hasPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (hasPush) return "ok";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  return ios && !standalone ? "needs-install" : "unsupported";
}

function base64ToBytes(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export async function subscribeThisDevice(tenantId: string): Promise<"subscribed" | "denied" | "unsupported" | "failed"> {
  if (pushSupport() !== "ok") return "unsupported";
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(key) }));
    const response = await fetch(`/api/v1/clinics/${tenantId}/push-subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
    return response.ok ? "subscribed" : "failed";
  } catch {
    return "failed";
  }
}
