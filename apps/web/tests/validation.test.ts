import test from "node:test";
import assert from "node:assert/strict";
import {
  InputError,
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
import { notificationPreferenceInput } from "../modules/notifications/validation.ts";
import {
  acceptInvitationInput,
  claimInvitationInput,
  onboardingPatchInput,
  onboardingSubmissionInput,
  patientInvitationInput,
} from "../modules/onboarding/validation.ts";
import {
  patientIntakeInput,
  patientIntakeMaxBodyBytes,
} from "../modules/patient-intake/validation.ts";
import { boundedJson } from "../lib/api.ts";

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
test("notification preferences accept only an explicit in-app boolean", () => {
  assert.deepEqual(notificationPreferenceInput({ in_app_enabled: true }), {
    inAppEnabled: true,
  });
  assert.deepEqual(notificationPreferenceInput({ in_app_enabled: false }), {
    inAppEnabled: false,
  });
  assert.throws(() => notificationPreferenceInput({}));
  assert.throws(() => notificationPreferenceInput({ in_app_enabled: "true" }));
  assert.throws(() =>
    notificationPreferenceInput({
      in_app_enabled: true,
      recipient_user_id: "forged",
    }),
  );
});
test("patient invitations keep recipient channels exclusive and server-owned", () => {
  assert.deepEqual(patientInvitationInput({ displayName: "  Maria   Silva ", channel: "email", email: " MARIA@EXAMPLE.COM " }), {
    displayName: "Maria Silva", channel: "email", email: "maria@example.com", doctorId: undefined, targetPatientId: undefined,
  });
  assert.deepEqual(patientInvitationInput({ displayName: "Maria", channel: "whatsapp", phone: "+55 (11) 99999-9999" }), {
    displayName: "Maria", channel: "whatsapp", phone: "+5511999999999", doctorId: undefined, targetPatientId: undefined,
  });
  assert.equal(patientInvitationInput({ displayName: "Maria", channel: "email", email: "m@example.com", targetPatientId: "00000000-0000-4000-8000-000000000001" }).targetPatientId, "00000000-0000-4000-8000-000000000001");
  assert.throws(() => patientInvitationInput({ displayName: "Maria", channel: "whatsapp", phone: "+5511999999999", email: "forged@example.com" }));
  assert.throws(() => patientInvitationInput({ displayName: "Maria", channel: "email", email: "m@example.com", invitedBy: "forged" }));
});
test("claim, accept and submit require bounded token and explicit consent", () => {
  assert.deepEqual(claimInvitationInput({ token: "a".repeat(43), email: "P@EXAMPLE.COM" }), { token: "a".repeat(43), email: "p@example.com" });
  assert.throws(() => claimInvitationInput({ token: "short", email: "p@example.com" }));
  assert.deepEqual(acceptInvitationInput({ invitationId: "00000000-0000-4000-8000-000000000001", accept: true }), { invitationId: "00000000-0000-4000-8000-000000000001", accept: true });
  assert.throws(() => acceptInvitationInput({ invitationId: "00000000-0000-4000-8000-000000000001", accept: false }));
  assert.deepEqual(onboardingSubmissionInput({ version: 2, shareConsent: true }), { version: 2, shareConsent: true });
  assert.throws(() => onboardingSubmissionInput({ version: 2, shareConsent: false }));
});
test("onboarding patch is partial, bounded and versioned", () => {
  assert.deepEqual(onboardingPatchInput({ version: 3, currentStep: "questions", skippedSteps: ["profile", "profile"], answers: { goal: "", questions: "Dúvida" }, measurements: { weightKg: null } }), {
    expected_version: 3, current_step: "questions", skipped_steps: ["profile"], answer_goal: "", answer_questions: "Dúvida", weight_kg: null,
  });
  assert.throws(() => onboardingPatchInput({ version: 1 }));
  assert.throws(() => onboardingPatchInput({ version: 1, answers: { goal: "x".repeat(4001) } }));
  assert.throws(() => onboardingPatchInput({ version: 1, examDocumentIds: Array(51).fill("00000000-0000-4000-8000-000000000001") }));
});

test("onboarding rejects impossible ISO dates with a user input error", () => {
  assert.throws(() => onboardingPatchInput({version:1, profile:{birthDate:"2026-99-99"}}), InputError);
});

test("patient intake keeps drafts bounded and requires explicit attribution on completion", () => {
  assert.deepEqual(
    patientIntakeInput({
      version: 1,
      reason: "  Quero dormir melhor  ",
      expectedOutcome: "",
      firstPriority: "",
      intent: "draft",
      confirmPatientWords: false,
    }),
    {
      expected_version: 1,
      status: "draft",
      reason_text: "Quero dormir melhor",
      expected_outcome: "",
      first_priority: "",
    },
  );
  assert.deepEqual(
    patientIntakeInput({
      version: 2,
      reason: "Sono ruim",
      expectedOutcome: "Dormir sem interrupções",
      firstPriority: "Entender os despertares",
      intent: "complete",
      confirmPatientWords: true,
    }).status,
    "completed",
  );
  assert.throws(() =>
    patientIntakeInput({
      version: 2,
      reason: "Sono ruim",
      expectedOutcome: "Dormir melhor",
      firstPriority: "Sono",
      intent: "complete",
      confirmPatientWords: false,
    }),
  );
  assert.throws(() =>
    patientIntakeInput({
      version: 1,
      reason: "x".repeat(2001),
      expectedOutcome: "",
      firstPriority: "",
      intent: "draft",
    }),
  );
});

test("patient intake HTTP boundary accepts three valid long answers", async () => {
  const body = {
    version: 1,
    reason: "á".repeat(2000),
    expectedOutcome: "é".repeat(2000),
    firstPriority: "í".repeat(2000),
    intent: "complete",
    confirmPatientWords: true,
  };
  const parsed = await boundedJson(
    new Request("https://vivance.test/intake", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    patientIntakeMaxBodyBytes,
  );
  assert.equal(patientIntakeInput(parsed).reason_text.length, 2000);
});
