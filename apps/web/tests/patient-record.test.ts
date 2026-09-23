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
      {
        relationshipId: "rel-1",
preparation: null,
        documents: { total: 0, latest_at: null },
        measurements: { total: 0, latest_at: null },
        intake: null,
        encounter: null,
        nextAppointment: null,
        publications: [],
        requests: [],
      },
      "tenant-1",
    ),
    {
      relationshipLabel: "Vínculo ativo",
      encounterHref: null,
      encounterLabel: null,
      nextAppointmentHref: null,
      nextAppointmentLabel: null,
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
preparation: null,
        documents: { total: 0, latest_at: null },
        measurements: { total: 0, latest_at: null },
        intake: null,
        encounter: { id: "enc-1", finalized_at: "2026-09-10T12:00:00.000Z" },
        nextAppointment: null,
        publications: [
          {
            id: "pub-1",
            plan_id: "plan-1",
            title: "Plano alimentar",
            revision: 2,
            published_at: "2026-09-01T00:00:00.000Z",
          },
        ],
        requests: [],
      },
      "tenant-1",
    ),
    {
      relationshipLabel: "Vínculo ativo",
      encounterHref: "/clinicas/tenant-1/atendimentos/enc-1",
      encounterLabel: "Finalizada em 10/09/2026",
      nextAppointmentHref: null,
      nextAppointmentLabel: null,
      planHref: "/clinicas/tenant-1/planos/plan-1",
      planLabel: "Plano alimentar · revisão 2",
    },
  );
});

test("patient header links to the next scheduled appointment", () => {
  const facts = patientHeaderFacts(
    {
      relationshipId: "rel-1",
preparation: null,
      documents: { total: 0, latest_at: null },
      measurements: { total: 0, latest_at: null },
      intake: null,
      encounter: null,
      nextAppointment: {
        id: "appointment-1",
        starts_at: "2026-09-20T13:30:00.000Z",
        status: "scheduled",
      },
      publications: [],
      requests: [],
    },
    "tenant-1",
  );
  assert.equal(facts?.nextAppointmentLabel, "20/09/2026 às 10:30");
  assert.equal(
    facts?.nextAppointmentHref,
    "/clinicas/tenant-1/agenda?data=2026-09-20#consulta-appointment-1",
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
  // Sem vínculo ativo, o bloco da consulta não recebe contexto nem recebidos.
  const home = readFileSync(
    new URL("../components/home-day.tsx", import.meta.url),
    "utf8",
  );
  assert.match(home, /context=\{link\.status === "active" \? contextFor\(appointment\.id\) : null\}/);
  assert.match(home, /received=\{\s*link\.status === "active"\s*\? viewFor\(appointment\.id, appointment\.patient_id\)\s*: null\s*\}/);
});
