"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "./icons";
import { discardOutboxItem, flushOutbox, onOutboxChange, outboxSnapshot, retryOutboxItem, type OutboxSnapshot } from "./outbox";

const subscribeOnline = (listener: () => void) => {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
};

const empty: OutboxSnapshot = { items: [], storageError: false };

export function ConnectionStatus({ owner }: { owner: string }) {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [snapshot, setSnapshot] = useState<OutboxSnapshot>(empty);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const update = () => setSnapshot(outboxSnapshot(owner));
    update();
    return onOutboxChange(update);
  }, [owner]);

  useEffect(() => {
    if (!online) return;
    void flushOutbox(owner);
    const timer = window.setInterval(() => void flushOutbox(owner), 30_000);
    return () => window.clearInterval(timer);
  }, [online, owner]);

  const pending = snapshot.items.filter((item) => item.status === "pending");
  const failed = snapshot.items.filter((item) => item.status === "failed");
  const sent = snapshot.items.filter((item) => item.status === "sent");
  if (online && snapshot.items.length === 0 && !snapshot.storageError && !actionError) return null;

  const discard = (id: string, status: "pending" | "sent" | "failed") => {
    if (status !== "sent" && !window.confirm("Descartar este envio do celular? Ele não será enviado automaticamente.")) return;
    try {
      setActionError("");
      discardOutboxItem(id, owner);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Não foi possível descartar o registro.");
    }
  };
  const retry = async (id: string) => {
    try {
      setActionError("");
      await retryOutboxItem(id, owner);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Não foi possível tentar novamente.");
    }
  };

  return (
    <div className="pv-connection" role="status">
      <Icon name={online ? "refresh" : "wifiOff"} size={20} />
      <div>
        {!online && <p>Sem conexão. Check-ins, peso, medidas e refeições sem foto podem ficar guardados. Fotos e pré-consulta precisam de internet.</p>}
        {online && pending.length > 0 && <p>Enviando {pending.length === 1 ? "1 registro guardado" : `${pending.length} registros guardados`}…</p>}
        {sent.length > 0 && <p>{sent.length === 1 ? "1 registro foi enviado." : `${sent.length} registros foram enviados.`}</p>}
        {failed.length > 0 && <p>{failed.length === 1 ? "1 registro precisa da sua atenção." : `${failed.length} registros precisam da sua atenção.`}</p>}
        {snapshot.storageError && <p>Há registros locais que não conseguimos ler. Eles não foram apagados. Tente novamente com internet.</p>}
        {actionError && <p role="alert">{actionError}</p>}
        {snapshot.items.map((item) => (
          <div key={item.id}>
            <p>{item.label}: {item.status === "pending" ? "pendente" : item.status === "sent" ? "enviado" : item.failure === "expired" ? "prazo de envio expirado" : "não aceito"}.</p>
            {item.status === "failed" && online && <button type="button" className="pv-link" onClick={() => void retry(item.id)}>Tentar novamente</button>}
            <button type="button" className="pv-link" onClick={() => discard(item.id, item.status)}>
              {item.status === "sent" ? "Fechar confirmação" : "Descartar envio"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
