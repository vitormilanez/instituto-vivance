import { Brand } from "@/components/brand";
import { PatientInvitationEntry } from "@/components/patient-invitation-entry";

export default function PatientInvitationPage() {
  return (
    <main id="conteudo" className="container" style={{ maxWidth: 520 }}>
      <Brand />
      <section className="panel" style={{ marginTop: 32 }}>
        <p className="eyebrow">Bem-vindo à Vivance</p>
        <PatientInvitationEntry />
      </section>
    </main>
  );
}
