import "server-only";
import { createClient } from "@/lib/supabase/server";

export class AccessError extends Error {
  constructor(public status: 401 | 403) {
    super(
      status === 401
        ? "Entre na sua conta."
        : "Você não tem acesso a esta clínica.",
    );
  }
}
export const roleLabels: Record<string, string> = {
  admin: "Administrador",
  doctor: "Médico",
  nurse: "Enfermagem",
  patient: "Paciente",
};
export type ClinicAccess = {
  id: string;
  name: string;
  role: string;
  displayName: string | null;
};
export type ClinicInvitation = ClinicAccess & { version: number };

export async function identity() {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new AccessError(401);
  return { client, user: data.user };
}

export async function clinics() {
  const { client, user } = await identity();
  const { data, error } = await client
    .from("memberships")
    .select(
      "tenant_id, role, status, version, display_name, tenants!inner(id, name)",
    )
    .eq("user_id", user.id)
    .in("status", ["active", "invited"]);
  if (error) throw new Error("Unable to load memberships");
  return {
    client,
    user,
    clinics: (data ?? [])
      .filter((m) => m.status === "active")
      .map((m) => ({
        ...m.tenants,
        role: m.role,
        // The member's own display name, distinct from the clinic/tenant
        // name in m.tenants — this is what identifies the authenticated
        // person, never the clinic they belong to.
        displayName: m.display_name,
      })) satisfies ClinicAccess[],
    invitations: (data ?? [])
      .filter((m) => m.status === "invited")
      .map((m) => ({
        ...m.tenants,
        role: m.role,
        displayName: m.display_name,
        version: m.version,
      })) satisfies ClinicInvitation[],
  };
}

export async function requireClinic(
  id: string,
  roles = ["admin", "doctor", "nurse"],
) {
  const context = await clinics();
  const clinic = context.clinics.find(
    (c) => c.id === id && roles.includes(c.role),
  );
  if (!clinic) throw new AccessError(403);
  return { ...context, clinic };
}
