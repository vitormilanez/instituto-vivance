"use client";

import type { ReactNode } from "react";

// Abre o registro original e, se ainda não foi aberto por esta pessoa, avisa o
// servidor antes de sair da página. `keepalive` deixa o aviso terminar mesmo
// com a navegação; se ele falhar, o item só continua "novo" — nada quebra.
export function ReceivedLink({
  tenantId,
  kind,
  itemId,
  href,
  unseen,
  children,
}: {
  tenantId: string;
  kind: string;
  itemId: string;
  href: string;
  unseen: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={() => {
        if (!unseen) return;
        void fetch(`/api/v1/clinics/${tenantId}/received/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, item_id: itemId }),
          keepalive: true,
        }).catch(() => undefined);
      }}
    >
      {children}
    </a>
  );
}
