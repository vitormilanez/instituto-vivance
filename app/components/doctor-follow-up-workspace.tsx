'use client';

import { useState } from 'react';
import { useCareDemo } from './care-demo-store';
import type { CareFollowUpCadence } from './care-demo-types';
import { cn, Status } from './shared';

const cadencePresentation: Record<CareFollowUpCadence, { short: string; detail: string }> = {
  daily: { short: 'Diário', detail: '1 registro por dia' },
  'every-three-days': { short: 'A cada 3 dias', detail: 'um registro a cada três dias' },
  'three-times-week': { short: '3x por semana', detail: 'três momentos na semana' },
  weekly: { short: 'Semanal', detail: '1 registro por semana' },
};

export function DoctorFollowUpWorkspace({
  patientId,
  encounterId,
}: {
  patientId: string;
  encounterId: string;
}) {
  const {
    latestCheckIn,
    latestCheckInReview,
    latestPublishedCarePlan,
    activeFollowUpConfiguration,
    followUpContacts,
    reviewCheckIn,
    configureFollowUp,
    recordFollowUpContact,
  } = useCareDemo(patientId, encounterId);
  const [selectedCadence, setSelectedCadence] = useState<CareFollowUpCadence>(
    activeFollowUpConfiguration?.cadence ?? 'every-three-days',
  );
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const latestContact = activeFollowUpConfiguration
    ? [...followUpContacts].reverse().find(
        (contact) => contact.configurationId === activeFollowUpConfiguration.id,
      ) ?? null
    : null;
  const checkInAfterConfiguration = Boolean(
    latestCheckIn &&
    activeFollowUpConfiguration &&
    latestCheckIn.submittedAtIso >= activeFollowUpConfiguration.configuredAtIso,
  );
  const awaitingCheckIn = Boolean(activeFollowUpConfiguration && !checkInAfterConfiguration);

  const runAction = async (action: () => unknown | Promise<unknown>, successMessage: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível concluir esta ação.');
    } finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="follow-up-workspace-title" className="rounded-2xl border border-[#bfd4cd] bg-[#f7fbf9] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#0b7b68]">Operação humana</p>
          <h4 id="follow-up-workspace-title" className="mt-2 text-lg font-semibold text-[#17372f]">Acompanhamento combinado</h4>
        </div>
        <Status tone={awaitingCheckIn ? 'amber' : activeFollowUpConfiguration ? 'green' : 'gray'}>
          {awaitingCheckIn ? 'Aguardando registro' : activeFollowUpConfiguration ? 'Cadência ativa' : 'Não configurado'}
        </Status>
      </div>

      <div className="mt-4 rounded-2xl border border-[#dfe8e3] bg-white p-4">
        <fieldset disabled={!latestPublishedCarePlan || busy}>
          <legend className="text-sm font-bold text-[#294940]">Frequência demonstrativa</legend>
          <p className="mt-1 text-xs leading-5 text-[#698078]">Vinculada somente à versão publicada do plano. Não cria monitoramento de urgência.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            {(Object.keys(cadencePresentation) as CareFollowUpCadence[]).map((cadence) => {
              const selected = selectedCadence === cadence;
              return (
                <button
                  type="button"
                  key={cadence}
                  aria-pressed={selected}
                  onClick={() => setSelectedCadence(cadence)}
                  className={cn(
                    'min-h-12 cursor-pointer rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b7b68] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
                    selected
                      ? 'border-[#0b7b68] bg-[#e8f4f0] text-[#0b6a5b]'
                      : 'border-[#d7e3df] bg-white text-[#60766f] hover:border-[#9fc8bd] hover:bg-[#f4f8f6]',
                  )}
                >
                  <span className="block text-xs font-bold">{cadencePresentation[cadence].short}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 opacity-80">{cadencePresentation[cadence].detail}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={!latestPublishedCarePlan}
            onClick={() => {
              if (!latestPublishedCarePlan) return;
              runAction(
                () => configureFollowUp(latestPublishedCarePlan.id, selectedCadence),
                'Cadência registrada no acompanhamento compartilhado.',
              );
            }}
            className="mt-3 min-h-11 w-full cursor-pointer rounded-xl bg-[#17372f] px-4 text-sm font-bold text-white transition-colors hover:bg-[#0f2d26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b7b68] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#9aaba5]"
          >
            {activeFollowUpConfiguration ? 'Atualizar cadência' : 'Ativar cadência demonstrativa'}
          </button>
        </fieldset>
        {activeFollowUpConfiguration ? (
          <p className="mt-3 text-[11px] leading-5 text-[#698078]">
            Versão {activeFollowUpConfiguration.version} · plano v{activeFollowUpConfiguration.planVersion} · {activeFollowUpConfiguration.retentionMode === 'shared-care' ? 'salva no acompanhamento' : 'configuração ilustrativa'} · contato sempre manual.
          </p>
        ) : null}
      </div>

      <div className="mt-3 rounded-2xl border border-[#dfe8e3] bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#789087]">Leitura da fonte</p>
            <p className="mt-1 text-sm font-bold text-[#294940]">
              {latestCheckIn ? `Check-in v${latestCheckIn.version}` : 'Nenhum check-in neste acompanhamento'}
            </p>
          </div>
          <Status tone={latestCheckInReview ? 'green' : latestCheckIn ? 'amber' : 'gray'}>
            {latestCheckInReview ? 'Leitura registrada' : latestCheckIn ? 'Pendente' : 'Sem fonte'}
          </Status>
        </div>
        {latestCheckIn ? (
          <>
            <p className="mt-3 text-xs leading-5 text-[#60766f]">Registrar a leitura confirma apenas que o médico abriu a fonte. Não significa diagnóstico, conduta ou sincronização.</p>
            <button
              type="button"
              disabled={Boolean(latestCheckInReview)}
              onClick={() => runAction(
                () => reviewCheckIn(latestCheckIn.id),
                'Leitura humana registrada no histórico.',
              )}
              className="mt-3 min-h-11 w-full cursor-pointer rounded-xl border border-[#9fc8bd] bg-white px-4 text-sm font-bold text-[#0b6a5b] transition-colors hover:bg-[#edf7f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b7b68] focus-visible:ring-offset-2 disabled:cursor-default disabled:border-[#d7e3df] disabled:bg-[#f4f7f5] disabled:text-[#698078]"
            >
              {latestCheckInReview ? `Lida em ${latestCheckInReview.reviewedAt}` : 'Registrar leitura da fonte'}
            </button>
          </>
        ) : (
          <p className="mt-3 text-xs leading-5 text-[#698078]">A ausência permanece explícita; o produto não inventa um sinal clínico.</p>
        )}
      </div>

      {activeFollowUpConfiguration ? (
        <div className={cn('mt-3 rounded-2xl border p-4', awaitingCheckIn ? 'border-[#ead8ad] bg-[#fffaf0]' : 'border-[#b9d8cf] bg-[#edf7f4]')}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#789087]">Ação operacional</p>
              <p className="mt-1 text-sm font-bold text-[#294940]">{awaitingCheckIn ? 'Registro ainda não recebido' : 'Registro recebido após a configuração'}</p>
            </div>
            <Status tone={awaitingCheckIn ? 'amber' : 'green'}>{awaitingCheckIn ? 'Acompanhar' : 'Recebido'}</Status>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#60766f]">
            {awaitingCheckIn
              ? 'A equipe pode registrar que fez um contato humano. Nenhuma mensagem ou notificação é enviada de verdade.'
              : 'Não há ação automática. A fonte segue disponível para leitura humana.'}
          </p>
          {awaitingCheckIn ? (
            <button
              type="button"
              disabled={Boolean(latestContact)}
              onClick={() => runAction(
                () => recordFollowUpContact(activeFollowUpConfiguration.id),
                'Contato demonstrativo registrado; nenhuma notificação real foi enviada.',
              )}
              className="mt-3 min-h-11 w-full cursor-pointer rounded-xl bg-[#0b7b68] px-4 text-sm font-bold text-white transition-colors hover:bg-[#096b5b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b7b68] focus-visible:ring-offset-2 disabled:cursor-default disabled:bg-[#779a91]"
            >
              {latestContact ? `Contato registrado em ${latestContact.recordedAt}` : 'Registrar contato humano'}
            </button>
          ) : null}
        </div>
      ) : null}

      <p aria-live="polite" className="mt-3 min-h-5 text-xs font-semibold leading-5 text-[#0b6a5b]">{message}</p>
    </section>
  );
}
