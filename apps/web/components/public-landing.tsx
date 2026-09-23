"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { LandingFutureFeatures } from "./landing-future-features";

const energyLabels = ["Muito baixa", "Baixa", "Moderada", "Boa", "Muito boa"];

const historyExamples = {
  30: {
    points: [
      [48, 20],
      [105, 30],
      [166, 46],
      [228, 36],
      [291, 73],
      [351, 85],
      [414, 96],
      [475, 103],
    ],
    start: "02/09",
    count: "12",
    caption: "8 registros fictícios · 02/09 a 23/09 · sem avaliação clínica",
    description:
      "Oito registros fictícios, de 78,0 kg em 02/09 a 76,4 kg em 23/09. Valores ilustrativos, sem interpretação clínica.",
  },
  90: {
    points: [
      [48, 4],
      [88, 13],
      [128, 7],
      [168, 24],
      [208, 17],
      [248, 41],
      [288, 34],
      [328, 67],
      [368, 61],
      [408, 89],
      [448, 95],
      [475, 103],
    ],
    start: "26/06",
    count: "34",
    caption: "12 registros fictícios · 26/06 a 23/09 · sem avaliação clínica",
    description:
      "Doze registros fictícios, de 78,3 kg em 26/06 a 76,4 kg em 23/09. Valores ilustrativos, sem interpretação clínica.",
  },
} as const;

export function PublicLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [energy, setEnergy] = useState(4);
  const [period, setPeriod] = useState<30 | 90>(30);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const history = historyExamples[period];

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menuOpen) {
        setMenuOpen(false);
        menuToggleRef.current?.focus();
      }
    };
    const desktopMedia = window.matchMedia("(min-width: 761px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    desktopMedia.addEventListener("change", closeOnDesktop);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      desktopMedia.removeEventListener("change", closeOnDesktop);
    };
  }, [menuOpen]);

  return (
    <div className="vivance-landing">
      <svg
        className="icon-library"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <symbol id="arrow" viewBox="0 0 24 24">
          <path d="M5 12h14m-6-6 6 6-6 6" />
        </symbol>
        <symbol id="chevron" viewBox="0 0 24 24">
          <path d="m9 5 7 7-7 7" />
        </symbol>
        <symbol id="check" viewBox="0 0 24 24">
          <path d="m5 12 4 4L19 6" />
        </symbol>
        <symbol id="calendar" viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M16 3v4M8 3v4M3 11h18m-14 5h3m4 0h3" />
        </symbol>
        <symbol id="file" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8m-8 4h5" />
        </symbol>
        <symbol id="message" viewBox="0 0 24 24">
          <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 1 1 21 11.5Z" />
          <path d="M8 10h8m-8 4h5" />
        </symbol>
        <symbol id="heart" viewBox="0 0 24 24">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
        </symbol>
        <symbol id="shield" viewBox="0 0 24 24">
          <path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7Z" />
          <path d="m8 12 3 3 5-6" />
        </symbol>
        <symbol id="spark" viewBox="0 0 24 24">
          <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />
        </symbol>
        <symbol id="chart" viewBox="0 0 24 24">
          <path d="M3 3v18h18M7 14l4-4 4 3 6-8" />
        </symbol>
        <symbol id="users" viewBox="0 0 24 24">
          <circle cx="9" cy="8" r="4" />
          <path d="M2 21v-2a7 7 0 0 1 14 0v2M17 4a4 4 0 0 1 0 8m3 9v-2a7 7 0 0 0-3-5.7" />
        </symbol>
        <symbol id="book" viewBox="0 0 24 24">
          <path d="M12 5C8 2 3 3 3 3v17s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Zm0 0v17" />
        </symbol>
        <symbol id="lock" viewBox="0 0 24 24">
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path d="M8 10V6a4 4 0 0 1 8 0v4m-4 4v3" />
        </symbol>
        <symbol id="plus" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" />
        </symbol>
        <symbol id="home" viewBox="0 0 24 24">
          <path d="m3 10 9-7 9 7M5 9v11h14V9M10 20v-6h4v6" />
        </symbol>
        <symbol id="scale" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M8 10a5 5 0 0 1 8 0m-4 0 2-2" />
        </symbol>
        <symbol id="food" viewBox="0 0 24 24">
          <path d="M3 2v7c0 1 1 2 2 2h2c1 0 2-1 2-2V2M6 2v20M18 22V2c-2 0-3 2-3 5s1 4 3 4" />
        </symbol>
        <symbol id="sun" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
        </symbol>
        <symbol id="moon" viewBox="0 0 24 24">
          <path d="M20.5 13a9 9 0 1 1-9.5-9.5A7 7 0 0 0 20.5 13Z" />
        </symbol>
        <symbol id="bolt" viewBox="0 0 24 24">
          <path d="m13 2-9 12h7l-1 8 10-13h-7Z" />
        </symbol>
        <symbol id="clock" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </symbol>
      </svg>
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#inicio" aria-label="Vivance — início">
            <Image
              src="/brand/vivance-mark.png"
              width={44}
              height={44}
              alt=""
              unoptimized
            />
            <span>
              <strong>VIVANCE</strong>
              <small>Cuidado contínuo</small>
            </span>
          </a>
          <nav className="desktop-nav" aria-label="Navegação principal">
            <a href="#check-in">Seu dia a dia</a>
            <a href="#seu-medico">Seu médico</a>
            <a href="#historico">Sua evolução</a>
          </nav>
          <div className="header-actions">
            <a className="button button-small" href="/login">
              <span>
                Entrar<span className="login-context"> no Vivance</span>
              </span>
              <svg className="icon" aria-hidden="true">
                <use href="#arrow" />
              </svg>
            </a>
            <button
              className="menu-toggle"
              ref={menuToggleRef}
              aria-controls="mobile-nav"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav
            id="mobile-nav"
            className="mobile-nav"
            aria-label="Navegação móvel"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a"))
                setMenuOpen(false);
            }}
          >
            <a href="#check-in">Seu dia a dia</a>
            <a href="#seu-medico">Seu médico</a>
            <a href="#historico">Sua evolução</a>
            <a href="#como-funciona">Como funciona</a>
          </nav>
        )}
      </header>
      <main id="conteudo">
        <section className="hero" id="inicio" aria-labelledby="hero-title">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">
                <span className="eyebrow-dot"></span> UMA NOVA FORMA DE
                ACOMPANHAR
              </p>
              <h1 id="hero-title">
                Seu cuidado,
                <br /> mais perto.
                <br />
                <span>Em cada passo.</span>
              </h1>
              <p className="hero-description">
                Como você se sente hoje importa para o cuidado de amanhã.
                Conecte sua rotina ao seu médico, com{" "}
                <strong>
                  check-ins simples, conversas e sua história em um só lugar.
                </strong>
              </p>
              <div className="hero-actions">
                <a className="button" href="#check-in">
                  Conheça seu espaço de cuidado
                  <svg className="icon" aria-hidden="true">
                    <use href="#arrow" />
                  </svg>
                </a>
                <a className="text-link" href="/login">
                  Já tenho acesso
                  <svg className="icon" aria-hidden="true">
                    <use href="#chevron" />
                  </svg>
                </a>
              </div>
              <div className="hero-note">
                <span className="note-icon">
                  <svg className="icon" aria-hidden="true">
                    <use href="#heart" />
                  </svg>
                </span>
                <p>
                  Emagrecimento e envelhecimento saudável.
                  <br />
                  <strong>Com contexto, proximidade e cuidado humano.</strong>
                </p>
              </div>
            </div>
            <div className="hero-visual">
              <div className="orbit orbit-one"></div>
              <div className="orbit orbit-two"></div>
              <div className="floating-label label-doctor">
                <span className="doctor-avatar">
                  <svg className="icon" aria-hidden="true">
                    <use href="#users" />
                  </svg>
                </span>
                <div>
                  <strong>Mais perto do seu médico</strong>
                  <span>A conversa continua por aqui.</span>
                </div>
              </div>
              <div className="phone">
                <div className="phone-header">
                  <Image
                    src="/brand/vivance-mark.png"
                    width={28}
                    height={28}
                    alt=""
                    unoptimized
                  />
                  <strong>Hoje</strong>
                  <span className="sample-pill">Demonstração</span>
                </div>
                <div className="phone-body">
                  <p className="phone-date">Seu espaço de cuidado</p>
                  <h2>Bom dia, Marina.</h2>
                  <div className="phone-checkin">
                    <p className="card-eyebrow">AGORA · CHECK-IN DO DIA</p>
                    <h3>
                      Como você está
                      <br />
                      se sentindo hoje?
                    </h3>
                    <p>Poucos toques. Mais contexto.</p>
                    <a href="#check-in" className="button button-gold">
                      Conhecer o check-in
                      <svg className="icon" aria-hidden="true">
                        <use href="#arrow" />
                      </svg>
                    </a>
                  </div>
                  <p className="mini-heading">REGISTRAR FAZ PARTE DO CUIDADO</p>
                  <div className="phone-shortcuts">
                    <a href="#historico">
                      <svg className="icon" aria-hidden="true">
                        <use href="#scale" />
                      </svg>
                      <span>Peso e medidas</span>
                    </a>
                    <a href="#check-in">
                      <svg className="icon" aria-hidden="true">
                        <use href="#food" />
                      </svg>
                      <span>Alimentação</span>
                    </a>
                    <a href="#historico">
                      <svg className="icon" aria-hidden="true">
                        <use href="#file" />
                      </svg>
                      <span>Exames</span>
                    </a>
                    <a href="#seu-medico">
                      <svg className="icon" aria-hidden="true">
                        <use href="#message" />
                      </svg>
                      <span>Conversas</span>
                    </a>
                  </div>
                  <div className="phone-appointment">
                    <div className="date-square">
                      <svg className="icon" aria-hidden="true">
                        <use href="#calendar" />
                      </svg>
                    </div>
                    <div>
                      <strong>Seu próximo encontro</strong>
                      <span>Data e detalhes na sua agenda</span>
                    </div>
                    <svg className="icon" aria-hidden="true">
                      <use href="#chevron" />
                    </svg>
                  </div>
                </div>
                <nav className="phone-nav" aria-label="Conheça os recursos">
                  <a href="#check-in" className="selected">
                    <svg className="icon" aria-hidden="true">
                      <use href="#home" />
                    </svg>
                    <span>Hoje</span>
                  </a>
                  <a href="#historico">
                    <svg className="icon" aria-hidden="true">
                      <use href="#chart" />
                    </svg>
                    <span>Evolução</span>
                  </a>
                  <a href="#check-in" className="register-shortcut">
                    <span className="plus-circle">
                      <svg className="icon" aria-hidden="true">
                        <use href="#plus" />
                      </svg>
                    </span>
                    <span>Registrar</span>
                  </a>
                  <a href="#seu-medico">
                    <svg className="icon" aria-hidden="true">
                      <use href="#message" />
                    </svg>
                    <span>Conversas</span>
                  </a>
                  <a href="#como-funciona">
                    <svg className="icon" aria-hidden="true">
                      <use href="#heart" />
                    </svg>
                    <span>Meu cuidado</span>
                  </a>
                </nav>
              </div>

              <p className="demo-caption">
                Prévia ilustrativa · dados fictícios
              </p>
            </div>
          </div>
          <div className="container value-strip">
            <span>O CUIDADO VAI ALÉM DA CONSULTA</span>
            <div>
              <span>
                <svg className="icon" aria-hidden="true">
                  <use href="#sun" />
                </svg>
                Check-in da rotina
              </span>
              <span>
                <svg className="icon" aria-hidden="true">
                  <use href="#message" />
                </svg>
                Proximidade com o médico
              </span>
              <span>
                <svg className="icon" aria-hidden="true">
                  <use href="#chart" />
                </svg>
                Histórico e evolução
              </span>
            </div>
          </div>
        </section>

        <section className="section overview-section" id="o-vivance">
          <div className="container">
            <div className="section-heading centered">
              <p className="eyebrow">CUIDAR É ACOMPANHAR A HISTÓRIA INTEIRA</p>
              <h2>
                Entre uma consulta e outra,
                <br />
                <span>você tem um ponto de apoio.</span>
              </h2>
              <p>
                Um espaço simples para registrar, conversar e entender os
                próximos passos do seu cuidado.
              </p>
            </div>
            <div className="benefit-grid">
              <a className="benefit-card" href="#check-in">
                <span className="feature-icon">
                  <svg className="icon" aria-hidden="true">
                    <use href="#sun" />
                  </svg>
                </span>
                <h3>Seu dia a dia importa</h3>
                <p>
                  Check-ins sobre como você se sente, alimentação e registros da
                  rotina ajudam a levar mais contexto para o acompanhamento.
                </p>
                <span className="card-link">
                  Conheça o check-in
                  <svg className="icon" aria-hidden="true">
                    <use href="#arrow" />
                  </svg>
                </span>
              </a>
              <a className="benefit-card" href="#seu-medico">
                <span className="feature-icon">
                  <svg className="icon" aria-hidden="true">
                    <use href="#message" />
                  </svg>
                </span>
                <h3>Seu médico, mais próximo</h3>
                <p>
                  Um canal para compartilhar dúvidas e relatos com a equipe, com
                  as orientações publicadas pelo médico sempre à mão.
                </p>
                <span className="card-link">
                  Veja como se conectar
                  <svg className="icon" aria-hidden="true">
                    <use href="#arrow" />
                  </svg>
                </span>
              </a>
              <a className="benefit-card" href="#historico">
                <span className="feature-icon">
                  <svg className="icon" aria-hidden="true">
                    <use href="#chart" />
                  </svg>
                </span>
                <h3>Sua história faz sentido</h3>
                <p>
                  Peso, medidas, check-ins, exames e orientações organizados no
                  tempo para apoiar a análise do médico e o próximo retorno.
                </p>
                <span className="card-link">
                  Explore seu histórico
                  <svg className="icon" aria-hidden="true">
                    <use href="#arrow" />
                  </svg>
                </span>
              </a>
            </div>
          </div>
        </section>

        <section
          className="section checkin-section"
          id="check-in"
          aria-labelledby="checkin-title"
        >
          <div className="container feature-grid">
            <div className="feature-copy">
              <p className="eyebrow">
                <span className="section-number">01</span> CHECK-IN E ROTINA
              </p>
              <h2 id="checkin-title">
                Pequenos registros.
                <br />
                <span>Um cuidado mais completo.</span>
              </h2>
              <p className="section-lead">
                Nem tudo cabe na memória do dia da consulta. O check-in ajuda
                você a registrar como tem se sentido e o que mudou na sua
                rotina.
              </p>
              <div className="checkin-topics">
                <span>
                  <svg className="icon" aria-hidden="true">
                    <use href="#sun" />
                  </svg>
                  Disposição
                </span>
                <span>
                  <svg className="icon" aria-hidden="true">
                    <use href="#bolt" />
                  </svg>
                  Energia
                </span>
                <span>
                  <svg className="icon" aria-hidden="true">
                    <use href="#moon" />
                  </svg>
                  Sono
                </span>
                <span>
                  <svg className="icon" aria-hidden="true">
                    <use href="#food" />
                  </svg>
                  Fome
                </span>
                <span>
                  <svg className="icon" aria-hidden="true">
                    <use href="#heart" />
                  </svg>
                  Conforto intestinal
                </span>
              </div>
              <ul className="feature-list">
                <li>
                  <svg className="icon" aria-hidden="true">
                    <use href="#check" />
                  </svg>
                  Perguntas simples, respondidas com poucos toques.
                </li>
                <li>
                  <svg className="icon" aria-hidden="true">
                    <use href="#check" />
                  </svg>
                  Espaço para complementar o que merece atenção.
                </li>
                <li>
                  <svg className="icon" aria-hidden="true">
                    <use href="#check" />
                  </svg>
                  Registros datados para conversar sobre a sua evolução.
                </li>
              </ul>
              <a className="text-link" href="/login">
                Acessar meu cuidado
                <svg className="icon" aria-hidden="true">
                  <use href="#arrow" />
                </svg>
              </a>
            </div>
            <div className="checkin-demo">
              <div className="demo-topline">
                <span className="sample-pill">Experimente uma pergunta</span>
                <span>Exemplo de check-in</span>
              </div>
              <div className="energy-question">
                <span className="energy-icon">
                  <svg className="icon" aria-hidden="true">
                    <use href="#bolt" />
                  </svg>
                </span>
                <p className="card-eyebrow">UM OLHAR PARA O SEU DIA</p>
                <h3>Como está sua energia?</h3>
                <p>Um registro simples ajuda a contar a sua história.</p>
                <div
                  className="energy-options"
                  role="group"
                  aria-label="Escolha uma resposta de exemplo sobre energia"
                >
                  <button
                    type="button"
                    aria-pressed={energy === 1}
                    aria-label="1 — Muito baixa"
                    onClick={() => setEnergy(1)}
                  >
                    1
                  </button>
                  <button
                    type="button"
                    aria-pressed={energy === 2}
                    aria-label="2 — Baixa"
                    onClick={() => setEnergy(2)}
                  >
                    2
                  </button>
                  <button
                    type="button"
                    aria-pressed={energy === 3}
                    aria-label="3 — Moderada"
                    onClick={() => setEnergy(3)}
                  >
                    3
                  </button>
                  <button
                    type="button"
                    aria-pressed={energy === 4}
                    aria-label="4 — Boa"
                    onClick={() => setEnergy(4)}
                  >
                    4
                  </button>
                  <button
                    type="button"
                    aria-pressed={energy === 5}
                    aria-label="5 — Muito boa"
                    onClick={() => setEnergy(5)}
                  >
                    5
                  </button>
                </div>
                <div className="energy-scale">
                  <span>Muito baixa</span>
                  <span>Muito boa</span>
                </div>
                <div className="demo-result" role="status" aria-live="polite">
                  Resposta de exemplo:{" "}
                  <strong>{energyLabels[energy - 1]}</strong>
                </div>
              </div>
              <div className="checkin-demo-footer">
                <svg className="icon" aria-hidden="true">
                  <use href="#lock" />
                </svg>
                <p>
                  Esta é uma demonstração. Nenhuma resposta é salva ou enviada
                  ao médico.
                </p>
              </div>
            </div>
          </div>
        </section>

        <LandingFutureFeatures />

        <section
          className="section doctor-section"
          id="seu-medico"
          aria-labelledby="doctor-title"
        >
          <div className="container feature-grid doctor-grid">
            <div className="conversation-demo">
              <div className="conversation-header">
                <span className="doctor-avatar large">
                  <svg className="icon" aria-hidden="true">
                    <use href="#users" />
                  </svg>
                </span>
                <div>
                  <strong>Conversa com seu médico</strong>
                  <span>Um espaço para o seu acompanhamento</span>
                </div>
                <svg className="icon" aria-hidden="true">
                  <use href="#message" />
                </svg>
              </div>
              <div className="conversation-body">
                <span className="conversation-date">CONVERSA ILUSTRATIVA</span>
                <div className="bubble bubble-patient">
                  <p>
                    Registrei como me senti nesta semana e enviei meus exames
                    para a próxima consulta.
                  </p>
                  <span>
                    Mensagem de exemplo · Enviada
                    <svg className="icon" aria-hidden="true">
                      <use href="#check" />
                    </svg>
                  </span>
                </div>
                <div className="bubble bubble-doctor">
                  <span className="bubble-author">Médico responsável</span>
                  <p>
                    Na próxima consulta, vamos conversar sobre seus registros e
                    revisar juntos os próximos passos.
                  </p>
                  <span>Resposta de exemplo</span>
                </div>
                <div className="published-note">
                  <span className="feature-icon">
                    <svg className="icon" aria-hidden="true">
                      <use href="#file" />
                    </svg>
                  </span>
                  <div>
                    <span>ORIENTAÇÃO PUBLICADA</span>
                    <strong>Seu plano, sempre à mão</strong>
                    <p>Consulte o que foi combinado com o médico.</p>
                  </div>
                </div>
              </div>
              <p className="conversation-footnote">
                Conversas e orientações fictícias, apenas para apresentar o
                produto.
              </p>
            </div>
            <div className="feature-copy">
              <p className="eyebrow">
                <span className="section-number">02</span> PROXIMIDADE COM O
                MÉDICO
              </p>
              <h2 id="doctor-title">
                A consulta termina.
                <br />
                <span>O vínculo continua.</span>
              </h2>
              <p className="section-lead">
                Dúvidas, mudanças na rotina e novos documentos ganham um lugar
                dentro do seu cuidado. A equipe encontra o contexto, e você
                encontra as orientações.
              </p>
              <div className="detail-item">
                <span className="feature-icon">
                  <svg className="icon" aria-hidden="true">
                    <use href="#message" />
                  </svg>
                </span>
                <div>
                  <h3>Conversas ligadas à sua jornada</h3>
                  <p>
                    Compartilhe o que importa com a equipe responsável, sem
                    perder o histórico da conversa.
                  </p>
                </div>
              </div>
              <div className="detail-item">
                <span className="feature-icon">
                  <svg className="icon" aria-hidden="true">
                    <use href="#file" />
                  </svg>
                </span>
                <div>
                  <h3>O combinado fica acessível</h3>
                  <p>
                    Revisite o plano e as orientações publicadas pelo médico
                    quando precisar.
                  </p>
                </div>
              </div>
              <div className="detail-item">
                <span className="feature-icon">
                  <svg className="icon" aria-hidden="true">
                    <use href="#calendar" />
                  </svg>
                </span>
                <div>
                  <h3>O próximo encontro, à vista</h3>
                  <p>
                    Consulte sua agenda e prepare suas dúvidas e informações
                    para o retorno.
                  </p>
                </div>
              </div>
              <p className="care-note">
                <svg className="icon" aria-hidden="true">
                  <use href="#clock" />
                </svg>
                Respostas conforme os horários combinados com a equipe. O canal
                não é um pronto atendimento.
              </p>
            </div>
          </div>
        </section>

        <section
          className="section history-section"
          id="historico"
          aria-labelledby="history-title"
        >
          <div className="container">
            <div className="section-heading split-heading">
              <div>
                <p className="eyebrow">
                  <span className="section-number">03</span> HISTÓRICO, ANÁLISE
                  E EVOLUÇÃO
                </p>
                <h2 id="history-title">
                  Mais que números soltos.
                  <br />
                  <span>A sua história, com contexto.</span>
                </h2>
              </div>
              <p>
                Reúna o que você registra e o que seu médico orienta. Compare
                períodos, reveja documentos e prepare uma conversa mais completa
                sobre sua evolução.
              </p>
            </div>
            <div className="history-workspace">
              <div className="history-overview">
                <div className="workspace-header">
                  <div>
                    <span className="mini-heading">VISÃO LONGITUDINAL</span>
                    <h3>O cuidado ao longo do tempo</h3>
                  </div>
                  <span className="sample-pill">Dados fictícios</span>
                </div>
                <div
                  className="history-filters"
                  role="group"
                  aria-label="Período do histórico ilustrativo"
                >
                  <button
                    type="button"
                    aria-pressed={period === 30}
                    onClick={() => setPeriod(30)}
                  >
                    30 dias
                  </button>
                  <button
                    type="button"
                    aria-pressed={period === 90}
                    onClick={() => setPeriod(90)}
                  >
                    90 dias
                  </button>
                </div>
                <div className="chart-heading">
                  <div>
                    <span>Peso registrado</span>
                    <strong>
                      76,4 <small>kg</small>
                    </strong>
                  </div>
                  <p id="chart-period">23/09 · informado pelo paciente</p>
                </div>
                <svg
                  className="weight-chart"
                  viewBox="0 0 500 170"
                  role="img"
                  aria-labelledby="chart-title chart-description"
                >
                  <title id="chart-title">Exemplo de histórico de peso</title>
                  <desc id="chart-description">{history.description}</desc>
                  <g className="chart-grid">
                    <path d="M45 20H478M45 72H478M45 124H478" />
                  </g>
                  <g className="chart-axis">
                    <text x="0" y="24">
                      78,0
                    </text>
                    <text x="0" y="76">
                      77,0
                    </text>
                    <text x="0" y="128">
                      76,0
                    </text>
                    <text id="chart-start" x="45" y="158">
                      {history.start}
                    </text>
                    <text x="442" y="158">
                      23/09
                    </text>
                  </g>
                  <polyline
                    id="chart-line"
                    points={history.points
                      .map((point) => point.join(","))
                      .join(" ")}
                  />
                  <g id="chart-dots">
                    {history.points.map(([x, y], index) => (
                      <circle
                        key={`${x}-${y}`}
                        cx={x}
                        cy={y}
                        r={index === history.points.length - 1 ? 6 : 4}
                      />
                    ))}
                  </g>
                </svg>
                <p
                  className="chart-caption"
                  id="chart-caption"
                  aria-live="polite"
                >
                  {history.caption}
                </p>
                <div className="history-measures">
                  <div>
                    <span>Cintura registrada</span>
                    <strong>
                      94 <small>cm</small>
                    </strong>
                    <span>20/09 · informado pelo paciente</span>
                  </div>
                  <div>
                    <span>Check-ins no período</span>
                    <strong id="checkin-count">{history.count}</strong>
                    <span>Registros de como a pessoa se sentiu</span>
                  </div>
                </div>
              </div>
              <div className="history-timeline">
                <span className="mini-heading">
                  CADA INFORMAÇÃO NO SEU TEMPO
                </span>
                <ol>
                  <li>
                    <span className="timeline-icon">
                      <svg className="icon" aria-hidden="true">
                        <use href="#sun" />
                      </svg>
                    </span>
                    <div>
                      <span>23 SET · CHECK-IN</span>
                      <strong>Como você se sentiu</strong>
                      <p>Energia, sono e relatos da rotina.</p>
                    </div>
                  </li>
                  <li>
                    <span className="timeline-icon">
                      <svg className="icon" aria-hidden="true">
                        <use href="#file" />
                      </svg>
                    </span>
                    <div>
                      <span>22 SET · DOCUMENTO</span>
                      <strong>Exame enviado</strong>
                      <p>Arquivo original disponível para revisão.</p>
                    </div>
                  </li>
                  <li>
                    <span className="timeline-icon">
                      <svg className="icon" aria-hidden="true">
                        <use href="#heart" />
                      </svg>
                    </span>
                    <div>
                      <span>18 SET · ORIENTAÇÃO</span>
                      <strong>Plano publicado pelo médico</strong>
                      <p>O que foi combinado no atendimento.</p>
                    </div>
                  </li>
                  <li>
                    <span className="timeline-icon">
                      <svg className="icon" aria-hidden="true">
                        <use href="#calendar" />
                      </svg>
                    </span>
                    <div>
                      <span>16 SET · CONSULTA</span>
                      <strong>Mais um encontro na jornada</strong>
                      <p>Contexto para preparar o próximo retorno.</p>
                    </div>
                  </li>
                </ol>
                <p className="timeline-note">
                  <svg className="icon" aria-hidden="true">
                    <use href="#shield" />
                  </svg>
                  Os registros apoiam a análise. O médico interpreta e decide.
                </p>
              </div>
            </div>
            <div className="history-benefits">
              <span>
                <svg className="icon" aria-hidden="true">
                  <use href="#check" />
                </svg>
                Registros com data e origem
              </span>
              <span>
                <svg className="icon" aria-hidden="true">
                  <use href="#check" />
                </svg>
                Documentos reunidos para revisão
              </span>
              <span>
                <svg className="icon" aria-hidden="true">
                  <use href="#check" />
                </svg>
                Histórico para o próximo retorno
              </span>
            </div>
          </div>
        </section>

        <section
          className="section journey-section"
          id="como-funciona"
          aria-labelledby="journey-title"
        >
          <div className="container">
            <div className="section-heading centered">
              <p className="eyebrow">ANTES, DURANTE E DEPOIS</p>
              <h2 id="journey-title">
                O próximo passo fica claro.
                <br />
                <span>A história continua conectada.</span>
              </h2>
            </div>
            <div className="journey-grid">
              <article>
                <span className="step-number">01</span>
                <h3>Prepare seu encontro</h3>
                <p>
                  Compartilhe objetivos, responda à pré-consulta e reúna seus
                  documentos.
                </p>
                <span>Antes da consulta</span>
              </article>
              <article>
                <span className="step-number">02</span>
                <h3>Converse e combine</h3>
                <p>
                  O médico revisa seu contexto, escuta você e define os próximos
                  passos.
                </p>
                <span>Durante a consulta</span>
              </article>
              <article>
                <span className="step-number">03</span>
                <h3>Continue seu cuidado</h3>
                <p>
                  Acesse o plano, faça seus check-ins e registre o que acontece
                  na rotina.
                </p>
                <span>Entre as consultas</span>
              </article>
            </div>
          </div>
        </section>

        <section className="human-section">
          <div className="container human-inner">
            <span className="human-icon">
              <svg className="icon" aria-hidden="true">
                <use href="#shield" />
              </svg>
            </span>
            <div>
              <p className="eyebrow">
                TECNOLOGIA QUE APOIA. CUIDADO QUE É HUMANO.
              </p>
              <h2>Seu médico continua no centro das decisões.</h2>
              <p>
                O Vivance organiza a informação para apoiar o acompanhamento.
                Diagnósticos, tratamentos e orientações são responsabilidade do
                médico. Você acessa o que foi revisado e publicado para o seu
                cuidado.
              </p>
            </div>
          </div>
        </section>

        <section className="section faq-section" id="duvidas">
          <div className="container faq-grid">
            <div>
              <p className="eyebrow">ANTES DE COMEÇAR</p>
              <h2>
                O que você <br /> <span>precisa saber.</span>
              </h2>
              <p>
                Cuidado próximo começa <br /> com clareza.
              </p>
            </div>
            <div className="faq-list">
              <details>
                <summary>
                  Como faço para acessar o Vivance?
                  <svg className="icon" aria-hidden="true">
                    <use href="#plus" />
                  </svg>
                </summary>
                <p>
                  Clique em “Entrar no Vivance” e use o acesso individual
                  disponibilizado pela sua clínica. Depois do login, você segue
                  para o espaço correspondente ao seu perfil. Se ainda não
                  recebeu um convite, fale com a equipe da clínica.
                </p>
              </details>
              <details>
                <summary>
                  O que posso registrar no check-in?
                  <svg className="icon" aria-hidden="true">
                    <use href="#plus" />
                  </svg>
                </summary>
                <p>
                  O check-in reúne informações sobre como você se sente, como
                  disposição, energia, sono, fome e conforto intestinal. Você
                  também pode complementar o contexto com relatos da rotina. Os
                  registros ajudam a preparar o acompanhamento com a equipe, sem
                  substituir a avaliação médica.
                </p>
              </details>
              <details>
                <summary>
                  O médico vê meus envios na mesma hora?
                  <svg className="icon" aria-hidden="true">
                    <use href="#plus" />
                  </svg>
                </summary>
                <p>
                  Um registro enviado não significa que ele já foi lido ou
                  revisado. A equipe acompanha as informações conforme a rotina
                  e os horários combinados com você. As conversas não são um
                  canal de pronto atendimento nem de monitoramento 24 horas.
                </p>
              </details>
              <details>
                <summary>
                  Quando a comparação do prato e as conexões de saúde estarão
                  disponíveis?
                  <svg className="icon" aria-hidden="true">
                    <use href="#plus" />
                  </svg>
                </summary>
                <p>
                  Hoje, o Vivance já permite registrar refeições com foto. A
                  checagem automática do prato e as conexões com apps de saúde
                  estão planejadas para uma próxima etapa e serão apresentadas
                  quando estiverem disponíveis.
                </p>
              </details>
              <details>
                <summary>
                  Como meu histórico ajuda no acompanhamento?
                  <svg className="icon" aria-hidden="true">
                    <use href="#plus" />
                  </svg>
                </summary>
                <p>
                  Registros com data, medidas, check-ins, documentos e
                  orientações permitem rever o que aconteceu entre as consultas.
                  Essa organização oferece contexto para a análise do médico. Os
                  gráficos não definem diagnósticos, metas ou tratamentos
                  automaticamente.
                </p>
              </details>
              <details>
                <summary>
                  As orientações são geradas automaticamente?
                  <svg className="icon" aria-hidden="true">
                    <use href="#plus" />
                  </svg>
                </summary>
                <p>
                  Não. As orientações que você acessa passam pela revisão e
                  publicação do médico. Quando habilitada, a assistência de IA
                  pode apoiar a organização de informações e a preparação de
                  rascunhos para o profissional; ela não publica condutas
                  diretamente para o paciente.
                </p>
              </details>
            </div>
          </div>
        </section>
        <section className="closing-section">
          <div className="container closing-inner">
            <div>
              <p className="eyebrow">VIVANCE · CUIDADO CONTÍNUO</p>
              <h2>
                Mais contexto para o médico.
                <br />
                <span>Mais proximidade para você.</span>
              </h2>
              <p>Seu próximo passo começa no seu espaço de cuidado.</p>
            </div>
            <div className="closing-action">
              <a className="button button-gold" href="/login">
                Entrar no Vivance
                <svg className="icon" aria-hidden="true">
                  <use href="#arrow" />
                </svg>
              </a>
              <span>
                <svg className="icon" aria-hidden="true">
                  <use href="#lock" />
                </svg>
                Acesso individual para pacientes e equipe
              </span>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-main">
            <a
              className="brand"
              href="#inicio"
              aria-label="Vivance — voltar ao início"
            >
              <Image
                src="/brand/vivance-mark.png"
                width={40}
                height={40}
                alt=""
                unoptimized
              />
              <span>
                <strong>VIVANCE</strong>
                <small>Cuidado contínuo</small>
              </span>
            </a>
            <p>Cuidar é acompanhar a história inteira.</p>
            <a href="#duvidas">
              Dúvidas frequentes
              <svg className="icon" aria-hidden="true">
                <use href="#arrow" />
              </svg>
            </a>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Instituto Vivance.</span>
            <span>
              Emagrecimento · Envelhecimento saudável · Cuidado humano
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
