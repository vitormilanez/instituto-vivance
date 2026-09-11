import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { patientPublications } from "@/modules/care-plans/publication-service";
import { patientCheckIns, CheckInError } from "@/modules/check-ins/service";
import { tenantId } from "@/lib/validation";
import { measurementSeries } from "./project";

export async function staffLongitudinal(
  id: string,
  patientInput?: string,
) {
  const tenant = tenantId(id);
  const { client, clinic, user } = await requireClinic(tenant, [
    "doctor",
    "nurse",
  ]);
  const links = await client
    .from("care_relationships")
    .select(
      "patient_id,patients!care_relationships_tenant_id_patient_id_fkey(display_name)",
    )
    .eq("tenant_id", tenant)
    .eq("professional_id", user.id)
    .eq("status", "active")
    .order("patient_id");
  if (links.error) throw new Error("Unable to load longitudinal patients");
  const patients = (links.data ?? []).map((link) => ({
    id: link.patient_id,
    display_name: link.patients?.display_name ?? "Paciente",
  }));
  const selectedId = patientInput ? tenantId(patientInput) : patients[0]?.id;
  if (selectedId && !patients.some((patient) => patient.id === selectedId))
    throw new CheckInError("Paciente indisponível para este vínculo.", 403);
  if (!selectedId)
    return {
      clinic,
      patients,
      selectedPatient: null,
      checkIns: [],
      publications: [],
      measures: [],
      truncated: false,
      professionalNames: new Map<string, string>(),
    };

  const [checkIns, publications] = await Promise.all([
    client
      .from("care_check_ins")
      .select("*")
      .eq("tenant_id", tenant)
      .eq("patient_id", selectedId)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .order("id")
      .limit(51),
    client
      .from("care_plan_publications")
      .select(
        "id,title,revision,status,published_at,closed_at,doctor_display_name",
      )
      .eq("tenant_id", tenant)
      .eq("patient_id", selectedId)
      .order("published_at", { ascending: false })
      .order("id")
      .limit(21),
  ]);
  if (checkIns.error || publications.error)
    throw new Error("Unable to load longitudinal history");
  const rows = (checkIns.data ?? []).slice(0, 50);
  const ids = rows.map((row) => row.id);
  const [submissions, reviews] = ids.length
    ? await Promise.all([
        client
          .from("care_check_in_submissions")
          .select("*")
          .eq("tenant_id", tenant)
          .in("check_in_id", ids),
        client
          .from("care_check_in_reviews")
          .select("*")
          .eq("tenant_id", tenant)
          .in("check_in_id", ids),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (submissions.error || reviews.error)
    throw new Error("Unable to load longitudinal details");
  const professionalIds = [
    ...new Set([
      ...rows.map((row) => row.requested_by),
      ...(reviews.data ?? []).map((row) => row.reviewer_id),
    ]),
  ];
  const professionals = professionalIds.length
    ? await client
        .from("memberships")
        .select("user_id,display_name")
        .eq("tenant_id", tenant)
        .in("user_id", professionalIds)
    : { data: [], error: null };
  if (professionals.error)
    throw new Error("Unable to load longitudinal authors");
  const professionalNames = new Map(
    (professionals.data ?? []).map((row) => [
      row.user_id,
      row.display_name ?? "Profissional da equipe",
    ]),
  );
  const enriched = rows.map((row) => ({
    ...row,
    submission:
      (submissions.data ?? []).find((item) => item.check_in_id === row.id) ??
      null,
    review:
      (reviews.data ?? []).find((item) => item.check_in_id === row.id) ?? null,
  }));
  return {
    clinic,
    patients,
    selectedPatient:
      patients.find((patient) => patient.id === selectedId) ?? null,
    checkIns: enriched,
    publications: (publications.data ?? []).slice(0, 20),
    measures: measurementSeries(
      enriched.flatMap((row) => (row.submission ? [row.submission] : [])),
    ),
    professionalNames,
    truncated:
      (checkIns.data?.length ?? 0) > 50 ||
      (publications.data?.length ?? 0) > 20,
  };
}

export async function patientLongitudinal(id: string) {
  const [checkIns, publications] = await Promise.all([
    patientCheckIns(id),
    patientPublications(id),
  ]);
  return {
    clinic: checkIns.clinic,
    checkIns: checkIns.checkIns.filter((item) => item.submission),
    publications: publications.publications,
    measures: measurementSeries(
      checkIns.checkIns.flatMap((item) =>
        item.submission ? [item.submission] : [],
      ),
    ),
    truncated: checkIns.hasNext || publications.hasNext,
  };
}

export type StaffLongitudinal = Awaited<ReturnType<typeof staffLongitudinal>>;
export type PatientLongitudinal = Awaited<
  ReturnType<typeof patientLongitudinal>
>;
