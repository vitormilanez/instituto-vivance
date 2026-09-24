import Link from "next/link";
import type { OnboardingRecord } from "@/modules/onboarding/types";
import { onboardingMeasurements, onboardingQuestions } from "@/modules/onboarding/display";

export function OnboardingSummary({
  record,
  documentsHref,
}: {
  record: OnboardingRecord;
  documentsHref: string;
}) {
  const measures = record.measurements;
  return (
    <section id="onboarding-summary" className="panel" aria-labelledby="onboarding-summary-title">
      <h2 id="onboarding-summary-title">Antes da primeira consulta</h2>
      <p>
        Respostas originais compartilhadas pelo paciente
        {record.submittedAt
          ? ` em ${new Date(record.submittedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
          : ""}
        .
      </p>
      <dl className="patient-facts">
        {onboardingQuestions.map(({ id, label }) => (
          <div key={id}>
            <dt>{label}</dt>
            <dd style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {record.answers[id] || "Não informado — conversar na consulta"}
            </dd>
          </div>
        ))}
        <div>
          <dt>Medidas informadas</dt>
          <dd>
            {onboardingMeasurements(measures)}
          </dd>
        </div>
      </dl>
      <Link className="button secondary" href={documentsHref}>
        Ver documentos e exames
      </Link>
    </section>
  );
}
