import { test } from "node:test";
import assert from "node:assert/strict";
import { planCreate, planPatch } from "../modules/care-plans/validation.ts";
import {publicationInput,withdrawalInput,receiptInput} from "../modules/care-plans/publication-validation.ts";
const draft = {
  title: "",
  goals: "",
  actions: "",
  frequency: "",
  period: "",
  review_on: null,
  status: "draft",
  version: 1,
};
test("publication actions require explicit confirmation and reject forged content",()=>{
  assert.deepEqual(publicationInput({version:3,previous_publication:null,confirmed:true}),{version:3,previousPublication:null});
  assert.throws(()=>publicationInput({version:3,previous_publication:null,confirmed:false}));
  assert.throws(()=>publicationInput({version:3,previous_publication:null,confirmed:true,actions:"unapproved"}));
  assert.throws(()=>withdrawalInput({publication_id:"invalid",reason:"",confirmed:true}));
  assert.throws(()=>receiptInput({confirmed:true,actor_user_id:"forged"}));
});
test("care plan drafts allow partial content; review requires complete medical fields", () => {
  assert.equal(planPatch(draft).values.status, "draft");
  assert.throws(() => planPatch({ ...draft, status: "in_review" }));
  assert.throws(() => planPatch({ ...draft, review_on: "2026-02-30" }));
  assert.throws(() => planPatch({ ...draft, actions: "x".repeat(8001) }));
  assert.throws(() => planPatch({ ...draft, doctor_id: "forged" }));
  assert.throws(() => planPatch({ ...draft, status: "published" }));
  assert.throws(() => planPatch({ ...draft, version: 0 }));
  assert.throws(() => planCreate({ patient_id: "invalid" }));
});
