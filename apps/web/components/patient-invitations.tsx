"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type PatientInvitation = {
  id: string;
  tenantId: string;
  clinicName: string;
  displayName: string;
  status: "pending";
  expiresAt: string;
  createdAt: string;
};

export function PatientInvitations({
  invitations,
}: {
  invitations: PatientInvitation[];
}) {
  const router = useRouter();
  const [reviewing, setReviewing] = useState<string>();
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState("");

  async function accept(invitation: PatientInvitation) {
    setPending(invitation.id);
    setError("");
    try {
      const response = await fetch("/api/patient-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: invitation.id, accept: true }),
      });
      const payload = (await response.json()) as {
        error?: string;
        clinic?: { tenantId: string };
      };
      if (!response.ok)
        throw new Error(
          payload.error ?? "Não foi possível aceitar este convite.",
        );
      router.push(
        `/clinicas/${payload.clinic?.tenantId ?? invitation.tenantId}/primeiros-passos`,
      );
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível aceitar este convite.",
      );
      setPending(undefined);
    }
  }

  if (!invitations.length) return null;
  return (
    <section
      className="panel patient-invitations"
      aria-labelledby="patient-invitations-title"
    >
      <h2 id="patient-invitations-title">Convites para você</h2>
      <p>Escolha a clínica que deseja adicionar ao seu cuidado.</p>
      {error ? (
        <p className="feedback" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="invitation-list">
        {invitations.map((invitation) => (
          <li key={invitation.id}>
            <div>
              <strong>{invitation.clinicName}</strong>
              <span>Convite para {invitation.displayName}</span>
              <small>
                Disponível até{" "}
                {new Date(invitation.expiresAt).toLocaleDateString("pt-BR")}
              </small>
            </div>
            {reviewing === invitation.id ? (
              <div className="inline-confirm">
                <p>
                  Ao continuar, esta clínica poderá abrir seu cadastro de
                  cuidado.
                </p>
                <div className="button-row">
                  <button
                    type="button"
                    disabled={pending === invitation.id}
                    onClick={() => accept(invitation)}
                  >
                    {pending === invitation.id
                      ? "Aceitando…"
                      : "Aceitar convite"}
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    disabled={pending === invitation.id}
                    onClick={() => setReviewing(undefined)}
                  >
                    Voltar
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="secondary"
                type="button"
                onClick={() => setReviewing(invitation.id)}
              >
                Revisar convite
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
