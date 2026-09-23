import { notFound, redirect } from "next/navigation";
import { AccessError, requireClinic } from "@/modules/identity/service";
import { InputError } from "@/lib/validation";
import {
  myCareLinks,
  receivedCutoffs,
  receivedForPatients,
} from "@/modules/workspace/received";
import { ClinicShell } from "@/components/clinic-shell";
import { DoctorReviewInbox } from "@/components/doctor-review-inbox";

export const dynamic = "force-dynamic";

export default async function DoctorReview({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const context = await (async () => {
    const { clinic } = await requireClinic(tenantId, ["doctor"]);
    const links = (await myCareLinks(tenantId)).filter(
      (link) => link.status === "active",
    );
    const cutoffs = await receivedCutoffs(
      tenantId,
      links.map((link) => link.patientId),
    );
    const { byPatient, failed } = await receivedForPatients(tenantId, cutoffs);
    return {
      clinic,
      failed,
      patients: links
        .filter((link) => cutoffs.has(link.patientId))
        .map((link) => ({
          patientId: link.patientId,
          name: link.name,
          items: byPatient.get(link.patientId) ?? [],
        })),
    };
  })().catch((error: unknown) => {
    if (error instanceof AccessError && error.status === 401)
      redirect("/login");
    if (error instanceof AccessError || error instanceof InputError) notFound();
    throw error;
  });
  return (
    <ClinicShell clinic={context.clinic} active="review">
      <DoctorReviewInbox
        tenantId={tenantId}
        patients={context.patients}
        failed={context.failed}
      />
    </ClinicShell>
  );
}
