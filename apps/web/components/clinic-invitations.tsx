"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ClinicInvitation } from "@/modules/identity/service";

const roles: Record<string, string> = {
  doctor: "Médico",
  nurse: "Enfermagem",
};

export function ClinicInvitations({
  invitations,
}: {
  invitations: ClinicInvitation[];
}) {
  const router = useRouter();
  const [reviewId, setReviewId] = useState<string>();
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  function accept(invitation: ClinicInvitation) {
    startTransition(async () => {
      setFeedback("");
      try {
        const response = await fetch(
          `/api/v1/clinics/${invitation.id}/membership/accept`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ version: invitation.version }),
          },
        );
        const body = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Não foi possível aceitar.");
        setReviewId(undefined);
        router.refresh();
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "Não foi possível aceitar o convite.",
        );
      }
    });
  }

  if (invitations.length === 0) return null;
  return (
    <section className="panel invitation-panel" aria-labelledby="invites-title">
      <h2 id="invites-title">Convites pendentes</h2>
      <p>
        Revise o papel antes de aceitar. O acesso à clínica só começa após sua
        confirmação.
      </p>
      <ul className="list">
        {invitations.map((invitation) => (
          <li key={invitation.id}>
            <strong>{invitation.name}</strong>
            <small>{roles[invitation.role] ?? invitation.role}</small>
            {reviewId === invitation.id ? (
              <div
                className="inline-confirm"
                role="group"
                aria-label="Revisão do convite da clínica"
              >
                <p>
                  Confirmar entrada como {roles[invitation.role]} nesta clínica?
                </p>
                <div className="button-row">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => accept(invitation)}
                  >
                    {isPending ? "Confirmando…" : "Aceitar convite"}
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    disabled={isPending}
                    onClick={() => setReviewId(undefined)}
                  >
                    Voltar
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="secondary compact-button"
                type="button"
                onClick={() => {
                  setFeedback("");
                  setReviewId(invitation.id);
                }}
              >
                Revisar convite
              </button>
            )}
          </li>
        ))}
      </ul>
      {feedback ? (
        <p className="feedback" role="alert">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}
