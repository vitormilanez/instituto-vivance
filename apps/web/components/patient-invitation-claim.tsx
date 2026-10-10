"use client";

import Link from "next/link";
import { useState } from "react";

export function PatientInvitationClaim({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [enteredEmail, setEnteredEmail] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const confirmedEmail = email.trim();
      const response = await fetch("/api/patient-invitations/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: confirmedEmail }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Não foi possível continuar agora.");
      }
      setEnteredEmail(confirmedEmail);
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
      <h1 id="claim-title">Seu convite para a Vivance</h1>
      <p>
        Confirme o e-mail que você usa ou deseja usar na Vivance. Depois, entre
        na sua conta para aceitar o convite e começar seu cadastro.
      </p>
      {sent ? (
        <div className="invitation-claim-next" role="status">
          <h2>Agora, entre na sua conta</h2>
          <p>
            Se você já usa <strong>{enteredEmail}</strong> na Vivance, entre com
            esse acesso e aceite o convite em Minhas clínicas. Não enviaremos
            outro e-mail para uma conta existente.
          </p>
          <p>
            Se ainda não tem conta, confira o e-mail informado para criar seu
            acesso. Verifique também a pasta de spam.
          </p>
          <Link className="button" href="/clinicas">
            Entrar e ver meu convite
          </Link>
          <button
            className="secondary"
            type="button"
            onClick={() => setSent(false)}
          >
            Corrigir e-mail
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="claim-email">Seu e-mail</label>
            <input
              id="claim-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={pending}
            />
          </div>
          <button type="submit" disabled={pending}>
            {pending ? "Confirmando…" : "Confirmar e continuar"}
          </button>
        </form>
      )}
      {error ? (
        <p className="feedback" role="alert">
          {error}
        </p>
      ) : null}
      {!sent && (
        <p className="invitation-existing-hint">
          Já tem conta? Confirme acima o mesmo e-mail que usa para entrar.
        </p>
      )}
    </section>
  );
}
