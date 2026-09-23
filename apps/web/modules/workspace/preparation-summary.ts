import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import { effectLabels, type EffectKey } from "@/modules/daily-check-ins/model";

const one = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dayMonth = (day: string) => day.split("-").reverse().slice(0, 2).join("/");

// O resumo que abre a pré-consulta: o que a própria pessoa registrou desde a
// última consulta, para ela confirmar em vez de reescrever. Só contagens e
// valores enviados — nenhuma leitura clínica. Falha vira ausência do bloco.
export async function preparationSummary(id: string, since: string) {
  const tenant = tenantId(id);
  const { client, user } = await requireClinic(tenant, ["patient"]);
  const [weights, daily, meals] = await Promise.all([
    client
      .from("patient_measurements")
      .select("measure_value,reported_on")
      .eq("tenant_id", tenant)
      .eq("actor_user_id", user.id)
      .eq("metric", "weight")
      .gte("reported_on", since)
      .order("reported_on")
      .order("submitted_at")
      .limit(200),
    client
      .from("patient_daily_check_ins")
      .select("check_in_on,effects")
      .eq("tenant_id", tenant)
      .eq("actor_user_id", user.id)
      .gte("check_in_on", since)
      .limit(200),
    client
      .from("patient_meal_logs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant)
      .eq("actor_user_id", user.id)
      .gte("eaten_at", `${since}T00:00:00-03:00`),
  ]);
  const rows: { label: string; value: string }[] = [];
  if (!weights.error && weights.data?.length) {
    const first = weights.data[0];
    const last = weights.data.at(-1)!;
    rows.push({
      label: "Peso",
      value:
        weights.data.length === 1
          ? `${one.format(first.measure_value)} kg em ${dayMonth(first.reported_on)}`
          : `${one.format(first.measure_value)} kg em ${dayMonth(first.reported_on)} → ${one.format(last.measure_value)} kg em ${dayMonth(last.reported_on)} · ${weights.data.length} registros`,
    });
  }
  if (!daily.error && daily.data?.length) {
    const days = new Map<string, Set<string>>();
    for (const row of daily.data)
      for (const key of Object.keys((row.effects ?? {}) as Record<string, string>)) {
        const set = days.get(key) ?? new Set<string>();
        set.add(row.check_in_on);
        days.set(key, set);
      }
    const effects = [...days.entries()]
      .sort((left, right) => right[1].size - left[1].size)
      .map(([key, set]) => `${effectLabels[key as EffectKey] ?? key} em ${set.size} ${set.size === 1 ? "dia" : "dias"}`);
    if (effects.length) rows.push({ label: "Efeitos que você marcou", value: effects.join(" · ") });
    rows.push({ label: "Check-ins", value: `${daily.data.length} ${daily.data.length === 1 ? "enviado" : "enviados"}` });
  }
  if (!meals.error && meals.count)
    rows.push({ label: "Refeições", value: `${meals.count} ${meals.count === 1 ? "registrada" : "registradas"}` });
  return rows;
}
