import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import { clinicDate, localToInstant } from "@/modules/agenda/validation";
import { requestInstant } from "@/lib/request-time";
import { dashboardDays, shiftDay, type DoctorDashboardMetrics } from "./doctor-dashboard";

// Operational facts only. Exact counts, current doctor's active links and RLS.
// No historical active-patient curve is inferred from today's relationships.
export async function doctorDashboardMetrics(id: string): Promise<DoctorDashboardMetrics> {
  const tenant = tenantId(id);
  const { client, user } = await requireClinic(tenant, ["doctor"]);
  const today = clinicDate(requestInstant());
  const empty: DoctorDashboardMetrics = { active: null, assigned: null, messages: null, overdue: null };
  const [active, assigned] = await Promise.all([
    client.from("care_relationships").select("patient_id", { count: "exact" }).eq("tenant_id", tenant).eq("professional_id", user.id).eq("status", "active").order("patient_id").limit(1000),
    client.from("care_relationships").select("id", { count: "exact", head: true }).eq("tenant_id", tenant).eq("professional_id", user.id).eq("status", "assigned"),
  ]);
  const result = { ...empty, active: active.error ? null : active.count, assigned: assigned.error ? null : assigned.count };
  // Never calculate a partial series if the scope was truncated or unavailable.
  if (active.error || active.count === null || active.count !== active.data?.length) return result;
  const ids = [...new Set(active.data.map(row => row.patient_id))];
  const days = dashboardDays(today);
  const ageLabels = ["1–2 dias", "3–7 dias", "> 7 dias"];
  if (!ids.length) return { ...result, messages: days.map(day => ({ label: day.slice(8), value: 0 })), overdue: ageLabels.map(label => ({ label, value: 0 })) };
  const accounts = await client.from("patient_accounts").select("patient_id,user_id", { count: "exact" }).eq("tenant_id", tenant).in("patient_id", ids).limit(1000);
  const senders = [...new Set((accounts.data ?? []).map(row => row.user_id))];
  const accountScopeComplete = !accounts.error && accounts.count !== null && accounts.count === accounts.data?.length;
  const overdueQuery = () => client.from("care_check_ins").select("id", { count: "exact", head: true }).eq("tenant_id", tenant).in("patient_id", ids).eq("status", "pending");
  const [messageCounts, overdueCounts] = await Promise.all([
    !accountScopeComplete ? Promise.resolve(null) : !senders.length ? Promise.resolve(days.map(() => ({ count: 0, error: null }))) : Promise.all(days.map(day =>
      client.from("care_messages").select("id", { count: "exact", head: true }).eq("tenant_id", tenant).eq("doctor_id", user.id).in("patient_id", ids).in("sender_id", senders)
        .gte("sent_at", localToInstant(day, "00:00")).lt("sent_at", localToInstant(shiftDay(day, 1), "00:00")))),
    Promise.all([
      overdueQuery().gte("due_on", shiftDay(today, -2)).lt("due_on", today),
      overdueQuery().gte("due_on", shiftDay(today, -7)).lt("due_on", shiftDay(today, -2)),
      overdueQuery().lt("due_on", shiftDay(today, -7)),
    ]),
  ]);
  return {
    ...result,
    messages: messageCounts?.every(row => !row.error && row.count !== null) ? days.map((day, index) => ({ label: day.slice(8), value: messageCounts[index].count! })) : null,
    overdue: overdueCounts.every(row => !row.error && row.count !== null) ? ageLabels.map((label, index) => ({ label, value: overdueCounts[index].count! })) : null,
  };
}
