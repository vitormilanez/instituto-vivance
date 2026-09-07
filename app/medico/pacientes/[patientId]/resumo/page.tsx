import { getCurrentUser } from '../../../../lib/auth';
import { carePerson } from '../../../../lib/care-directory';
import { RegisteredCare } from '../../../../components/registered-care';
import { notFound } from 'next/navigation';
import { DoctorPatientResultsSummary } from '../../../../components/doctor-patient-results-summary';
import { getDemoPatient } from '../../../../components/demo-routes';

export default async function DoctorPatientResultsSummaryPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const user = await getCurrentUser();
  const person = user ? await carePerson(user, patientId) : null;
  if (!user || !person) notFound();
  if (person.relationshipId !== 'care-dr-guilherme-marina') return <div className="mx-auto max-w-6xl p-5 lg:ml-[240px] lg:p-8"><RegisteredCare person={person} user={user} /></div>;
  const patient = getDemoPatient(patientId);
  if (!patient) notFound();

  return <DoctorPatientResultsSummary patientId={patient.id} patientName={patient.name} />;
}
