import { Brand } from "@/components/brand";
import { PatientInvitationEntry } from "@/components/patient-invitation-entry";

export default function PatientInvitationPage() {
  return (
    <main id="conteudo" className="container invitation-page" style={{ maxWidth: 560 }}>
      <Brand />
      <PatientInvitationEntry />
    </main>
  );
}
