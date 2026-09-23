import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import {
  documentItems,
  encounterItem,
  openWorkOrder,
  planItem,
  reportItem,
  type OpenWorkItem,
} from "./open-work-items";

// Limites de varredura: a fila é do profissional logado e cabe em uma tela;
// os limites são rede de segurança, não paginação.
const scan = 60;
const documentScan = 300;

// Tudo o que está em aberto com o profissional logado. Cada query filtra
// clínica e autoria (doctor_id = usuário) além da RLS. Plano e relatório
// aprovados só entram se a versão aprovada não estiver publicada. Documento
// só entra para quem revisa (médico) e só de paciente com vínculo ativo.
export async function openWork(
  id: string,
  input: { activePatientIds: string[]; names: Map<string, string> },
): Promise<OpenWorkItem[]> {
  const tenant = tenantId(id);
  const { client, clinic, user } = await requireClinic(tenant, ["doctor", "nurse"]);
  const base = `/clinicas/${tenant}`;
  const isDoctor = clinic.role === "doctor";
  const none = Promise.resolve({ data: [], error: null });

  const [drafts, plans, reports, documents] = await Promise.all([
    client
      .from("encounters")
      .select("id,patient_id,updated_at")
      .eq("tenant_id", tenant)
      .eq("doctor_id", user.id)
      .eq("status", "draft")
      .order("updated_at")
      .order("id")
      .limit(scan),
    client
      .from("care_plans")
      .select("id,patient_id,status,version,updated_at")
      .eq("tenant_id", tenant)
      .eq("doctor_id", user.id)
      .in("status", ["draft", "in_review", "approved"])
      .order("updated_at")
      .order("id")
      .limit(scan),
    isDoctor
      ? client
          .from("care_reports")
          .select("id,patient_id,status,version,updated_at")
          .eq("tenant_id", tenant)
          .eq("doctor_id", user.id)
          .in("status", ["draft", "in_review", "approved"])
          .order("updated_at")
          .order("id")
          .limit(scan)
      : none,
    isDoctor && input.activePatientIds.length
      ? client
          .from("patient_documents")
          .select("id,patient_id,available_at,created_at")
          .eq("tenant_id", tenant)
          .eq("status", "available")
          // Foto de refeição é parte do relato, não exame: fica fora.
          .eq("attached_to", "documents")
          .in("patient_id", input.activePatientIds)
          .order("created_at", { ascending: false })
          .order("id")
          .limit(documentScan)
      : none,
  ]);
  if (drafts.error || plans.error || reports.error || documents.error)
    throw new Error("Unable to load open work");

  const approvedPlans = (plans.data ?? []).filter((row) => row.status === "approved");
  const approvedReports = (reports.data ?? []).filter((row) => row.status === "approved");
  const documentIds = (documents.data ?? []).map((row) => row.id);
  const [planPublications, reportPublications, reviews] = await Promise.all([
    approvedPlans.length
      ? client
          .from("care_plan_publications")
          .select("plan_id,source_version")
          .eq("tenant_id", tenant)
          .eq("status", "published")
          .in("plan_id", approvedPlans.map((row) => row.id))
      : none,
    approvedReports.length
      ? client
          .from("care_report_publications")
          .select("report_id,source_version")
          .eq("tenant_id", tenant)
          .eq("status", "published")
          .in("report_id", approvedReports.map((row) => row.id))
      : none,
    documentIds.length
      ? client
          .from("patient_document_reviews")
          .select("document_id")
          .eq("tenant_id", tenant)
          .in("document_id", documentIds)
      : none,
  ]);
  if (planPublications.error || reportPublications.error || reviews.error)
    throw new Error("Unable to load open work");

  // Nomes: os do vínculo primeiro; quem faltar (plano de paciente sem vínculo
  // ativo, por exemplo) é lido numa query só.
  const names = new Map(input.names);
  const missing = [
    ...new Set(
      [...(drafts.data ?? []), ...(plans.data ?? []), ...(reports.data ?? [])]
        .map((row) => row.patient_id)
        .filter((patientId) => !names.has(patientId)),
    ),
  ];
  if (missing.length) {
    const patients = await client
      .from("patients")
      .select("id,display_name")
      .eq("tenant_id", tenant)
      .in("id", missing);
    if (patients.error) throw new Error("Unable to load open work");
    for (const row of patients.data ?? []) names.set(row.id, row.display_name);
  }
  const name = (patientId: string) => names.get(patientId) ?? "Paciente";

  const planPublished = new Set(
    ((planPublications.data ?? []) as { plan_id: string; source_version: number }[]).map(
      (row) => `${row.plan_id}:${row.source_version}`,
    ),
  );
  const reportPublished = new Set(
    ((reportPublications.data ?? []) as { report_id: string; source_version: number }[]).map(
      (row) => `${row.report_id}:${row.source_version}`,
    ),
  );
  const reviewed = new Set(
    ((reviews.data ?? []) as { document_id: string }[]).map((row) => row.document_id),
  );

  const items: OpenWorkItem[] = [];
  for (const row of drafts.data ?? [])
    items.push(
      encounterItem(base, {
        id: row.id,
        patientId: row.patient_id,
        patientName: name(row.patient_id),
        updatedAt: row.updated_at,
      }),
    );
  for (const row of plans.data ?? []) {
    const item = planItem(
      base,
      {
        id: row.id,
        patientId: row.patient_id,
        patientName: name(row.patient_id),
        status: row.status,
        version: row.version,
        updatedAt: row.updated_at,
      },
      planPublished,
    );
    if (item) items.push(item);
  }
  for (const row of (reports.data ?? []) as {
    id: string;
    patient_id: string;
    status: string;
    version: number;
    updated_at: string;
  }[]) {
    const item = reportItem(
      base,
      {
        id: row.id,
        patientId: row.patient_id,
        patientName: name(row.patient_id),
        status: row.status,
        version: row.version,
        updatedAt: row.updated_at,
      },
      reportPublished,
    );
    if (item) items.push(item);
  }
  items.push(
    ...documentItems(
      base,
      ((documents.data ?? []) as {
        id: string;
        patient_id: string;
        available_at: string | null;
        created_at: string;
      }[]).map((row) => ({
        id: row.id,
        patientId: row.patient_id,
        at: row.available_at ?? row.created_at,
      })),
      reviewed,
      names,
    ),
  );
  return openWorkOrder(items);
}
