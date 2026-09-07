import { redirect } from 'next/navigation';
import AdminWorkspace from '../components/admin/admin-workspace';
import { getCurrentUser } from '../lib/auth';
import { readAdmin } from '../lib/admin';
export default async function AdminPage() {
  const actor = await getCurrentUser(); if (!actor) redirect('/');
  return <AdminWorkspace actor={actor} initial={await readAdmin(actor)} />;
}
