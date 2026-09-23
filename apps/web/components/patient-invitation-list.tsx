"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { invitationDeliveryLabel } from "@/modules/onboarding/invitation-delivery";

type Invitation = {
  id: string;
  displayName: string;
  status: string;
  channel: string;
  expiresAt: string;
  delivery: { status: string };
};
const deliveryText = (invitation: Invitation) => {
  const delivery = invitationDeliveryLabel({
    channel: invitation.channel,
    status: invitation.status,
    deliveryStatus: invitation.delivery.status,
  });
  return delivery ? ` · ${delivery}` : "";
};

export function PatientInvitationList({
  tenantId,
  invitations,
}: {
  tenantId: string;
  invitations: Invitation[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string>();
  const [confirming, setConfirming] = useState<string>();
  const [error, setError] = useState("");
  async function revoke(id: string) {
    setPending(id);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/clinics/${tenantId}/patient-invitations/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "revoke" }),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Não foi possível cancelar o convite.");
      setConfirming(undefined);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tente novamente.");
    } finally {
      setPending(undefined);
    }
  }
  if (!invitations.length) return null;
  const labels: Record<string, string> = {
    pending: "Aguardando aceite",
    accepted: "Aceito",
    revoked: "Cancelado",
    expired: "Expirado",
  };
  return (
    <section className="panel">
      <h2>Convites recentes</h2>
      <p>Até 100 convites. Cancelar um convite pendente desativa seu link.</p>
      {error && (
        <p role="alert" className="feedback">
          {error}
        </p>
      )}
      <ul className="list">
        {invitations.map((invitation) => (
          <li key={invitation.id}>
            <div>
              <strong>{invitation.displayName}</strong>
              <p>
                {labels[invitation.status] ?? invitation.status}
                {deliveryText(invitation)}
              </p>
              {invitation.status === "pending" && (
                <small>
                  Disponível até{" "}
                  {new Date(invitation.expiresAt).toLocaleDateString("pt-BR")}
                </small>
              )}
            </div>
            {invitation.status === "pending" && (
              <div>
                {confirming === invitation.id ? (
                  <>
                    <p>
                      Cancelar este convite? A pessoa precisará de um novo para
                      entrar.
                    </p>
                    <button
                      type="button"
                      disabled={Boolean(pending)}
                      onClick={() => void revoke(invitation.id)}
                    >
                      {pending === invitation.id
                        ? "Cancelando…"
                        : "Confirmar cancelamento"}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={Boolean(pending)}
                      onClick={() => setConfirming(undefined)}
                    >
                      Voltar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setConfirming(invitation.id)}
                  >
                    Cancelar convite
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
