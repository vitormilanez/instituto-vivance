import Image from "next/image";

export function LandingFutureFeatures() {
  return (
    <>
      <section
        className="section future-meal-section"
        id="alimentacao"
        aria-labelledby="future-meal-title"
      >
        <div className="container future-feature-grid">
          <div className="future-feature-copy">
            <p className="eyebrow future-eyebrow">A CAMINHO • EM BREVE</p>
            <h2 id="future-meal-title">Seu prato, conectado ao seu plano.</h2>
            <p className="section-lead">
              Você poderá fotografar seu prato e conferir como os alimentos e as
              porções se relacionam com o seu plano alimentar.
            </p>
            <p className="future-feature-detail">
              Você confirmará ingredientes e quantidades antes de uma análise
              aproximada que complementará o plano e a orientação do
              profissional.
            </p>
          </div>

          <div
            className="meal-preview"
            aria-label="Exemplo ilustrativo de comparação de refeição"
          >
            <div className="meal-photo-frame">
              <Image
                src="/brand/meal-preview.png"
                alt="Prato com alimentos variados, em imagem ilustrativa"
                fill
                sizes="(max-width: 760px) calc(100vw - 48px), 480px"
              />
              <span className="meal-photo-label meal-label-vegetais">
                Vegetais
              </span>
              <span className="meal-photo-label meal-label-proteina">
                Proteína
              </span>
              <span className="meal-photo-label meal-label-carboidrato">
                Carboidrato
              </span>
            </div>
            <div className="meal-compare-card">
              <div className="meal-compare-heading">
                <span>PLANO ILUSTRATIVO</span>
                <strong>Proteína + cereal + vegetais</strong>
              </div>
              <div className="meal-compare-row">
                <span>Composição do prato</span>
                <strong>Compatível no exemplo</strong>
              </div>
              <div className="meal-compare-row">
                <span>Porções</span>
                <strong>Confirmar quantidades</strong>
              </div>
              <p>Você revisará as informações antes de compartilhar.</p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="section future-signals-section"
        id="sinais"
        aria-labelledby="future-signals-title"
      >
        <div className="container future-signals-grid">
          <div className="signals-showcase">
            <div className="signals-showcase-topline">
              <span>LEITURA ILUSTRATIVA</span>
              <span>Com sua permissão</span>
            </div>
            <div className="signals-device-image">
              <Image
                src="/brand/health-rings-reference.png"
                alt="Dois anéis de saúde em imagem ilustrativa"
                fill
                sizes="(max-width: 760px) calc(100vw - 72px), 260px"
              />
            </div>
            <div className="signals-connection-flow" aria-hidden="true">
              <span>Seu app de saúde</span>
              <i>
                <svg viewBox="0 0 24 24">
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
                </svg>
              </i>
              <strong>Vivance</strong>
            </div>
            <div
              className="signals-metric-grid"
              aria-label="Exemplos ilustrativos de sinais"
            >
              <div>
                <span>Sono</span>
                <strong>7h20</strong>
                <svg viewBox="0 0 84 22" aria-hidden="true">
                  <polyline points="1,16 13,12 25,15 37,7 49,11 61,5 83,8" />
                </svg>
                <small>Exemplo</small>
              </div>
              <div>
                <span>Atividade</span>
                <strong>4.280 passos</strong>
                <svg viewBox="0 0 84 22" aria-hidden="true">
                  <rect x="2" y="12" width="8" height="8" rx="2" />
                  <rect x="17" y="8" width="8" height="12" rx="2" />
                  <rect x="32" y="10" width="8" height="10" rx="2" />
                  <rect x="47" y="4" width="8" height="16" rx="2" />
                  <rect x="62" y="7" width="8" height="13" rx="2" />
                </svg>
                <small>Exemplo</small>
              </div>
              <div>
                <span>Energia</span>
                <strong>3 de 5</strong>
                <svg viewBox="0 0 84 22" aria-hidden="true">
                  <rect x="2" y="8" width="13" height="12" rx="3" />
                  <rect x="19" y="8" width="13" height="12" rx="3" />
                  <rect x="36" y="8" width="13" height="12" rx="3" />
                  <rect x="53" y="8" width="13" height="12" rx="3" />
                  <rect x="70" y="8" width="12" height="12" rx="3" />
                </svg>
                <small>Relato ilustrativo</small>
              </div>
            </div>
          </div>

          <div className="future-feature-copy future-signals-copy">
            <p className="eyebrow future-eyebrow">A CAMINHO • EM BREVE</p>
            <h2 id="future-signals-title">
              Seu corpo conta uma história. Vamos conectar os sinais.
            </h2>
            <p className="section-lead">
              Com sua autorização, o Vivance poderá receber do seu app de saúde
              dados de relógios e anéis compatíveis, como sono, atividade e
              frequência cardíaca.
            </p>
            <p className="future-feature-detail">
              Reunidos ao seu relato de energia, esses sinais darão mais
              contexto para acompanhar a fadiga ao longo dos dias e conversar
              com o seu médico.
            </p>
            <p className="signals-compatibility-note">
              Imagem ilustrativa. A compatibilidade dependerá dos dispositivos e
              conexões disponíveis quando o recurso for lançado.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
