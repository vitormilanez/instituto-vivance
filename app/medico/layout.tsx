import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { WorkspaceShell } from '../components/workspace-shell';
import { getCurrentUser, homeForUser } from '../lib/auth';

export const dynamic = 'force-dynamic';

export default async function DoctorLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/');
  if (user.role !== 'professional') redirect(homeForUser(user));

  return <WorkspaceShell role="doctor" displayName={user.displayName} demo={user.id === 'usr-dr-guilherme'}>{children}</WorkspaceShell>;
}
