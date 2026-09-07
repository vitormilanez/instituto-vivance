import { getCurrentUser } from '../../../lib/auth';
import { carePerson } from '../../../lib/care-directory';
import { RegisteredCare } from '../../../components/registered-care';
import { notFound } from 'next/navigation';
import DoctorWorkspace from '../../../components/doctor';
import { getDemoPatient } from '../../../components/demo-routes';

export default async function DoctorPatientPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const user = await getCurrentUser();
  const person = user ? await carePerson(user, patientId) : null;
  if (!user || !person) notFound();
  if (person.relationshipId !== 'care-dr-guilherme-marina') return <div className="mx-auto max-w-6xl p-5 lg:ml-[240px] lg:p-8"><RegisteredCare person={person} user={user} /></div>;
  if (!getDemoPatient(patientId)) notFound();

  return <DoctorWorkspace initialView="Pacientes" patientId={patientId} patientDetail />;
}
