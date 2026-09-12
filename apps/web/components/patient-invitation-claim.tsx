"use client";

import Link from "next/link";
import { useState } from "react";

export function PatientInvitationClaim({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const email = String(
        new FormData(event.currentTarget).get("email") ?? "",
      ).trim();
      const response = await fetch("/api/patient-invitations/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Não foi possível continuar agora.");
      }
      setSent(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível continuar agora.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="patient-invitation-claim" aria-labelledby="claim-title">
      <h1 id="claim-title">Vamos criar seu acesso</h1>
      <p>
        Informe seu e-mail. Enviaremos uma confirmação para proteger seu acesso
        à clínica.
      </p>
      {sent ? (
        <p className="notice" role="status">
          Se este convite puder ser confirmado, as próximas instruções serão
          enviadas para o e-mail informado.
        </p>
      ) : (
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="claim-email">Seu e-mail</label>
            <input
              id="claim-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={pending}
            />
          </div>
          <button type="submit" disabled={pending}>
            {pending ? "Enviando…" : "Continuar"}
          </button>
        </form>
      )}
      {error ? (
        <p className="feedback" role="alert">
          {error}
        </p>
      ) : null}
      <p>
        <Link href="/">Já tenho conta: entrar para revisar convite</Link>
      </p>
    </section>
  );
}
