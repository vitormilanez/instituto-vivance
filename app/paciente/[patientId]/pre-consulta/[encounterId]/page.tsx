import { getCurrentUser } from '../../../../lib/auth';
import { carePerson } from '../../../../lib/care-directory';
import { RegisteredCare } from '../../../../components/registered-care';
import { notFound } from 'next/navigation';
import PatientWorkspace from '../../../../components/patient';
import { encounterBelongsToPatient } from '../../../../components/demo-routes';

export default async function PatientPreConsultationPage({
  params,
}: {
  params: Promise<{ patientId: string; encounterId: string }>;
}) {
  const { patientId, encounterId } = await params;
  if (!encounterBelongsToPatient(patientId, encounterId)) notFound();

  const user = await getCurrentUser();
  const person = user ? await carePerson(user, patientId) : null;
  if (user && person && person.relationshipId !== 'care-dr-guilherme-marina') return <RegisteredCare person={person} user={user} />;
  return (
    <PatientWorkspace
      patientId={patientId}
      encounterId={encounterId}
      initialView="Consultas"
      preVisitRouteOpen
    />
  );
}
