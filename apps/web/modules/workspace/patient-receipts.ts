import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId, InputError } from "@/lib/validation";
import { checkInSummary, type CheckInAnswers } from "@/modules/daily-check-ins/model";
import { patientReturnPreparations } from "@/modules/return-preparation/service";
import { preparationTopics } from "@/modules/return-preparation/questionnaire";
import { mealTypeLabels } from "@/modules/meals/validation";
import { documentTitle } from "@/modules/documents/title";
import { sentLabels, type SentKind } from "./patient-home";

export type PatientReceipt = {
  title: string;
  at: string;
  rows: { label: string; value: string }[];
  documentId?: string;
  sharedByTeam?: boolean;
};

export async function patientReceipt(id: string, kindInput: string, keyInput: string) {
  const tenant = tenantId(id), key = tenantId(keyInput);
  if (!Object.hasOwn(sentLabels, kindInput)) throw new InputError("Tipo de envio inválido.");
  const kind = kindInput as SentKind;
  const { client, user, clinic } = await requireClinic(tenant, ["patient"]);
  const account = await client.from("patient_accounts").select("patient_id").eq("tenant_id", tenant).eq("user_id", user.id).maybeSingle();
  if (account.error) throw new Error("Não foi possível carregar seu envio.");
  if (!account.data) return { clinic, receipt: null };
  const patient = account.data.patient_id;
  let receipt: PatientReceipt | null = null;
  const title = sentLabels[kind];
  const checked = <T>(result: { data: T; error: unknown }) => {
    if (result.error) throw new Error("Não foi possível carregar seu envio. Tente novamente.");
    return result.data;
  };
  if (kind === "preparation") {
    const result = await patientReturnPreparations(tenant, undefined, key);
    const item = result.preparations.find((item) => item.id === key && item.patient_id === patient);
    if (item?.submission) {
      const answers = item.submission.answers as Record<string, string>;
      const questions = item.questionnaire.questions as { id: string; label: string }[];
      receipt = { title, at: item.submission.submitted_at, rows: [
        { label: "Consulta", value: new Date(item.appointments.starts_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) },
        ...questions.map((q) => ({ label: q.label, value: answers[q.id] ?? "Não respondida" })),
        { label: "Prioridades", value: item.submission.priorities.map((id) => preparationTopics.find((t) => t.id === id)?.label ?? id).join(" · ") || "Nenhuma escolhida" },
      ] };
    }
  } else if (kind === "daily") {
    const row = checked(await client.from("patient_daily_check_ins").select("*").eq("tenant_id", tenant).eq("patient_id", patient).eq("actor_user_id", user.id).eq("client_request_id", key).maybeSingle());
    if (row) {
      const answers = Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null)) as CheckInAnswers;
      receipt = { title, at: row.submitted_at, rows: checkInSummary(answers) };
    }
  } else if (kind === "meal") {
    const row = checked(await client.from("patient_meal_logs").select("*").eq("tenant_id", tenant).eq("patient_id", patient).eq("actor_user_id", user.id).eq("id", key).maybeSingle());
    if (row) receipt = { title, at: row.created_at, rows: [
      { label: "Refeição", value: mealTypeLabels[row.meal_type as keyof typeof mealTypeLabels] ?? row.meal_type },
      { label: "Quando", value: new Date(row.eaten_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) },
      { label: "Seu relato", value: row.description ?? "Só a foto, sem descrição." },
    ], documentId: row.photo_document_id ?? undefined };
  } else if (kind === "document") {
    const row = checked(await client.from("patient_documents").select("*").eq("tenant_id", tenant).eq("patient_id", patient).eq("id", key).eq("status", "available").eq("attached_to", "documents").maybeSingle());
    if (row) receipt = { title, at: row.available_at ?? row.created_at, rows: [{ label: "Documento", value: documentTitle(row) }, { label: "Nome original", value: row.original_filename }], documentId: row.id, sharedByTeam: row.uploaded_by !== user.id };
  } else if (kind === "measurements") {
    const rows = checked(await client.from("patient_measurements").select("*").eq("tenant_id", tenant).eq("patient_id", patient).eq("actor_user_id", user.id).eq("client_request_id", key));
    if (rows?.length) receipt = { title, at: rows[0].submitted_at, rows: rows.map((row) => ({ label: `${row.measure_label} · ${row.reported_on.split("-").reverse().join("/")}`, value: `${new Intl.NumberFormat("pt-BR").format(row.measure_value)} ${row.measure_unit}` })) };
  } else if (kind === "message") {
    const row = checked(await client.from("care_messages").select("content,sent_at").eq("tenant_id", tenant).eq("patient_id", patient).eq("sender_id", user.id).eq("id", key).maybeSingle());
    if (row) receipt = { title, at: row.sent_at, rows: [{ label: "Sua mensagem", value: row.content }] };
  } else {
    const row = checked(await client.from("care_check_in_submissions").select("*").eq("tenant_id", tenant).eq("patient_id", patient).eq("actor_user_id", user.id).eq("check_in_id", key).maybeSingle());
    if (row) receipt = { title, at: row.submitted_at, rows: [{ label: "Seu relato", value: row.report }, ...(row.measure_label ? [{ label: row.measure_label, value: `${row.measure_value} ${row.measure_unit}` }] : [])] };
  }
  return { clinic, receipt };
}

export async function patientDailyHistory(id: string) {
  const tenant = tenantId(id);
  const { client, user } = await requireClinic(tenant, ["patient"]);
  const result = await client.from("patient_daily_check_ins").select("client_request_id,submitted_at")
    .eq("tenant_id", tenant).eq("actor_user_id", user.id).order("submitted_at", { ascending: false }).limit(20);
  if (result.error?.code === "42P01" || result.error?.code === "PGRST205") return null;
  if (result.error) throw new Error("Não foi possível carregar seus check-ins.");
  return result.data ?? [];
}
