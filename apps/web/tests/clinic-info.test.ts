// Telefone da clínica e sinais de alerta: o que o paciente vê.
import assert from "node:assert/strict";
import test from "node:test";
import { alertSignsFromInfo, alertSignsReady } from "../modules/workspace/alert-signs.ts";

test("o paciente só vê lista com aprovação completa; telefone aparece mesmo sem lista", () => {
  const empty = alertSignsFromInfo(null);
  assert.equal(alertSignsReady(empty), false);
  const phoneOnly = alertSignsFromInfo({
    phone_display: "(11) 4000-0000",
    phone_tel: "1140000000",
    phone_hours: null,
    alert_signs: [],
    alert_approved_name: null,
    alert_approved_on: null,
  });
  assert.equal(alertSignsReady(phoneOnly), false);
  assert.deepEqual(phoneOnly.clinicPhone, { display: "(11) 4000-0000", tel: "1140000000", hours: null });
  const approved = alertSignsFromInfo({
    phone_display: null,
    phone_tel: null,
    phone_hours: null,
    alert_signs: ["Falta de ar"],
    alert_approved_name: "Dr. Guilherme Martins",
    alert_approved_on: "2026-09-26",
  });
  assert.equal(alertSignsReady(approved), true);
  assert.equal(approved.approvedOn, "26/09/2026");
  const unapproved = alertSignsFromInfo({ ...{ phone_display: null, phone_tel: null, phone_hours: null }, alert_signs: ["Falta de ar"], alert_approved_name: null, alert_approved_on: null });
  assert.deepEqual(unapproved.signs, []);
});
