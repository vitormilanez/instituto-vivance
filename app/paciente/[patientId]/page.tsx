import { getCurrentUser } from '../../lib/auth';
import { carePerson } from '../../lib/care-directory';
import { RegisteredCare } from '../../components/registered-care';
import PatientWorkspace from '../../components/patient-mvp';
import { getDefaultEncounterId } from '../../components/demo-routes';

export default async function PatientHomePage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const user = await getCurrentUser();
  const person = user ? await carePerson(user, patientId) : null;
  if (user && person && person.relationshipId !== 'care-dr-guilherme-marina') return <RegisteredCare person={person} user={user} />;
  return (
    <PatientWorkspace
      patientId={patientId}
      encounterId={getDefaultEncounterId(patientId)}
      initialView="Hoje"
    />
  );
}
