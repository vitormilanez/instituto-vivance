import { isReference, makeReference, readAdClick } from './attribution.ts';
import type { ConsentedOpportunity, ConversionStore } from './conversion-pipeline.ts';
import { processPulseReceivedEvent } from './conversion-pipeline.ts';
import type { AdsUploader } from './conversion-pipeline.ts';

const maxBodyBytes = 12_000;
const noStoreHeaders = { 'cache-control': 'no-store' };

export type Virada90Runtime = {
  allowedOrigin: string;
  store: ConversionStore;
  upload: AdsUploader;
  customerId: string;
  conversionActionId: string;
  authenticatePulse(request: Request): boolean;
  now?: () => Date;
  opportunityTtlMs?: number;
  makeReference?: () => string;
};

export type Virada90RuntimeProvider = () => Virada90Runtime | null;

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: noStoreHeaders });
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return null;
  }
  const contentLength = request.headers.get('content-length');
  const declaredLength = contentLength === null ? null : Number(contentLength);
  if (declaredLength !== null && Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    await request.body?.cancel().catch(() => {});
    return null;
  }
  try {
    if (!request.body) return null;
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBodyBytes) {
          await reader.cancel().catch(() => {});
          return null;
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const value: unknown = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function sameOrigin(request: Request, allowedOrigin: string) {
  try {
    return new URL(request.headers.get('origin') ?? '').origin === new URL(allowedOrigin).origin;
  } catch {
    return false;
  }
}

function exactKeys(value: Record<string, unknown>, keys: string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

export function opportunityGet(runtime: Virada90RuntimeProvider) {
  return async function GET() {
    return json({ enabled: runtime() !== null });
  };
}

export function opportunityPost(runtime: Virada90RuntimeProvider) {
  return async function POST(request: Request) {
    const dependencies = runtime();
    if (!dependencies) return json({ error: 'disabled' }, 404);
    if (!sameOrigin(request, dependencies.allowedOrigin)) return json({ error: 'forbidden' }, 403);
    const body = await readJson(request);
    if (!body || !exactKeys(body, ['click']) || !body.click || typeof body.click !== 'object' ||
        Array.isArray(body.click) || !exactKeys(body.click as Record<string, unknown>, ['kind', 'value'])) {
      return json({ error: 'invalid_request' }, 400);
    }
    const clickRecord = body.click as Record<string, unknown>;
    const click = typeof clickRecord.kind === 'string'
      ? readAdClick({ [clickRecord.kind]: clickRecord.value })
      : null;
    if (!click || click.kind !== clickRecord.kind) return json({ error: 'invalid_click' }, 400);

    const now = (dependencies.now ?? (() => new Date()))();
    const ttl = dependencies.opportunityTtlMs ?? 30 * 24 * 60 * 60 * 1_000;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const opportunity: ConsentedOpportunity = {
        reference: (dependencies.makeReference ?? makeReference)(),
        click,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + ttl).toISOString(),
        consent: 'granted'
      };
      try {
        if (await dependencies.store.createOpportunity(opportunity)) {
          return json({ reference: opportunity.reference, expiresAt: opportunity.expiresAt }, 201);
        }
      } catch {
        return json({ error: 'temporarily_unavailable' }, 503);
      }
    }
    return json({ error: 'reference_unavailable' }, 503);
  };
}

export function opportunityDelete(runtime: Virada90RuntimeProvider) {
  return async function DELETE(request: Request) {
    const dependencies = runtime();
    if (!dependencies) return json({ error: 'disabled' }, 404);
    if (!sameOrigin(request, dependencies.allowedOrigin)) return json({ error: 'forbidden' }, 403);
    const body = await readJson(request);
    if (!body || !exactKeys(body, ['reference']) || !isReference(body.reference)) {
      return json({ error: 'invalid_request' }, 400);
    }
    // Idempotent and deliberately does not reveal whether a reference existed.
    try {
      await dependencies.store.revokeOpportunity(body.reference);
    } catch {
      return json({ error: 'temporarily_unavailable' }, 503);
    }
    return new Response(null, { status: 204, headers: noStoreHeaders });
  };
}

export function pulsePost(runtime: Virada90RuntimeProvider) {
  return async function POST(request: Request) {
    const dependencies = runtime();
    if (!dependencies) return json({ error: 'disabled' }, 404);
    if (!dependencies.authenticatePulse(request)) return json({ error: 'unauthorized' }, 401);
    const body = await readJson(request);
    if (!body) return json({ error: 'invalid_request' }, 400);
    try {
      const status = await processPulseReceivedEvent(body, dependencies);
      return json({ status }, 202);
    } catch {
      // A 5xx response allows the provider to retry. Never echo or log the body.
      return json({ error: 'temporarily_unavailable' }, 503);
    }
  };
}
