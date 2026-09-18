// Every domain error the API answers with carries the HTTP status the caller
// should see. apiError checks this one base class instead of a ladder of
// `instanceof` branches that has to grow with each new module.
export class DomainError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = new.target.name;
    this.status = status;
  }
}

// Postgres answers a blocked write with 42501 (RLS) and a broken constraint
// with a 23xxx/40001 code. Both are expected states, not crashes: the first
// means the person's access changed, the second that the record moved under
// them. Anything else stays an opaque 503 with no database detail leaked.
export function databaseFailure<E extends DomainError>(copy: {
  error: new (message: string, status: number) => E;
  denied: string;
  conflict: string;
  conflictCodes: string[];
  log: string;
}) {
  return (code?: string): never => {
    if (code === "42501") throw new copy.error(copy.denied, 403);
    if (copy.conflictCodes.includes(code ?? ""))
      throw new copy.error(copy.conflict, 409);
    throw new Error(copy.log);
  };
}
