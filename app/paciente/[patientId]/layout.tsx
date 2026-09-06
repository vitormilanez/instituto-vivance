import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { carePerson } from '../../lib/care-directory';
import { AccountShell } from '../../components/admin/admin-workspace';
import { WorkspaceShell } from '../../components/workspace-shell';
import { getCurrentUser, homeForUser } from '../../lib/auth';

export const dynamic = 'force-dynamic';

export default async function PatientLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/');
  if (user.role !== 'patient') redirect(homeForUser(user));
  if (user.patientId !== patientId) redirect(homeForUser(user));

  const person = await carePerson(user, patientId);
  if (person?.relationshipId !== 'care-dr-guilherme-marina') return <AccountShell user={user}>{children}</AccountShell>;
  return <WorkspaceShell role="patient" patientId={patientId}>{children}</WorkspaceShell>;
}
