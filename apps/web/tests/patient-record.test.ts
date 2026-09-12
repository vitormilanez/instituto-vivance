import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(
  new URL("../app/clinicas/[tenantId]/pacientes/[patientId]/page.tsx", import.meta.url),
  "utf8",
);
const documents = readFileSync(
  new URL("../modules/documents/service.ts", import.meta.url),
  "utf8",
);

test("patient record connects individual documents and longitudinal views", () => {
  assert.match(page, /staffLongitudinal\(tenantId, patientId\)/);
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
