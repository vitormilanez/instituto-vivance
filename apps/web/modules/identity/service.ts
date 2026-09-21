import { cache } from "react";
import { DomainError } from "@/lib/errors";
import "server-only";
import { createClient } from "@/lib/supabase/server";

export class AccessError extends DomainError {
  constructor(status: 401 | 403) {
    super(
      status === 401
        ? "Entre na sua conta."
        : "Você não tem acesso a esta clínica.",
      status,
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

// Request-scoped memoisation (Next.js request memoization): a single page
// render calls requireClinic two or three times — shell, page and workspace —
// and each call used to re-read the session and every membership. The cache
// lives inside one request: another request, another user, another cache.
export const identity = cache(async function identity() {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new AccessError(401);
  return { client, user: data.user };
});

export const clinics = cache(async function clinics() {
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
});

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
