import assert from "node:assert/strict";
import test from "node:test";
import { syntheticPilotAllows } from "../modules/exams/pilot.ts";

test("extração fica restrita ao documento sintético autorizado fora de produção", () => {
  const before = {
    pilot: process.env.VIVANCE_EXAM_TEXT_PILOT,
    environment: process.env.VERCEL_ENV,
    nodeEnvironment: process.env.NODE_ENV,
    ids: process.env.VIVANCE_SYNTHETIC_EXAM_DOCUMENT_IDS,
  };
  try {
    process.env.VIVANCE_EXAM_TEXT_PILOT = "synthetic";
    process.env.VIVANCE_SYNTHETIC_EXAM_DOCUMENT_IDS = "11111111-1111-4111-8111-111111111111";
    process.env.VERCEL_ENV = "preview";
    assert.equal(syntheticPilotAllows("11111111-1111-4111-8111-111111111111"), true);
    assert.equal(syntheticPilotAllows("22222222-2222-4222-8222-222222222222"), false);
    process.env.VERCEL_ENV = "production";
    assert.equal(syntheticPilotAllows("11111111-1111-4111-8111-111111111111"), false);
    delete process.env.VERCEL_ENV;
    Reflect.set(process.env, "NODE_ENV", "production");
    assert.equal(syntheticPilotAllows("11111111-1111-4111-8111-111111111111"), false);
    Reflect.set(process.env, "NODE_ENV", "development");
    assert.equal(syntheticPilotAllows("11111111-1111-4111-8111-111111111111"), true);
    process.env.VERCEL_ENV = "preview";
    process.env.VIVANCE_EXAM_TEXT_PILOT = "";
    assert.equal(syntheticPilotAllows("11111111-1111-4111-8111-111111111111"), false);
  } finally {
    for (const [key, value] of Object.entries({
      VIVANCE_EXAM_TEXT_PILOT: before.pilot,
      VERCEL_ENV: before.environment,
      NODE_ENV: before.nodeEnvironment,
      VIVANCE_SYNTHETIC_EXAM_DOCUMENT_IDS: before.ids,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
