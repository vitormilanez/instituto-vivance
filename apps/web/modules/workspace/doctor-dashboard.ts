import { clinicDate } from "../agenda/validation.ts";

export type DashboardBucket = { label: string; value: number };
export type DoctorDashboardMetrics = {
  active: number | null;
  assigned: number | null;
  messages: DashboardBucket[] | null;
  overdue: DashboardBucket[] | null;
};

export function dashboardDays(today: string): string[] {
  return Array.from({ length: 7 }, (_, index) => shiftDay(today, index - 6));
}
export function shiftDay(today: string, offset: number): string {
  const at = new Date(`${today}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() + offset);
  return at.toISOString().slice(0, 10);
}

// Only a genuinely future, scheduled appointment gets "Próxima". A late or
// in-progress encounter keeps its explicit state, never masquerades as future.
export function nextScheduledToday<T extends { id: string; status: string; starts_at: string }>(appointments: T[], now: string, today: string): T | null {
  return appointments.filter(item => item.status === "scheduled" && item.starts_at >= now && clinicDate(new Date(item.starts_at)) === today)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.id.localeCompare(b.id))[0] ?? null;
}

export function bucketTotal(values: DashboardBucket[] | null | undefined): number | null {
  return values ? values.reduce((total, item) => total + item.value, 0) : null;
}
