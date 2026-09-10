import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { listPatients } from '@/modules/patients/service';
import { listAudit } from '@/modules/audit/service';
import { AccessError, roleLabels } from '@/modules/identity/service';
import { InputError, pageNumber } from '@/lib/validation';
import { Header } from '@/components/header';
import { PatientForm } from '@/components/forms';
export const dynamic = 'force-dynamic';
export default async function Directory({ params, searchParams }: { params: Promise<{ tenantId: string }>; searchParams: Promise<{ page?: string }> }) {
  const { tenantId } = await params;
  const load = async () => {
    const page = pageNumber((await searchParams).page);
    return { ...await listPatients(tenantId, page), page };
  };
  const context = await load().catch(error => {
    if (error instanceof AccessError && error.status === 401) redirect('/');
    if (error instanceof AccessError || error instanceof InputError) notFound();
    throw error;
  });
  const audit = context.clinic.role === 'admin' ? await listAudit(tenantId) : [];
  return <><Header /><main id="conteudo" className="container"><p className="eyebrow">{context.clinic.name} · {roleLabels[context.clinic.role]}</p><h1>Pacientes</h1><p>Cadastro básico da clínica. {context.count} {context.count === 1 ? 'pessoa cadastrada' : 'pessoas cadastradas'}.</p>
    <div className="grid"><section className="panel"><h2>Cadastros</h2>{context.patients.length === 0
      ? <div className="empty"><h2>{context.count === 0 ? 'Nenhum paciente cadastrado' : 'Nenhum cadastro nesta página'}</h2><p>{context.count === 0 ? 'Os pacientes aparecerão aqui após o primeiro cadastro autorizado. Nenhum dado de demonstração é carregado.' : 'Volte para a página anterior.'}</p></div>
      : <ul className="list">{context.patients.map(p => <li key={p.id}><strong>{p.display_name}</strong><small>{p.birth_date ? `Nascimento: ${String(p.birth_date).split('-').reverse().join('/')}` : 'Nascimento não informado'}</small></li>)}</ul>}
      <nav className="pagination" aria-label="Paginação">{context.page > 1 ? <Link href={`?page=${context.page - 1}`}>Anterior</Link> : <span />}<small>Página {context.page}</small>{context.page * 25 < context.count ? <Link href={`?page=${context.page + 1}`}>Próxima</Link> : <span />}</nav>
    </section><aside className="panel"><h2>Novo paciente</h2><p>Cadastre somente pessoas com autorização para atendimento nesta clínica.</p><PatientForm tenantId={tenantId} /></aside></div>
    {context.clinic.role === 'admin' && <details className="panel audit"><summary>Histórico de alterações</summary><p>Últimas 50 alterações. Sem conteúdo clínico ou cópia dos dados pessoais.</p>{audit.length === 0 ? <p>Nenhuma alteração registrada.</p> : <ul className="list">{audit.map(e => <li key={e.id}><strong>{e.action === 'insert' ? 'Cadastro' : 'Atualização'} · {({ patients: 'Paciente', tenants: 'Clínica', memberships: 'Vínculo de acesso' } as Record<string,string>)[e.entity_type] ?? 'Registro'}</strong><small>{new Date(e.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · Responsável: {e.actor_user_id ?? 'Configuração administrativa'}</small><code>Registro: {e.entity_id}</code></li>)}</ul>}</details>}
  </main></>;
}
