import { getCurrentUser } from '../../../lib/auth';
import { carePerson } from '../../../lib/care-directory';
import { RegisteredCare } from '../../../components/registered-care';
import { notFound } from 'next/navigation';
import PatientWorkspace from '../../../components/patient-mvp';
import { getDefaultEncounterId, getPatientView } from '../../../components/demo-routes';

export default async function PatientSectionPage({
  params,
}: {
  params: Promise<{ patientId: string; section: string }>;
}) {
  const { patientId, section } = await params;
  const view = getPatientView(section);
  if (!view || view === 'Hoje') notFound();

  const user = await getCurrentUser();
  const person = user ? await carePerson(user, patientId) : null;
  if (user && person && person.relationshipId !== 'care-dr-guilherme-marina') return <RegisteredCare person={person} user={user} />;
  return (
    <PatientWorkspace
      patientId={patientId}
      encounterId={getDefaultEncounterId(patientId)}
      initialView={view}
    />
  );
}
