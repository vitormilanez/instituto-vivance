import { notFound, redirect } from "next/navigation";
import { ClinicShell } from "@/components/clinic-shell";
import { ReportEditor } from "@/components/report-editor";
import { AccessError } from "@/modules/identity/service";
import { loadReport, ReportError } from "@/modules/reports/service";
import { InputError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ tenantId: string; reportId: string }>;
}) {
  const { tenantId, reportId } = await params;
  const detail = await loadReport(tenantId, reportId).catch((error) => {
    if (error instanceof AccessError && error.status === 401) redirect("/");
    if (
      error instanceof AccessError ||
      error instanceof ReportError ||
      error instanceof InputError
    )
      notFound();
    throw error;
  });
  return (
    <ClinicShell clinic={detail.clinic} active="relatorios">
      <ReportEditor key={`${detail.report.id}:${detail.report.version}`} initial={detail} />
    </ClinicShell>
  );
}
