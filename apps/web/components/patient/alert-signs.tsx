import { alertSignsReady, type AlertSignsContent } from "@/modules/workspace/alert-signs";
import { Icon } from "./icons";

// "Sentiu algo forte ou diferente?" — estática, sem triagem. Urgência não passa
// pelo app: a primeira ação é sempre ligar.
export function PatientAlertSigns({ content }: { content: AlertSignsContent }) {
  const ready = alertSignsReady(content);
  return (
    <div className="pv-stack">
      <div className="pv-alert-hero">
        <span className="pv-clear-icon is-gold" aria-hidden="true"><Icon name="alert" /></span>
        <h2>Sentiu algo forte ou diferente?</h2>
        <p className="pv-lead">
          O app não é usado para urgências. Se for grave, não espere resposta por aqui.
        </p>
      </div>
      <a className="pv-call" href="tel:192">
        <span><Icon name="phone" /></span>
        <span>
          <strong>Ligar 192 · SAMU</strong>
          <small>Atendimento de urgência, 24 horas</small>
        </span>
      </a>
      {content.clinicPhone && (
        <a className="pv-call is-light" href={`tel:${content.clinicPhone.tel}`}>
          <span><Icon name="phone" /></span>
          <span>
            <strong>Falar com a clínica</strong>
            <small>
              {content.clinicPhone.display}
              {content.clinicPhone.hours ? ` · ${content.clinicPhone.hours}` : ""}
            </small>
          </span>
        </a>
      )}
      {ready ? (
        <section className="pv-card" aria-labelledby="pv-signs-title">
          <h3 id="pv-signs-title" className="pv-eyebrow">Procure atendimento imediato se tiver</h3>
          <ol className="pv-signs">
            {content.signs.map((sign) => (
              <li key={sign}>{sign}</li>
            ))}
          </ol>
          <p className="pv-muted">
            Orientação aprovada por {content.approvedBy} em {content.approvedOn}.
          </p>
        </section>
      ) : (
        <p className="pv-notice">
          A lista de sinais de alerta do seu médico está em revisão e aparece aqui assim
          que for aprovada. Na dúvida, ligue.
        </p>
      )}
    </div>
  );
}
