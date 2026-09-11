import "server-only";
import { identity, requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import {
  careAssignmentInput,
  careRelationshipChangeInput,
  membershipAcceptanceInput,
  membershipManagementInput,
  teamInvitationInput,
} from "./validation";

export class TeamError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const memberFields =
  "user_id,display_name,role,status,version,accepted_at,created_at" as const;
const relationshipFields =
  "id,patient_id,professional_id,status,version,accepted_at,revoked_at,created_at,updated_at" as const;

function databaseError(error: { code?: string }): never {
  if (error.code === "23505")
    throw new TeamError(
      "Este profissional já possui um vínculo com o paciente. Use a ação disponível no vínculo existente.",
      409,
    );
  if (error.code === "40001")
    throw new TeamError(
      "Este acesso mudou em outra tela. Atualize a página antes de tentar novamente.",
      409,
    );
  if (error.code === "42501")
    throw new TeamError("Você não pode realizar esta ação.", 403);
  if (["23503", "23514"].includes(error.code ?? ""))
    throw new TeamError(
      "A alteração não corresponde à situação atual da equipe. Atualize a página.",
      409,
    );
  throw new Error("Team operation failed");
}

export async function loadTeamWorkspace(id: string) {
  const tenant = tenantId(id);
  const { client, clinic, user } = await requireClinic(tenant, [
    "admin",
    "doctor",
    "nurse",
  ]);

  if (clinic.role === "admin") {
    const [members, patients, relationships] = await Promise.all([
      client
        .from("memberships")
        .select(memberFields)
        .eq("tenant_id", tenant)
        .in("role", ["doctor", "nurse"])
        .order("created_at")
        .limit(201),
      client
        .from("patients")
        .select("id,display_name")
        .eq("tenant_id", tenant)
        .order("display_name")
        .order("id")
        .limit(1001),
      client
        .from("care_relationships")
        .select(relationshipFields)
        .eq("tenant_id", tenant)
        .order("updated_at", { ascending: false })
        .order("id")
        .limit(1001),
    ]);
    if (members.error || patients.error || relationships.error)
      throw new Error("Unable to load team workspace");
    const safeMembers = (members.data ?? []).slice(0, 200);
    const safePatients = (patients.data ?? []).slice(0, 1000);
    const memberNames = new Map(
      safeMembers.map((member) => [
        member.user_id,
        member.display_name ?? "Profissional da clínica",
      ]),
    );
    const patientNames = new Map(
      safePatients.map((patient) => [patient.id, patient.display_name]),
    );
    return {
      clinic,
      userId: user.id,
      members: safeMembers,
      patients: safePatients,
      relationships: (relationships.data ?? []).slice(0, 1000).map((item) => ({
        ...item,
        patient_name: patientNames.get(item.patient_id) ?? "Paciente",
        professional_name:
          memberNames.get(item.professional_id) ?? "Profissional da clínica",
      })),
      truncated:
        (members.data?.length ?? 0) > 200 ||
        (patients.data?.length ?? 0) > 1000 ||
        (relationships.data?.length ?? 0) > 1000,
    };
  }

  const relationships = await client
    .from("care_relationships")
    .select(relationshipFields)
    .eq("tenant_id", tenant)
    .eq("professional_id", user.id)
    .order("updated_at", { ascending: false })
    .order("id")
    .limit(1001);
  if (relationships.error) throw new Error("Unable to load care assignments");
  const visible = (relationships.data ?? []).slice(0, 1000);
  const patientIds = [...new Set(visible.map((item) => item.patient_id))];
  const patients = patientIds.length
    ? await client
        .from("patients")
        .select("id,display_name")
        .eq("tenant_id", tenant)
        .in("id", patientIds)
        .limit(1000)
    : { data: [], error: null };
  if (patients.error) throw new Error("Unable to load assigned patients");
  const patientNames = new Map(
    (patients.data ?? []).map((patient) => [patient.id, patient.display_name]),
  );
  return {
    clinic,
    userId: user.id,
    members: [],
    patients: [],
    relationships: visible.map((item) => ({
      ...item,
      patient_name: patientNames.get(item.patient_id) ?? "Paciente",
      professional_name: "Você",
    })),
    truncated: (relationships.data?.length ?? 0) > 1000,
  };
}

export async function inviteTeamMember(id: string, input: unknown) {
  const tenant = tenantId(id);
  const values = teamInvitationInput(input);
  const { client } = await requireClinic(tenant, ["admin"]);
  const { data: sessionData, error: sessionError } =
    await client.auth.getSession();
  if (sessionError || !sessionData.session)
    throw new TeamError("Sua sessão expirou. Entre novamente.", 401);
  const { data, error } = await client.functions.invoke("invite-staff", {
    body: { tenant_id: tenant, ...values },
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
  });
  if (error) {
    const context = "context" in error ? error.context : undefined;
    if (context instanceof Response) {
      const status = context.status;
      let message = "Não foi possível enviar o convite.";
      try {
        const body = (await context.clone().json()) as { error?: unknown };
        if (typeof body.error === "string") message = body.error;
      } catch {}
      throw new TeamError(message, status >= 400 && status < 600 ? status : 503);
    }
    throw new Error("Team invitation failed");
  }
  if (!data || data.invited !== true)
    throw new Error("Team invitation returned an invalid response");
  return { invited: true as const };
}

export async function acceptClinicInvitation(id: string, input: unknown) {
  const tenant = tenantId(id);
  const { version } = membershipAcceptanceInput(input);
  const { client, user } = await identity();
  const { data, error } = await client
    .from("memberships")
    .update({ status: "active", expected_version: version })
    .eq("tenant_id", tenant)
    .eq("user_id", user.id)
    .eq("status", "invited")
    .eq("version", version)
    .select("tenant_id,status,version")
    .maybeSingle();
  if (error) databaseError(error);
  if (!data)
    throw new TeamError(
      "O convite mudou, expirou ou não está disponível. Atualize a página.",
      409,
    );
  return data;
}

export async function manageTeamMember(
  id: string,
  memberId: string,
  input: unknown,
) {
  const tenant = tenantId(id);
  const member = tenantId(memberId);
  const change = membershipManagementInput(input);
  const { client } = await requireClinic(tenant, ["admin"]);
  const current = await client
    .from("memberships")
    .select(memberFields)
    .eq("tenant_id", tenant)
    .eq("user_id", member)
    .in("role", ["doctor", "nurse"])
    .maybeSingle();
  if (current.error) databaseError(current.error);
  if (!current.data || current.data.version !== change.version)
    throw new TeamError(
      "Este acesso mudou em outra tela. Atualize a página.",
      409,
    );
  const target =
    change.action === "suspend"
      ? "suspended"
      : current.data.accepted_at
        ? "active"
        : "invited";
  if (
    (change.action === "suspend" && current.data.status === "suspended") ||
    (change.action === "reactivate" && current.data.status !== "suspended")
  )
    throw new TeamError("Esta ação não corresponde ao acesso atual.", 409);
  const result = await client
    .from("memberships")
    .update({ status: target, expected_version: change.version })
    .eq("tenant_id", tenant)
    .eq("user_id", member)
    .eq("version", change.version)
    .select(memberFields)
    .maybeSingle();
  if (result.error) databaseError(result.error);
  if (!result.data)
    throw new TeamError(
      "Este acesso mudou em outra tela. Atualize a página.",
      409,
    );
  return result.data;
}

export async function assignCareRelationship(id: string, input: unknown) {
  const tenant = tenantId(id);
  const values = careAssignmentInput(input);
  const { client } = await requireClinic(tenant, ["admin"]);
  const { data, error } = await client
    .from("care_relationships")
    .insert({ tenant_id: tenant, status: "assigned", ...values })
    .select(relationshipFields)
    .maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new TeamError("O vínculo não foi criado.", 409);
  return data;
}

export async function changeCareRelationship(
  id: string,
  relationshipId: string,
  input: unknown,
) {
  const tenant = tenantId(id);
  const relationship = tenantId(relationshipId);
  const change = careRelationshipChangeInput(input);
  const { client, clinic, user } = await requireClinic(tenant, [
    "admin",
    "doctor",
    "nurse",
  ]);
  const current = await client
    .from("care_relationships")
    .select(relationshipFields)
    .eq("tenant_id", tenant)
    .eq("id", relationship)
    .maybeSingle();
  if (current.error) databaseError(current.error);
  if (!current.data || current.data.version !== change.version)
    throw new TeamError(
      "Este vínculo mudou em outra tela. Atualize a página.",
      409,
    );
  let target: "active" | "assigned" | "revoked";
  if (change.action === "accept") {
    if (
      clinic.role === "admin" ||
      current.data.professional_id !== user.id ||
      current.data.status !== "assigned"
    )
      throw new TeamError("Você não pode aceitar este vínculo.", 403);
    target = "active";
  } else {
    if (clinic.role !== "admin")
      throw new TeamError("Somente o administrador pode alterar este vínculo.", 403);
    target = change.action === "revoke" ? "revoked" : "assigned";
    if (
      (change.action === "revoke" &&
        !["assigned", "active"].includes(current.data.status)) ||
      (change.action === "reassign" && current.data.status !== "revoked")
    )
      throw new TeamError("Esta ação não corresponde ao vínculo atual.", 409);
  }
  const result = await client
    .from("care_relationships")
    .update({ status: target, expected_version: change.version })
    .eq("tenant_id", tenant)
    .eq("id", relationship)
    .eq("version", change.version)
    .select(relationshipFields)
    .maybeSingle();
  if (result.error) databaseError(result.error);
  if (!result.data)
    throw new TeamError(
      "Este vínculo mudou em outra tela. Atualize a página.",
      409,
    );
  return result.data;
}

export type TeamWorkspace = Awaited<ReturnType<typeof loadTeamWorkspace>>;
