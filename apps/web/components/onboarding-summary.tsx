import Link from "next/link";
import type { OnboardingRecord } from "@/modules/onboarding/types";

const questions = [
  ["goal", "O que procura melhorar"],
  ["history", "Quando começou e o que mudou"],
  ["routine", "Rotina e impacto no dia a dia"],
  ["treatments", "Tratamentos, medicamentos e tentativas anteriores"],
  ["questions", "Dúvidas para a consulta"],
] as const;

export function OnboardingSummary({
  record,
  documentsHref,
}: {
  record: OnboardingRecord;
  documentsHref: string;
}) {
  const measures = record.measurements;
  return (
    <section className="panel" aria-labelledby="onboarding-summary-title">
      <h2 id="onboarding-summary-title">Antes da primeira consulta</h2>
      <p>
        Respostas originais compartilhadas pelo paciente
        {record.submittedAt
          ? ` em ${new Date(record.submittedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
          : ""}
        .
      </p>
      <dl className="patient-facts">
        {questions.map(([key, label]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {record.answers[key] || "Não informado — conversar na consulta"}
            </dd>
          </div>
        ))}
        <div>
          <dt>Medidas informadas</dt>
          <dd>
            {[
              measures.weightKg !== null
                ? `Peso: ${measures.weightKg} kg`
                : null,
              measures.heightCm !== null
                ? `Altura: ${measures.heightCm} cm`
                : null,
              measures.waistCm !== null
                ? `Cintura: ${measures.waistCm} cm`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Não informadas"}
            {measures.measuredOn
              ? ` (${measures.measuredOn.split("-").reverse().join("/")})`
              : ""}
          </dd>
        </div>
      </dl>
      <Link className="button secondary" href={documentsHref}>
        Ver documentos e exames
      </Link>
    </section>
  );
}
