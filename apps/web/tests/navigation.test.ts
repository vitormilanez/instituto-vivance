import test from "node:test";
import assert from "node:assert/strict";
import {
  findStaffModule,
  findPatientSection,
  staffModules,
  patientSections,
  selectedTab,
} from "../modules/workspace/navigation.ts";
import { readFileSync } from "node:fs";

test("workspace registers all visual modules with no duplicate paths", () => {
  assert.deepEqual(
    staffModules.map((module) => module.slug),
    [
      "agenda",
      "atendimentos",
      "preparo",
      "planos",
      "acompanhamento",
      "documentos",
      "mensagens",
      "processamentos",
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
test("clinic dashboard preserves exactly eight quick actions and exposes team care", () => {
  const page = readFileSync(
    new URL("../app/clinicas/[tenantId]/page.tsx", import.meta.url),
    "utf8",
  );
  const start = page.indexOf("const actions = [");
  const actions = page.slice(start, page.indexOf("];", start));
  assert.equal(actions.match(/\btitle:/g)?.length, 8);
  assert.match(actions, /title: "Equipe de cuidado"/);
  assert.match(actions, /title: "Acompanhamento"/);
  assert.doesNotMatch(actions, /pending:/);
});

test("today preserves the focused patient when opening the record and documents", () => {
  const workspace = readFileSync(
    new URL("../components/today-workspace.tsx", import.meta.url),
    "utf8",
  );
  assert.match(workspace, /patientId=\{next\.patient_id\}/);
  assert.match(workspace, /recordBase=\{`\$\{base\}\/pacientes\/\$\{next\.patient_id\}`\}/);
  assert.match(workspace, /Revise o contexto disponível e siga para o atendimento\./);
  assert.match(workspace, /density="compact"/);
});

test("header displays only the RLS-backed unread notice counter", () => {
  const shell = readFileSync(
    new URL("../components/clinic-shell.tsx", import.meta.url),
    "utf8",
  );
  const header = readFileSync(
    new URL("../components/header.tsx", import.meta.url),
    "utf8",
  );
  const notifications = readFileSync(
    new URL("../modules/notifications/service.ts", import.meta.url),
    "utf8",
  );
  assert.match(shell, /unreadInAppNotificationCount\(clinic\.id\)/);
  assert.match(header, /avisos não lidos/);
  assert.match(notifications, /\.is\("read_at", null\)/);
  assert.match(notifications, /\.eq\("recipient_user_id", user\.id\)/);
  assert.doesNotMatch(notifications, /select\("\*"\)/);
});

test("agenda highlights only the shared focus, not a stale hash target", () => {
  const agenda = readFileSync(
    new URL("../components/agenda.tsx", import.meta.url),
    "utf8",
  );
  const styles = readFileSync(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  assert.match(agenda, /focusedAppointment\(appointments, currentTime, date\)/);
  assert.doesNotMatch(styles, /\.appointment-row:target/);
});
