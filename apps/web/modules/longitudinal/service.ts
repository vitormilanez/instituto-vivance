import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { patientPublications } from "@/modules/care-plans/publication-service";
import { patientCheckIns, CheckInError } from "@/modules/check-ins/service";
import { InputError, tenantId } from "@/lib/validation";
import {
  measurementSeries,
  paginateMeasurementPoints,
  longitudinalPeriod as projectLongitudinalPeriod,
  type MeasurementPeriod,
  type MeasurementSource,
} from "./project";

export type LongitudinalInput = {
  from?: string;
  to?: string;
  cursor?: string;
};

function parseLongitudinalPeriod(input: LongitudinalInput) {
  try {
    return projectLongitudinalPeriod(input);
  } catch {
    throw new InputError("O período informado é inválido.");
  }
}

function measurementPage(
  measures: ReturnType<typeof measurementSeries>,
  cursor?: string,
) {
  try {
    return paginateMeasurementPoints(measures, cursor);
  } catch {
    throw new InputError("O cursor de medidas não é válido para este período.");
  }
}

async function persistedMeasurementSources(
  client: Awaited<ReturnType<typeof requireClinic>>["client"],
  tenant: string,
  patient: string,
  period: MeasurementPeriod,
) {
  let submissions = client
    .from("care_check_in_submissions")
    .select("id,check_in_id,measure_label,measure_value,measure_unit,reported_on,submitted_at")
    .eq("tenant_id", tenant)
    .eq("patient_id", patient)
    .not("measure_label", "is", null)
    .not("measure_value", "is", null)
    .not("measure_unit", "is", null)
    .order("reported_on", { ascending: false })
    .order("submitted_at", { ascending: false })
    .limit(501);
  if (period.from) submissions = submissions.gte("reported_on", period.from);
  if (period.to) submissions = submissions.lte("reported_on", period.to);
  const [checkIns, onboarding] = await Promise.all([
    submissions,
    client
      .from("patient_onboarding_submissions")
      .select("id,weight_kg,height_cm,waist_cm,measured_on,submitted_at")
      .eq("tenant_id", tenant)
      .eq("patient_id", patient)
      .maybeSingle(),
  ]);
  if (checkIns.error || onboarding.error)
    throw new Error("Unable to load persisted measurements");
  const onboardingRow = onboarding.data;
  const onboardingRows: MeasurementSource[] = onboardingRow
    ? [
        ["Peso", onboardingRow.weight_kg, "kg"],
        ["Altura", onboardingRow.height_cm, "cm"],
        ["Circunferência abdominal", onboardingRow.waist_cm, "cm"],
      ].map(([measure_label, measure_value, measure_unit]) => ({
        measure_label: measure_label as string,
        measure_value: measure_value as number | null,
        measure_unit: measure_unit as string,
        reported_on: onboardingRow.measured_on,
        submitted_at: onboardingRow.submitted_at,
        source: "onboarding",
        source_id: onboardingRow.id,
        source_label: "Onboarding enviado",
      }))
    : [];
  return {
    rows: [
      ...onboardingRows,
      ...(checkIns.data ?? []).map((row) => ({
        ...row,
        source: "check_in" as const,
        source_id: row.check_in_id,
        source_label: "Check-in enviado",
      })),
    ],
    truncated: (checkIns.data?.length ?? 0) > 500,
  };
}

export async function staffLongitudinal(
  id: string,
  patientInput?: string,
  input: LongitudinalInput = {},
) {
  const tenant = tenantId(id);
  const period = parseLongitudinalPeriod(input);
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
      measurementPoints: [],
      measurementNextCursor: null,
      measurementsTruncated: false,
      period,
      truncated: false,
      professionalNames: new Map<string, string>(),
    };

  const [checkIns, publications, measurementSources] = await Promise.all([
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
    persistedMeasurementSources(client, tenant, selectedId, period),
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
  const measures = measurementSeries(measurementSources.rows, period);
  const page = measurementPage(measures, input.cursor);
  return {
    clinic,
    patients,
    selectedPatient:
      patients.find((patient) => patient.id === selectedId) ?? null,
    checkIns: enriched,
    publications: (publications.data ?? []).slice(0, 20),
    measures,
    measurementPoints: page.points,
    measurementNextCursor: page.nextCursor,
    measurementsTruncated: measurementSources.truncated,
    period,
    professionalNames,
    truncated:
      (checkIns.data?.length ?? 0) > 50 ||
      (publications.data?.length ?? 0) > 20 || measurementSources.truncated,
  };
}

export async function patientLongitudinal(id: string, input: LongitudinalInput = {}) {
  const tenant = tenantId(id);
  const period = parseLongitudinalPeriod(input);
  const [checkIns, publications] = await Promise.all([
    patientCheckIns(tenant),
    patientPublications(tenant),
  ]);
  const { client, user } = await requireClinic(tenant, ["patient"]);
  const account = await client
    .from("patient_accounts")
    .select("patient_id")
    .eq("tenant_id", tenant)
    .eq("user_id", user.id)
    .maybeSingle();
  if (account.error || !account.data) throw new Error("Unable to load patient measurement context");
  const sources = await persistedMeasurementSources(client, tenant, account.data.patient_id, period);
  const measures = measurementSeries(sources.rows, period);
  const page = measurementPage(measures, input.cursor);
  return {
    clinic: checkIns.clinic,
    checkIns: checkIns.checkIns.filter((item) => item.submission),
    publications: publications.publications,
    measures,
    measurementPoints: page.points,
    measurementNextCursor: page.nextCursor,
    measurementsTruncated: sources.truncated,
    period,
    truncated: checkIns.hasNext || publications.hasNext || sources.truncated,
  };
}

export type StaffLongitudinal = Awaited<ReturnType<typeof staffLongitudinal>>;
export type PatientLongitudinal = Awaited<
  ReturnType<typeof patientLongitudinal>
>;
