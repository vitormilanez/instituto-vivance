import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { patientNextStep } from "../modules/workspace/patient-next-step.ts";

const area = readFileSync(
  new URL("../components/patient-area.tsx", import.meta.url),
  "utf8",
);
const page = readFileSync(
  new URL(
    "../app/clinicas/[tenantId]/meu-cuidado/[section]/page.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("patient today chooses one next step from actual available context", () => {
  const base = "/clinicas/tenant/meu-cuidado";
  assert.equal(
    patientNextStep({
      base,
      onboardingHref: "/onboarding",
      publishedPlanTitle: "Plano vigente",
      hasConsultationInProgress: true,
      hasUpcomingConsultation: true,
      pendingCheckInId: "check-in",
    }).title,
    "Acompanhe sua consulta em andamento",
  );
  assert.equal(
    patientNextStep({
      base,
      onboardingHref: "/onboarding",
      publishedPlanTitle: "Plano vigente",
      hasConsultationInProgress: false,
      hasUpcomingConsultation: true,
      pendingCheckInId: "check-in",
    }).href,
    `${base}/diario#check-in-check-in`,
  );
  assert.equal(
    patientNextStep({
      base,
      onboardingHref: "/onboarding",
      publishedPlanTitle: "Plano vigente",
      hasConsultationInProgress: false,
      hasUpcomingConsultation: true,
    }).href,
    "/onboarding",
  );
  assert.match(area, /Seu próximo passo/);
  assert.equal(area.match(/available: (?:true|false)/g)?.length, 8);
  assert.match(area, /!action\.available/);
  assert.match(area, /Em desenvolvimento/);
});

test("patient onboarding draft is presented as the next step instead of a duplicate panel", () => {
  assert.match(page, /onboardingHref=/);
  assert.match(page, /onboarding\?\.status === "draft"/);
  assert.match(page, /item\.status === "pending"/);
  assert.doesNotMatch(page, /Vamos preparar sua primeira conversa/);
});

test("requested return preparation becomes a resumable patient next step", () => {
  const base = "/clinicas/tenant/meu-cuidado";
  assert.deepEqual(
    patientNextStep({
      base,
      hasConsultationInProgress: false,
      hasUpcomingConsultation: true,
      pendingReturnPreparationId: "request-id",
    }),
    {
      title: "Prepare sua próxima consulta",
      detail: "Seu médico enviou um roteiro curto. Você pode responder, salvar e continuar depois.",
      action: "Começar preparo",
      href: `${base}/hoje?preparo=request-id#preparo-request-id`,
    },
  );
});
