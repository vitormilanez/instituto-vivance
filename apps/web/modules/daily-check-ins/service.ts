import "server-only";
import { DomainError, databaseFailure } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import { clinicDate } from "@/modules/agenda/validation";
import { checkInDue, dailyCheckInInput, effectsMap, nextCheckInLabel } from "./model";

export class DailyCheckInError extends DomainError {}
const failed: (code?: string) => never = databaseFailure({
  error: DailyCheckInError,
  denied: "Sua conta não está vinculada a esta ficha. Atualize a página.",
  conflict: "Não foi possível registrar este check-in. Confira as respostas.",
  conflictCodes: ["23503", "23505", "23514"],
  log: "Daily check-in operation failed",
});

// Tabela ainda inexistente (migration não aplicada): o check-in some da tela
// em vez de derrubar a página.
const missingTable = (code?: string) => code === "42P01" || code === "PGRST205";

const addDays = (day: string, days: number) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export async function submitDailyCheckIn(id: string, input: unknown) {
  const tenant = tenantId(id);
  const value = dailyCheckInInput(input, clinicDate());
  const { client } = await requireClinic(tenant, ["patient"]);
  const result = await client.rpc("submit_daily_check_in", {
    target_tenant: tenant,
    request_key: value.requestKey,
    answers: value.answers,
  });
  if (result.error) failed(result.error.code);
  return { id: result.data as string };
}

// O estado do check-in para o próprio paciente: se há um esperando por ele,
// quando é o próximo e o mapa de efeitos das últimas duas semanas.
export async function patientCheckInState(id: string) {
  const tenant = tenantId(id);
  const { client, user } = await requireClinic(tenant, ["patient"]);
  const account = await client
    .from("patient_accounts")
    .select("patient_id")
    .eq("tenant_id", tenant)
    .eq("user_id", user.id)
    .maybeSingle();
  if (account.error || !account.data) return null;
  const today = clinicDate();
  const [settings, recent] = await Promise.all([
    client
      .from("patient_check_in_settings")
      .select("frequency_days,application_enabled")
      .eq("tenant_id", tenant)
      .eq("patient_id", account.data.patient_id)
      .maybeSingle(),
    client
      .from("patient_daily_check_ins")
      .select("check_in_on,effects,submitted_at")
      .eq("tenant_id", tenant)
      .eq("patient_id", account.data.patient_id)
      .gte("check_in_on", addDays(today, -30))
      .order("check_in_on", { ascending: false })
      .limit(100),
  ]);
  if (missingTable(settings.error?.code) || missingTable(recent.error?.code)) return null;
  if (settings.error || recent.error) failed(settings.error?.code ?? recent.error?.code);
  const frequencyDays = settings.data?.frequency_days ?? 1;
  const rows = (recent.data ?? []) as { check_in_on: string; effects: Record<string, string> | null; submitted_at: string }[];
  const lastOn = rows[0]?.check_in_on ?? null;
  const due = checkInDue(lastOn, frequencyDays, today);
  const twoWeeks = addDays(today, -13);
  return {
    frequencyDays,
    applicationEnabled: settings.data?.application_enabled ?? false,
    due: due.due,
    nextLabel: nextCheckInLabel(due.nextOn, today),
    lastSubmittedAt: rows[0]?.submitted_at ?? null,
    recentCount: rows.filter((row) => row.check_in_on >= twoWeeks).length,
    effects: effectsMap(rows, today),
  };
}
export type PatientCheckInState = NonNullable<Awaited<ReturnType<typeof patientCheckInState>>>;

// Leitura do médico: configuração e os relatos recentes do paciente.
export async function staffCheckIns(id: string, patientInput: string) {
  const tenant = tenantId(id);
  const patient = tenantId(patientInput);
  const { client } = await requireClinic(tenant, ["doctor", "nurse"]);
  const today = clinicDate();
  const [settings, recent] = await Promise.all([
    client
      .from("patient_check_in_settings")
      .select("frequency_days,application_enabled,updated_at")
      .eq("tenant_id", tenant)
      .eq("patient_id", patient)
      .maybeSingle(),
    client
      .from("patient_daily_check_ins")
      .select("*")
      .eq("tenant_id", tenant)
      .eq("patient_id", patient)
      .gte("check_in_on", addDays(today, -30))
      .order("check_in_on", { ascending: false })
      .order("submitted_at", { ascending: false })
      .limit(60),
  ]);
  if (missingTable(settings.error?.code) || missingTable(recent.error?.code)) return null;
  if (settings.error || recent.error) failed(settings.error?.code ?? recent.error?.code);
  const rows = recent.data ?? [];
  return {
    frequencyDays: settings.data?.frequency_days ?? 1,
    applicationEnabled: settings.data?.application_enabled ?? false,
    configured: Boolean(settings.data),
    rows,
    effects: effectsMap(rows as { check_in_on: string; effects: Record<string, string> | null }[], today),
  };
}
export type StaffCheckIns = NonNullable<Awaited<ReturnType<typeof staffCheckIns>>>;

export async function setCheckInSettings(id: string, patientInput: string, input: unknown) {
  const tenant = tenantId(id);
  const patient = tenantId(patientInput);
  const body = (input ?? {}) as Record<string, unknown>;
  if (![1, 3].includes(body.frequency_days as number) || typeof body.application_enabled !== "boolean")
    throw new DailyCheckInError("Escolha diário ou a cada 3 dias.", 422);
  const { client } = await requireClinic(tenant, ["doctor"]);
  const result = await client.rpc("set_check_in_settings", {
    target_tenant: tenant,
    target_patient: patient,
    frequency: body.frequency_days as number,
    application: body.application_enabled,
  });
  if (result.error) failed(result.error.code);
  return { ok: true };
}
