import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { listAppointments } from "@/modules/agenda/service";
import { clinicDate } from "@/modules/agenda/validation";
import { focusedAppointment } from "@/modules/agenda/focus";
import { requestInstant } from "@/lib/request-time";

const appointmentFields =
  "id, patient_id, doctor_id, doctor_display_name, starts_at, ends_at, kind, status, version, started_at, completed_at, cancelled_at, no_show_at, patients!appointments_tenant_id_patient_id_fkey(display_name)" as const;

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
  let next = focusedAppointment(agenda.appointments, now, today);
  if (!next) {
    const future = await client
      .from("appointments")
      .select(appointmentFields)
      .eq("tenant_id", id)
      .eq("status", "scheduled")
      .gt("starts_at", now)
      .order("starts_at")
      .order("id")
      .limit(1);
    if (future.error) throw new Error("Unable to load next appointment");
    next = future.data?.[0] ?? null;
  }
  const [drafts, checkIns, preparations] = await Promise.all([
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
    client
      .from("return_preparation_requests")
      .select("id,patient_id,submitted_at,patients!return_preparation_requests_tenant_id_patient_id_fkey(display_name)")
      .eq("tenant_id", id)
      .eq("doctor_id", user.id)
      .eq("status", "submitted")
      .order("submitted_at")
      .order("id")
      .limit(5),
  ]);
  if (drafts.error || checkIns.error || preparations.error)
    throw new Error("Unable to load care pending items");
  const context = next ? await patientCareContext(id, next.patient_id) : null;
  return {
    ...agenda,
    next,
    nextDate: next ? clinicDate(new Date(next.starts_at)) : null,
    context,
    drafts: drafts.data ?? [],
    checkIns: checkIns.data ?? [],
    preparations: preparations.data ?? [],
    now,
    today,
  };
}

export type PatientCareContext = {
  relationshipId: string;
  encounter: { id: string; finalized_at: string | null } | null;
  nextAppointment: { id: string; starts_at: string; status: string } | null;
  publications: {
    id: string;
    plan_id: string;
    title: string;
    revision: number;
    published_at: string | null;
  }[];
  preparation: {
    id: string;
    status: string;
    submitted_at: string | null;
  } | null;
  documents: { total: number; latest_at: string | null };
  measurements: { total: number; latest_at: string | null };
  intake: { hasGoal: boolean; updatedAt: string | null } | null;
};

export async function patientCareContext(
  id: string,
  patientId: string,
): Promise<PatientCareContext | null> {
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
  const now = requestInstant().toISOString();
  const [encounter, nextAppointment, publications] = await Promise.all([
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
      .from("appointments")
      .select("id,starts_at,status")
      .eq("tenant_id", id)
      .eq("patient_id", patientId)
      .eq("status", "scheduled")
      .gt("starts_at", now)
      .order("starts_at")
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
  if (encounter.error || nextAppointment.error || publications.error)
    throw new Error("Unable to load patient care context");
  // O que o paciente deve fornecer e o que a clínica registrou, por tipo: o
  // bloco "Contexto para esta consulta" mostra um estado factual para cada um,
  // inclusive quando falta. Somente leitura; nenhuma inferência clínica.
  const appointmentId = nextAppointment.data?.[0]?.id ?? null;
  const [preparation, documents, measurements, intake] = await Promise.all([
    appointmentId
      ? client
          .from("return_preparation_requests")
          .select("id,status,submitted_at")
          .eq("tenant_id", id)
          .eq("patient_id", patientId)
          .eq("appointment_id", appointmentId)
          .neq("status", "cancelled")
          .order("requested_at", { ascending: false })
          .order("id")
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client
      .from("patient_documents")
      .select("created_at", { count: "exact" })
      .eq("tenant_id", id)
      .eq("patient_id", patientId)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .order("id")
      .limit(1),
    client
      .from("patient_measurements")
      .select("submitted_at", { count: "exact" })
      .eq("tenant_id", id)
      .eq("patient_id", patientId)
      .order("submitted_at", { ascending: false })
      .order("id")
      .limit(1),
    client
      .from("patient_intake_contexts")
      .select("expected_outcome,first_priority,updated_at")
      .eq("tenant_id", id)
      .eq("patient_id", patientId)
      .maybeSingle(),
  ]);
  if (preparation.error || documents.error || measurements.error || intake.error)
    throw new Error("Unable to load patient care context");
  const documentRow = documents.data?.[0] ?? null;
  const measurementRow = measurements.data?.[0] ?? null;
  const intakeRow = intake.data ?? null;
  return {
    relationshipId: relationship.data.id,
    encounter: encounter.data?.[0] ?? null,
    nextAppointment: nextAppointment.data?.[0] ?? null,
    publications: publications.data ?? [],
    preparation: preparation.data
      ? {
          id: preparation.data.id,
          status: preparation.data.status,
          submitted_at: preparation.data.submitted_at,
        }
      : null,
    documents: {
      total: documents.count ?? (documentRow ? 1 : 0),
      latest_at: documentRow?.created_at ?? null,
    },
    measurements: {
      total: measurements.count ?? (measurementRow ? 1 : 0),
      latest_at: measurementRow?.submitted_at ?? null,
    },
    intake: intakeRow
      ? {
          hasGoal: Boolean(
            intakeRow.expected_outcome?.trim() || intakeRow.first_priority?.trim(),
          ),
          updatedAt: intakeRow.updated_at,
        }
      : null,
  };
}
