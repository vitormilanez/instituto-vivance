'use client';

import { useState } from 'react';
import { useCareDemo } from './care-demo-store';
import type { CarePlanVersion } from './care-demo-types';
import { getDefaultEncounterId } from './demo-routes';
import { cn,Heading,Status } from './shared';

export function SharedPatientCarePlan({ patientId }: { patientId: string }) {
  const { latestPublishedCarePlan, confirmedActionIds, confirmCarePlanAction } = useCareDemo(patientId, getDefaultEncounterId(patientId));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return <div className="p-5 sm:p-6"><p role="status" className="text-sm text-[#60766f]">{busy ? 'Salvando confirmação…' : message}</p><PatientCarePlan plan={latestPublishedCarePlan} confirmedActionIds={confirmedActionIds} onConfirm={async (actionId, completed) => {
    if (busy || !latestPublishedCarePlan) return;
    setBusy(true); setMessage('');
    try { await confirmCarePlanAction(latestPublishedCarePlan.id, actionId, completed); setMessage('Confirmação salva no acompanhamento.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  }} /></div>;
}

export function PatientCarePlan({
  plan,
  confirmedActionIds,
  onConfirm,
}: {
  plan: CarePlanVersion | null;
  confirmedActionIds: string[];
  onConfirm: (actionId: string, completed: boolean) => void;
}) {
  if (!plan) {
    return (
      <section className="mt-0 lg:mt-8">
        <Heading eyebrow="Seu plano" title="Ainda não há um plano publicado" description="Quando seu médico revisar e publicar uma versão, ela aparecerá aqui com passos claros e a data da publicação." />
        <div className="mt-7 rounded-3xl border border-dashed border-[#bfd4cd] bg-white p-6 text-center sm:p-8">
          <p className="text-base font-bold text-[#405d54]">Nenhum rascunho aparece para você.</p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#698078]">O médico pode preparar versões durante a consulta, mas você só vê uma versão depois da aprovação e da publicação explícita.</p>
        </div>
      </section>
    );
  }

  const visibleActions = plan.actions.filter((action) => action.active);
  const confirmedActionIdSet = new Set(confirmedActionIds);
  const completed = visibleActions.filter((action) => confirmedActionIdSet.has(action.id)).length;
  const completion = visibleActions.length > 0 ? Math.round((completed / visibleActions.length) * 100) : 0;

  return (
    <section className="mt-0 lg:mt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Heading eyebrow={`Plano publicado · versão ${plan.version}`} title={plan.title} description={plan.introduction} />
        <div className="shrink-0 rounded-2xl border border-[#b9d8cf] bg-[#edf7f4] px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#0b6a5b]">Publicado pela equipe</p><p className="mt-1 text-sm font-bold text-[#17372f]">{plan.publishedAt}</p></div>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="rounded-3xl border border-[#dfe8e3] bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-sm font-bold text-[#17372f]">Foco deste ciclo</p><p className="mt-2 max-w-2xl text-base font-semibold leading-6 text-[#405d54]">{plan.objective}</p></div>
            <Status tone="green">Versão publicada</Status>
          </div>
          <div className="mt-6 flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-[#17372f]">Seus passos</p><p className="mt-1 text-xs text-[#698078]">{completed} de {visibleActions.length} registrados no acompanhamento</p></div><span className="text-2xl font-semibold text-[#0b7b68]">{completion}%</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e3ebe7]"><div className="h-full rounded-full bg-[#0b7b68] transition-[width]" style={{ width: `${completion}%` }} /></div>
          <div className="mt-6 space-y-3">
            {visibleActions.map((action) => {
              const done = confirmedActionIdSet.has(action.id);
              return (
                <button type="button" key={action.id} aria-pressed={done} onClick={() => onConfirm(action.id, !done)} className={cn('flex min-h-16 w-full cursor-pointer items-center gap-4 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b7b68] focus-visible:ring-offset-2', done ? 'border-[#b9d8cf] bg-[#edf7f4]' : 'border-[#dfe8e3] bg-white hover:border-[#9fc9bd] hover:bg-[#fbfdfc]')}>
                  <span aria-hidden="true" className={cn('grid size-7 shrink-0 place-items-center rounded-full border-2 text-sm font-bold', done ? 'border-[#0b7b68] bg-[#0b7b68] text-white' : 'border-[#aebfba] text-transparent')}>✓</span>
                  <span><strong className={cn('block text-sm text-[#17372f]', done && 'text-[#45655c] line-through')}>{action.title}</strong><span className="mt-1 block text-xs text-[#698078]">{action.cadence}</span></span>
                </button>
              );
            })}
          </div>
        </article>

        <aside className="space-y-5">
          <div className="rounded-3xl bg-[#17372f] p-5 text-white"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9cc7ba]">Acompanhamento</p><p className="mt-3 text-sm leading-6 text-[#d6e8e2]">{plan.monitoring}</p></div>
          <div className="rounded-3xl border border-[#f0d59c] bg-[#fff8e9] p-5"><p className="text-sm font-bold text-[#6f4b0d]">Canal combinado com a equipe</p><p className="mt-2 text-sm leading-6 text-[#805f24]">{plan.supportNotice}</p></div>
          <div className="rounded-3xl border border-[#dfe8e3] bg-white p-5"><p className="text-sm font-bold text-[#17372f]">Como esta versão foi criada?</p><p className="mt-2 text-sm leading-6 text-[#698078]">Origem: {plan.sourceDescription}. Revisada e publicada por {plan.publishedBy ?? 'equipe médica demonstrativa'}.</p><p className="mt-3 text-xs leading-5 text-[#8a9c96]">Você vê apenas a versão publicada. Rascunhos e versões em revisão ficam com a equipe.</p></div>
        </aside>
      </div>
    </section>
  );
}
