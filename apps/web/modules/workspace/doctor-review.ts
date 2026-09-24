import type { ReceivedItem, ReceivedItemKind } from "./received-items";

export type DoctorReviewPatient = {
  patientId: string;
  name: string;
  items: ReceivedItem[];
};
export type DoctorReviewStatus = "all" | "unopened" | "opened" | "reviewed" | "unknown";
type ReviewState = Exclude<DoctorReviewStatus, "all">;

// Os estados da fila são mutuamente exclusivos. Revisão humana prevalece
// sobre abertura: uma revisão registrada nunca volta a parecer pendência.
export function doctorReviewState(item: ReceivedItem): ReviewState {
  if (item.reviewed === true) return "reviewed";
  if (item.reviewed === null || item.seen == null) return "unknown";
  return item.seen ? "opened" : "unopened";
}

export function doctorReviewStateLabel(item: ReceivedItem): string {
  const state = doctorReviewState(item);
  if (state === "reviewed") return "Revisão registrada";
  if (state === "unknown")
    return item.reviewed === null ? "Revisão não confirmada" : "Abertura não confirmada";
  const opened = state === "opened" ? "Já aberto" : "Ainda não aberto";
  return item.reviewed === false ? `${opened} · revisão não registrada` : opened;
}

export function doctorReviewCounts(groups: DoctorReviewPatient[]) {
  const counts = { total: 0, unopened: 0, opened: 0, reviewed: 0, unknown: 0 };
  for (const patient of groups)
    for (const item of patient.items) {
      counts.total += 1;
      counts[doctorReviewState(item)] += 1;
    }
  return counts;
}

// Only resolve identifiers already returned by the authorized inbox query.
// An invalid explicit selection must not silently show another patient's data.
export function doctorReviewSelection(patients: DoctorReviewPatient[], query: { item?: string; paciente?: string }) {
  const ordered = doctorReviewGroups(patients, { kind: "all", status: "all", search: "" });
  const available = ordered.flatMap((patient) => patient.items.map((item) => ({ patient, item })));
  return available.find(({ patient, item }) =>
    (!query.paciente || patient.patientId === query.paciente) &&
    (!query.item || `${item.kind}:${item.id}` === query.item));
}

// A fila organiza envios por chegada, sem inferir prioridade clínica.
export function doctorReviewGroups(
  patients: DoctorReviewPatient[],
  filters: {
    kind: ReceivedItemKind | "all";
    status: DoctorReviewStatus;
    search: string;
  },
): DoctorReviewPatient[] {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  const search = normalize(filters.search.trim());
  const chronological = (left: ReceivedItem, right: ReceivedItem) =>
    left.at.localeCompare(right.at) ||
    left.kind.localeCompare(right.kind) ||
    left.id.localeCompare(right.id);
  return patients
    .filter((patient) => normalize(patient.name).includes(search))
    .map((patient) => ({
      ...patient,
      items: patient.items
        .filter(
          (item) =>
            (filters.kind === "all" || item.kind === filters.kind) &&
            (filters.status === "all" || doctorReviewState(item) === filters.status),
        )
        .sort(chronological),
    }))
    .filter((patient) => patient.items.length > 0)
    .sort(
      (left, right) =>
        chronological(left.items[0], right.items[0]) ||
        left.patientId.localeCompare(right.patientId),
    );
}
