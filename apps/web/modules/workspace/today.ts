import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { listAppointments } from "@/modules/agenda/service";
import { clinicDate } from "@/modules/agenda/validation";
import { requestInstant } from "@/lib/request-time";

// Read-only composition. Existing RLS remains the authority for every record.
export async function todayWorkspace(id: string) {
  const now = requestInstant().toISOString(),
    today = clinicDate();
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const [{ client, user }, agenda] = await Promise.all([
    requireClinic(id, ["doctor", "nurse"]),
    listAppointments(id, today, tomorrow.toISOString().slice(0, 10)),
  ]);
  const next =
    agenda.appointments.find((a) => a.status === "in_progress") ??
    agenda.appointments.find(
      (a) => a.status === "scheduled" && a.ends_at > now,
    );
  const pending = await client
    .from("encounters")
    .select(
      "id,patient_id,appointment_id,updated_at,patients!encounters_tenant_id_patient_id_fkey(display_name)",
    )
    .eq("tenant_id", id)
    .eq("doctor_id", user.id)
    .eq("status", "draft")
    .order("updated_at")
    .order("id")
    .limit(6);
  if (pending.error) throw new Error("Unable to load care pending items");
  const context = next ? await patientCareContext(id, next.patient_id) : null;
  return { ...agenda, next, context, pending: pending.data ?? [], now, today };
}

export async function patientCareContext(id: string, patientId: string) {
  const { client } = await requireClinic(id, ["doctor", "nurse"]);
  const [encounter, publications] = await Promise.all([
    client
      .from("encounters")
      .select("id,finalized_at")
      .eq("tenant_id", id)
      .eq("patient_id", patientId)
      .eq("status", "finalized")
      .order("finalized_at", { ascending: false })
      .order("id")
      .limit(1),
    client
      .from("care_plan_publications")
      .select("id,plan_id,title,revision,published_at")
      .eq("tenant_id", id)
      .eq("patient_id", patientId)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .order("id")
      .limit(6),
  ]);
  if (encounter.error || publications.error)
    throw new Error("Unable to load patient care context");
  return {
    encounter: encounter.data?.[0] ?? null,
    publications: publications.data ?? [],
  };
}
