import Link from "next/link";
import { patientGoalFacts } from "@/modules/workspace/patient-goal-facts";

export function DoctorCurrentGoal({
  expectedOutcome,
  firstPriority,
  source,
  recordedByName,
  updatedAt,
  href,
  awaitingPatient = false,
}: {
  expectedOutcome: string | null;
  firstPriority: string | null;
  source: "staff_assisted" | "patient_reported" | null;
  recordedByName: string | null;
  updatedAt: string | null;
  href: string;
  awaitingPatient?: boolean;
}) {
  const facts = patientGoalFacts({
    expectedOutcome,
    firstPriority,
    source,
    recordedByName,
    updatedAt,
    awaitingPatient,
  });
  if (!facts) return null;

  return (
    <section className="doctor-current-goal" aria-label="Objetivo informado pelo paciente">
      <div>
        <h3>
          {facts.title}
        </h3>
        {facts.expectedOutcome && <p>{facts.expectedOutcome}</p>}
        {facts.firstPriority && <p><strong>Prioridade declarada:</strong> {facts.firstPriority}</p>}
        <small>{facts.origin}{facts.updatedAt ? ` · atualizado em ${facts.updatedAt}` : ""}</small>
      </div>
      <Link href={href}>Abrir registro original</Link>
    </section>
  );
}
