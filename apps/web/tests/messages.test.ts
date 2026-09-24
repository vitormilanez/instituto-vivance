import assert from "node:assert/strict";
import test from "node:test";
import {
  messageInput,
  messagePage,
  messageReadInput,
  messageRequestKey,
  messageRecipient,
} from "../modules/messages/validation.ts";

const patientId = "11111111-1111-4111-8111-111111111111";
const doctorId = "22222222-2222-4222-8222-222222222222";

test("direct message input accepts only a bounded patient-doctor pair", () => {
  assert.deepEqual(
    messageInput({
      patient_id: patientId,
      doctor_id: doctorId,
      content: "  Olá,   doutor.  ",
    }),
    {
      patientId,
      doctorId,
      content: "Olá, doutor.",
      references: [],
    },
  );
  assert.throws(() =>
    messageInput({
      patient_id: patientId,
      doctor_id: doctorId,
      content: "texto",
      sender_id: doctorId,
    }),
  );
  assert.throws(() =>
    messageInput({ patient_id: patientId, doctor_id: doctorId, content: " " }),
  );
  assert.throws(() =>
    messageInput({
      patient_id: patientId,
      doctor_id: doctorId,
      content: "x".repeat(4001),
    }),
  );
});

test("direct message accepts up to ten unique shared-context references", () => {
  assert.deepEqual(messageInput({
    patient_id: patientId,
    doctor_id: doctorId,
    content: "Cliente antigo ainda aberto",
    reference_type: "document",
    reference_id: patientId,
  }).references, [{ type: "document", id: patientId }]);
  assert.deepEqual(messageInput({
    patient_id: patientId,
    doctor_id: doctorId,
    content: "Sem citação",
    reference_type: null,
    reference_id: null,
  }).references, []);
  assert.deepEqual(
    messageInput({
      patient_id: patientId,
      doctor_id: doctorId,
      content: "Veja este documento.",
      references: [
        { type: "document", id: patientId },
        { type: "care_plan", id: doctorId },
      ],
    }),
    {
      patientId,
      doctorId,
      content: "Veja este documento.",
      references: [
        { type: "document", id: patientId },
        { type: "care_plan", id: doctorId },
      ],
    },
  );
  assert.throws(() =>
    messageInput({
      patient_id: patientId,
      doctor_id: doctorId,
      content: "Inválida",
      references: [{ type: "report", id: patientId }],
    }),
  );
  assert.throws(() =>
    messageInput({
      patient_id: patientId,
      doctor_id: doctorId,
      content: "Inválida",
      references: [
        { type: "document", id: patientId },
        { type: "document", id: patientId },
      ],
    }),
  );
  assert.throws(() =>
    messageInput({
      patient_id: patientId,
      doctor_id: doctorId,
      content: "Inválida",
      references: Array.from({ length: 11 }, (_, index) => ({
        type: "document",
        id: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`,
      })),
    }),
  );
});

test("message operations require opaque request and read identifiers", () => {
  assert.equal(messageRequestKey(patientId), patientId);
  assert.throws(() => messageRequestKey(null));
  assert.throws(() => messageRequestKey("retry-1"));
  assert.deepEqual(
    messageReadInput({
      patient_id: patientId,
      doctor_id: doctorId,
      message_id: patientId,
    }),
    { patientId, doctorId, messageId: patientId },
  );
  assert.throws(() =>
    messageReadInput({
      patient_id: patientId,
      doctor_id: doctorId,
      message_id: patientId,
      read_at: new Date().toISOString(),
    }),
  );
});

test("message pagination and recipient selection remain bounded and allowlisted", () => {
  assert.equal(messagePage(), 1);
  assert.equal(messagePage("7"), 7);
  assert.throws(() => messagePage("0"));
  assert.equal(messageRecipient(undefined, [doctorId]), doctorId);
  assert.equal(messageRecipient(doctorId, [doctorId]), doctorId);
  assert.equal(messageRecipient(undefined, []), null);
  assert.throws(() => messageRecipient(patientId, [doctorId]));
  assert.throws(() => messageRecipient([doctorId], [doctorId]));
});
