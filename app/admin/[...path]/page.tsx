import { notFound, redirect } from 'next/navigation';
import AdminWorkspace from '../../components/admin/admin-workspace';
import { getCurrentUser } from '../../lib/auth';
import { readAdmin } from '../../lib/admin';
export default async function AdminSection({ params, searchParams }: { params: Promise<{ path: string[] }>; searchParams: Promise<{ medico?: string; filtro?: string }> }) {
  const { path } = await params, query = await searchParams;
  if (!['pacientes', 'medicos', 'acessos', 'historico', 'configuracoes'].includes(path[0]) || path.length > 2) notFound();
  const actor = await getCurrentUser(); if (!actor) redirect('/');
  const initial = await readAdmin(actor);
  if (path[1] && (['historico', 'configuracoes'].includes(path[0]) || path[1] !== 'novo' && !initial.users.some(user => user.id === path[1]))) notFound();
  if (path[1] && path[1] !== 'novo' && path[0] !== 'acessos') {
    const expected = path[0] === 'pacientes' ? 'patient' : 'professional';
    if (!initial.users.some(user => user.id === path[1] && user.role === expected)) notFound();
  }
  return <AdminWorkspace actor={actor} initial={initial} path={path} presetDoctor={query.medico} initialFilter={query.filtro === 'sem-medico' ? 'unlinked' : 'all'} />;
}
