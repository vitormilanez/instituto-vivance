---
name: "VIVANCE — aplicação autenticada"
description: "Guia visual de apps/web: navegação clara, cadastros reais e áreas clínicas em desenvolvimento."
colors:
  navy: "#03132d"
  navy-hover: "#082553"
  nav-selected: "#16365c"
  nav-text: "#ced8e8"
  ink: "#071a3a"
  muted: "#405675"
  blue: "#124da0"
  canvas: "#f6f9fe"
  surface: "#ffffff"
  ice: "#edf3fb"
  quiet-surface: "#f0f4fa"
  disabled: "#e8eef6"
  border: "#dbe4f0"
  input-border: "#98a9bf"
  attention: "#8a5b09"
  attention-border: "#e6c77a"
  attention-surface: "#fff9eb"
typography:
  headline:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "clamp(28 px, 4vw, 35 px)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "20 px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "16 px"
    fontWeight: 400
    lineHeight: 1.55
  navigation:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "14 px"
  label:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "12 px"
    fontWeight: 700
    letterSpacing: "0.1em"
rounded:
  compact: "8 px"
  field: "10 px"
  control: "12 px"
  panel: "16 px"
spacing:
  small: "8 px"
  compact: "12 px"
  regular: "16 px"
  comfortable: "20 px"
  section: "24 px"
  panel: "28 px"
  page: "36 px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10 px 20 px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10 px 20 px"
  button-unavailable:
    backgroundColor: "{colors.disabled}"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "28 px"
---

# Sistema visual da aplicação autenticada Vivance

Contrato reconciliado em **14/10/2026**. A direção mais recente prevalece sobre
composições antigas de sidebar, widgets gigantes e briefing na Hoje.
Escopo: `apps/web`, não o protótipo `app/` da raiz nem o site comercial.

## Princípio

**Clareza para cuidar.** Identidade confiável, superfícies operacionais claras
e informação com origem. A tela torna visíveis tarefa, estado e próxima ação;
não inventa integração, métricas, gravidade clínica ou sucesso.

[Produto](../../PRODUCT.md), [direção](../../docs/DIRECAO_E_SLICES.md) e
[funcionalidades](../../docs/FUNCIONALIDADES.md) definem o que pode ser mostrado.
Código e CSS da superfície prevalecem sobre medições históricas de screenshots.

## Tipografia, cor e superfícies

- A base global carrega **Geist** em `app/layout.tsx`/`--font-geist-sans`.
- A área médica tem override **Figtree**: `components/doctor-shell.tsx`
  carrega `--font-doctor-figtree`, e `app/doctor.css` aplica em `.dv`.
  Não trocar a fonte do médico por Geist por olhar somente o layout global.
- Outras áreas usam sua cascata existente; páginas comerciais têm design próprio.
  Não afirmar uma única fonte global para todas as superfícies.
- Branco e azul/navy existentes estruturam o workspace; azul-claro indica
  seleção/orientação. Dourado permanece detalhe pontual da identidade existente,
  não decoração de IA nem classificação clínica.
- Texto principal/auxiliar deve manter contraste; cor nunca é o único sinal de
  pendência, comparação ou seleção. Atenção pede uma ação, não significa urgência.
- Superfícies predominantemente planas, divisores/bordas finos e sombra discreta
  apenas onde já há separação útil. Não adicionar gradiente/vidro em cartões clínicos.
  Tokens do frontmatter são base compartilhada, não inventário de cada override.

## Navegação e composição por papel

| Área | Contrato vigente |
| --- | --- |
| Médico | Cabeçalho de marca/busca/avisos/conta, **uma navegação principal inferior**, áreas secundárias em Mais. Sem duplicar menu superior/lateral. |
| Hoje médica | Consultas do dia, indicadores reais e pendências. Contexto clínico extenso fica na ficha; não reintroduzir a grade de grandes widgets ou quatro abas de consulta da composição10/10. |
| Ficha | Identidade/objetivo/origem, visão geral, documentos e estados, evolução e pendências; detalhes e histórico progressivos, ações junto do conteúdo. |
| Agenda | Calendário/modos existentes, ação junto ao horário e formulário com foco previsível. Não é calendário demonstrativo. |
| Pacientes | Lista/busca primeiro; convite e histórico separados, sem dominar a lista. |
| Mensagens | Conversa e compositor prioritários, busca de destinatário, contexto recolhível. Não colocar carrossel na conversa. |
| Teleconsulta | Paciente/horário/estado/ação no mesmo fluxo; preparar sala do horário existente, entrar externamente, abrir registro/transcrição. |
| Administrador/equipe | Preservar navegação/ações e limites de papel existentes. Não aplicar automaticamente o shell médico a outras funções. |
| Paciente | Quatro entradas principais: Hoje, Meu cuidado, Conversas, Evolução; perfil no contexto da clínica. |

Preservar os oito destinos/ações da equipe, não obrigatoriamente oito grandes
widgets na Hoje médica. Consultar `doctor-shell.tsx`, `doctor-today.tsx`,
`doctor-workspace.css` e CSS de cada área.

## Hoje e estado sem consultas

Indicadores: pacientes ativos na situação atual, mensagens recebidas no período
e check-ins atrasados em faixas. Sem histórico suficiente, mostrar recorte real,
não curva inventada. Estado vazio oferece **Agendar consulta** → Agenda.

O carrossel de incentivo é manual e limitado ao contexto aprovado; revisar
texto e destinatários antes de enviar. Slide não dispara envio nem representa
mensagem enviada. Redução de movimento, controles claros e texto legível;
sem autoplay que roube foco.

## Ficha e exames

- Objetivo literal/estruturado conserva autoria/data. Não duplicar cadastro como
  novo relato ou medida longitudinal.
- Documentos, resultados, revisão documental, conferência dos itens e resumo
  têm estados separados. Contagem indisponível não é zero.
- Valor/unidade/referência/data e fonte ficam próximos à ação de conferir/revisar.
  Faixa do laudo, estado de revisão e critério clínico são conceitos distintos.
- Dentro/fora/sem comparação usam texto e ícone além da cor, sem diagnóstico.
- Originais, histórico e detalhes por expansão; preservar posição/filtro/rascunho.
- Peso único é compacto; séries têm datas proporcionais, teclado e tabela textual.
  Sem ponto fictício, meta ou classificação de adesão.
- Receitas arquivadas não equivalem a emissão/validação eletrônica de prescrição.
  Dialogs têm título, Escape e restauração de foco.

[Contrato da ficha](../../docs/FICHA_PACIENTE.md) e
[exames](../../docs/IA2_EXAMES.md).

## Interação, acessibilidade e mobile

Português do Brasil, rótulo visível e alvos de pelo menos 44 px. Corpo de leitura
preserva escala legível; campos e ações não dependem de hover/cor. Navegação
tem estado atual, foco visível e semântica de link/botão correspondente à ação.

Desde320 px: página sem overflow horizontal estrutural; tabelas podem ter área
interna rolável acessível. Dock não cobre conteúdo/compositor; reservar espaço.
Até400 px os rótulos visuais do médico podem ser Vídeo/Chat, mantendo nomes
completos para leitores de tela.

Movimento curto e funcional, respeitando `prefers-reduced-motion`. Não mover
cards ao hover, rolar a janela sem necessidade ou animar altura só para decorar.
Carregamento reserva espaço; transição não desmonta formulário para esconder
latência. Estados locais preservam edição quando o contrato suporta; não prometer
persistência de rascunho apenas porque o painel permaneceu montado.

Navegação pendente conserva contexto e informa atividade. Mensagens controlam
rolagem interna; Agenda evita foco com duas rolagens. Erro tem explicação e
retry sem fingir coleção vazia ou sucesso. Funcionalidade não conectada é
realmente indisponível, sem desabilitar o que já está implementado.

## Check-in e alimentação

Uma pergunta por etapa: Energia, Sono, Fome, Banheiro, recado opcional.
Seleção explícita avança; hover/foco não escolhem. Ilustração reforça rótulo,
não o substitui. Escalas e habilitação médica são preservadas. Adicionais ficam
em expansão; alimentação aceita foto, texto ou ambos, com envio único.

Landing demonstrativa e aplicativo podem reutilizar ilustrações, mas a
demonstração informa que não salva. Sem calorias/juízo nutricional ou análise
automática. [Evidência 11/10](../../docs/historico/entregas/UX_CHECKIN_ALIMENTACAO_2026-10-11.md).

## Teleconsulta e consentimento

Distinguir: configuração, conexão pessoal, autorização, captura, original salvo
e revisão. Meet é externo; não desenhar controles falsos de câmera/encerramento.
Transcrição manual pode ser parcial e o serviço de voz real não foi validado.
Nativa preparada/OFF e consentimento direto do paciente/resumo automático ainda
não implementados, conforme [contrato](../../docs/TELECONSULTA_GOOGLE_MEET.md).

## Evidência e manutenção

[Workspace 14/10](../../docs/historico/entregas/WORKSPACE_E_TRANSCRICAO_2026-10-14.md)
e [QA histórico](../../docs/historico/avaliacoes/QA_DESIGN_ATE_2026-10-14.md)
registram publicação/320 px e limites. Layouts e medições do PR119/112 são
[históricos](../../docs/historico/entregas/UX_MEDICA_2026-10-10.md), não regras
para reconstruir a Hoje antiga. Versão integral anterior deste guia:
[Git a86c994](https://github.com/vitormilanez/instituto-vivance/blob/a86c99400505d7bfa125baa7aacd9980987a0cee/apps/web/DESIGN.md).

Esta reconciliação altera documentação, não CSS, componentes, regras clínicas,
fontes carregadas ou testes visuais já executados.
