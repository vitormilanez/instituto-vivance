import test from "node:test";
import assert from "node:assert/strict";
import {
  patientInput,
  tenantId,
  pageNumber,
  sameOrigin,
} from "../lib/validation.ts";
import {
  careAssignmentInput,
  careRelationshipChangeInput,
  membershipAcceptanceInput,
  membershipManagementInput,
  teamInvitationInput,
} from "../modules/team/validation.ts";

test("normalizes demographic input without creating placeholder values", () => {
  assert.deepEqual(
    patientInput({ display_name: "  Pessoa   de Teste  ", birth_date: "" }),
    { display_name: "Pessoa de Teste", birth_date: null },
  );
});
test("rejects role, clinic, identity and audit injection", () => {
  for (const key of ["tenant_id", "created_by", "role", "id", "created_at"])
    assert.throws(() =>
      patientInput({ display_name: "Teste", [key]: "forged" }),
    );
});
test("rejects invalid dates and malformed names", () => {
  for (const birth_date of [
    "2025-02-29",
    "2020-02-30",
    "3000-01-01",
    "1899-01-01",
    15,
  ])
    assert.throws(() => patientInput({ display_name: "Teste", birth_date }));
  for (const display_name of ["", "a", null, "a".repeat(161)])
    assert.throws(() => patientInput({ display_name }));
  assert.equal(
    patientInput({ display_name: "Teste", birth_date: "2024-02-29" })
      .birth_date,
    "2024-02-29",
  );
});
test("validates tenant and bounds pagination", () => {
  assert.equal(tenantId("00000000-0000-4000-8000-000000000001").length, 36);
  assert.throws(() => tenantId("../other"));
  assert.equal(pageNumber(null), 1);
  for (const page of ["0", "-1", "1.5", "Infinity", "10001", "1 OR 1=1"])
    assert.throws(() => pageNumber(page));
});
test("blocks cross-origin and missing-origin cookie mutations", () => {
  assert.equal(
    sameOrigin(
      new Request("https://vivance.example/api", {
        headers: { origin: "https://vivance.example" },
      }),
    ),
    true,
  );
  assert.equal(
    sameOrigin(
      new Request("https://vivance.example/api", {
        headers: { origin: "https://evil.example" },
      }),
    ),
    false,
  );
  assert.equal(sameOrigin(new Request("https://vivance.example/api")), false);
});
test("origin uses the actual HTTP authority, never an untrusted forwarded host", () => {
  const headers = { host: "127.0.0.1:3010", origin: "http://127.0.0.1:3010" };
  assert.equal(
    sameOrigin(new Request("http://localhost:3010/api", { headers })),
    true,
  );
  assert.equal(
    sameOrigin(
      new Request("http://localhost:3010/api", {
        headers: { ...headers, origin: "http://localhost:3010" },
      }),
    ),
    false,
  );
  assert.equal(
    sameOrigin(
      new Request("http://localhost:3010/api", {
        headers: {
          ...headers,
          origin: "https://evil.example",
          "x-forwarded-host": "evil.example",
        },
      }),
    ),
    false,
  );
  assert.equal(
    sameOrigin(
      new Request("https://app.example/api", {
        headers: { host: "app.example", origin: "http://app.example" },
      }),
    ),
    false,
  );
});
test("team invitation accepts only bounded doctor or nursing identity fields", () => {
  assert.deepEqual(
    teamInvitationInput({
      email: "  TESTE@EXAMPLE.COM ",
      display_name: "  Pessoa   de Teste ",
      role: "nurse",
    }),
    {
      email: "teste@example.com",
      display_name: "Pessoa de Teste",
      role: "nurse",
    },
  );
  for (const input of [
    { email: "invalido", display_name: "Pessoa", role: "doctor" },
    { email: "a@example.com", display_name: "A", role: "doctor" },
    { email: "a@example.com", display_name: "Pessoa", role: "admin" },
    {
      email: "a@example.com",
      display_name: "Pessoa",
      role: "doctor",
      tenant_id: "forged",
    },
  ])
    assert.throws(() => teamInvitationInput(input));
});
test("team mutations require optimistic versions and allowlisted actions", () => {
  assert.deepEqual(membershipAcceptanceInput({ version: 3 }), { version: 3 });
  assert.deepEqual(
    membershipManagementInput({ version: 2, action: "suspend" }),
    { version: 2, action: "suspend" },
  );
  assert.deepEqual(
    careRelationshipChangeInput({ version: 4, action: "revoke" }),
    { version: 4, action: "revoke" },
  );
  for (const value of [0, -1, 1.5, "1", null]) {
    assert.throws(() => membershipAcceptanceInput({ version: value }));
    assert.throws(() =>
      membershipManagementInput({ version: value, action: "suspend" }),
    );
  }
  assert.throws(() =>
    careRelationshipChangeInput({ version: 1, action: "delete" }),
  );
  assert.throws(() =>
    membershipManagementInput({ version: 1, action: "promote" }),
  );
});
test("care assignment validates both identifiers and rejects actor injection", () => {
  const first = "00000000-0000-4000-8000-000000000001";
  const second = "00000000-0000-4000-8000-000000000002";
  assert.deepEqual(
    careAssignmentInput({ patient_id: first, professional_id: second }),
    { patient_id: first, professional_id: second },
  );
  for (const input of [
    { patient_id: "invalid", professional_id: second },
    { patient_id: first, professional_id: "invalid" },
    { patient_id: first, professional_id: second, status: "active" },
    { patient_id: first, professional_id: second, created_by: first },
  ])
    assert.throws(() => careAssignmentInput(input));
});
