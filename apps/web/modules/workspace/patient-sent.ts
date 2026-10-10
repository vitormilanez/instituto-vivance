import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import { recentSent, type SentItem } from "./patient-home";
import { mealTypeLabels } from "@/modules/meals/validation";

// O que a própria pessoa enviou, para a Home confirmar que chegou. Lida com a
// sessão do paciente: a RLS só devolve registros dele, e o filtro por autoria
// deixa de fora o que a equipe registrou por ele. Uma query por tipo, poucas
// linhas cada. Se algo falhar, a seção simplesmente não aparece — nunca um
// "nada enviado" que não é verdade.
const perKind = 5;

export async function patientRecentSent(id: string): Promise<SentItem[] | null> {
  const tenant = tenantId(id);
  const { client, user } = await requireClinic(tenant, ["patient"]);
  const account = await client
    .from("patient_accounts")
    .select("patient_id")
    .eq("tenant_id", tenant)
    .eq("user_id", user.id)
    .maybeSingle();
  if (account.error || !account.data) return null;
  const patient = account.data.patient_id;
  const [measurements, meals, documents, checkIns, preparations, messages, daily] =
    await Promise.all([
      client
        .from("patient_measurements")
        .select("client_request_id,submitted_at,measure_label,measure_value,measure_unit")
        .eq("tenant_id", tenant)
        .eq("patient_id", patient)
        .eq("actor_user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(perKind * 3),
      client
        .from("patient_meal_logs")
        .select("id,created_at,meal_type")
        .eq("tenant_id", tenant)
        .eq("patient_id", patient)
        .eq("actor_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(perKind),
      client
        .from("patient_documents")
        .select("id,available_at,created_at")
        .eq("tenant_id", tenant)
        .eq("patient_id", patient)
        .eq("uploaded_by", user.id)
        .eq("status", "available")
        // Arquivos do perfil ficam no histórico da seção; não têm revisão
        // individual e não devem ocupar os últimos envios como exames avulsos.
        .eq("visibility", "shared")
        // Foto de refeição é parte do relato, não exame: fica fora.
        .eq("attached_to", "documents")
        .order("created_at", { ascending: false })
        .limit(perKind),
      client
        .from("care_check_ins")
        .select("id,submitted_at")
        .eq("tenant_id", tenant)
        .eq("patient_id", patient)
        .in("status", ["submitted", "reviewed"])
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(perKind),
      client
        .from("return_preparation_requests")
        .select("id,submitted_at")
        .eq("tenant_id", tenant)
        .eq("patient_id", patient)
        .in("status", ["submitted", "reviewed"])
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(perKind),
      client
        .from("care_messages")
        .select("id,sent_at")
        .eq("tenant_id", tenant)
        .eq("patient_id", patient)
        .eq("sender_id", user.id)
        .order("sent_at", { ascending: false })
        .limit(perKind),
      client
        .from("patient_daily_check_ins")
        .select("client_request_id,submitted_at")
        .eq("tenant_id", tenant)
        .eq("actor_user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(perKind),
    ]);
  if (
    measurements.error ||
    meals.error ||
    documents.error ||
    checkIns.error ||
    preparations.error ||
    messages.error
  )
    return null;

  const items: SentItem[] = [];
  // Check-in diário: tabela nova pode ainda não existir; aí o tipo só some.
  const dailyRows = daily.error ? [] : (daily.data ?? []);
  const dailyKeys = new Set(dailyRows.map((row) => row.client_request_id));
  for (const row of dailyRows)
    items.push({ kind: "daily", key: row.client_request_id, at: row.submitted_at, detail: null });
  // Medidas do mesmo envio viram uma linha: "Peso 72,4 kg · Cintura 91 cm".
  const grouped = new Map<string, { at: string; parts: string[] }>();
  for (const row of measurements.data ?? []) {
    const group = grouped.get(row.client_request_id) ?? { at: row.submitted_at, parts: [] };
    group.parts.push(
      `${row.measure_label} ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(row.measure_value)} ${row.measure_unit}`,
    );
    grouped.set(row.client_request_id, group);
  }
  for (const [key, group] of grouped)
    if (!dailyKeys.has(key)) items.push({ kind: "measurements", key, at: group.at, detail: group.parts.join(" · ") });
  for (const row of meals.data ?? [])
    items.push({
      kind: "meal",
      key: row.id,
      at: row.created_at,
      detail: mealTypeLabels[row.meal_type as keyof typeof mealTypeLabels] ?? null,
    });
  for (const row of documents.data ?? [])
    items.push({ kind: "document", key: row.id, at: row.available_at ?? row.created_at, detail: null });
  for (const row of checkIns.data ?? [])
    if (row.submitted_at) items.push({ kind: "checkin", key: row.id, at: row.submitted_at, detail: null });
  for (const row of preparations.data ?? [])
    if (row.submitted_at) items.push({ kind: "preparation", key: row.id, at: row.submitted_at, detail: null });
  for (const row of messages.data ?? [])
    items.push({ kind: "message", key: row.id, at: row.sent_at, detail: null });
  const recent = recentSent(items);
  const sentDocuments = recent.filter((item) => item.kind === "document");
  if (!sentDocuments.length) return recent;

  // A associação ao pedido e o estado da revisão são projeções separadas.
  // Falhar em uma delas não apaga o comprovante do envio já carregado.
  const requests = await (async () => {
    try {
      return await client
        .from("patient_care_requests")
        .select("requested_at,response_document_id")
        .eq("tenant_id", tenant)
        .eq("patient_id", patient)
        .eq("kind", "exams")
        .in("response_document_id", sentDocuments.map((item) => item.key));
    } catch {
      return null;
    }
  })();
  const requestAt = new Map((requests?.data ?? []).filter((row) => row.response_document_id)
    .map((row) => [row.response_document_id!, row.requested_at]));
  const statuses = await Promise.all(sentDocuments.map(async (item) => {
    let status: string | undefined;
    try {
      const result = await client.rpc("get_own_patient_document_status", {
        target_tenant: tenant,
        target_document: item.key,
      });
      status = result.data?.[0]?.operational_status;
    } catch {
      // Os demais envios continuam visíveis mesmo se este estado falhar.
    }
    return [item.key, status === "received" || status === "review_recorded" ? status : "unavailable"] as const;
  }));
  const statusByDocument = new Map(statuses);
  return recent.map((item) => item.kind === "document"
    ? { ...item, reviewStatus: statusByDocument.get(item.key), requestAt: requestAt.get(item.key) }
    : item);
}
