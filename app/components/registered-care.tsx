'use client';
import { NavigationLink as Link } from './shared';
import { useState } from 'react';
import type { CarePerson } from '../lib/care-directory';
import type { AppUser } from '../lib/auth';
import { getDefaultEncounterId } from './demo-routes';
import { CareSubmissionComposer } from './care-submission-composer';
import { CareSubmissionInbox } from './care-submission-inbox';
import { usePersistentConversation } from './use-persistent-conversation';
import { CareSyncStatus, useSharedCare } from './shared-care-context';
import { cycleKey } from '../lib/care-cycle-contract';
import s from './admin/admin.module.css';
export function CareDirectory({ people, title = 'Pacientes' }: { people: CarePerson[]; title?: string }) {
  const [search, setSearch] = useState('');
  return <main id="main-content" className={s.shell}><div className={s.heading}><div><h1>{title}</h1><p className={s.subtle}>Pacientes vinculados ao seu acompanhamento.</p></div></div><section className={s.panel}><label>Buscar paciente<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome do paciente" /></label><div className={s.rows}>{people.filter(person => person.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).map(person => <div className={s.row} key={person.id}><div><strong>{person.name}</strong><p className={s.subtle}>{person.email || 'Sem e-mail cadastrado'}</p></div><Link className={s.button} href={`/medico/pacientes/${person.id}`}>Abrir acompanhamento</Link></div>)}</div>{!people.length && <p className={s.empty}>Você ainda não tem pacientes vinculados. A administração pode organizar seus vínculos.</p>}{people.length > 0 && !people.some(person => person.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))) && <p className={s.empty}>Nenhum paciente encontrado.</p>}</section></main>;
}
export function RegisteredCare({ person, user }: { person: CarePerson; user: AppUser }) {
  const doctor = user.role === 'professional';
  const encounterId = getDefaultEncounterId(person.id);
  const conversation = usePersistentConversation({ patientId: person.id, encounterId, sender: doctor ? 'doctor' : 'patient', enabled: Boolean(person.relationshipId) });
  const [message, setMessage] = useState(''), [sendError, setSendError] = useState('');
  const { cycles } = useSharedCare();
  const published = cycles[cycleKey(person.id, encounterId)]?.care.carePlans.filter(plan => plan.status === 'published').at(-1);
  return <main id="main-content" className={s.shell}>{doctor && <Link href="/medico/pacientes" className={s.back}>Voltar para pacientes</Link>}<div className={s.heading}><div><h1>{doctor ? person.name : `Olá, ${person.name.split(' ')[0]}`}</h1><p className={s.subtle}>{person.doctorName ? `Médico responsável: ${person.doctorName}` : 'Seu cadastro está pronto. A administração ainda vai vincular seu médico.'}</p></div></div>
    {!person.relationshipId ? <section className={s.panel}><h2>Aguardando início do acompanhamento</h2><p className={`${s.subtle} mt-3`}>As conversas e os envios ficam disponíveis quando um médico for vinculado ao seu cadastro.</p></section> : <>
      <CareSyncStatus patientId={person.id} encounterId={encounterId} />
      {published && <section className={s.panel}><h2>{published.title}</h2><p className={s.subtle}>{published.objective}</p>{published.actions.filter(action => action.active).map(action => <p key={action.id} className={s.row}>{action.title} · {action.cadence}</p>)}</section>}
      {!doctor && <CareSubmissionComposer patientId={person.id} />}
      <CareSubmissionInbox patientId={person.id} encounterId={encounterId} doctor={doctor} />
      <section className={`${s.panel} mt-6`}><h2>Conversa com {doctor ? person.name : person.doctorName}</h2><p className={`${s.subtle} mt-2`}>As mensagens ficam neste acompanhamento. Não há monitoramento contínuo deste canal.</p>
        {conversation.loading ? <p role="status" className={s.empty}>Carregando conversa…</p> : !conversation.messages.length ? <p className={s.empty}>A conversa ainda não começou.</p> : <div className={s.rows}>{conversation.messages.map(item => <article key={item.id} className={s.history}><strong>{item.sender === 'doctor' ? person.doctorName : person.name}</strong><p className="whitespace-pre-wrap break-words">{item.body}</p><small className={s.subtle}>{item.sentAt}</small></article>)}</div>}
        {(sendError || conversation.error) && <p role="alert" className={`${s.notice} ${s.error}`}>{sendError || conversation.error}</p>}
        <form className={`${s.form} mt-5`} onSubmit={event => { event.preventDefault(); setSendError(''); void conversation.sendMessage({ body: message, context: 'general' }).then(() => setMessage('')).catch(cause => setSendError(cause.message)); }}><label>Mensagem<textarea value={message} onChange={event => setMessage(event.target.value)} required minLength={2} maxLength={600} /></label><button className={s.button} disabled={conversation.sending || !message.trim()}>{conversation.sending ? 'Enviando…' : 'Enviar mensagem'}</button></form>
      </section></>}
  </main>;
}
