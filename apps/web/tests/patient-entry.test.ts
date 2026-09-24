import assert from "node:assert/strict";
import test from "node:test";
import { singlePatientDestination } from "../modules/identity/entry.ts";
import type { ClinicAccess } from "../modules/identity/service.ts";

const clinic = (id: string, role: string): ClinicAccess => ({ id, role, name: "Clínica", displayName: null });

test("paciente com uma clínica entra direto no cuidado", () => {
  assert.equal(singlePatientDestination([clinic("a", "patient")]), "/clinicas/a/meu-cuidado/hoje");
});

test("escolha de clínica permanece para equipe, múltiplas clínicas e conta sem vínculo", () => {
  assert.equal(singlePatientDestination([clinic("a", "doctor")]), null);
  assert.equal(singlePatientDestination([clinic("a", "patient"), clinic("b", "patient")]), null);
  assert.equal(singlePatientDestination([]), null);
});
