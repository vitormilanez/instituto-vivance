import { clinicDate, localToInstant } from "./validation.ts";

type Interval = { starts_at: string; ends_at: string; doctor_id: string; status: string };
export function agendaClock(instant: string) {
  return new Date(instant).toLocaleTimeString("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
}

// These are navigation shortcuts, not a declaration of the doctor's availability.
// Actual intervals (including off-grid times) always remain visible.
export function daySlots(date: string, intervals: readonly Interval[]) {
  const times = new Set(Array.from({ length: 25 }, (_, index) => {
    const minutes = 8 * 60 + index * 30;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }));
  for (const item of intervals) {
    if (clinicDate(new Date(item.starts_at)) === date) times.add(agendaClock(item.starts_at));
    else if (item.starts_at < localToInstant(date, "00:00") && item.ends_at > localToInstant(date, "00:00")) times.add("00:00");
  }
  return [...times].sort();
}

export function slotOccupied(date: string, time: string, doctorId: string, intervals: readonly Interval[]) {
  const instant = localToInstant(date, time);
  return intervals.some(item => item.doctor_id === doctorId && !["cancelled", "no_show"].includes(item.status) && item.starts_at <= instant && item.ends_at > instant);
}
