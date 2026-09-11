"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type TeamMember = {
  user_id: string;
  display_name: string | null;
  role: string;
  status: string;
  version: number;
  accepted_at: string | null;
  created_at: string;
};
type PatientOption = { id: string; display_name: string };
type CareRelationship = {
  id: string;
  patient_id: string;
  professional_id: string;
  patient_name: string;
  professional_name: string;
  status: string;
  version: number;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};
type InviteReview = {
  email: string;
  display_name: string;
  role: "doctor" | "nurse";
};
type AssignmentReview = {
  patient_id: string;
  professional_id: string;
};
type RowReview =
  | {
      kind: "member";
      id: string;
      version: number;
      action: "suspend" | "reactivate";
      label: string;
    }
  | {
      kind: "relationship";
      id: string;
      version: number;
      action: "accept" | "revoke" | "reassign";
      label: string;
    };

const roleLabels: Record<string, string> = {
  doctor: "Médico",
  nurse: "Enfermagem",
};
const relationshipLabels: Record<string, string> = {
  assigned: "Aguardando aceite",
  active: "Responsabilidade aceita",
  revoked: "Vínculo revogado",
};

function membershipLabel(member: TeamMember) {
  if (member.status === "invited") return "Convite pendente";
  if (member.status === "active") return "Acesso ativo";
  return member.accepted_at ? "Acesso suspenso" : "Convite suspenso";
}

function formattedDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

async function mutate(path: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as { error?: string };
  if (!response.ok)
    throw new Error(data.error ?? "Não foi possível concluir a alteração.");
}

export function TeamWorkspace({
  tenantId,
  role,
  members,
  patients,
  relationships,
  selectedPatient,
  selectedProfessional,
  truncated,
}: {
  tenantId: string;
  role: string;
  members: TeamMember[];
  patients: PatientOption[];
  relationships: CareRelationship[];
  selectedPatient?: string;
  selectedProfessional?: string;
  truncated: boolean;
}) {
  const router = useRouter();
  const [inviteReview, setInviteReview] = useState<InviteReview>();
  const [assignmentReview, setAssignmentReview] =
    useState<AssignmentReview>();
  const [rowReview, setRowReview] = useState<RowReview>();
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const isAdmin = role === "admin";
  const activeMembers = members.filter((member) => member.status === "active");
  const memberNames = new Map(
    members.map((member) => [
      member.user_id,
      member.display_name ?? "Profissional da clínica",
    ]),
  );
  const memberStatuses = new Map(
    members.map((member) => [member.user_id, member.status]),
  );
  const patientNames = new Map(
    patients.map((patient) => [patient.id, patient.display_name]),
  );

  function execute(path: string, method: "POST" | "PATCH", body: unknown) {
    startTransition(async () => {
      setFeedback("");
      try {
        await mutate(path, method, body);
        setInviteReview(undefined);
        setAssignmentReview(undefined);
        setRowReview(undefined);
        setFeedback("Alteração confirmada e registrada no histórico.");
        router.refresh();
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "Não foi possível concluir a alteração.",
        );
      }
    });
  }

  function reviewInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    const form = new FormData(event.currentTarget);
    setInviteReview({
      email: String(form.get("email") ?? "").trim(),
      display_name: String(form.get("display_name") ?? "").trim(),
      role: form.get("role") === "nurse" ? "nurse" : "doctor",
    });
  }

  function reviewAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    const form = new FormData(event.currentTarget);
    setAssignmentReview({
      patient_id: String(form.get("patient_id") ?? ""),
      professional_id: String(form.get("professional_id") ?? ""),
    });
  }

  return (
    <>
      {feedback ? (
        <p
          className={feedback.startsWith("Alteração confirmada") ? "notice" : "feedback"}
          role={feedback.startsWith("Alteração confirmada") ? "status" : "alert"}
        >
          {feedback}
        </p>
      ) : null}

      {isAdmin ? (
        <div className="team-admin-grid">
          <section className="panel" aria-labelledby="invite-title">
            <h2 id="invite-title">Convidar profissional</h2>
            <p>
              O convite cria acesso pendente. A pessoa entra na clínica somente
              depois de aceitar.
            </p>
            <form onSubmit={reviewInvite}>
              <div className="field">
                <label htmlFor="team-name">Nome de exibição</label>
                <input
                  id="team-name"
                  name="display_name"
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="team-email">E-mail individual</label>
                <input
                  id="team-email"
                  name="email"
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="team-role">Papel</label>
                <select id="team-role" name="role" defaultValue="doctor">
                  <option value="doctor">Médico</option>
                  <option value="nurse">Enfermagem</option>
                </select>
              </div>
              <button type="submit">Revisar convite</button>
            </form>
            {inviteReview ? (
              <div
                className="inline-confirm"
                role="group"
                aria-label="Revisão do convite"
              >
                <h3>Confirmar convite</h3>
                <p>
                  {inviteReview.display_name} · {roleLabels[inviteReview.role]}
                  <br />
                  {inviteReview.email}
                </p>
                <p>
                  O envio pode criar uma identidade de acesso, mas não concede
                  acesso a prontuários nem atribui pacientes.
                </p>
                <div className="button-row">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      execute(
                        `/api/v1/clinics/${tenantId}/team/invitations`,
                        "POST",
                        inviteReview,
                      )
                    }
                  >
                    {isPending ? "Enviando…" : "Enviar convite"}
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    disabled={isPending}
                    onClick={() => setInviteReview(undefined)}
                  >
                    Corrigir
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="panel" aria-labelledby="assign-title">
            <h2 id="assign-title">Atribuir cuidado</h2>
            <p>
              A atribuição fica pendente até o profissional aceitar a
              responsabilidade.
            </p>
            <form onSubmit={reviewAssignment}>
              <div className="field">
                <label htmlFor="care-patient">Paciente</label>
                <select
                  id="care-patient"
                  name="patient_id"
                  defaultValue={selectedPatient ?? ""}
                  required
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.display_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="care-professional">Profissional ativo</label>
                <select
                  id="care-professional"
                  name="professional_id"
                  defaultValue={selectedProfessional ?? ""}
                  required
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {activeMembers.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.display_name ?? "Profissional"} · {roleLabels[member.role]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={patients.length === 0 || activeMembers.length === 0}
              >
                Revisar atribuição
              </button>
            </form>
            {assignmentReview ? (
              <div
                className="inline-confirm"
                role="group"
                aria-label="Revisão da atribuição"
              >
                <h3>Confirmar atribuição</h3>
                <p>
                  {patientNames.get(assignmentReview.patient_id) ?? "Paciente"}
                  {" → "}
                  {memberNames.get(assignmentReview.professional_id) ??
                    "Profissional"}
                </p>
                <p>
                  O acesso clínico continuará bloqueado até o aceite do
                  profissional.
                </p>
                <div className="button-row">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      execute(
                        `/api/v1/clinics/${tenantId}/team/relationships`,
                        "POST",
                        assignmentReview,
                      )
                    }
                  >
                    {isPending ? "Atribuindo…" : "Confirmar atribuição"}
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    disabled={isPending}
                    onClick={() => setAssignmentReview(undefined)}
                  >
                    Voltar
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : (
        <section className="notice" aria-label="Regra de responsabilidade">
          Aceite somente pacientes pelos quais você assumirá responsabilidade de
          cuidado. Um vínculo revogado ou seu acesso suspenso bloqueia os
          registros imediatamente.
        </section>
      )}

      {isAdmin ? (
        <section className="panel team-section" aria-labelledby="members-title">
          <div className="section-heading">
            <h2 id="members-title">Equipe clínica</h2>
            <span className="quiet-label">{members.length} profissionais</span>
          </div>
          {members.length > 0 ? (
            <ul className="team-list">
              {members.map((member) => {
                const action =
                  member.status === "suspended" ? "reactivate" : "suspend";
                return (
                  <li key={member.user_id}>
                    <div>
                      <strong>
                        {member.display_name ?? "Profissional da clínica"}
                      </strong>
                      <span>
                        {roleLabels[member.role]} · {membershipLabel(member)}
                      </span>
                      <small>
                        Aceite: {formattedDate(member.accepted_at)} · versão {member.version}
                      </small>
                    </div>
                    <div className="row-controls">
                      <Link
                        href={`/clinicas/${tenantId}/equipe?profissional=${member.user_id}`}
                      >
                        Ver vínculos
                      </Link>
                      <button
                        className="secondary compact-button"
                        type="button"
                        onClick={() => {
                          setFeedback("");
                          setRowReview({
                            kind: "member",
                            id: member.user_id,
                            version: member.version,
                            action,
                            label:
                              member.display_name ?? "Profissional da clínica",
                          });
                        }}
                      >
                        {action === "suspend" ? "Revisar suspensão" : "Revisar reativação"}
                      </button>
                    </div>
                    {rowReview?.kind === "member" &&
                    rowReview.id === member.user_id ? (
                      <div
                        className="inline-confirm wide-confirm"
                        role="group"
                        aria-label="Revisão do acesso profissional"
                      >
                        <p>
                          {rowReview.action === "suspend"
                            ? `Suspender o acesso de ${rowReview.label}? O bloqueio será imediato.`
                            : `Reativar o acesso de ${rowReview.label}?`}
                        </p>
                        <div className="button-row">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              execute(
                                `/api/v1/clinics/${tenantId}/team/members/${rowReview.id}`,
                                "PATCH",
                                {
                                  version: rowReview.version,
                                  action: rowReview.action,
                                },
                              )
                            }
                          >
                            {isPending ? "Confirmando…" : "Confirmar"}
                          </button>
                          <button
                            className="secondary"
                            type="button"
                            disabled={isPending}
                            onClick={() => setRowReview(undefined)}
                          >
                            Voltar
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="empty">
              <h3>Nenhum profissional cadastrado</h3>
              <p>Use o convite acima para formar a equipe clínica.</p>
            </div>
          )}
        </section>
      ) : null}

      <section className="panel team-section" aria-labelledby="relationships-title">
        <div className="section-heading">
          <h2 id="relationships-title">
            {isAdmin ? "Vínculos de cuidado" : "Minhas responsabilidades"}
          </h2>
          <span className="quiet-label">{relationships.length} vínculos</span>
        </div>
        {relationships.length > 0 ? (
          <ul className="team-list relationship-list">
            {relationships.map((relationship) => {
              const effectivelySuspended =
                relationship.status === "active" &&
                memberStatuses.get(relationship.professional_id) === "suspended";
              const action = isAdmin
                ? relationship.status === "revoked"
                  ? "reassign"
                  : "revoke"
                : relationship.status === "assigned"
                  ? "accept"
                  : undefined;
              const highlighted =
                relationship.patient_id === selectedPatient ||
                relationship.professional_id === selectedProfessional;
              return (
                <li
                  key={relationship.id}
                  className={highlighted ? "selected-row" : undefined}
                >
                  <div>
                    <strong>{relationship.patient_name}</strong>
                    <span>
                      {relationship.professional_name} · {" "}
                      {effectivelySuspended
                        ? "Acesso suspenso"
                        : relationshipLabels[relationship.status]}
                    </span>
                    <small>
                      Atualizado em {formattedDate(relationship.updated_at)} · versão {relationship.version}
                    </small>
                  </div>
                  <div className="row-controls">
                    <Link
                      href={`/clinicas/${tenantId}/pacientes/${relationship.patient_id}`}
                    >
                      Ver cadastro demográfico
                    </Link>
                    {action ? (
                      <button
                        className="secondary compact-button"
                        type="button"
                        onClick={() => {
                          setFeedback("");
                          setRowReview({
                            kind: "relationship",
                            id: relationship.id,
                            version: relationship.version,
                            action,
                            label: relationship.patient_name,
                          });
                        }}
                      >
                        {action === "accept"
                          ? "Revisar aceite"
                          : action === "revoke"
                            ? "Revisar revogação"
                            : "Revisar nova atribuição"}
                      </button>
                    ) : null}
                  </div>
                  {rowReview?.kind === "relationship" &&
                  rowReview.id === relationship.id ? (
                    <div
                      className="inline-confirm wide-confirm"
                      role="group"
                      aria-label="Revisão do vínculo de cuidado"
                    >
                      <p>
                        {rowReview.action === "accept"
                          ? `Aceitar responsabilidade de cuidado por ${rowReview.label}?`
                          : rowReview.action === "revoke"
                            ? `Revogar o vínculo com ${rowReview.label}? O acesso será bloqueado imediatamente.`
                            : `Reatribuir ${rowReview.label}? O profissional precisará aceitar novamente.`}
                      </p>
                      <div className="button-row">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            execute(
                              `/api/v1/clinics/${tenantId}/team/relationships/${rowReview.id}`,
                              "PATCH",
                              {
                                version: rowReview.version,
                                action: rowReview.action,
                              },
                            )
                          }
                        >
                          {isPending ? "Confirmando…" : "Confirmar"}
                        </button>
                        <button
                          className="secondary"
                          type="button"
                          disabled={isPending}
                          onClick={() => setRowReview(undefined)}
                        >
                          Voltar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty">
            <h3>Nenhum vínculo disponível</h3>
            <p>
              {isAdmin
                ? "Atribua um profissional ativo a um paciente para iniciar o aceite de responsabilidade."
                : "O administrador ainda não atribuiu pacientes à sua conta."}
            </p>
          </div>
        )}
        {truncated ? (
          <p className="notice">
            A lista atingiu o limite desta etapa. Use o cadastro do paciente para
            localizar o vínculo desejado.
          </p>
        ) : null}
      </section>
    </>
  );
}
