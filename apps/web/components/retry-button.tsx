"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

// Recarrega os dados do servidor sem perder a posição na página.
export function RetryButton({ label = "Tentar de novo" }: { label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="secondary compact-button"
      disabled={pending}
      onClick={() => start(() => router.refresh())}
    >
      {pending ? "Carregando…" : label}
    </button>
  );
}
