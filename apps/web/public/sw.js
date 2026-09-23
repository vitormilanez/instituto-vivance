// Service worker do Instituto Vivance: só recebe o lembrete e abre o app no
// lugar certo. Não guarda páginas nem dados de saúde em cache.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const url = typeof data.url === "string" && data.url.startsWith("/clinicas/") ? data.url : "/clinicas";
  event.waitUntil(
    self.registration.showNotification(data.title || "Instituto Vivance", {
      body: data.body || "Seu check-in de hoje está esperando.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "vivance-check-in",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/clinicas";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
