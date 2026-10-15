import assert from "node:assert/strict";
import test from "node:test";
import { entryDestination, singleClinicDestination, singlePatientDestination } from "../modules/identity/entry.ts";
import type { ClinicAccess } from "../modules/identity/service.ts";

const clinic = (id: string, role: string): ClinicAccess => ({ id, role, name: "Clínica", displayName: null });

test("paciente com uma clínica entra direto no cuidado", () => {
  assert.equal(singlePatientDestination([clinic("a", "patient")]), "/clinicas/a/meu-cuidado/hoje");
  assert.equal(singleClinicDestination([clinic("a", "patient")]), "/clinicas/a/meu-cuidado/hoje");
  assert.equal(entryDestination([clinic("a", "patient")], "submitted"), "/clinicas/a/meu-cuidado/hoje");
  assert.equal(entryDestination([clinic("a", "patient")], "draft"), "/clinicas/a/primeiros-passos");
});

test("equipe com uma clínica entra direto no workspace", () => {
  for (const role of ["doctor", "admin", "nurse"]) {
    assert.equal(singleClinicDestination([clinic("a", role)]), "/clinicas/a");
    assert.equal(entryDestination([clinic("a", role)], "draft"), "/clinicas/a");
    assert.equal(singlePatientDestination([clinic("a", role)]), null);
  }
});

test("escolha de clínica permanece para múltiplas clínicas e conta sem vínculo", () => {
  assert.equal(singlePatientDestination([clinic("a", "doctor")]), null);
  assert.equal(singlePatientDestination([clinic("a", "patient"), clinic("b", "patient")]), null);
  assert.equal(singlePatientDestination([]), null);
  assert.equal(entryDestination([clinic("a", "patient"), clinic("b", "patient")], "draft"), null);
  assert.equal(entryDestination([], "submitted"), null);
});
