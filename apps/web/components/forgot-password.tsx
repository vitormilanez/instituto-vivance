"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";

export function ForgotPassword() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(
      new FormData(event.currentTarget).get("email") ?? "",
    ).trim();
    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      setError("Informe um e-mail válido.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const { url, key } = supabaseConfig();
      // Send-only client: no session is read or persisted here. The implicit
      // recovery link can be opened in the user's email browser, independently
      // of the browser used to request it. FirstAccess explicitly validates and
      // imports the returned session into the SSR cookie client.
      const client = createClient(url, key, {
        auth: {
          flowType: "implicit",
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      const { error: sendError } = await client.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: new URL(
            "/primeiro-acesso",
            window.location.origin,
          ).toString(),
        },
      );
      if (sendError) {
        if (sendError.status === 429) {
          setError(
            "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.",
          );
          return;
        }
        throw new Error();
      }
      setSent(true);
    } catch {
      setError(
        "Não foi possível solicitar o link agora. Tente novamente em alguns minutos.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {sent ? (
        <div className="notice" role="status">
          Se este e-mail possui uma conta, você receberá um link para definir
          uma nova senha. Confira também a pasta de spam e use o e-mail mais
          recente.
        </div>
      ) : (
        <form onSubmit={submit}>
          <p>
            Informe o e-mail da sua conta para receber o link de recuperação.
          </p>
          <div className="field">
            <label htmlFor="recovery-email">E-mail</label>
            <input
              id="recovery-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
            />
          </div>
          {error && (
            <p className="feedback" role="alert">
              {error}
            </p>
          )}
          <button className="full" disabled={pending}>
            {pending ? "Enviando…" : "Enviar link de recuperação"}
          </button>
        </form>
      )}
      <p style={{ marginTop: 24 }}>
        <Link href="/login">Voltar ao login</Link>
      </p>
    </>
  );
}
