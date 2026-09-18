import assert from "node:assert/strict";
import test from "node:test";
import { DomainError, databaseFailure } from "../lib/errors.ts";

class SampleError extends DomainError {}

const failed: (code?: string) => never = databaseFailure({
  error: SampleError,
  denied: "Seu acesso mudou.",
  conflict: "O registro mudou.",
  conflictCodes: ["23503", "40001"],
  log: "Sample operation failed",
});

function thrown(code?: string): Error {
  try {
    failed(code);
  } catch (reason) {
    return reason as Error;
  }
  throw new Error("databaseFailure returned instead of throwing");
}

test("a blocked write by RLS becomes 403 with the module's own message", () => {
  const error = thrown("42501");
  assert.ok(error instanceof SampleError);
  assert.equal(error.status, 403);
  assert.equal(error.message, "Seu acesso mudou.");
});

test("a constraint the module declares becomes 409", () => {
  for (const code of ["23503", "40001"]) {
    const error = thrown(code);
    assert.ok(error instanceof SampleError);
    assert.equal(error.status, 409);
  }
});

test("any other database code stays opaque and never carries the code", () => {
  const error = thrown("28000");
  assert.ok(!(error instanceof DomainError));
  assert.equal(error.message, "Sample operation failed");
  assert.ok(!error.message.includes("28000"));
});

test("a missing code is opaque as well", () => {
  assert.ok(!(thrown() instanceof DomainError));
});
