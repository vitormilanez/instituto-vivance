import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { patientHeaderFacts } from "../modules/workspace/patient-header-facts.ts";

const page = readFileSync(
  new URL("../app/clinicas/[tenantId]/pacientes/[patientId]/page.tsx", import.meta.url),
  "utf8",
);
const documents = readFileSync(
  new URL("../modules/documents/service.ts", import.meta.url),
  "utf8",
);

test("patient record connects individual documents and longitudinal views", () => {
  assert.match(page, /staffLongitudinal\(tenantId, patientId,/);
  assert.match(page, /staffDocuments\(tenantId, query\.pagina, patientId\)/);
  assert.match(page, /showPatientPicker=\{false\}/);
  assert.match(page, /showMeasures=\{false\}/);
  assert.match(page, /showTimeline=\{false\}/);
  assert.doesNotMatch(page, /Esta parte da ficha ainda será conectada/);
});

test("individual document reads verify the active care relationship", () => {
  assert.match(documents, /patientInput\?: string/);
  assert.match(documents, /documentQuery = documentQuery\.eq\("patient_id", patient\)/);
  assert.match(
    documents,
    /if \(patient && !patients\.some\(\(item\) => item\.id === patient\)\)/,
  );
});

test("patient header shows no facts strip without an active care relationship", () => {
  assert.equal(patientHeaderFacts(null, "tenant-1"), null);
});

test("patient header states an active link honestly even with no consultation or plan yet", () => {
  assert.deepEqual(
    patientHeaderFacts(
      { relationshipId: "rel-1", encounter: null, publications: [] },
      "tenant-1",
    ),
    {
      relationshipLabel: "Vínculo ativo",
      encounterHref: null,
      encounterLabel: null,
      planHref: null,
      planLabel: null,
    },
  );
});

test("patient header links to the real finalized encounter and published plan", () => {
  assert.deepEqual(
    patientHeaderFacts(
      {
        relationshipId: "rel-1",
        encounter: { id: "enc-1", finalized_at: "2026-09-10T12:00:00.000Z" },
        publications: [
          {
            id: "pub-1",
            plan_id: "plan-1",
            title: "Plano alimentar",
            revision: 2,
            published_at: "2026-09-01T00:00:00.000Z",
          },
        ],
      },
      "tenant-1",
    ),
    {
      relationshipLabel: "Vínculo ativo",
      encounterHref: "/clinicas/tenant-1/atendimentos/enc-1",
      encounterLabel: "Finalizada em 10/09/2026",
      planHref: "/clinicas/tenant-1/planos/plan-1",
      planLabel: "Plano alimentar · revisão 2",
    },
  );
});

test("today omits clinical context when the focused appointment has no active care link", () => {
  const today = readFileSync(
    new URL("../modules/workspace/today.ts", import.meta.url),
    "utf8",
  );
  assert.match(today, /\.eq\("professional_id", user\.id\)/);
  assert.match(today, /\.eq\("status", "active"\)/);
  assert.match(today, /if \(!relationship\.data\) return null/);
  assert.match(
    readFileSync(
      new URL("../components/today-workspace.tsx", import.meta.url),
      "utf8",
    ),
    /Não há contexto clínico disponível para este vínculo/,
  );
});
