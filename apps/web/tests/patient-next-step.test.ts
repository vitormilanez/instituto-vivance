import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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
  assert.match(area, /onboardingHref/);
  assert.match(area, /latestPublication/);
  assert.match(area, /nextAppointment/);
  assert.match(area, /Seu próximo passo/);
  assert.match(area, /Conheça seu espaço de conversas/);
});

test("patient onboarding draft is presented as the next step instead of a duplicate panel", () => {
  assert.match(page, /onboardingHref=/);
  assert.match(page, /onboarding\?\.status === "draft"/);
  assert.doesNotMatch(page, /Vamos preparar sua primeira conversa/);
});
