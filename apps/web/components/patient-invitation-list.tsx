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
  createdAt?: string;
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
  const [filter, setFilter] = useState("all");
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
  const labels: Record<string, string> = {
    pending: "Aguardando paciente",
    accepted: "Aceito",
    revoked: "Cancelado",
    expired: "Expirado",
  };
  const groups = [["all", "Todos"], ["pending", "Aguardando aceite"], ["accepted", "Aceitos"], ["closed", "Encerrados"]];
  const matches = (invitation: Invitation, value: string) => value === "all" || (value === "closed" ? ["expired", "revoked"].includes(invitation.status) : invitation.status === value);
  const visible = invitations.filter((invitation) => matches(invitation, filter));
  return (
    <section className="panel dv-invitation-tracker">
      <h2>Convites recentes</h2>
      <p>Acompanhe os convites recentes e o aceite do paciente.</p>
      <div className="dv-invitation-filters" role="group" aria-label="Filtrar convites recentes">
        {groups.map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}><strong>{invitations.filter((invitation) => matches(invitation, value)).length}</strong><span>{label}</span></button>)}
      </div>
      {error && (
        <p role="alert" className="feedback">
          {error}
        </p>
      )}
      {!visible.length && <p className="invitation-empty">Nenhum convite neste filtro.</p>}
      {!!visible.length && <div className="dv-invitation-columns" aria-hidden="true"><span>Paciente e envio</span><span>Status</span><span>Enviado em</span><span>Ações</span></div>}
      <ul className="list">
        {visible.map((invitation) => (
          <li key={invitation.id}>
            <div>
              <strong>{invitation.displayName}</strong>
              <small>{invitation.channel === "whatsapp" ? "WhatsApp" : "E-mail"}</small>
            </div>
            <div className="dv-invitation-status">
              <span className={`dv-invitation-badge dv-invitation-${invitation.status}`}>{labels[invitation.status] ?? invitation.status}</span>
              <small>{deliveryText(invitation).replace(/^ · /, "")}</small>
              {invitation.status === "pending" && (
                <small>
                  Disponível até{" "}
                  {new Date(invitation.expiresAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </small>
              )}
            </div>
            <time dateTime={invitation.createdAt}>{invitation.createdAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(invitation.createdAt)) : "—"}</time>
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
