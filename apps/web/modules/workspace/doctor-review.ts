import type { ReceivedItem, ReceivedItemKind } from "./received-items";

export type DoctorReviewPatient = {
  patientId: string;
  name: string;
  items: ReceivedItem[];
};
export type DoctorReviewStatus = "all" | "unopened" | "opened";

// Only resolve identifiers already returned by the authorized inbox query.
// An invalid explicit selection must not silently show another patient's data.
export function doctorReviewSelection(patients: DoctorReviewPatient[], query: { item?: string; paciente?: string }) {
  const ordered = doctorReviewGroups(patients, { kind: "all", status: "all", search: "" });
  const available = ordered.flatMap((patient) => patient.items.map((item) => ({ patient, item })));
  return available.find(({ patient, item }) =>
    (!query.paciente || patient.patientId === query.paciente) &&
    (!query.item || `${item.kind}:${item.id}` === query.item));
}

// A fila organiza envios por chegada, sem inferir prioridade clínica. `seen`
// significa somente abertura pelo profissional, nunca revisão ou aprovação.
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
            (filters.status === "all" ||
              (filters.status === "opened"
                ? item.seen === true
                : item.seen === false)),
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
