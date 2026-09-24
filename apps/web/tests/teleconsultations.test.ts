import test from "node:test";
import assert from "node:assert/strict";
import { teleconsultationInput } from "../modules/teleconsultations/validation.ts";

test("teleconsultation input accepts canonical in-person and Google Meet settings", () => {
  assert.deepEqual(
    teleconsultationInput({
      delivery_mode: "in_person",
      join_url: null,
      version: 0,
    }),
    { deliveryMode: "in_person", joinUrl: null, version: 0 },
  );
  assert.deepEqual(
    teleconsultationInput({
      delivery_mode: "video",
      join_url: "https://meet.google.com/abc-defg-hij",
      version: 3,
    }),
    {
      deliveryMode: "video",
      joinUrl: "https://meet.google.com/abc-defg-hij",
      version: 3,
    },
  );
});

test("teleconsultation input rejects unsafe links, provider injection and stale versions", () => {
  for (const body of [
    { delivery_mode: "video", join_url: "http://meet.google.com/abc-defg-hij", version: 0 },
    { delivery_mode: "video", join_url: "https://evil.example/abc-defg-hij", version: 0 },
    { delivery_mode: "video", join_url: "https://meet.google.com/abc-defg-hij?authuser=1", version: 0 },
    { delivery_mode: "video", join_url: "https://meet.google.com/ABC-DEFG-HIJ", version: 0 },
    { delivery_mode: "in_person", join_url: "https://meet.google.com/abc-defg-hij", version: 0 },
    { delivery_mode: "in_person", join_url: null, version: -1 },
    { delivery_mode: "in_person", join_url: null, version: 1.5 },
    { delivery_mode: "video", join_url: "https://meet.google.com/abc-defg-hij", version: 0, provider: "external" },
  ])
    assert.throws(() => teleconsultationInput(body));
});
