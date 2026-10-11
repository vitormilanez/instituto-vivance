# QA — widgets médicos e fluidez (11/10/2026)

Final result: **passed** para implementação e verificação local delimitadas.
Não constitui publicação, aceite do usuário ou aceite clínico.

## Referência e evidência

- Fonte aprovada: `/Users/vitormilanez/.codex/generated_images/01a12ce7-3b52-7400-9d4f-7a71bf83f09f/exec-38013fc2-5bd3-424d-872d-bc14825ca3ca.png` (1659 × 948).
- Implementação: [Hoje autenticado](output/widgets-fluidez-20261011/hoje-final.png), viewport DOM 1440 × 900.
- Responsivo: [Hoje em 320 px](output/widgets-fluidez-20261011/widgets-320.png), captura de página inteira.
- Fonte e captura foram inspecionadas juntas. Comparação de hierarquia,
  proporções dos módulos e identidade; não foi feita diferença pixel a pixel.
  A referência e o app usam dimensões diferentes, e o navegador mantém seu zoom
  existente (devicePixelRatio 1,04 na captura final). Dimensões de layout foram
  aferidas no DOM, sem confundir o viewport configurado com largura CSS.

## Resultado visual

- Oito ações preservadas, sem reunir ou esconder destinos. Agenda alta à
  esquerda, quatro cards horizontais e linha inferior compacta reproduzem a
  composição aprovada; ícones do produto substituem os desenhados pela imagem.
- Branco/azul-gelo/marfim, cantos arredondados, sombra discreta, hierarquia de
  texto e espaçamento consistentes. Próximo passo compacto acima das ações.
- Adaptações intencionais: fontes/ícones reais do app; resumo inclui canceladas
  quando existentes; convite explica app ou ficha; sem ícone redundante no
  rodapé da Agenda. Logotipo e navegação existentes preservados.
- Widgets sem overflow em 1440/900/320 px; Agenda passa à largura completa
  no celular. A captura longa conserva a barra móvel fixa no ponto da janela.
- Pacientes reflow em 320 px com rótulos Cadastro/Acolhimento; Mensagens em
  1440/320 px sem overflow. Nenhum desenho clínico novo ou dado inventado.

## Interações e engenharia

- Sessão médica autenticada existente reutilizada no localhost; não houve novo
  login nesta rodada. Nenhuma mensagem, convite, consulta ou revisão enviada.
- Filtro Cadastro enviado → Todos conservou scrollY 175; data seguinte da
  Agenda conservou scrollY 0. Novo agendamento abriu com foco no painel, e foi
  fechado sem salvar. Menu móvel fechou ao navegar para convite de paciente.
- Rolagem de Mensagens foi limitada ao painel interno. Proteção de rascunho
  existente preservada em código; não houve teste novo de envio/paginação
  com conversa preenchida. O chat do paciente não recebeu os novos scroll=false.
- Hover dos widgets não muda geometria; redução de movimento prevista em CSS
  e na Agenda. Não houve medição quantitativa de CLS ou emulação de redução
  de movimento no navegador; não se afirma eliminar todos os saltos do produto.
- Build e tipos passaram; lint zero erros e um aviso preexistente em onboarding.
- 528/528 testes em `/tmp/vivance-widgets-qa.cjuG0S` (arquivos versionados do
  working tree + três arquivos novos; dependências locais). No checkout original,
  migrations duplicadas preexistentes ` 2.sql` provocam 124 falhas de SQL por
  coluna duplicada; os arquivos não foram removidos ou alterados.
- Revisão independente GPT-6 Sol medium verificou widgets/Home/Pacientes e
  seletor, sem regressão concreta. `git diff --check` passou.

## Limites e próximos gates

Triagem posterior do hook Impeccable: removidas duas bordas laterais de 3 px
preexistentes em `doctor-home.css` (home-work e cards de contexto). As bordas
neutras uniformes, os rótulos e as cores de identificação foram preservados.
Nenhuma regra ou arquivo recebeu supressão; nenhum dos dois achados ficou pendente.

Resultado somente local na branch `codex/checkin-alimentacao-intuitivos-20261011`,
sobre HEAD `9f9866b`. Sem PR/deploy novo. Publicação, aceite visual do usuário,
fluxos com outros papéis e aceite clínico exigem evidência separada. Não houve
migration, Edge Function, ampliação de permissão ou mudança em IA clínica.
