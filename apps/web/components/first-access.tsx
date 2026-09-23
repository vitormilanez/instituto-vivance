"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

export function FirstAccess() {
  const started = useRef(false);
  const [email, setEmail] = useState("");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function acceptInvitation() {
      // Default Supabase invitation emails return credentials in the fragment.
      // Remove them before any navigation, and never include them in logs.
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const query = new URLSearchParams(window.location.search);
      window.history.replaceState(null, "", "/primeiro-acesso");
      const client = createClient();
      if (fragment.has("error") || query.has("error")) throw new Error();
      const access_token = fragment.get("access_token");
      const refresh_token = fragment.get("refresh_token");
      if (access_token || refresh_token) {
        if (
          !access_token ||
          !refresh_token ||
          !["invite", "recovery"].includes(fragment.get("type") ?? "")
        )
          throw new Error();
        const result = await client.auth.setSession({
          access_token,
          refresh_token,
        });
        if (result.error) throw new Error();
      } else if (query.get("code")) {
        const result = await client.auth.exchangeCodeForSession(
          query.get("code")!,
        );
        if (result.error) throw new Error();
      }
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) throw new Error();
      setEmail(data.user.email ?? "");
      setReady(true);
    }
    void acceptInvitation().catch(() =>
      setError(
        "Este link está inválido ou expirou. Solicite um novo link de recuperação de senha.",
      ),
    );
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (
      password.length < 8 ||
      password.length > 128 ||
      password !== form.get("confirm")
    ) {
      setError(
        "Use de 8 a 128 caracteres e repita a mesma senha nos dois campos.",
      );
      return;
    }
    setPending(true);
    setError("");
    try {
      const client = createClient();
      const { data, error: sessionError } = await client.auth.getUser();
      if (sessionError || !data.user) throw new Error();
      const { error } = await client.auth.updateUser({ password });
      if (error) throw new Error();
      window.location.replace("/clinicas");
    } catch {
      setError(
        "Não foi possível salvar a senha. Tente uma senha diferente ou solicite um novo link de recuperação.",
      );
      setPending(false);
    }
  }

  return (
    <>
      {!ready && !error && <p role="status">Validando seu acesso…</p>}
      {ready && (
        <form onSubmit={submit}>
          <p>Seu acesso: {email}</p>
          <div className="field">
            <label htmlFor="password">Nova senha</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="confirm">Repita a senha</label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </div>
          <button className="full" disabled={pending}>
            {pending ? "Salvando…" : "Salvar senha e entrar"}
          </button>
        </form>
      )}
      {error && (
        <p className="feedback" role="alert">
          {error}
        </p>
      )}
      <p style={{ marginTop: 24 }}>
        <Link href="/esqueci-minha-senha" prefetch={false}>
          Solicitar novo link
        </Link>
      </p>
      <p>
        <Link href="/login" prefetch={false}>
          Voltar ao login
        </Link>
      </p>
    </>
  );
}
