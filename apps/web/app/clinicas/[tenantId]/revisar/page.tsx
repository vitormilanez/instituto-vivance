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
import { DoctorReviewDetail } from "@/components/doctor-review-detail";
import { doctorReviewSelection } from "@/modules/workspace/doctor-review";

export const dynamic = "force-dynamic";

export default async function DoctorReview({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ item?: string; paciente?: string }>;
}) {
  const { tenantId } = await params;
  const query = await searchParams;
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
  const selected = doctorReviewSelection(context.patients, query);
  return (
    <ClinicShell clinic={context.clinic} active="review">
      <DoctorReviewInbox
        tenantId={tenantId}
        patients={context.patients}
        failed={context.failed}
        selectedKey={selected ? `${selected.item.kind}:${selected.item.id}` : null}
      >
        {selected && <DoctorReviewDetail tenantId={tenantId} patientId={selected.patient.patientId} item={selected.item} />}
      </DoctorReviewInbox>
    </ClinicShell>
  );
}
