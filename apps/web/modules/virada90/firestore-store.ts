import { randomUUID } from 'node:crypto';
import { isReference, readAdClick } from './attribution.ts';
import type { ClaimedOpportunity, ConsentedOpportunity, ConversionStore } from './conversion-pipeline.ts';

type FirestoreValue = { stringValue: string } | { timestampValue: string };
type FirestoreDocument = {
  fields?: Record<string, FirestoreValue>;
  updateTime?: string;
};

const collection = 'virada90_opportunities';
const leaseDurationMs = 5 * 60 * 1_000;
const maxAttempts = 5;

function string(field: FirestoreValue | undefined): string | null {
  return field && 'stringValue' in field && typeof field.stringValue === 'string'
    ? field.stringValue : null;
}

function timestamp(field: FirestoreValue | undefined): string | null {
  return field && 'timestampValue' in field && typeof field.timestampValue === 'string' &&
    Number.isFinite(Date.parse(field.timestampValue)) ? field.timestampValue : null;
}

function text(value: string): FirestoreValue { return { stringValue: value }; }
function time(value: string): FirestoreValue { return { timestampValue: value }; }

function opportunity(document: FirestoreDocument, reference: string): ConsentedOpportunity {
  const fields = document.fields ?? {};
  const kind = string(fields.clickKind);
  const value = string(fields.clickValue);
  const click = kind && value ? readAdClick({ [kind]: value }) : null;
  const createdAt = timestamp(fields.createdAt);
  const expiresAt = timestamp(fields.expiresAt);
  if (!click || click.kind !== kind || !createdAt || !expiresAt ||
      string(fields.state) !== 'pending' && string(fields.state) !== 'claimed') {
    throw new Error('Attribution document is unavailable');
  }
  return { reference, click, createdAt, expiresAt, consent: 'granted' };
}

/** Server-only Firestore REST store. Its documents contain no message text or contact identity. */
export function createFirestoreConversionStore(dependencies: {
  projectId: string;
  accessToken: () => Promise<string>;
  fetch?: typeof fetch;
  now?: () => Date;
}): ConversionStore {
  if (!/^[a-z][a-z0-9-]{5,29}$/.test(dependencies.projectId)) {
    throw new Error('Invalid attribution project');
  }
  const request = dependencies.fetch ?? fetch;
  const now = dependencies.now ?? (() => new Date());
  const base = `https://southamerica-east1-firestore.googleapis.com/v1/projects/${dependencies.projectId}/databases/(default)/documents/${collection}`;

  async function send(url: string, init: RequestInit): Promise<Response> {
    const token = await dependencies.accessToken();
    if (!token) throw new Error('Attribution token unavailable');
    return request(url, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.body ? { 'content-type': 'application/json' } : {})
      },
      cache: 'no-store'
    });
  }

  async function get(reference: string): Promise<FirestoreDocument | null> {
    const response = await send(`${base}/${reference}`, { method: 'GET' });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Attribution read failed: ${response.status}`);
    const document = await response.json() as FirestoreDocument;
    if (!document.updateTime || !document.fields) throw new Error('Malformed attribution document');
    return document;
  }

  async function patch(reference: string, updateTime: string, fields: Record<string, FirestoreValue>, mask: string[]): Promise<boolean> {
    const url = new URL(`${base}/${reference}`);
    url.searchParams.set('currentDocument.updateTime', updateTime);
    for (const field of mask) url.searchParams.append('updateMask.fieldPaths', field);
    const response = await send(url.toString(), {
      method: 'PATCH',
      body: JSON.stringify({ fields })
    });
    if (response.status === 409 || response.status === 412) return false;
    if (!response.ok) throw new Error(`Attribution update failed: ${response.status}`);
    return true;
  }

  return {
    async createOpportunity(input) {
      if (!isReference(input.reference) || input.consent !== 'granted' ||
          !Number.isFinite(Date.parse(input.createdAt)) || !Number.isFinite(Date.parse(input.expiresAt)) ||
          Date.parse(input.expiresAt) <= Date.parse(input.createdAt) ||
          readAdClick({ [input.click.kind]: input.click.value })?.kind !== input.click.kind) {
        throw new Error('Invalid attribution opportunity');
      }
      const url = new URL(base);
      url.searchParams.set('documentId', input.reference);
      const response = await send(url.toString(), {
        method: 'POST',
        body: JSON.stringify({ fields: {
          clickKind: text(input.click.kind), clickValue: text(input.click.value),
          createdAt: time(input.createdAt), expiresAt: time(input.expiresAt),
          state: text('pending')
        } })
      });
      if (response.status === 409) return false;
      if (!response.ok) throw new Error(`Attribution create failed: ${response.status}`);
      return true;
    },

    async revokeOpportunity(reference) {
      if (!isReference(reference)) return false;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const document = await get(reference);
        if (!document || string(document.fields?.state) === 'revoked') return false;
        const changed = await patch(reference, document.updateTime!, { state: text('revoked') },
          ['state', 'clickKind', 'clickValue', 'leaseId', 'leaseUntil']);
        if (changed) return true;
      }
      throw new Error('Attribution revocation contention');
    },

    async claimFirstReceived({ reference, messageId, receivedAt }) {
      if (!isReference(reference) || !messageId || !Number.isFinite(Date.parse(receivedAt))) return null;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const document = await get(reference);
        if (!document) return null;
        const fields = document.fields ?? {};
        const state = string(fields.state);
        if (state === 'revoked' || state === 'submitted') return null;
        if (state !== 'pending' && state !== 'claimed') throw new Error('Invalid attribution state');
        const current = opportunity(document, reference);
        const receivedTime = Date.parse(receivedAt);
        if (receivedTime < Date.parse(current.createdAt) || receivedTime >= Date.parse(current.expiresAt) ||
            now().getTime() >= Date.parse(current.expiresAt)) return null;
        if (state === 'claimed') {
          if (string(fields.messageId) !== messageId) return null;
          const leaseUntil = timestamp(fields.leaseUntil);
          if (!leaseUntil) throw new Error('Invalid attribution lease');
          if (Date.parse(leaseUntil) > now().getTime()) throw new Error('Attribution claim busy');
        }
        const leaseId = randomUUID();
        const changed = await patch(reference, document.updateTime!, {
          state: text('claimed'), messageId: text(messageId), receivedAt: time(receivedAt),
          leaseId: text(leaseId), leaseUntil: time(new Date(now().getTime() + leaseDurationMs).toISOString())
        }, ['state', 'messageId', 'receivedAt', 'leaseId', 'leaseUntil']);
        if (changed) return { ...current, leaseId } satisfies ClaimedOpportunity;
      }
      throw new Error('Attribution claim contention');
    },

    async markSubmitted(reference, leaseId, requestId) {
      if (!isReference(reference) || !leaseId || !requestId) throw new Error('Invalid attribution submission');
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const document = await get(reference);
        if (!document) throw new Error('Attribution submission missing');
        const state = string(document.fields?.state);
        if (state === 'submitted' || state === 'revoked') return;
        if (state !== 'claimed' || string(document.fields?.leaseId) !== leaseId) {
          throw new Error('Attribution lease lost');
        }
        const changed = await patch(reference, document.updateTime!, {
          state: text('submitted'), requestId: text(requestId)
        }, ['state', 'requestId', 'clickKind', 'clickValue', 'leaseId', 'leaseUntil']);
        if (changed) return;
      }
      throw new Error('Attribution submission contention');
    }
  };
}
