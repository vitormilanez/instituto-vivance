'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { initialCandidate, mergePolicyView, mergePolicyPatients, type PatientPolicyView, type PolicyCandidate, type PolicyCommand, type PolicyView } from '../lib/clinical-policy-contract';

type LocalDraft = { candidate: PolicyCandidate; note: string; revision: number };
export function useClinicalPolicy(role: 'professional' | 'patient' | null) {
  const pathname = usePathname();
  const protectedRoute = /^\/(medico|paciente)(\/|$)/u.test(pathname ?? '');
  const [view, setView] = useState<PolicyView | null>(null);
  const [patientView, setPatientView] = useState<PatientPolicyView | null>(null);
  const [local, setLocal] = useState<LocalDraft | null>(null);
  const [error, setError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const current = useRef({ view, local, patientView });
  const epoch = useRef(0);
  const mutating = useRef(false);
  const requestSequence = useRef(0);
  const loadingTicket = useRef<number | null>(null);
  useEffect(() => {
    if (!local) return;
    const warnUnsaved = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warnUnsaved);
    return () => window.removeEventListener('beforeunload', warnUnsaved);
  }, [local]);
  const reload = useCallback(async () => {
    if (!role || loadingTicket.current !== null) return;
    const ticket = ++requestSequence.current;
    loadingTicket.current = ticket;
    const started = epoch.current;
    try {
      const response = await fetch(role === 'professional' ? '/api/clinical-policy' : '/api/clinical-policy/context',
        { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
      const data = await response.json() as Partial<PolicyView & PatientPolicyView> & { error?: string };
      if (started !== epoch.current || ticket !== requestSequence.current) return;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          current.current = { view: null, local: null, patientView: null }; setView(null); setLocal(null); setPatientView(null);
        }
        throw new Error(data.error ?? 'Central indisponível.');
      }
      if (!data.actorId || !Array.isArray(data.patients) || (role === 'professional' && (!data.workspace || !Array.isArray(data.history)))) {
        throw new Error('Resposta incompleta da Central. Atualize antes de continuar.');
      }
      if (role === 'professional') {
        const incoming = data as PolicyView;
        const previous = current.current.view;
        if (previous && previous.actorId !== incoming.actorId) { current.current.local = null; setLocal(null); }
        const merged = mergePolicyView(previous, incoming);
        current.current.view = merged; setView(merged);
      } else {
        const incoming = data as PatientPolicyView;
        const previous = current.current.patientView;
        if (previous?.actorId === incoming.actorId) {
          incoming.patients = mergePolicyPatients(previous.patients, incoming.patients);
          if (previous.active && incoming.active && previous.active.version > incoming.active.version) incoming.active = previous.active;
        }
        current.current.patientView = incoming; setPatientView(incoming);
      }
      setError('');
    } catch (cause) { if (started === epoch.current && ticket === requestSequence.current) setError(cause instanceof Error ? cause.message : 'Falha ao carregar a Central.'); }
    finally {
      if (started === epoch.current && ticket === requestSequence.current) setLoaded(true);
      if (loadingTicket.current === ticket) loadingTicket.current = null;
    }
  }, [role]);
  useEffect(() => {
    epoch.current += 1;
    requestSequence.current += 1; loadingTicket.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- an authentication boundary invalidates the external policy cache
    current.current = { view: null, local: null, patientView: null }; setView(null); setLocal(null); setPatientView(null); setLoaded(false);
    setError(''); setOperationError(''); setBusy(false);
    if (!role || !protectedRoute) return;
    void reload();
    const refresh = () => { if (document.visibilityState === 'visible' && !mutating.current) void reload(); };
    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener('focus', refresh);
    return () => { epoch.current += 1; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
    // Keep draft across protected-page navigation. Role changes or leaving the protected area clear it.
  }, [role, reload, protectedRoute]);

  const edit = useCallback((update: (candidate: PolicyCandidate) => PolicyCandidate, note?: string) => {
    const stored = current.current.view;
    if (!stored || mutating.current) return;
    const draft = current.current.local ?? { candidate: stored.workspace.draft.candidate, note: stored.workspace.draft.note, revision: stored.workspace.revision };
    const next = { ...draft, candidate: update(draft.candidate), note: note ?? draft.note };
    current.current.local = next; setLocal(next);
  }, []);
  const run = useCallback(async (action: 'save' | 'test' | 'approve' | 'publish', acknowledged = false) => {
    if (mutating.current) return;
    const stored = current.current.view;
    if (!stored) { setOperationError('Carregue a política compartilhada antes de editar.'); return; }
    const draft = current.current.local;
    if (action !== 'save' && draft) { setOperationError('Salve suas alterações antes de testar, aprovar ou publicar.'); return; }
    const command: PolicyCommand = action === 'save'
      ? { action, revision: draft?.revision ?? stored.workspace.revision,
        candidate: draft?.candidate ?? stored.workspace.draft.candidate, note: draft?.note ?? stored.workspace.draft.note }
      : action === 'approve' ? { action, revision: stored.workspace.revision, acknowledged: acknowledged as true }
        : { action, revision: stored.workspace.revision };
    mutating.current = true; setBusy(true); setOperationError('');
    requestSequence.current += 1; loadingTicket.current = null;
    const started = epoch.current;
    try {
      const response = await fetch('/api/clinical-policy', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command), signal: AbortSignal.timeout(20_000) });
      const data = await response.json() as PolicyView & { error?: string };
      if (started !== epoch.current || current.current.view?.actorId !== stored.actorId) return;
      if (!response.ok || !data.workspace) throw new Error(data.error ?? 'Não foi possível concluir.');
      if (data.actorId !== stored.actorId) { await reload(); throw new Error('A sessão mudou. Confira a Central antes de continuar.'); }
      const merged = mergePolicyView(current.current.view, data);
      current.current.view = merged; current.current.local = null; setView(merged); setLocal(null);
    } catch (cause) { if (started === epoch.current) { setOperationError(cause instanceof Error ? cause.message : 'Falha na Central.'); await reload(); } }
    finally { mutating.current = false; if (started === epoch.current) setBusy(false); }
  }, [reload]);
  const pausePatient = useCallback(async (patientId: string) => {
    if (mutating.current) return;
    const patient = current.current.view?.patients.find((item) => item.patientId === patientId);
    if (!patient) return;
    const actorId = current.current.view?.actorId;
    const started = epoch.current;
    mutating.current = true; setBusy(true); setOperationError('');
    requestSequence.current += 1; loadingTicket.current = null;
    try {
      const response = await fetch('/api/clinical-policy', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause', relationshipId: patient.relationshipId, revision: patient.revision, paused: !patient.paused }),
        signal: AbortSignal.timeout(20_000) });
      const data = await response.json() as PolicyView & { error?: string };
      if (started !== epoch.current || current.current.view?.actorId !== actorId) return;
      if (!response.ok || !data.workspace) throw new Error(data.error ?? 'Não foi possível atualizar a permissão.');
      if (data.actorId !== actorId) { await reload(); throw new Error('A sessão mudou. Confira a Central antes de continuar.'); }
      const merged = mergePolicyView(current.current.view, data);
      current.current.view = merged; setView(merged); setError('');
    } catch (cause) { if (started === epoch.current) { setOperationError(cause instanceof Error ? cause.message : 'Falha ao atualizar.'); await reload(); } }
    finally { mutating.current = false; if (started === epoch.current) setBusy(false); }
  }, [reload]);
  const useSharedDraft = () => {
    // Explicit user action only. Refreshing never overwrites an unsaved editor.
    current.current.local = null; setLocal(null); setOperationError('');
  };
  return { view, patientView, loaded, busy, error: operationError || error, reload, edit, run, pausePatient, useSharedDraft,
    candidate: local?.candidate ?? view?.workspace.draft.candidate ?? initialCandidate(),
    note: local?.note ?? view?.workspace.draft.note ?? '',
    hasLocalEdits: Boolean(local), conflict: Boolean(local && view && local.revision !== view.workspace.revision) };
}
export type ClinicalPolicyStore = ReturnType<typeof useClinicalPolicy>;
