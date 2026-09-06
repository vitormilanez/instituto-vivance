import type { ClinicalGovernanceSnapshot, ClinicalGovernedArtifact } from '../components/clinical-intelligence-context';

export type SynthesisContent = { draftText: string; selectedPointIds: string[] };
export type SynthesisSaveInput = {
  patientId: string;
  encounterId: string;
  requestId: string;
  baseVersion: number;
  content: string;
  sourceIds: string[];
  governance: ClinicalGovernanceSnapshot;
};
export type SavedSynthesis = ClinicalGovernedArtifact & { encounterId: string; content: string };

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function strings(value: unknown, max: number): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= max
    && value.every((item) => typeof item === 'string' && item.length > 0 && item.length <= 200)
    && new Set(value).size === value.length;
}

export function parseSynthesisContent(content: unknown): SynthesisContent | null {
  if (typeof content !== 'string' || content.length > 30_000) return null;
  try {
    const parsed: unknown = JSON.parse(content);
    if (!record(parsed) || typeof parsed.draftText !== 'string'
      || !parsed.draftText.trim() || parsed.draftText.length > 20_000
      || !strings(parsed.selectedPointIds, 50)) return null;
    return { draftText: parsed.draftText, selectedPointIds: parsed.selectedPointIds };
  } catch { return null; }
}

export function parseSynthesisSave(value: unknown): SynthesisSaveInput | null {
  if (!record(value) || typeof value.patientId !== 'string'
    || !/^pac-demo-\d{3}$/u.test(value.patientId)
    || typeof value.encounterId !== 'string' || !/^enc-demo-\d{3}$/u.test(value.encounterId)
    || typeof value.requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/u.test(value.requestId)
    || !Number.isSafeInteger(value.baseVersion) || Number(value.baseVersion) < 0
    || !parseSynthesisContent(value.content) || !strings(value.sourceIds, 100)
    || !record(value.governance)) return null;
  const governance = value.governance;
  if (governance.moduleId !== 'clinical_synthesis'
    || !Number.isSafeInteger(governance.configurationVersion) || Number(governance.configurationVersion) < 1
    || !['moduleLabel', 'knowledgeSourceId', 'knowledgeReference', 'knowledgeVersion', 'sourceFingerprint', 'governedAt', 'governedAtIso']
      .every((key) => typeof governance[key] === 'string' && String(governance[key]).length > 0 && String(governance[key]).length <= 500)) return null;
  return {
    patientId: value.patientId, encounterId: value.encounterId, requestId: value.requestId,
    baseVersion: Number(value.baseVersion), content: value.content as string,
    sourceIds: value.sourceIds, governance: governance as unknown as ClinicalGovernanceSnapshot,
  };
}

// A fingerprint helps trace a version; it is never a substitute for the text.
export async function synthesisFingerprint(content: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
