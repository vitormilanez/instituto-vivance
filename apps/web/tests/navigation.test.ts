import test from "node:test";
import assert from "node:assert/strict";
import {
  findStaffModule,
  findPatientSection,
  staffModules,
  patientSections,
  selectedTab,
} from "../modules/workspace/navigation.ts";

test("workspace registers all visual modules with no duplicate paths", () => {
  assert.deepEqual(
    staffModules.map((module) => module.slug),
    [
      "agenda",
      "atendimentos",
      "planos",
      "acompanhamento",
      "documentos",
      "mensagens",
      "relatorios",
      "ia",
    ],
  );
  assert.equal(
    new Set(patientSections.map((section) => section.slug)).size,
    patientSections.length,
  );
  assert.deepEqual(
    patientSections.slice(0, 4).map((section) => section.title),
    ["Hoje", "Meu cuidado", "Conversas", "Evolução"],
  );
});
test("unknown and prototype-property module routes are not resolved", () => {
  for (const slug of [
    "__proto__",
    "constructor",
    "admin",
    "pacientes",
    "../historico",
    "",
  ]) {
    assert.equal(findStaffModule(slug), undefined);
    assert.equal(findPatientSection(slug), undefined);
  }
});
test("tab input is allowlisted and repeated/invalid parameters default safely", () => {
  const tabs = ["Rascunhos", "Publicados"];
  assert.equal(selectedTab(tabs, "Publicados"), "Publicados");
  for (const value of [undefined, "<script>", ["Publicados"], ""])
    assert.equal(selectedTab(tabs, value), "Rascunhos");
});
