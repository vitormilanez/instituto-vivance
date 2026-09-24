import Link from "next/link";
import type { ReactNode } from "react";
import { Video, ArrowLeft } from "lucide-react";
import { TeleconsultationCallAccess } from "./teleconsultation-call-access";

export function TeleconsultationWorkspace({
  tenantId,
  encounterId,
  appointmentId,
  appointmentLabel,
  agendaHref,
  patientName,
  url,
  audit,
  editable,
  unavailable,
  children,
  context,
}: {
  tenantId: string;
  encounterId: string;
  appointmentId: string;
  appointmentLabel: string;
  agendaHref: string;
  patientName: string;
  url: string | null;
  audit: { updated_at: string; updated_by: string; updated_by_name?: string | null } | null;
  editable: boolean;
  unavailable?: boolean;
  children: ReactNode;
  context: ReactNode;
}) {
  return (
    <div className="teleconsultation-workspace">
      <header className="teleconsultation-toolbar">
        {/* A barra do topo já diz "Modo atendimento"; o título fica para leitores de tela. */}
        <h1 className="sr-only">Modo atendimento · {patientName}</h1>
        <Link
          className="back-link"
          href={`/clinicas/${tenantId}/atendimentos/${encounterId}?etapa=consulta`}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Voltar à visão completa
        </Link>
      </header>
      <div className="teleconsultation-layout">
        <aside
          className="teleconsultation-context"
          aria-label="Chamada e contexto do paciente"
        >
          <section
            className="teleconsultation-call-card"
            aria-label="Acesso à chamada"
          >
            <div className="teleconsultation-call-stage">
              <Video size={32} aria-hidden="true" />
              <h2>{patientName}</h2>
              <p>
                {url
                  ? "Converse pelo Google Meet e mantenha seu registro aberto aqui."
                  : "Tudo o que você precisa para conduzir e registrar a consulta."}
              </p>
            </div>
            <TeleconsultationCallAccess
              key={audit?.updated_at ?? "no-configuration"}
              tenantId={tenantId}
              appointmentId={appointmentId}
              patientName={patientName}
              agendaHref={agendaHref}
              appointmentLabel={appointmentLabel}
              initialUrl={url}
              initialAudit={audit}
              editable={editable}
              unavailable={Boolean(unavailable)}
            />
            {url && (
              <details>
                <summary>Manter o vídeo visível enquanto escrevo</summary>
                <p>
                  No Google Meet, abra o menu de três pontos e escolha “Abrir
                  picture-in-picture”. No Chrome para computador, o vídeo pode
                  ficar sobre esta tela enquanto você escreve.
                </p>
                <p>
                  Câmera, microfone e encerramento são controlados no Meet. Sair
                  da chamada não finaliza este registro.
                </p>
                <a
                  href="https://support.google.com/meet/answer/13665919?hl=pt-br"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-external-call
                >
                  Ver instruções do Google Meet
                </a>
              </details>
            )}
          </section>
          {context}
        </aside>
        <div className="teleconsultation-record">{children}</div>
      </div>
    </div>
  );
}
