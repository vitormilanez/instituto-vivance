import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentUser } from '../../../lib/auth';
import { carePerson } from '../../../lib/care-directory';
export default async function PatientScope({ children, params }: { children: ReactNode; params: Promise<{ patientId: string }> }) {
  const user = await getCurrentUser(); if (!user) redirect('/');
  const { patientId } = await params;
  if (user.role !== 'professional' || !await carePerson(user, patientId)) notFound();
  return children;
}
