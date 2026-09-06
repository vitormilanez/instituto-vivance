'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { cycleKey, type CareCycle, type CycleCommand, type CycleMutation } from '../lib/care-cycle-contract';

type SharedCareStore = {
  cycles: Record<string, CareCycle>; loaded: boolean; error: string; role: 'patient' | 'professional' | null;
  refresh: () => Promise<void>;
  mutate: <T>(patientId: string, encounterId: string, command: CycleCommand, args: unknown[]) => Promise<T>;
};
const SharedCareContext = createContext<SharedCareStore | null>(null);
export function SharedCareProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [cycles, setCycles] = useState<Record<string, CareCycle>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState<SharedCareStore['role']>(null);
  const current = useRef(cycles);
  const queues = useRef(new Map<string, Promise<unknown>>());
  const failed = useRef(new Map<string, { payload: string; mutation: CycleMutation }>());
  const loadPromise = useRef<Promise<void> | null>(null);
  const actor = useRef<string | null>(null);
  const epoch = useRef(0);

  const accept = useCallback((incoming: CareCycle[], replace = false) => {
    const next = replace ? {} as Record<string, CareCycle> : { ...current.current };
    for (const cycle of incoming) {
      const key = cycleKey(cycle.patientId, cycle.encounterId);
      const previous = current.current[key];
      next[key] = previous && previous.relationshipId === cycle.relationshipId && previous.revision > cycle.revision ? previous : cycle;
    }
    current.current = next; setCycles(next);
  }, []);
  const refresh = useCallback((): Promise<void> => {
    if (loadPromise.current) return loadPromise.current;
    const run = async () => {
      const startedAt = epoch.current;
      try {
        const response = await fetch('/api/care-cycles', { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
        const data = await response.json() as { actorId: string; cycles?: CareCycle[]; role: SharedCareStore['role']; error?: string };
        if (startedAt !== epoch.current) return;
        if (response.status === 401) {
          current.current = {}; actor.current = null; setCycles({}); setRole(null); setError('Entre novamente para recuperar o acompanhamento.'); return;
        }
        if (!response.ok || !Array.isArray(data.cycles)) throw new Error(data.error ?? 'Não foi possível atualizar os dados.');
        if (actor.current !== data.actorId) { current.current = {}; failed.current.clear(); }
        actor.current = data.actorId; setRole(data.role); accept(data.cycles, true); setError('');
      } catch (cause) { if (startedAt === epoch.current) setError(cause instanceof Error ? cause.message : 'Falha ao atualizar.'); }
      finally { if (startedAt === epoch.current) setLoaded(true); loadPromise.current = null; }
    };
    loadPromise.current = run(); return loadPromise.current;
  }, [accept]);
  useEffect(() => {
    if (!/^\/(medico|paciente)(\/|$)/u.test(pathname ?? '')) {
      epoch.current += 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leaving an authenticated route invalidates the external session cache
      current.current = {}; actor.current = null; setCycles({}); setRole(null); setLoaded(false); failed.current.clear();
      return;
    }
    void refresh();
    const update = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', update); document.addEventListener('visibilitychange', update);
    const timer = window.setInterval(update, 15_000);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); };
  }, [refresh, pathname]);

  const mutate = useCallback(<T,>(patientId: string, encounterId: string, command: CycleCommand, args: unknown[]): Promise<T> => {
    const key = cycleKey(patientId, encounterId);
    const run = async (): Promise<T> => {
      const startedAt = epoch.current;
      const startedBy = actor.current;
      const cycle = current.current[key];
      if (!cycle) throw new Error('Este vínculo ainda não está disponível no acompanhamento compartilhado.');
      const payload = JSON.stringify({ command, args });
      const previous = failed.current.get(key);
      const mutation: CycleMutation = previous?.payload === payload ? previous.mutation
        : { patientId, encounterId, relationshipId: cycle.relationshipId, revision: cycle.revision, command, args, requestId: crypto.randomUUID() };
      failed.current.set(key, { payload, mutation });
      const response = await fetch('/api/care-cycles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mutation), signal: AbortSignal.timeout(20_000) });
      const data = await response.json() as { cycle: CareCycle; result: T; error?: string };
      if (startedAt !== epoch.current || startedBy !== actor.current) throw new Error('A sessão mudou. Entre novamente para recuperar o acompanhamento.');
      if (!response.ok) {
        if (response.status === 409) { failed.current.delete(key); await refresh(); }
        throw new Error(data.error ?? 'Não foi possível salvar. Seu texto deve permanecer no editor.');
      }
      accept([data.cycle]); failed.current.delete(key); setError(''); return data.result as T;
    };
    const task = (queues.current.get(key) ?? Promise.resolve()).catch(() => undefined).then(run);
    queues.current.set(key, task); void task.finally(() => { if (queues.current.get(key) === task) queues.current.delete(key); }).catch(() => undefined);
    return task;
  }, [accept, refresh]);
  const value = useMemo(() => ({ cycles, loaded, error, role, refresh, mutate }), [cycles, loaded, error, role, refresh, mutate]);
  return <SharedCareContext.Provider value={value}>{children}</SharedCareContext.Provider>;
}
export function useSharedCare() {
  const value = useContext(SharedCareContext);
  if (!value) throw new Error('SharedCareProvider não encontrado.');
  return value;
}
export function CareSyncStatus({ patientId, encounterId }: { patientId: string; encounterId: string }) {
  const { loaded, cycles, error, refresh } = useSharedCare();
  const connected = Boolean(cycles[cycleKey(patientId, encounterId)]);
  return <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#dbe4f0] bg-white p-3 text-sm text-[#405675]">
    <span>{!loaded ? 'Carregando acompanhamento compartilhado…' : error || (connected ? 'Acompanhamento compartilhado · dados fictícios' : 'Cenário ilustrativo · vínculo ainda não persistido')}</span>
    <button type="button" onClick={() => void refresh()} className="min-h-11 px-3 font-semibold text-[#124da0] underline">Atualizar dados</button>
  </div>;
}
