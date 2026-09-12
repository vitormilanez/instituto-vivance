import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { buildReportPdf } from "../modules/reports/pdf.ts";

test("published report PDF is valid and carries only patient-facing metadata", async () => {
  const bytes = await buildReportPdf({
    id: "11111111-1111-4111-8111-111111111111",
    tenant_id: "22222222-2222-4222-8222-222222222222",
    report_id: "33333333-3333-4333-8333-333333333333",
    patient_id: "44444444-4444-4444-8444-444444444444",
    doctor_id: "55555555-5555-4555-8555-555555555555",
    source_version: 7,
    patient_title: "Seu acompanhamento",
    patient_summary: "Esta é a síntese confirmada para o paciente.",
    period_start: "2026-09-01",
    period_end: "2026-09-12",
    clinic_display_name: "Instituto Vivance",
    patient_display_name: "Paciente Teste",
    doctor_display_name: "Dra. Responsável",
    approved_at: "2026-09-12T15:00:00Z",
    published_by: "55555555-5555-4555-8555-555555555555",
    published_at: "2026-09-12T16:00:00Z",
    status: "published",
    closed_at: null,
    closed_by: null,
    withdrawal_reason: null,
  });
  assert.ok(bytes.byteLength > 1_000);
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  assert.equal(pdf.getTitle(), "Seu acompanhamento");
  assert.equal(pdf.getAuthor(), "Dra. Responsável");
  assert.equal(pdf.getSubject(), "Relatório publicado ao paciente");
});
