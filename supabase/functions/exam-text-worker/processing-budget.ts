// Leave time to save the batch and yield the lease before the runtime stops.
export class ExtractionContinuationRequired extends Error {
  constructor() { super("continue_required"); }
}

export function extractionBudget(startedAt: number, now: () => number = Date.now, windowMs = 170_000) {
  const deadline = startedAt + windowMs;
  return (timeoutMs: number) => {
    if (now() + timeoutMs + 15_000 > deadline) throw new ExtractionContinuationRequired();
  };
}
