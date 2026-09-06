'use client';

import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Clock,
  FileText,
  Microphone,
  PaperPlaneTilt,
  Ruler,
  ShieldCheck,
  Stop,
  UserFocus,
} from '@phosphor-icons/react';
import { type FormEvent,useEffect,useMemo,useRef,useState } from 'react';
import type {
  CareCheckIn,
  CareCheckInInput,
  CareCheckInPlanExperience,
  CareCheckInSleepQuality,
  CareConversationMessage,
} from './care-demo-types';
import { SharedPatientCarePlan } from './patient-care-plan';
import type {
  FilledPatientMvpData,
  PatientMvpAppointmentChoice,
  PatientMvpData,
  PatientMvpPhotoPose,
  PatientMvpSessionState,
  PendingPatientMvpData,
} from './patient-mvp-data';
import { isPatientCheckInDue } from './patient-mvp-data';
import { cn,Status } from './shared';

export type CareDestination = 'plan' | 'medications' | 'appointments' | 'journal';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b7b68] focus-visible:ring-offset-2';
const primaryButton = cn(
  'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0b7b68] px-5 text-sm font-bold text-white transition-colors hover:bg-[#096b5b] disabled:cursor-not-allowed disabled:bg-[#829c95]',
  focusRing,
);
const secondaryButton = cn(
  'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#b9d2ca] bg-white px-4 text-sm font-bold text-[#0b6a5b] transition-colors hover:bg-[#edf7f4]',
  focusRing,
);

const careDestinations: Array<{ id: CareDestination; label: string }> = [
  { id: 'plan', label: 'Meu plano' },
  { id: 'medications', label: 'Medicamentos' },
  { id: 'appointments', label: 'Consultas' },
  { id: 'journal', label: 'Check-ins' },
];

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return <label htmlFor={htmlFor} className="block text-sm font-bold text-[#17372f]">{children}</label>;
}

export function CareScreen({
  data,
  session,
  latestCheckIn,
  latestCheckInReviewed,
  activeDestination,
  onChangeDestination,
  onOpenCheckIn,
  onMarkMedicationRead,
  onAskMedicationQuestion,
  onChooseAppointment,
  onSaveMedication,
}: {
  data: PatientMvpData;
  session: PatientMvpSessionState;
  latestCheckIn: CareCheckIn | null;
  latestCheckInReviewed: boolean;
  activeDestination: CareDestination;
  onChangeDestination: (destination: CareDestination) => void;
  onOpenCheckIn: () => void;
  onMarkMedicationRead: () => void;
  onAskMedicationQuestion: () => void;
  onChooseAppointment: (choice: PatientMvpAppointmentChoice) => void;
  onSaveMedication: (choice: 'uses' | 'none', report: string) => void;
}) {
  return (
    <section aria-labelledby="care-screen-title">
      <div className="max-w-2xl">
        <h1 id="care-screen-title" className="text-3xl font-semibold tracking-[-0.03em] text-[#17372f]">Meu cuidado</h1>
        <p className="mt-2 text-base leading-7 text-[#60766f]">O que foi publicado pelo médico e o que você escolheu compartilhar ficam separados e fáceis de encontrar.</p>
      </div>

      <nav aria-label="Áreas do meu cuidado" className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {careDestinations.map((destination) => (
          <button
            key={destination.id}
            type="button"
            aria-pressed={activeDestination === destination.id}
            onClick={() => onChangeDestination(destination.id)}
            className={cn(
              'min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold transition-colors',
              focusRing,
              activeDestination === destination.id
                ? 'bg-[#17372f] text-white'
                : 'border border-[#d9e5e0] bg-white text-[#526a62] hover:bg-[#edf7f4]',
            )}
          >
            {destination.label}
          </button>
        ))}
      </nav>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#d9e5e0] bg-white">
        {activeDestination === 'plan' ? (
          <SharedPatientCarePlan key={data.patientId} patientId={data.patientId} />
        ) : null}
        {activeDestination === 'medications' ? (
          data.scenario === 'filled'
            ? (
              <FilledMedication
                data={data}
                read={session.medicationRead}
                onRead={onMarkMedicationRead}
                onQuestion={onAskMedicationQuestion}
              />
            )
            : <PendingMedication data={data} session={session} onSave={onSaveMedication} />
        ) : null}
        {activeDestination === 'appointments' ? (
          data.scenario === 'filled'
            ? <FilledAppointment data={data} choice={session.appointmentChoice} onChoose={onChooseAppointment} />
            : <PendingAppointment />
        ) : null}
        {activeDestination === 'journal' ? (
          <CheckInHistory
            data={data}
            latestCheckIn={latestCheckIn}
            reviewed={latestCheckInReviewed}
            onOpenCheckIn={onOpenCheckIn}
          />
        ) : null}
      </div>
    </section>
  );
}


function FilledMedication({
  data,
  read,
  onRead,
  onQuestion,
}: {
  data: FilledPatientMvpData;
  read: boolean;
  onRead: () => void;
  onQuestion: () => void;
}) {
  return (
    <article className="p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#17372f]">Orientação atualizada</h2>
          <p className="mt-2 text-sm leading-6 text-[#60766f]">{data.medication.name} · nome e doses exclusivamente demonstrativos.</p>
        </div>
        <Status tone={read ? 'green' : 'amber'}>{read ? 'Leitura confirmada' : 'Aguardando leitura'}</Status>
      </div>
      <div className="mt-6 grid gap-px overflow-hidden rounded-xl bg-[#d9e5e0] sm:grid-cols-2">
        <div className="bg-[#f7faf8] p-4"><p className="text-xs font-bold text-[#60766f]">Orientação anterior</p><p className="mt-2 text-sm font-semibold leading-6 text-[#17372f]">{data.medication.previousOrientation}</p></div>
        <div className="bg-[#edf7f4] p-4"><p className="text-xs font-bold text-[#0b6a5b]">Nova orientação publicada</p><p className="mt-2 text-sm font-semibold leading-6 text-[#17372f]">{data.medication.newOrientation}</p></div>
      </div>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div className="border-t border-[#e4ece8] pt-3"><dt className="text-xs font-bold text-[#60766f]">Início informado</dt><dd className="mt-1 text-[#405d54]">{data.medication.startsAt}</dd></div>
        <div className="border-t border-[#e4ece8] pt-3"><dt className="text-xs font-bold text-[#60766f]">Receita fictícia</dt><dd className="mt-1 text-[#405d54]">Vence em {data.medication.prescriptionExpiresIn} · aviso visível para o médico</dd></div>
      </dl>
      <p className="mt-4 border-t border-[#e4ece8] pt-4 text-xs leading-5 text-[#60766f]">Histórico demonstrativo: {data.medication.history}.</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onRead} disabled={read} className={primaryButton}><Check aria-hidden="true" size={18} />{read ? 'Leitura confirmada' : 'Li e entendi'}</button>
        <button type="button" onClick={onQuestion} className={secondaryButton}>Tenho uma dúvida</button>
      </div>
      <p className="mt-4 text-xs leading-5 text-[#60766f]">Confirmar leitura não significa confirmar uso. Não existe renovação automática neste protótipo.</p>
    </article>
  );
}

function PendingMedication({
  data,
  session,
  onSave,
}: {
  data: PendingPatientMvpData;
  session: PatientMvpSessionState;
  onSave: (choice: 'uses' | 'none', report: string) => void;
}) {
  const [choice, setChoice] = useState<'uses' | 'none' | null>(
    session.medicationChoice === 'uses' || session.medicationChoice === 'none'
      ? session.medicationChoice
      : null,
  );
  const [report, setReport] = useState(session.medicationReport);

  return (
    <article className="p-5 sm:p-7">
      <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#17372f]">O que você usa hoje?</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#60766f]">Essa resposta é um relato seu e ficará pendente de conferência. Informe o nome como está na embalagem; não ajuste doses aqui.</p>
      <fieldset className="mt-5">
        <legend className="text-sm font-bold text-[#17372f]">Escolha uma opção</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {([['uses', 'Uso medicamento atualmente'], ['none', 'Não uso medicamentos']] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={choice === value} onClick={() => setChoice(value)} className={cn('min-h-12 rounded-xl border px-4 text-sm font-bold', focusRing, choice === value ? 'border-[#0b7b68] bg-[#edf7f4] text-[#0b6a5b]' : 'border-[#d9e5e0] text-[#526a62]')}>{label}</button>
          ))}
        </div>
      </fieldset>
      {choice === 'uses' ? (
        <div className="mt-5"><FieldLabel htmlFor="pending-medication-report">Nome e como foi orientado a usar</FieldLabel><textarea id="pending-medication-report" value={report} onChange={(event) => setReport(event.target.value)} rows={4} placeholder="Ex.: nome que aparece na embalagem e orientação recebida" className={cn('mt-2 w-full resize-y rounded-xl border border-[#c9d6d1] bg-white px-4 py-3 text-base leading-6 text-[#17372f] placeholder:text-[#60766f]', focusRing)} /></div>
      ) : null}
      <button type="button" disabled={!choice || (choice === 'uses' && !report.trim())} onClick={() => { if (choice) onSave(choice, report.trim()); }} className={cn(primaryButton, 'mt-5')}>Salvar resposta</button>
      {session.medicationChoice !== 'pending' ? <p className="mt-3 text-xs font-semibold text-[#0b6a5b]">Resposta salva nesta sessão demonstrativa.</p> : null}
      <p className="mt-5 text-xs leading-5 text-[#60766f]">Paciente fictício: {data.name}. A IA não prescreve, escolhe ou altera medicamentos.</p>
    </article>
  );
}

function FilledAppointment({ data, choice, onChoose }: { data: FilledPatientMvpData; choice: PatientMvpAppointmentChoice; onChoose: (choice: PatientMvpAppointmentChoice) => void }) {
  return (
    <article className="p-5 sm:p-7">
      <div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#edf7f4] text-[#0b6a5b]"><Clock aria-hidden="true" size={23} /></span><div><h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#17372f]">{data.appointment.date}, às {data.appointment.time}</h2><p className="mt-2 text-sm leading-6 text-[#60766f]">{data.appointment.purpose} com {data.doctorName}. O horário só apareceu depois da aprovação médica.</p></div></div>
      <div className="mt-5"><Status tone={choice === 'confirmed' ? 'green' : choice === 'alternative' ? 'blue' : 'amber'}>{choice === 'confirmed' ? 'Confirmado' : choice === 'alternative' ? 'Outras opções solicitadas' : 'Aguardando sua resposta'}</Status></div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => onChoose('confirmed')} className={primaryButton}>Confirmar horário</button><button type="button" onClick={() => onChoose('alternative')} className={secondaryButton}>Ver outras opções</button></div>
      <p className="mt-4 text-xs leading-5 text-[#60766f]">Agenda e notificações são simuladas. Sua resposta retorna à área médica deste mock.</p>
    </article>
  );
}

function PendingAppointment() {
  return <article className="p-6 sm:p-8"><h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#17372f]">Nenhum retorno proposto ainda</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#60766f]">Quando houver uma sugestão aprovada pelo médico, você poderá confirmar ou pedir outras opções aqui. A IA nunca agenda sozinha.</p></article>;
}

function CheckInHistory({ data, latestCheckIn, reviewed, onOpenCheckIn }: { data: PatientMvpData; latestCheckIn: CareCheckIn | null; reviewed: boolean; onOpenCheckIn: () => void }) {
  const seededOriginal = data.scenario === 'filled' ? data.checkIn.originalText : null;
  const original = latestCheckIn?.originalText || seededOriginal;
  const due = isPatientCheckInDue(latestCheckIn);
  return (
    <article className="p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#17372f]">Check-ins a cada 3 dias</h2><p className="mt-2 text-sm leading-6 text-[#60766f]">Um registro atrasado continua como uma única pendência. Você também pode contar uma mudança a qualquer momento.</p></div><Status tone={latestCheckIn && !due ? (reviewed ? 'blue' : 'amber') : original ? 'gray' : 'amber'}>{latestCheckIn && !due ? (reviewed ? 'Fonte lida pelo médico' : 'Aguardando leitura') : due ? 'Disponível agora' : 'Histórico fictício'}</Status></div>
      {original ? <blockquote className="mt-6 rounded-xl bg-[#f7faf8] p-4 text-sm leading-6 text-[#405d54]">“{original}”</blockquote> : <p className="mt-6 rounded-xl border border-dashed border-[#b9d2ca] p-5 text-sm leading-6 text-[#60766f]">Ainda não há relato para mostrar. A ausência permanece explícita.</p>}
      <button type="button" onClick={onOpenCheckIn} className={cn(primaryButton, 'mt-5')}>{due ? 'Começar check-in' : 'Contar uma mudança'}</button>
      <p className="mt-4 text-xs leading-5 text-[#60766f]">O canal não é acompanhado em tempo real e não substitui atendimento de urgência.</p>
    </article>
  );
}

export function ConversationScreen({
  data,
  messages,
  loading = false,
  sending = false,
  error = '',
  onSend,
}: {
  data: PatientMvpData;
  messages: CareConversationMessage[];
  loading?: boolean;
  sending?: boolean;
  error?: string;
  onSend: (body: string) => Promise<void>;
}) {
  const [body, setBody] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim() || sending) return;
    try {
      await onSend(body.trim());
      setBody('');
    } catch {
      // The shared error banner keeps the failed message visible to the user.
    }
  };
  const allMessages = [...data.conversation, ...messages.map((message) => ({ id: message.id, sender: message.sender === 'patient' ? 'patient' as const : 'doctor' as const, body: message.body, sentAt: message.sentAt }))];
  return (
    <section aria-labelledby="conversation-title">
      <h1 id="conversation-title" className="text-3xl font-semibold tracking-[-0.03em] text-[#17372f]">Conversas</h1>
      <p className="mt-2 max-w-2xl text-base leading-7 text-[#60766f]">Escreva para a equipe responsável. Nenhuma resposta clínica é criada automaticamente pela IA.</p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-[#d9e5e0] bg-white">
        <div className="space-y-4 p-5 sm:p-7" aria-live="polite">
          {loading ? <p className="text-sm text-[#60766f]">Atualizando a conversa…</p> : null}
          {allMessages.map((message) => <article key={message.id} className={cn('max-w-[88%] rounded-xl p-4 text-sm leading-6', message.sender === 'patient' ? 'ml-auto bg-[#17372f] text-white' : 'bg-[#edf7f4] text-[#294940]')}><p>{message.body}</p><p className={cn('mt-2 text-[11px]', message.sender === 'patient' ? 'text-[#c9e4dd]' : 'text-[#526a62]')}>{message.sentAt} · {message.sender === 'patient' ? 'Você' : data.doctorName}</p></article>)}
        </div>
        <form onSubmit={submit} className="border-t border-[#e4ece8] p-4 sm:p-5">
          <FieldLabel htmlFor="patient-mvp-message">Sua mensagem</FieldLabel>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row"><textarea id="patient-mvp-message" value={body} maxLength={600} disabled={sending} onChange={(event) => setBody(event.target.value)} rows={3} placeholder="Escreva do seu jeito" className={cn('min-h-12 flex-1 resize-y rounded-xl border border-[#c9d6d1] px-4 py-3 text-base text-[#17372f] placeholder:text-[#60766f] disabled:bg-[#f1f5f3]', focusRing)} /><button type="submit" disabled={!body.trim() || sending} className={primaryButton}><PaperPlaneTilt aria-hidden="true" size={18} />{sending ? 'Enviando…' : 'Enviar'}</button></div>
          {error ? <p role="alert" className="mt-3 rounded-xl border border-[#efc5c1] bg-[#fff2f1] px-3 py-2.5 text-sm font-medium text-[#8b3732]">{error}</p> : null}
          <p className="mt-3 text-xs leading-5 text-[#60766f]">Este espaço não é acompanhado em tempo real. Em uma situação urgente, procure o serviço de emergência da sua região.</p>
        </form>
      </div>
    </section>
  );
}

export function EvolutionScreen({ data, session, onSaveMeasures, onChoosePhotoPath, onTogglePhotoSlot }: { data: PatientMvpData; session: PatientMvpSessionState; onSaveMeasures: (weight: string, waist: string) => void; onChoosePhotoPath: (choice: 'protocol' | 'alternative') => void; onTogglePhotoSlot: (pose: PatientMvpPhotoPose['id']) => void }) {
  return (
    <section aria-labelledby="evolution-title">
      <h1 id="evolution-title" className="text-3xl font-semibold tracking-[-0.03em] text-[#17372f]">Evolução</h1>
      <p className="mt-2 max-w-2xl text-base leading-7 text-[#60766f]">Veja tendências com data e origem. Nenhuma medida isolada define diagnóstico, sucesso ou falha.</p>
      <div className="mt-6 space-y-5">
        {data.scenario === 'filled' ? <FilledMeasures data={data} /> : <PendingMeasures session={session} onSave={onSaveMeasures} />}
        <PhotoSection data={data} session={session} onChoosePath={onChoosePhotoPath} onToggleSlot={onTogglePhotoSlot} />
      </div>
    </section>
  );
}

function FilledMeasures({ data }: { data: FilledPatientMvpData }) {
  const latest = data.measures.at(-1)!;
  const first = data.measures[0];
  return (
    <article id="patient-measures" className="scroll-mt-24 overflow-hidden rounded-2xl border border-[#d9e5e0] bg-white">
      <div className="p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#17372f]">Medidas do acompanhamento</h2><p className="mt-2 text-sm leading-6 text-[#60766f]">Último registro em {latest.date} · autorrelato.</p></div><Status tone="gray">Dados fictícios</Status></div>
        <dl className="mt-6 grid gap-px overflow-hidden rounded-xl bg-[#d9e5e0] sm:grid-cols-2"><div className="bg-[#f7faf8] p-4"><dt className="text-xs font-bold text-[#60766f]">Peso</dt><dd className="mt-2 text-2xl font-semibold tabular-nums text-[#17372f]">{String(latest.weight).replace('.', ',')} kg</dd><p className="mt-1 text-xs text-[#526a62]">{(latest.weight - first.weight).toFixed(1).replace('.', ',')} kg desde o início</p></div><div className="bg-[#f7faf8] p-4"><dt className="text-xs font-bold text-[#60766f]">Cintura</dt><dd className="mt-2 text-2xl font-semibold tabular-nums text-[#17372f]">{String(latest.waist).replace('.', ',')} cm</dd><p className="mt-1 text-xs text-[#526a62]">{(latest.waist - first.waist).toFixed(1).replace('.', ',')} cm desde o início</p></div></dl>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[480px] border-collapse text-left text-sm"><caption className="sr-only">Histórico fictício de peso e cintura</caption><thead><tr className="border-b border-[#d9e5e0] text-xs text-[#60766f]"><th className="py-3 pr-4">Data</th><th className="px-4 py-3">Peso</th><th className="px-4 py-3">Cintura</th><th className="pl-4 py-3">Origem</th></tr></thead><tbody>{data.measures.map((record) => <tr key={record.date} className="border-b border-[#edf2ef] last:border-0"><th className="py-3 pr-4 font-semibold text-[#294940]">{record.date}</th><td className="px-4 py-3 tabular-nums text-[#526a62]">{String(record.weight).replace('.', ',')} kg</td><td className="px-4 py-3 tabular-nums text-[#526a62]">{String(record.waist).replace('.', ',')} cm</td><td className="pl-4 py-3 text-[#526a62]">{record.source}</td></tr>)}</tbody></table></div>
      </div>
      <div className="grid gap-px bg-[#d9e5e0] sm:grid-cols-2"><div className="bg-[#f6f9fe] p-4"><p className="text-xs font-bold text-[#50627f]">IMC calculado</p><p className="mt-1 text-lg font-semibold tabular-nums text-[#071a3a]">34,1 kg/m²</p><p className="mt-1 text-xs leading-5 text-[#61718a]">Medida de rastreio; não é diagnóstico nem mede gordura diretamente.</p></div><div className="bg-[#f6f9fe] p-4"><p className="text-xs font-bold text-[#50627f]">Relação cintura/altura</p><p className="mt-1 text-lg font-semibold tabular-nums text-[#071a3a]">0,64</p><p className="mt-1 text-xs leading-5 text-[#61718a]">Valor derivado para contexto; a interpretação é do médico.</p></div></div>
    </article>
  );
}

function PendingMeasures({ session, onSave }: { session: PatientMvpSessionState; onSave: (weight: string, waist: string) => void }) {
  const [weight, setWeight] = useState(session.measures?.weight ?? '');
  const [waist, setWaist] = useState(session.measures?.waist ?? '');
  const valid = /^\d{2,3}([,.]\d)?$/.test(weight.trim()) && /^\d{2,3}([,.]\d)?$/.test(waist.trim());
  return (
    <article id="patient-measures" className="scroll-mt-24 rounded-2xl border border-[#d9e5e0] bg-white p-5 sm:p-7">
      <div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#edf7f4] text-[#0b6a5b]"><Ruler aria-hidden="true" size={23} /></span><div><h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#17372f]">Registre peso e cintura</h2><p className="mt-2 text-sm leading-6 text-[#60766f]">Leva cerca de 2 minutos. Somente você e a equipe responsável verão estes dados fictícios.</p></div></div>
      <details className="mt-5 rounded-xl bg-[#f7faf8] p-4"><summary className={cn('min-h-11 cursor-pointer text-sm font-bold text-[#0b6a5b]', focusRing)}>Ver como medir com consistência</summary><div className="mt-3 text-xs leading-5 text-[#60766f]"><p>Use a mesma balança e condições semelhantes quando possível.</p><p className="mt-2">Para a cintura, siga o ponto e a técnica combinados com seu médico; este mock não define o protocolo clínico final.</p><p className="mt-2">Se não conseguir medir, salve depois ou peça ajuda à equipe.</p></div></details>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><div><FieldLabel htmlFor="pending-weight">Peso em kg</FieldLabel><input id="pending-weight" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="Ex.: 92,4" className={cn('mt-2 min-h-12 w-full rounded-xl border border-[#c9d6d1] px-4 text-base tabular-nums text-[#17372f] placeholder:text-[#60766f]', focusRing)} /></div><div><FieldLabel htmlFor="pending-waist">Cintura em cm</FieldLabel><input id="pending-waist" inputMode="decimal" value={waist} onChange={(event) => setWaist(event.target.value)} placeholder="Ex.: 104,5" className={cn('mt-2 min-h-12 w-full rounded-xl border border-[#c9d6d1] px-4 text-base tabular-nums text-[#17372f] placeholder:text-[#60766f]', focusRing)} /></div></div>
      <button type="button" disabled={!valid} onClick={() => onSave(weight.trim(), waist.trim())} className={cn(primaryButton, 'mt-5')}>Salvar medidas</button>
      {session.measures ? <p className="mt-3 text-xs font-semibold text-[#0b6a5b]">Medidas salvas como autorrelato nesta sessão.</p> : null}
    </article>
  );
}

function PhotoSection({ data, session, onChoosePath, onToggleSlot }: { data: PatientMvpData; session: PatientMvpSessionState; onChoosePath: (choice: 'protocol' | 'alternative') => void; onToggleSlot: (pose: PatientMvpPhotoPose['id']) => void }) {
  const poses: PatientMvpPhotoPose[] = data.scenario === 'filled' ? data.photos.poses : [{ id: 'front', label: 'Frente' }, { id: 'side', label: 'Perfil' }, { id: 'back', label: 'Costas' }];
  const filled = data.scenario === 'filled';
  return (
    <article id="patient-photos" className="scroll-mt-24 rounded-2xl border border-[#d9e5e0] bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#17372f]">Fotos de acompanhamento</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#60766f]">{filled ? `Conjunto recebido em ${data.photos.receivedAt}.` : 'Solicitadas pelo médico para comparar enquadramentos ao longo do tempo; você pode escolher uma alternativa.'}</p></div><Status tone={filled || session.photoSlots.length === 3 ? 'green' : 'amber'}>{filled ? 'Protocolo completo' : 'Solicitação condicional'}</Status></div>
      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">{poses.map((pose) => { const selected = filled || session.photoSlots.includes(pose.id); return <button key={pose.id} type="button" disabled={filled || session.photoChoice !== 'protocol'} aria-pressed={selected} onClick={() => onToggleSlot(pose.id)} className={cn('min-h-32 rounded-xl border p-3 text-center transition-colors disabled:cursor-default', focusRing, selected ? 'border-[#9fc9bd] bg-[#edf7f4] text-[#0b6a5b]' : 'border-dashed border-[#b9d2ca] bg-[#fafcfb] text-[#526a62]')}><span className="mx-auto grid size-12 place-items-center rounded-full bg-white"><UserFocus aria-hidden="true" size={25} /></span><span className="mt-3 block text-xs font-bold">{pose.label}</span><span className="mt-1 block text-[11px]">{selected ? 'Imagem abstrata' : 'Simular envio'}</span></button>; })}</div>
      {!filled ? <><details className="mt-5 rounded-xl bg-[#f7faf8] p-4"><summary className={cn('min-h-11 cursor-pointer text-sm font-bold text-[#0b6a5b]', focusRing)}>Conhecer o protocolo antes de escolher</summary><div className="mt-3 text-xs leading-5 text-[#60766f]"><p>Frente, perfil e costas, no mesmo local, com iluminação, distância, enquadramento e roupa semelhante escolhida por você.</p><p className="mt-2">No MVP, a IA organiza pose, data e completude. Não analisa corpo, gordura, defeitos ou diagnóstico.</p></div></details><div className="mt-4 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => onChoosePath('protocol')} className={session.photoChoice === 'protocol' ? primaryButton : secondaryButton}><Camera aria-hidden="true" size={18} />Quero seguir o protocolo</button><button type="button" onClick={() => onChoosePath('alternative')} className={session.photoChoice === 'alternative' ? primaryButton : secondaryButton}>Prefiro uma alternativa</button></div></> : <p className="mt-5 text-xs leading-5 text-[#60766f]">Placeholders abstratos protegem a dignidade da pessoa no mock. Não há upload, armazenamento ou análise real.</p>}
    </article>
  );
}

type CheckInStep = 'mode' | 'story' | 'energy' | 'sleep' | 'plan' | 'symptom' | 'review';
const checkInSteps: CheckInStep[] = ['mode', 'story', 'energy', 'sleep', 'plan', 'symptom', 'review'];

function summarizePatientText(text: string, symptomAnswer: boolean | null) {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const summary: string[] = [];

  if (/cansad|fadig/.test(normalized)) summary.push('O relato livre menciona cansaço ou fadiga.');
  if (/rotina|constan/.test(normalized)) summary.push('O objetivo relatado inclui melhorar a rotina com constância.');
  if (/fome|apetite/.test(normalized)) summary.push('Houve menção a fome ou apetite no relato livre.');
  if (/enjoo|nause/.test(normalized)) summary.push('Houve menção a enjoo ou náusea; o contexto completo permanece na fonte.');

  const mentionsDiscomfort = /dor|desconfort|enjoo|nause/.test(normalized);
  if (mentionsDiscomfort && symptomAnswer === false) {
    summary.push('O texto menciona desconforto, mas a resposta estruturada foi “não”; confirmar a divergência na fonte.');
  }

  return summary.length > 0
    ? summary.slice(0, 3)
    : ['Relato livre recebido; o conteúdo integral permanece disponível na fonte original.'];
}

export function CheckInDialog({ patient, onClose, onComplete }: { patient: PatientMvpData; onClose: () => void; onComplete: (input: CareCheckInInput) => void | Promise<void> }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const recordingTimer = useRef<number | null>(null);
  const [step, setStep] = useState<CheckInStep>('mode');
  const [mode, setMode] = useState<'voice' | 'text' | null>(null);
  const [response, setResponse] = useState('');
  const [energy, setEnergy] = useState<CareCheckInInput['energy'] | null>(null);
  const [sleepQuality, setSleepQuality] = useState<CareCheckInSleepQuality | null>(null);
  const [planExperience, setPlanExperience] = useState<CareCheckInPlanExperience | null>(null);
  const [newSymptom, setNewSymptom] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [voiceCaptured, setVoiceCaptured] = useState(false);
  const [aiAllowed, setAiAllowed] = useState(true);
  const [announcement, setAnnouncement] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const activeCheckInSteps = useMemo(
    () => patient.scenario === 'filled'
      ? checkInSteps
      : checkInSteps.filter((item) => item !== 'plan'),
    [patient.scenario],
  );
  const stepIndex = activeCheckInSteps.indexOf(step);
  const isReview = step === 'review';
  const aiSummary = useMemo(() => {
    if (!aiAllowed) return [];
    if (patient.scenario === 'filled' && response.trim() === patient.checkIn.originalText) return patient.checkIn.aiSummary;
    return [
      ...summarizePatientText(response, newSymptom),
      energy === null ? null : `Energia informada: ${energy} de 5.`,
      sleepQuality === null
        ? null
        : `Sono informado como ${sleepQuality === 'poor' ? 'ruim' : sleepQuality === 'good' ? 'bom' : 'regular'}.`,
      patient.scenario === 'filled' && planExperience !== null
        ? `Plano: ${planExperience === 'easy' ? 'foi tranquilo' : planExperience === 'difficult' ? 'houve dificuldade' : 'conseguiu em parte'}.`
        : null,
      newSymptom === null
        ? null
        : newSymptom
          ? 'Um sintoma ou desconforto foi relatado e precisa de contexto médico.'
          : 'A pessoa marcou que não percebeu novo sintoma.',
    ].filter((item): item is string => item !== null);
  }, [aiAllowed, energy, newSymptom, patient, planExperience, response, sleepQuality]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled]), input:not([disabled])')];
      if (focusable.length === 0) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => { if (recordingTimer.current !== null) window.clearTimeout(recordingTimer.current); document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handleKeyDown); previous?.focus(); };
  }, [onClose]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const heading = dialogRef.current?.querySelector<HTMLElement>('#patient-checkin-title');
      if (!heading) return;
      heading.setAttribute('tabindex', '-1');
      heading.focus();
      setAnnouncement(heading.textContent ?? 'Nova etapa do check-in.');
    });
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  const startVoiceCapture = () => {
    const simulatedTranscript = patient.scenario === 'filled'
      ? patient.checkIn.originalText
      : 'Quero melhorar minha rotina com constância. Tenho me sentido cansado no fim do dia e quero entender por onde começar sem tentar mudar tudo de uma vez.';
    if (recording) {
      if (recordingTimer.current !== null) window.clearTimeout(recordingTimer.current);
      recordingTimer.current = null;
      setRecording(false);
      setVoiceCaptured(true);
      setResponse(simulatedTranscript);
      setAnnouncement('Gravação demonstrativa interrompida. A transcrição está pronta para revisão.');
      return;
    }
    setRecording(true); setAnnouncement('Gravação demonstrativa iniciada.');
    recordingTimer.current = window.setTimeout(() => {
      setRecording(false); setVoiceCaptured(true);
      setResponse(simulatedTranscript);
      setAnnouncement('Gravação demonstrativa concluída. A transcrição está pronta para revisão.');
    }, 1400);
  };
  const goBack = () => {
    const previous = activeCheckInSteps[Math.max(0, stepIndex - 1)];
    setStep(previous);
  };
  const goNext = () => {
    const next = activeCheckInSteps[Math.min(activeCheckInSteps.length - 1, stepIndex + 1)];
    setStep(next);
  };
  const complete = async () => {
    if (saving || energy === null || sleepQuality === null || newSymptom === null) return;
    const hasVoiceSource = mode === 'voice' && voiceCaptured;
    setSaving(true); setSaveError('');
    try { await onComplete({
      energy,
      sleepQuality,
      newSymptom,
      inputMode: hasVoiceSource ? 'voice' : 'text',
      originalText: response.trim(),
      aiSummary,
      aiAssistanceAllowed: aiAllowed,
      planExperience: patient.scenario === 'filled'
        ? planExperience ?? 'not-applicable'
        : 'not-applicable',
      audioRef: hasVoiceSource ? `audio-demo-${patient.patientId}-${Date.now()}` : null,
      audioDurationSeconds: hasVoiceSource ? 27 : null,
    }); } catch (error) { setSaveError(error instanceof Error ? error.message : 'Não foi possível enviar. Seu relato foi mantido.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#102a24]/65 sm:items-center sm:p-5" role="presentation">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="patient-checkin-title" aria-busy={saving} className="flex max-h-[100dvh] min-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden bg-white text-[#17372f] sm:min-h-0 sm:rounded-2xl">
        {saveError ? <p role="alert" className="bg-red-50 p-4 text-sm text-red-800">{saveError}</p> : null}
        {saving ? <p role="status" className="bg-[#edf7f4] p-3 text-sm">Confirmando o recebimento…</p> : null}
        <header className="border-b border-[#e4ece8] px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3"><button type="button" onClick={stepIndex > 0 ? goBack : onClose} className={cn('grid size-11 place-items-center rounded-xl text-[#526a62] hover:bg-[#edf7f4]', focusRing)} aria-label={stepIndex > 0 ? 'Voltar uma etapa' : 'Fechar check-in'}><ArrowLeft aria-hidden="true" size={21} /></button><div className="min-w-0 flex-1 text-center"><p className="text-xs font-bold text-[#60766f]">{isReview ? 'Revisão final' : `Etapa ${stepIndex + 1} de ${activeCheckInSteps.length}`}</p><div className="mx-auto mt-2 h-1.5 max-w-48 overflow-hidden rounded-full bg-[#e3ebe7]"><div className="h-full rounded-full bg-[#0b7b68] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((stepIndex + 1) / activeCheckInSteps.length) * 100}%` }} /></div></div><button type="button" onClick={onClose} className={cn('min-h-11 rounded-xl px-3 text-sm font-bold text-[#526a62] hover:bg-[#edf7f4]', focusRing)}>Fechar</button></div>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
          {step === 'mode' ? <><h2 id="patient-checkin-title" className="text-3xl font-semibold tracking-[-0.03em]">Como prefere contar?</h2><p className="mt-2 text-base leading-7 text-[#526a62]">Voz e texto levam ao mesmo lugar. Você sempre revisa antes de enviar.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{([['voice', 'Quero falar', 'Gravação simulada com transcrição editável'], ['text', 'Quero escrever', 'Campo de texto simples e editável']] as const).map(([value, title, detail]) => { const Icon = value === 'voice' ? Microphone : FileText; return <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={cn('min-h-32 rounded-xl border p-5 text-left transition-colors', focusRing, mode === value ? 'border-[#0b7b68] bg-[#edf7f4]' : 'border-[#d9e5e0] hover:bg-[#f7faf8]')}><Icon aria-hidden="true" size={25} className="text-[#0b6a5b]" /><strong className="mt-4 block text-lg">{title}</strong><span className="mt-1 block text-sm leading-6 text-[#526a62]">{detail}</span></button>; })}</div><label className="mt-6 flex min-h-12 items-start gap-3 rounded-xl bg-[#f6f9fe] p-4 text-sm leading-6 text-[#405675]"><input type="checkbox" checked={aiAllowed} onChange={(event) => setAiAllowed(event.target.checked)} className="mt-1 size-4 accent-[#0b7b68]" /><span><strong className="block text-[#071a3a]">Permitir organização assistida</strong>Opcional. Sem ela, seu relato original ainda pode ser enviado ao médico.</span></label></> : null}
          {step === 'story' ? <><h2 id="patient-checkin-title" className="text-3xl font-semibold tracking-[-0.03em]">Como você está desde a última vez?</h2><p className="mt-2 text-base leading-7 text-[#60766f]">Fale do seu jeito. Mudanças em apetite, sono, disposição, rotina ou qualquer outro contexto podem ajudar a conversa.</p>{mode === 'voice' ? <div className="mt-7 rounded-xl bg-[#edf7f4] p-5 text-center"><button type="button" onClick={startVoiceCapture} className={cn(recording ? 'mx-auto inline-flex min-h-14 items-center gap-3 rounded-xl bg-[#9c453f] px-5 text-sm font-bold text-white' : primaryButton, focusRing)}>{recording ? <><Stop aria-hidden="true" size={20} weight="fill" />Parar gravação demonstrativa</> : <><Microphone aria-hidden="true" size={20} />{voiceCaptured ? 'Gravar novamente' : 'Iniciar gravação simulada'}</>}</button><p className="mt-3 text-xs leading-5 text-[#526a62]">Pode falar do seu jeito. Ao usar a simulação, a referência do áudio fica ligada à transcrição editável.</p></div> : null}<div className="mt-5"><FieldLabel htmlFor="checkin-original-response">{mode === 'voice' ? 'Revise a transcrição' : 'Sua resposta'}</FieldLabel><textarea id="checkin-original-response" value={response} onChange={(event) => setResponse(event.target.value)} rows={7} placeholder={mode ? 'Conte como têm sido estes últimos dias' : 'Volte e escolha voz ou texto'} disabled={!mode || recording} className={cn('mt-2 w-full resize-y rounded-xl border border-[#c9d6d1] px-4 py-3 text-base leading-7 text-[#17372f] placeholder:text-[#60766f] disabled:bg-[#f1f5f3]', focusRing)} /></div></> : null}
          {step === 'energy' ? <QuestionChoice title="Como está sua energia?" description="Escolha de 1 a 5. Este número é um autorrelato, não uma avaliação clínica.">{([1, 2, 3, 4, 5] as const).map((value) => <button key={value} type="button" aria-pressed={energy === value} onClick={() => setEnergy(value)} className={cn('min-h-14 rounded-xl border text-base font-bold', focusRing, energy === value ? 'border-[#0b7b68] bg-[#0b7b68] text-white' : 'border-[#d9e5e0] bg-white text-[#526a62]')}>{value}</button>)}</QuestionChoice> : null}
          {step === 'sleep' ? <QuestionChoice title="Como foi seu sono?" description="Pense nos últimos três dias.">{([['poor', 'Ruim'], ['regular', 'Regular'], ['good', 'Bom']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={sleepQuality === value} onClick={() => setSleepQuality(value)} className={cn('min-h-14 rounded-xl border px-3 text-sm font-bold', focusRing, sleepQuality === value ? 'border-[#0b7b68] bg-[#edf7f4] text-[#0b6a5b]' : 'border-[#d9e5e0] text-[#526a62]')}>{label}</button>)}</QuestionChoice> : null}
          {step === 'plan' ? <QuestionChoice title="Como foi seguir o plano?" description="Não existe resposta certa. Contexto ajuda mais que perfeição.">{([['easy', 'Foi tranquilo'], ['partial', 'Consegui em parte'], ['difficult', 'Tive dificuldade']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={planExperience === value} onClick={() => setPlanExperience(value)} className={cn('min-h-14 rounded-xl border px-3 text-sm font-bold', focusRing, planExperience === value ? 'border-[#0b7b68] bg-[#edf7f4] text-[#0b6a5b]' : 'border-[#d9e5e0] text-[#526a62]')}>{label}</button>)}</QuestionChoice> : null}
          {step === 'symptom' ? <QuestionChoice title="Percebeu algum sintoma ou desconforto?" description="A marcação não define gravidade nem urgência.">{([['no', 'Não percebi'], ['yes', 'Sim, contei no relato']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={newSymptom === (value === 'yes')} onClick={() => setNewSymptom(value === 'yes')} className={cn('min-h-14 rounded-xl border px-3 text-sm font-bold', focusRing, newSymptom === (value === 'yes') ? 'border-[#0b7b68] bg-[#edf7f4] text-[#0b6a5b]' : 'border-[#d9e5e0] text-[#526a62]')}>{label}</button>)}</QuestionChoice> : null}
          {step === 'review' ? <><h2 id="patient-checkin-title" className="text-3xl font-semibold tracking-[-0.03em]">Confira antes de enviar</h2><p className="mt-2 text-base leading-7 text-[#60766f]">Sua fonte e a organização assistida são registros separados.</p><section className="mt-6 rounded-xl border border-[#d9e5e0] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">Sua resposta original</strong><Status tone="gray">{mode === 'voice' && voiceCaptured ? 'Transcrição editável · áudio fictício preservado' : 'Texto do paciente'}</Status></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#405d54]">{response.trim()}</p><button type="button" onClick={() => setStep('story')} className={cn('mt-3 min-h-11 text-sm font-bold text-[#0b6a5b] underline underline-offset-4', focusRing)}>Editar resposta</button></section>{aiAllowed ? <section className="mt-4 rounded-xl bg-[#f6f9fe] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-[#071a3a]">Entendi assim</strong><Status tone="blue">Organizado pela IA</Status></div><ul className="mt-3 space-y-2">{aiSummary.map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-[#405675]"><span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[#124da0]" />{item}</li>)}</ul><p className="mt-3 text-xs leading-5 text-[#61718a]">Rascunho sem diagnóstico, prescrição ou decisão. Seu médico receberá as duas camadas.</p></section> : <section className="mt-4 rounded-xl bg-[#f6f9fe] p-4"><strong className="text-sm text-[#071a3a]">Envio manual</strong><p className="mt-2 text-sm leading-6 text-[#405675]">A organização por IA foi desativada. Somente sua resposta original será enviada.</p></section>}</> : null}
        </div>
        <footer className="border-t border-[#e4ece8] bg-white px-5 py-4 sm:px-8"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-[#60766f]">Não monitorado em tempo real. Em urgência, procure o serviço de emergência da sua região.</p>{isReview ? <button type="button" onClick={complete} disabled={!response.trim() || energy === null || sleepQuality === null || newSymptom === null || (patient.scenario === 'filled' && planExperience === null)} className={primaryButton}><ShieldCheck aria-hidden="true" size={18} />Confirmar e enviar</button> : <button type="button" onClick={goNext} disabled={(step === 'mode' && !mode) || (step === 'story' && !response.trim()) || (step === 'energy' && energy === null) || (step === 'sleep' && sleepQuality === null) || (step === 'plan' && planExperience === null) || (step === 'symptom' && newSymptom === null) || recording} className={primaryButton}>Continuar<ArrowRight aria-hidden="true" size={18} /></button>}</div></footer>
        <p className="sr-only" aria-live="polite">{announcement}</p>
      </div>
    </div>
  );
}

function QuestionChoice({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <><h2 id="patient-checkin-title" className="text-3xl font-semibold tracking-[-0.03em]">{title}</h2><p className="mt-2 text-base leading-7 text-[#60766f]">{description}</p><div className="mt-7 grid gap-2 sm:grid-cols-3">{children}</div></>;
}
