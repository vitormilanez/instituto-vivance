import type { PatientIntakeContext } from "@/modules/patient-intake/types";

export function PatientIntakeSummary({
  record,
}: {
  record: PatientIntakeContext;
}) {
  return (
    <div className="patient-intake-summary">
      <dl className="patient-facts">
        <div>
          <dt>O que fez procurar o Vivance agora</dt>
          <dd>{record.reason || "Ainda não informado"}</dd>
        </div>
        <div>
          <dt>O que espera melhorar ou conseguir</dt>
          <dd>{record.expectedOutcome || "Ainda não informado"}</dd>
        </div>
        <div>
          <dt>O que é mais importante conversar primeiro</dt>
          <dd>{record.firstPriority || "Ainda não informado"}</dd>
        </div>
      </dl>
      <p className="patient-intake-attribution">
        {record.source === "patient_reported"
          ? `Compartilhado por ${record.recordedByName}`
          : `Registrado por ${record.recordedByName}, com o paciente`}
        {record.completedAt
          ? ` em ${new Date(record.completedAt).toLocaleDateString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            })}`
          : ""}
        .
      </p>
    </div>
  );
}
