import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { pageNumber, tenantId } from "@/lib/validation";
import { ReportError } from "./service";
import {
  reportPublicationInput,
  reportReopenInput,
  reportWithdrawalInput,
} from "./validation";

function failed(code?: string): never {
  if (code === "42501")
    throw new ReportError(
      "Seu acesso mudou ou esta publicação não está disponível.",
      403,
    );
  if (["23503", "23505", "23514", "40001"].includes(code ?? ""))
    throw new ReportError(
      "O relatório ou a publicação mudou. Atualize a página antes de confirmar novamente.",
      409,
    );
  throw new Error("Care report publication operation failed");
}

export async function publishReport(
  clinicInput: string,
  reportInput: string,
  input: unknown,
) {
  const clinicId = tenantId(clinicInput);
  const reportId = tenantId(reportInput);
  const values = reportPublicationInput(input);
  const { client } = await requireClinic(clinicId, ["doctor"]);
  const result = await client.rpc("publish_care_report", {
    target_tenant: clinicId,
    target_report: reportId,
    read_version: values.version,
    previous_publication: values.previousPublication,
    public_title: values.title,
    public_summary: values.summary,
    confirmed: true,
  });
  if (result.error) failed(result.error.code);
  return { id: result.data };
}

export async function withdrawReport(
  clinicInput: string,
  reportInput: string,
  input: unknown,
) {
  const clinicId = tenantId(clinicInput);
  const reportId = tenantId(reportInput);
  const values = reportWithdrawalInput(input);
  const { client } = await requireClinic(clinicId, ["doctor"]);
  const result = await client.rpc("withdraw_care_report", {
    target_tenant: clinicId,
    target_report: reportId,
    target_publication: values.publicationId,
    reason: values.reason,
    confirmed: true,
  });
  if (result.error) failed(result.error.code);
  return { id: result.data };
}

export async function reopenReport(
  clinicInput: string,
  reportInput: string,
  input: unknown,
) {
  const clinicId = tenantId(clinicInput);
  const reportId = tenantId(reportInput);
  const values = reportReopenInput(input);
  const { client } = await requireClinic(clinicId, ["doctor"]);
  const result = await client.rpc("reopen_care_report", {
    target_tenant: clinicId,
    target_report: reportId,
    read_version: values.version,
    confirmed: true,
  });
  if (result.error) failed(result.error.code);
  return { id: result.data };
}

export async function patientReportPublications(
  clinicInput: string,
  pageInput?: string,
) {
  const clinicId = tenantId(clinicInput);
  const page = pageNumber(pageInput);
  const { client, clinic } = await requireClinic(clinicId, ["patient"]);
  const result = await client
    .from("care_report_publications")
    .select(
      "id,patient_title,patient_summary,period_start,period_end,source_version,doctor_display_name,approved_at,published_at",
    )
    .eq("tenant_id", clinicId)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20);
  if (result.error) failed(result.error.code);
  return {
    clinic,
    publications: (result.data ?? []).slice(0, 20),
    page,
    hasNext: (result.data?.length ?? 0) > 20,
  };
}

export async function reportPublicationForExport(
  clinicInput: string,
  publicationInput: string,
) {
  const clinicId = tenantId(clinicInput);
  const publicationId = tenantId(publicationInput);
  const { client } = await requireClinic(clinicId, ["doctor", "patient"]);
  const result = await client.rpc("authorize_care_report_export", {
    target_tenant: clinicId,
    target_publication: publicationId,
  });
  if (result.error) failed(result.error.code);
  const publication = result.data?.[0];
  if (!publication)
    throw new ReportError("Publicação não disponível para exportação.", 404);
  return publication;
}

export type PatientReportPublications = Awaited<
  ReturnType<typeof patientReportPublications>
>;
