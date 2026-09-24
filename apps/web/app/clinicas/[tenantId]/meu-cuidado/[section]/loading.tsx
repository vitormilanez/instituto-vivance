import "@/app/patient.css";

// Enquanto a tela do paciente carrega: a forma da página, nunca números ou
// registros de exemplo.
export default function Loading() {
  return (
    <div className="pv">
      <main id="conteudo" className="pv-main">
        <div className="pv-loading" aria-busy="true">
          <p role="status" className="pv-lead">Carregando suas informações…</p>
          <div className="pv-skeleton is-title" />
          <div className="pv-skeleton is-hero" />
          <div className="pv-skeleton is-row" />
          <div className="pv-skeleton is-row" />
        </div>
      </main>
    </div>
  );
}
