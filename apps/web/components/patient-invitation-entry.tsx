"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PatientInvitationClaim } from "./patient-invitation-claim";

export function PatientInvitationEntry() {
  const [token, setToken] = useState<string | null>(null);
  const activeToken = useRef<string | null>(null);
  useEffect(() => {
    const consumeToken = () => {
      const value = window.location.hash.slice(1);
      // Strict Mode can rerun this effect after the fragment was removed.
      // Keep a valid token in memory, and also handle a second link opened
      // while this route is already mounted.
      if (!value && activeToken.current) return;
      window.history.replaceState(null, "", "/convite");
      const next = /^[A-Za-z0-9_-]{43}$/.test(value) ? value : "";
      activeToken.current = next || null;
      setToken(next);
    };
    consumeToken();
    window.addEventListener("hashchange", consumeToken);
    return () => window.removeEventListener("hashchange", consumeToken);
  }, []);

  if (token === null) return <p role="status">Abrindo seu convite…</p>;
  if (!token)
    return (
      <section className="patient-invitation-claim">
        <h1>Vamos conferir seu convite</h1>
        <p>
          Abra novamente o link completo que a clínica enviou. Se precisar, peça
          um novo convite.
        </p>
        <Link href="/login">Já tenho acesso</Link>
      </section>
    );
  return <PatientInvitationClaim token={token} />;
}
