import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import { careDirectory } from '../../lib/care-directory';
import { CareDirectory } from '../../components/registered-care';
export default async function DoctorPatientsPage() {
  const user = await getCurrentUser(); if (!user) redirect('/');
  return <div className="mx-auto max-w-6xl p-5 lg:ml-[240px] lg:p-8"><CareDirectory people={await careDirectory(user)} /></div>;
}
