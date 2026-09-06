import { getCurrentUser } from '../../lib/auth';
import { careDirectory } from '../../lib/care-directory';
import { CareDirectory } from '../../components/registered-care';
import DoctorWorkspace from '../../components/doctor';

export default async function DoctorAgendaPage() {
  const user = await getCurrentUser();
  if (user && user.id !== 'usr-dr-guilherme') return <div className="mx-auto max-w-6xl p-5 lg:ml-[240px] lg:p-8"><CareDirectory people={await careDirectory(user)} /></div>;
  return <DoctorWorkspace initialView="Agenda" />;
}
