import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { pageNumber, tenantId } from "@/lib/validation";
import {
  reportApprovalInput,
  reportCreateInput,
  reportPatchInput,
  type ReportSourceRef,
  type ReportSourceType,
} from "./validation";

export class ReportError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function failed(code?: string): never {
  if (code === "42501")
    throw new ReportError(
      "Seu acesso mudou ou uma das fontes não está disponível para este relatório.",
      403,
    );
  if (["23503", "23505", "23514", "40001"].includes(code ?? ""))
    throw new ReportError(
      "O relatório mudou ou ainda não está pronto para esta etapa. Seu texto permanece na tela.",
      409,
    );
  throw new Error("Care report operation failed");
}

async function reportPatients(tenant: string) {
  const { client, user } = await requireClinic(tenant, ["doctor"]);
  const result = await client
    .from("care_relationships")
    .select(
      "patient_id,patients!care_relationships_tenant_id_patient_id_fkey(display_name)",
    )
    .eq("tenant_id", tenant)
    .eq("professional_id", user.id)
    .eq("status", "active")
    .order("patient_id");
  if (result.error) failed(result.error.code);
  return (result.data ?? []).map((row) => ({
    id: row.patient_id,
    displayName: row.patients?.display_name ?? "Paciente",
  }));
}

export async function listReports(id: string, pageInput?: string) {
  const tenant = tenantId(id);
  const page = pageNumber(pageInput);
  const { client, clinic } = await requireClinic(tenant, ["doctor"]);
  const [reports, patients] = await Promise.all([
    client
      .from("care_reports")
      .select("*")
      .eq("tenant_id", tenant)
      .order("updated_at", { ascending: false })
      .order("id")
      .range((page - 1) * 20, page * 20),
    reportPatients(tenant),
  ]);
  if (reports.error) failed(reports.error.code);
  const names = new Map(patients.map((patient) => [patient.id, patient.displayName]));
  return {
    clinic,
    patients,
    reports: (reports.data ?? []).slice(0, 20).map((report) => ({
      ...report,
      patientName: names.get(report.patient_id) ?? "Paciente",
    })),
    page,
    hasNext: (reports.data?.length ?? 0) > 20,
  };
}

export async function createReport(id: string, input: unknown) {
  const tenant = tenantId(id);
  const values = reportCreateInput(input);
  const { client } = await requireClinic(tenant, ["doctor"]);
  const result = await client.rpc("create_care_report", {
    target_tenant: tenant,
    target_patient: values.patientId,
    report_period_start: values.periodStart,
    report_period_end: values.periodEnd,
  });
  if (result.error) failed(result.error.code);
  if (!result.data) throw new Error("Care report creation returned no id");
  return { id: result.data };
}

type SourceCandidate = ReportSourceRef & {
  label: string;
  occurredAt: string;
  detail: string;
};

async function sourceCandidates(
  client: Awaited<ReturnType<typeof requireClinic>>["client"],
  tenant: string,
  patient: string,
  start: string,
  end: string,
) {
  const until = new Date(`${end}T00:00:00Z`);
  until.setUTCDate(until.getUTCDate() + 1);
  const [checkIns, reviews] = await Promise.all([
    client
      .from("care_check_in_submissions")
      .select("id,submitted_at,report")
      .eq("tenant_id", tenant)
      .eq("patient_id", patient)
      .gte("submitted_at", `${start}T00:00:00Z`)
      .lt("submitted_at", until.toISOString())
      .order("submitted_at", { ascending: false })
      .limit(100),
    client
      .from("patient_document_reviews")
      .select("id,document_id,decision,reviewed_at")
      .eq("tenant_id", tenant)
      .eq("patient_id", patient)
      .gte("reviewed_at", `${start}T00:00:00Z`)
      .lt("reviewed_at", until.toISOString())
      .order("reviewed_at", { ascending: false })
      .limit(100),
  ]);
  if (checkIns.error || reviews.error)
    failed(checkIns.error?.code ?? reviews.error?.code);
  const documentIds = [...new Set((reviews.data ?? []).map((row) => row.document_id))];
  const documents = documentIds.length
    ? await client
        .from("patient_documents")
        .select("id,original_filename")
        .eq("tenant_id", tenant)
        .in("id", documentIds)
    : { data: [], error: null };
  if (documents.error) failed(documents.error.code);
  const filenames = new Map(
    (documents.data ?? []).map((row) => [row.id, row.original_filename]),
  );
  const candidates: SourceCandidate[] = [
    ...(checkIns.data ?? []).map((row) => ({
      type: "check_in" as ReportSourceType,
      id: row.id,
      label: "Relato enviado pela pessoa",
      occurredAt: row.submitted_at,
      detail: row.report.slice(0, 140),
    })),
    ...(reviews.data ?? []).map((row) => ({
      type: "document_review" as ReportSourceType,
      id: row.id,
      label: filenames.get(row.document_id) ?? "Documento revisado",
      occurredAt: row.reviewed_at,
      detail:
        row.decision === "approved"
          ? "Conferido"
          : row.decision === "rejected"
            ? "Arquivo não utilizável"
            : "Precisa de acompanhamento",
    })),
  ];
  return candidates.sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt),
  );
}

export async function loadReport(id: string, reportInput: string) {
  const tenant = tenantId(id);
  const reportId = tenantId(reportInput);
  const { client, clinic } = await requireClinic(tenant, ["doctor"]);
  const report = await client
    .from("care_reports")
    .select("*")
    .eq("tenant_id", tenant)
    .eq("id", reportId)
    .maybeSingle();
  if (report.error) failed(report.error.code);
  if (!report.data) throw new ReportError("Relatório não disponível.", 404);
  const reportRow = report.data;
  const [sources, versions, patients, candidates] = await Promise.all([
    client
      .from("care_report_sources")
      .select("*")
      .eq("tenant_id", tenant)
      .eq("report_id", reportId)
      .order("source_occurred_at")
      .order("id"),
    client
      .from("care_report_versions")
      .select("*")
      .eq("tenant_id", tenant)
      .eq("report_id", reportId)
      .order("version", { ascending: false })
      .limit(20),
    reportPatients(tenant),
    sourceCandidates(
      client,
      tenant,
      reportRow.patient_id,
      reportRow.period_start,
      reportRow.period_end,
    ),
  ]);
  if (sources.error || versions.error)
    failed(sources.error?.code ?? versions.error?.code);
  return {
    clinic,
    report: reportRow,
    patientName:
      patients.find((patient) => patient.id === reportRow.patient_id)
        ?.displayName ?? "Paciente",
    sources: sources.data ?? [],
    versions: versions.data ?? [],
    candidates,
  };
}

export async function saveReport(id: string, report: string, input: unknown) {
  const tenant = tenantId(id);
  const reportId = tenantId(report);
  const values = reportPatchInput(input);
  const { client } = await requireClinic(tenant, ["doctor"]);
  const result = await client.rpc("save_care_report", {
    target_tenant: tenant,
    target_report: reportId,
    read_version: values.version,
    report_title: values.title,
    report_summary: values.summary,
    report_consultation_points: values.consultationPoints,
    report_status: values.status,
    source_refs: values.sources,
  });
  if (result.error) failed(result.error.code);
  return { id: result.data };
}

export async function approveReport(id: string, report: string, input: unknown) {
  const tenant = tenantId(id);
  const reportId = tenantId(report);
  const values = reportApprovalInput(input);
  const { client } = await requireClinic(tenant, ["doctor"]);
  const result = await client.rpc("approve_care_report", {
    target_tenant: tenant,
    target_report: reportId,
    read_version: values.version,
    confirmed: true,
  });
  if (result.error) failed(result.error.code);
  return { id: result.data };
}

export type ReportsList = Awaited<ReturnType<typeof listReports>>;
export type ReportDetail = Awaited<ReturnType<typeof loadReport>>;
