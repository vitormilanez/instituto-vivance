import assert from "node:assert/strict";
import test from "node:test";
import {
  deterministicConsultationBrief,
  type ConsultationBriefInput,
} from "../modules/ai/consultation-brief-data.ts";
import { generateConsultationBrief } from "../modules/ai/consultation-brief.ts";
import { readFileSync } from "node:fs";

const input = (): ConsultationBriefInput => ({
  tenantId: "tenant-1",
  patientId: "patient-1",
  appointment: {
    id: "appointment-1",
    starts_at: "2026-10-08T13:00:00.000Z",
  },
  context: {
    relationshipId: "relationship-1",
    canReviewPreparation: true,
    encounter: null,
    nextAppointment: null,
    preparationAppointmentAt: "2026-10-08T13:00:00.000Z",
    publications: [],
    preparation: {
      id: "preparation-1",
      status: "submitted",
      requested_at: "2026-10-01T12:00:00.000Z",
      submitted_at: "2026-10-02T12:00:00.000Z",
      answers: {
        goal: "Quero conversar sobre meu sono.",
        changes: "Passei a acordar mais cedo.",
        routine: "",
        treatment: "",
        questions: "",
      },
    },
    previousPreparation: null,
    preparationHistory: [],
    onboarding: null,
    documents: { total: 1, latest_at: "2026-10-03T12:00:00.000Z" },
    documentItems: [{
      id: "document-1",
      title: "Hemograma.pdf",
      created_at: "2026-10-03T12:00:00.000Z",
    }],
    measurements: { total: 0, latest_at: null },
    intake: null,
    requests: [{
      id: "request-goals-1",
      kind: "goals",
      requested_at: "2026-10-04T12:00:00.000Z",
    }],
    prescriptions: { total: 0, available: true },
  },
  documentReview: { pending: true, total: 1, documentIds: ["document-1"] },
});

const message = (topics: unknown) =>
  new Response(JSON.stringify({
    content: [{ type: "text", text: JSON.stringify({ topics }) }],
  }), { status: 200, headers: { "content-type": "application/json" } });

test("fallback determinístico preserva respostas literais e cita lacunas por registro real", () => {
  const brief = deterministicConsultationBrief(input());
  assert.equal(brief.mode, "deterministic");
  assert.equal(brief.retry, false);
  assert.equal(brief.topics[0].text, "Quero conversar sobre meu sono.");
  assert.equal(brief.topics[0].sources[0].id, "preparation-1");
  assert.ok(brief.topics.some((topic) =>
    topic.text === "As metas solicitadas ainda aguardam resposta."
    && topic.sources[0].id === "request-goals-1"));
  assert.ok(brief.topics.some((topic) =>
    topic.text === "Há 1 documento aguardando revisão médica."
    && topic.sources[0].type === "patient_document"));
});

test("flag desligada não chama provedor nem rotula fallback como IA", async () => {
  let called = false;
  const brief = await generateConsultationBrief(input(), {
    env: {},
    fetch: async () => {
      called = true;
      throw new Error("should not run");
    },
  });
  assert.equal(called, false);
  assert.equal(brief.mode, "deterministic");
});

test("saída estruturada só aceita texto literal ligado à source key real", async () => {
  let sentModel = "";
  let formatType = "";
  const brief = await generateConsultationBrief(input(), {
    env: {
      VIVANCE_AI_BRIEF: "on",
      VIVANCE_AI_BRIEF_MODEL: "configured-model",
      ANTHROPIC_API_KEY: "test-key",
    },
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as {
        model: string;
        output_config: { format: { type: string } };
      };
      sentModel = body.model;
      formatType = body.output_config.format.type;
      return message([
        {
          text: "Quero conversar sobre meu sono.",
          source_keys: ["preparation:preparation-1:goal"],
        },
        {
          text: "Paciente apresenta risco elevado.",
          source_keys: ["preparation:preparation-1:goal"],
        },
        { text: "Sem fonte", source_keys: ["invented"] },
      ]);
    },
  });
  assert.equal(sentModel, "configured-model");
  assert.equal(formatType, "json_schema");
  assert.equal(brief.mode, "ai");
  assert.deepEqual(brief.topics.map((topic) => topic.text), [
    "Quero conversar sobre meu sono.",
  ]);
  assert.equal(brief.topics[0].sources[0].id, "preparation-1");
});

test("falha do provedor volta ao briefing factual e permite tentar de novo", async () => {
  const brief = await generateConsultationBrief(input(), {
    env: {
      VIVANCE_AI_BRIEF: "on",
      VIVANCE_AI_BRIEF_MODEL: "configured-model",
      ANTHROPIC_API_KEY: "test-key",
    },
    fetch: async () => new Response("unavailable", { status: 503 }),
  });
  assert.equal(brief.mode, "deterministic");
  assert.equal(brief.retry, true);
  assert.equal(brief.topics[0].text, "Quero conversar sobre meu sono.");
});

test("Home exige sessão, clínica e vínculo profissional antes dos reads clínicos", () => {
  const source = readFileSync(
    new URL("../modules/workspace/today.ts", import.meta.url),
    "utf8",
  );
  const access = source.indexOf('.from("care_relationships")');
  const contextReads = source.indexOf('const [encounter, nextAppointment, publications]');
  assert.ok(source.includes('requireClinic(id, ["doctor", "nurse"])'));
  assert.ok(access > 0 && access < contextReads);
  assert.match(source.slice(access, contextReads), /\.eq\("tenant_id", id\)/);
  assert.match(source.slice(access, contextReads), /\.eq\("patient_id", patientId\)/);
  assert.match(source.slice(access, contextReads), /\.eq\("professional_id", user\.id\)/);
  assert.match(source.slice(access, contextReads), /\.eq\("status", "active"\)/);
  assert.match(source, /\{ mode: clinic\.role === "doctor" \? "tolerant" : "strict" \}/);
  assert.match(source, /documents\.error \? null/);
  assert.match(source, /measurements\.error\s*\? null/);
});
