# QA — fechamento publicado e transcrição gratuita (14/10/2026)

Final result: **passed** para a entrega técnica sintética publicada no PR137,
aplicação `a1d2153`, deployment `dpl_5g2yuAvA3yMAH2S8yzY4CFk9JDHD`.
O gate remoto de outreach foi resolvido: migration aplicada e uma mensagem QA
enviada/recebida com replay sem duplicar, só para o destinatário autorizado.
Não representa aceite clínico ou teste de áudio real.

- Navegação publicada médico: Hoje → Pacientes → ficha → Agenda → Mensagens →
  Teleconsulta, com recarga/original/revisão. Todas as áreas conferidas em mobile;
  Pacientes/ficha/Agenda/Mensagens/Teleconsulta `innerWidth=scrollWidth=320`.
- Impeccable orientou toque/legibilidade e revisão final: rótulos do dock abaixo
  de400px usam Vídeo/Chat sem perder nomes acessíveis; formulário/original não
  estouram a tela. Revisão independente confirmou o fix e disposição `ship`.
- 591 testes/CI, lint, tipos/build; Astra confirmou cinco correções de captura/
  retry/permissões/limites. Nativa do Meet continua OFF e OAuth não configurado.
- Capturas locais do domínio, fora do Git:
  `output/teleconsulta-meet-20261014/release/*-publicado.png`.
- Nenhuma nova supressão; os dois acentos laterais do hook anterior em
  `doctor-home.css` já haviam sido removidos. Divisórias neutras de1px mantidas.
- Áudio do fornecedor, aparelho físico e chamada real com dois participantes
  não validados; testes determinísticos não comprovam precisão da transcrição.
  [Registro final](docs/ENTREGA_WORKSPACE_E_TRANSCRICAO_2026-10-14.md).

---

# Histórico local — continuidade em Agenda, Pacientes e Mensagens (14/10/2026)

Final result: **passed** para o slice visual local. Não publicado; aceite do
usuário separado. O gate remoto de envio coletivo da entrega anterior continua
**blocked**, sem alteração neste slice.

## Comparação e evidência

Fonte: [Hoje aprovada implementada](output/hoje-redesign/hoje-auth-desktop.jpg).
Comparada às capturas renderizadas, não a um protótipo inexistente das três áreas.
Adaptação funcional intencional: calendário, lista e conversa mantêm suas tarefas.

- [Agenda desktop](output/hoje-redesign/agenda-modern-desktop.png),
  [mobile](output/hoje-redesign/agenda-modern-mobile.png),
  [semana tablet](output/hoje-redesign/agenda-modern-tablet.png).
- [Pacientes desktop](output/hoje-redesign/pacientes-modern-desktop.png),
  [mobile](output/hoje-redesign/pacientes-modern-mobile.png).
- [Mensagens desktop](output/hoje-redesign/mensagens-modern-desktop.png),
  [mobile](output/hoje-redesign/mensagens-modern-mobile.png).

## Rodada agrupada e confirmação

- Tipografia Figtree, azul existente, branco e ícones Lucide preservados; títulos
  equivalentes, filtros leves e separadores de1px. Nenhum ativo novo necessário.
- Hierarquia: calendário/horário na Agenda, lista em Pacientes, conversa em
  Mensagens. Contexto secundário recolhível; convites fora da lista principal.
- CSS aferido1440/320 nas três páginas, semana900; scrollWidth=innerWidth nas
  medições móveis e tablet. Capturas respeitam o zoom existente do navegador.
- Corrigidos na rodada: orientação enganosa no filtro vazio e botão Hoje que
  quebrava a navegação de data em três linhas no celular. Confirmação dos controles
  móveis: Anterior/Hoje/Próximo no mesmo eixo, sem overflow global.
- Ações: filtro vazio e retorno, abrir convite e voltar, Semana/Dia, formulário
  abrir/fechar sem salvar, Agenda→ficha, busca local sem resultados/limpar,
  contexto expandido e recolhido. Nenhum envio nem agendamento criado.
- Labels/semântica existentes, foco, contraste dos estados selecionados e redução
  de movimento preservados. Não realizada auditoria completa de leitor de tela.
- Guardas de rascunho preservadas; teste do diálogo inconclusivo na automação.
  Console observado sem erros. 27 testes, lint, tipos e build passaram.
- Nenhuma regra suprimida. Bordas divisórias finas são intencionais, não acentos
  laterais decorativos. Diferenças de conteúdo são dados existentes, não mocks.

---

# QA — Hoje, ficha médica e incentivo (14/10/2026)

Final result: **blocked** para liberação completa do disparo coletivo: a migração
está apenas local e não houve envio/recebimento no ambiente conectado. A revisão
visual e navegação local descritas abaixo passaram. Publicação não realizada.

## Referências e comparação

- Hoje aprovada: `/Users/vitormilanez/.codex/generated_images/01a12ce7-3b52-7400-9d4f-7a71bf83f09f/exec-673acdf0-7a12-4288-bc71-34fb0c958d04.png`.
- Paciente aprovado: `/Users/vitormilanez/.codex/generated_images/01a12ce7-3b52-7400-9d4f-7a71bf83f09f/exec-8543a08a-162e-44d9-9812-2cfc6f829351.png`.
- Fonte e captura renderizada inspecionadas juntas. Avaliação de composição,
  hierarquia, identidade e estados; não comparação pixel a pixel. Referências
  1536×1024, desktop CSS aferido em 1535×1024; navegador preserva zoom existente
  (DPR 0,9), capturas raster podem conter margem. Captura final em largura CSS1422.
- Evidências: [Hoje autenticado](output/hoje-redesign/hoje-auth-desktop.jpg),
  [paciente desktop](output/hoje-redesign/paciente-auth-desktop.jpg),
  [paciente 320px](output/hoje-redesign/paciente-320.jpg),
  [dia vazio completo](output/hoje-redesign/hoje-vazio-final.jpg),
  [carrossel 320px](output/hoje-redesign/hoje-vazio-320.jpg).

## Resultado da rodada agrupada

- Hierarquia: consultas do dia e acesso à ficha substituem o briefing grande na
  Hoje; três indicadores compactos e pendências secundárias. Navegação principal
  apenas inferior; Mais preserva os destinos adicionais.
- Paciente: objetivo e origem, documentos, evolução real e solicitações. Abas
  internas mantidas para preservar funcionalidades, sem duplicar navegação global.
- Adaptações intencionais: Figtree/ícones existentes; não reproduzir números,
  tendências ou resultados fictícios da imagem. Um único peso real não produz
  curva. Pacientes ativos têm barra da situação atual, sem falso histórico.
- Dia vazio: CTA Agenda e três mensagens manuais, sem autoplay, texto editável,
  revisão e confirmação explícita. Movimento180ms, reduzido conforme preferência.
- Corrigidos: pesquisa oculta no celular por estilo herdado; overflow de elemento
  acessível dentro da tabela (contêiner relativo); nomes UUID; duplicatas no total
  de revisão; estados de falha desconhecidos versus ausência; objetivo antigo
  aguardando resposta; proteção de saída durante preparo/envio.
- Após recarga, paciente e dia vazio em320px: scrollWidth=innerWidth=320. Tabela
  de documentos conserva rolagem interna. Desktop:1535=1535 sem overflow global.
- Login real local médico, Hoje→paciente→Conferir fonte abriu Documentos com117
  resultados existentes. Agenda e Mensagens abriram; carrossel mudou de1/3para2/3;
  Mais abre/fecha por navegação, clique externo e Escape. Console observado sem
  erros. Nenhuma mensagem, consulta ou aprovação clínica criada neste teste.
- Revisão independente Astra: quatro achados delimitados corrigidos. Nenhuma
  supressão nova de regra. Separadores de1px mantidos como divisão de áreas,
  não bordas decorativas espessas em cards.

## Validação técnica e gate restante

Suite limpa567/567, tipos/build finais passaram e lint zero erros/um aviso anterior;
testes SQL de outreach locais. Duplicados anteriores ` 2.sql`
quebram o bootstrap do checkout; cópia limpa evita duplicação sem apagar arquivos.
Ver [registro da entrega](docs/ENTREGA_HOJE_2026-10-14.md) para escopo e limitações.
Falta aplicar contrato no ambiente confirmado e verificar entrega/recebimento
sintéticos antes da publicação. Aceite do usuário e Gate P continuam separados.

---

# Histórico — widgets médicos e fluidez (11/10/2026)

Final result: **passed** para implementação e verificação técnica delimitadas,
incluindo o domínio publicado. Aceite do usuário e aceite clínico são separados.

## Publicação e verificação no domínio — 19h

PR131/main `5251384dbd1a20289d3f8d0910581ff2cffe8517`, deployment
`dpl_HcUg7BHmuz8ZiWThQBC9WybD8uN8` READY/production. Ambos os domínios e
targets.production conferidos; três HTTP200 no principal e três 307 no
secundário. CI e release verify passaram; backend/promoção de CI skipped,
frontend publicado pela integração Git da Vercel. Sem migrations/Edge novas.

Após aplicação sobre a main atual: 538 testes/tipos/build em Node24.21.0;
lint zero erros/um aviso anterior. Preservadas as melhorias recentes de convites.
Sessão médica existente reutilizada no domínio (sem novo login), recarga
preservada, oito destinos abriram. Filtro Cadastro → Todos manteve scrollY
271,5; Agenda passou a 12/10 mantendo scrollY0. Formulário recebeu foco sem
rolagem dupla e foi fechado sem salvar. Mensagens mostrou conversa/contexto QA
e compositor vazio; menu móvel fechou ao abrir o convite. Sem envios nesta rodada.

Widgets, Pacientes e Mensagens sem overflow em 1440/320px; screenshots com
viewport CSS aferido em DOM e devicePixelRatio1:
[desktop](output/widgets-fluidez-20261011/site-publicado-desktop.png),
[320px](output/widgets-fluidez-20261011/site-publicado-320.png).
Console não registrou erros; consulta limitada a10min de erros do deployment
retornou zero entradas. Envio/paginação com conversa preenchida não testados.
A tentativa de conferir guarda de rascunho foi inconclusiva pela interação do
navegador; não se declara esse caminho validado. Nenhum texto foi enviado.

As seções abaixo preservam as evidências da implementação local anterior.

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

Estado na rodada inicial: somente local na branch `codex/checkin-alimentacao-intuitivos-20261011`,
sobre HEAD `9f9866b`. Sem PR/deploy novo. Publicação, aceite visual do usuário,
fluxos com outros papéis e aceite clínico exigem evidência separada. Não houve
migration, Edge Function, ampliação de permissão ou mudança em IA clínica.
# Teleconsulta / Meet — 14/10/2026

- Disposition independente: `ship`, somente desktop local preparado.
- Hierarquia branca/azul, navegação inferior única, ações junto ao agendamento,
  formulário com foco e captura desativada sem configuração; fallback preservado.
- Hook sem achados determinísticos nos alvos editados; nenhuma supressão nova.
- Astra: lote parcial e callback antigo corrigidos; fixes confirmados.
- 21 testes focados, lint, build Webpack e TypeScript passaram. Nenhuma sala,
  consulta ou mensagem criada no navegador; sem OAuth/migration/publicação.
- Mobile e estados conectado/importado não aceitos visualmente nesta rodada.
  Controle de viewport não alterou a aba isolada; captura foi corretamente
  identificada como desktop, sem alegação de teste móvel.
- Evidência: `output/teleconsulta-meet-20261014/teleconsulta-desktop.png`.
- [Ativação e limites](docs/TELECONSULTA_GOOGLE_MEET.md).
