import Link from "next/link";
import type { OnboardingRecord } from "@/modules/onboarding/types";
import type { SubmittedPatientProfileContext } from "@/modules/onboarding/profile-types";
import { onboardingMeasurements, onboardingQuestions } from "@/modules/onboarding/display";

export function OnboardingSummary({
  record,
  documentsHref,
  profileContext,
}: {
  record: OnboardingRecord;
  documentsHref: string;
  profileContext?: SubmittedPatientProfileContext | null;
}) {
  const measures = record.measurements;
  const healthLabels = {
    medications: "Medicamentos",
    conditions: "Condições de saúde",
    allergies: "Alergias",
    surgeries: "Cirurgias",
    familyHistory: "Histórico familiar",
  } as const;
  const statusLabels = { "": "", yes: "Sim", no: "Não", unknown: "Não sei", discuss: "Prefere conversar" } as const;
  const health = record.healthContext;
  const hasHealth = health && Object.values(health).some((answer) => answer.status || answer.details.trim());
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
        {record.profile.birthDate && <div><dt>Data de nascimento informada</dt><dd>{record.profile.birthDate.split("-").reverse().join("/")}</dd></div>}
        {onboardingQuestions.filter(({ id }) => record.answers[id]?.trim()).map(({ id, label }) => (
          <div key={id}>
            <dt>{label}</dt>
            <dd style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {record.answers[id]}
            </dd>
          </div>
        ))}
        {hasHealth && Object.entries(healthLabels).map(([key, label]) => {
          const answer = health[key as keyof typeof healthLabels];
          if (!answer.status && !answer.details.trim()) return null;
          return <div key={key}>
            <dt>{label}</dt>
            <dd style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {[statusLabels[answer.status], answer.details].filter(Boolean).join(" · ")}
            </dd>
          </div>;
        })}
        <div>
          <dt>Medidas informadas</dt>
          <dd>
            {onboardingMeasurements(measures)}
          </dd>
        </div>
      </dl>
      {profileContext?.nutrition && <section aria-label="Alimentação compartilhada">
        <h3>Alimentação informada</h3>
        <p>Compartilhada em {new Date(profileContext.nutrition.submittedAt).toLocaleString("pt-BR", {timeZone:"America/Sao_Paulo"})}.</p>
        <p>Padrão: {({ "": "Não informado", mixed: "Mista", vegetarian: "Vegetariana", vegan: "Vegana", other: "Outra" } as const)[profileContext.nutrition.pattern]}</p>
        {profileContext.nutrition.preferences && <p>Preferências: {profileContext.nutrition.preferences}</p>}
        {profileContext.nutrition.avoidedFoods && <p>Alimentos evitados: {profileContext.nutrition.avoidedFoods}</p>}
        {profileContext.nutrition.mealRoutine.filter((meal) => meal.time || meal.description).map((meal) =>
          <p key={meal.id}>{({ breakfast: "Café da manhã", lunch: "Almoço", dinner: "Jantar", snack: "Lanche" } as const)[meal.id]}: {[meal.time, meal.description].filter(Boolean).join(" · ")}</p>)}
      </section>}
      {profileContext?.photos && <p>Fotos corporais compartilhadas: frente, lado e costas. <Link href={documentsHref}>Abrir documentos</Link></p>}
      {profileContext?.exams && <p>
        Exames: {profileContext.exams.status === "none_now" ? "Paciente informou que não possui exames para compartilhar agora" : `${profileContext.exams.documentIds.length} documento(s) compartilhado(s)`}.
        {profileContext.exams.documentIds.length > 0 && <> <Link href={documentsHref}>Abrir documentos</Link></>}
      </p>}
      <Link className="button secondary" href={documentsHref}>
        Ver documentos e exames
      </Link>
    </section>
  );
}
