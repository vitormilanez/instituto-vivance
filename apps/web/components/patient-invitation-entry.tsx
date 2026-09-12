"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PatientInvitationClaim } from "./patient-invitation-claim";

export function PatientInvitationEntry() {
  const [token, setToken] = useState<string | null>(null);
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const value = window.location.hash.slice(1);
    // Keep the invitation secret out of navigation history and referrers.
    window.history.replaceState(null, "", "/convite");
    // One hydration update imports browser-only URL state, then removes the secret.
    setToken(/^[A-Za-z0-9_-]{43}$/.test(value) ? value : "");
  }, []);

  if (token === null) return <p role="status">Abrindo seu convite…</p>;
  if (!token)
    return (
      <>
        <h1>Vamos conferir seu convite</h1>
        <p>
          Abra novamente o link completo que a clínica enviou. Se precisar, peça
          um novo convite.
        </p>
        <Link href="/">Já tenho acesso</Link>
      </>
    );
  return <PatientInvitationClaim token={token} />;
}
