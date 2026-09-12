import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { listAppointments } from "@/modules/agenda/service";
import { clinicDate } from "@/modules/agenda/validation";
import { focusedAppointment } from "@/modules/agenda/focus";
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
  const next = focusedAppointment(agenda.appointments, now, today);
  const [drafts, checkIns] = await Promise.all([
    client
      .from("encounters")
      .select(
        "id,patient_id,appointment_id,updated_at,patients!encounters_tenant_id_patient_id_fkey(display_name)",
      )
      .eq("tenant_id", id)
      .eq("doctor_id", user.id)
      .eq("status", "draft")
      .order("updated_at")
      .order("id")
      .limit(5),
    client
      .from("care_check_ins")
      .select(
        "id,patient_id,submitted_at,patients!care_check_ins_tenant_id_patient_id_fkey(display_name)",
      )
      .eq("tenant_id", id)
      .eq("status", "submitted")
      .order("submitted_at")
      .order("id")
      .limit(5),
  ]);
  if (drafts.error || checkIns.error)
    throw new Error("Unable to load care pending items");
  const context = next ? await patientCareContext(id, next.patient_id) : null;
  return {
    ...agenda,
    next,
    context,
    drafts: drafts.data ?? [],
    checkIns: checkIns.data ?? [],
    now,
    today,
  };
}

export async function patientCareContext(id: string, patientId: string) {
  const { client, user } = await requireClinic(id, ["doctor", "nurse"]);
  const relationship = await client
    .from("care_relationships")
    .select("id")
    .eq("tenant_id", id)
    .eq("patient_id", patientId)
    .eq("professional_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (relationship.error)
    throw new Error("Unable to verify patient care access");
  // A scheduled or assigned appointment is not yet clinical authorization.
  // Keep the focus appointment, but do not provide a fallback patient link.
  if (!relationship.data) return null;
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
