"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "./icons";
import { flushOutbox, onOutboxChange, pendingFor } from "./outbox";

const subscribeOnline = (listener: () => void) => {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
};

// Aviso fixo quando a internet cai, e o que ficou guardado no celular
// esperando para sair. Quando a conexão volta, envia sozinho.
export function ConnectionStatus({ owner }: { owner: string }) {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const update = () => setPending(pendingFor(owner).length);
    update();
    return onOutboxChange(update);
  }, [owner]);

  useEffect(() => {
    if (!online) return;
    void flushOutbox(owner);
    const timer = window.setInterval(() => void flushOutbox(owner), 30_000);
    return () => window.clearInterval(timer);
  }, [online, owner]);

  if (online && pending === 0) return null;
  return (
    <div className="pv-connection" role="status">
      <Icon name={online ? "refresh" : "wifiOff"} size={20} />
      <p>
        {!online
          ? "Sem conexão. Pode registrar normalmente — enviamos quando a internet voltar."
          : `Enviando ${pending === 1 ? "1 registro guardado" : `${pending} registros guardados`} no seu celular…`}
      </p>
    </div>
  );
}
