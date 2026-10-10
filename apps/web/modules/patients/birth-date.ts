import { ageInYears } from "../../lib/format.ts";

export function patientBirthDate(
  registeredBirthDate: string | null,
  reportedBirthDate: string | null,
) {
  if (registeredBirthDate)
    return { date: registeredBirthDate, source: "registered" as const };
  if (reportedBirthDate)
    return { date: reportedBirthDate, source: "patient" as const };
  return { date: null, source: null };
}

export function patientBirthLabel(
  registeredBirthDate: string | null,
  reportedBirthDate: string | null,
  today?: string,
) {
  const birth = patientBirthDate(registeredBirthDate, reportedBirthDate);
  if (!birth.date) return "Nascimento não informado";
  const age = ageInYears(birth.date, today);
  const date = birth.date.split("-").reverse().join("/");
  const origin = birth.source === "patient"
    ? "nascimento informado pelo paciente em"
    : "nascimento em";
  return `${age} ${age === 1 ? "ano" : "anos"} · ${origin} ${date}`;
}
