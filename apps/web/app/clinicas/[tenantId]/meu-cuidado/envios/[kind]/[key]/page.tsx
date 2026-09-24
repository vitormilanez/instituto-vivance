import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PatientShell } from "@/components/patient-shell";
import { PatientReceiptView } from "@/components/patient/receipt";
import { patientReceipt } from "@/modules/workspace/patient-receipts";
import { AccessError } from "@/modules/identity/service";
import { InputError } from "@/lib/validation";

export const dynamic = "force-dynamic";
export default async function PatientReceiptPage({ params }: { params: Promise<{ tenantId: string; kind: string; key: string }> }) {
  const { tenantId, kind, key } = await params;
  const { clinic, receipt } = await patientReceipt(tenantId, kind, key).catch((error) => {
    if (error instanceof AccessError && error.status === 401) redirect("/login");
    if (error instanceof AccessError || error instanceof InputError) notFound();
    throw error;
  });
  if (!receipt) notFound();
  const base = `/clinicas/${tenantId}/meu-cuidado`;
  return <PatientShell clinic={clinic} active="envio" title={receipt.title} backHref={`${base}/hoje`}>
    <PatientReceiptView receipt={receipt} tenantId={tenantId} />
    <Link className="pv-link" href={`${base}/diario`}>Ver meu diário</Link>
  </PatientShell>;
}
