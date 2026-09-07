import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, homeForUser } from '../lib/auth';
export const dynamic = 'force-dynamic';
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/');
  if (user.role !== 'admin') redirect(homeForUser(user));
  return children;
}
