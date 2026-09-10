import Link from 'next/link';
import { redirect } from 'next/navigation';
import { clinics, AccessError, roleLabels } from '@/modules/identity/service';
import { Header } from '@/components/header';
export const dynamic = 'force-dynamic';
export default async function Clinics() {
  const context = await clinics().catch(error => { if (error instanceof AccessError && error.status === 401) redirect('/'); throw error; });
  return <><Header /><main id="conteudo" className="container"><p className="eyebrow">Seu espaço de trabalho</p><h1>Minhas clínicas</h1><p>Escolha a clínica para acessar os cadastros autorizados.</p>
    {context.clinics.length === 0 ? <section className="panel empty"><h2>Aguardando liberação de acesso</h2><p>Sua conta ainda não possui vínculo ativo com uma clínica. Solicite a liberação ao administrador.</p></section>
    : <ul className="clinic-list">{context.clinics.map(c => <li key={c.id} className="panel">{c.role === 'patient'
      ? <><h2>{c.name}</h2><p>A área do paciente ainda não está disponível nesta versão.</p></>
      : <Link href={`/clinicas/${c.id}`}><div><h2>{c.name}</h2><small>{roleLabels[c.role]}</small></div><span aria-hidden="true">→</span></Link>}</li>)}</ul>}
    <p className="notice">Versão inicial: cadastros e histórico de alterações. Consultas, prontuário, documentos e IA ainda não estão disponíveis.</p>
  </main></>;
}
