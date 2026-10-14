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
    fontSize: "clamp(28px, 4vw, 35px)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  navigation:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "14px"
  label:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.1em"
rounded:
  compact: "8px"
  field: "10px"
  control: "12px"
  panel: "16px"
spacing:
  small: "8px"
  compact: "12px"
  regular: "16px"
  comfortable: "20px"
  section: "24px"
  panel: "28px"
  page: "36px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-unavailable:
    backgroundColor: "{colors.disabled}"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "28px"
---

# Sistema visual da aplicação autenticada VIVANCE

## Continuidade médica — 14/10/2026

Na área do médico, a decisão mais recente substitui o tratamento de sidebar e
widgets grandes: base branca, Figtree existente, azul/navy atual, uma navegação
principal inferior e conteúdo orientado à tarefa. As áreas dos outros papéis não
recebem automaticamente este tratamento. Referência viva: `doctor-workspace.css`.

Agenda mantém calendário e modos, com ações junto ao horário; Pacientes mantém
lista/busca como foco e convite separado; Mensagens prioriza a conversa, busca de
destinatários e contexto recolhível. Abas internas da ficha são secundárias, não
outra navegação global. Divisores discretos, superfícies selecionadas azul-claro,
controles de pelo menos44px de altura e sem movimento decorativo. Mensagens não
ganha carrossel: o carrossel manual pertence ao estado vazio da Hoje.

Implementação restrita a `.dv-modern`; detalhes e gates de publicação em
`docs/ENTREGA_HOJE_2026-10-14.md` na raiz. Seções históricas abaixo permanecem
referência para outras superfícies; esta direção prevalece nas áreas médicas.

## Overview

**Creative North Star: "Clareza para cuidar".**

Este guia descreve somente `apps/web`, a aplicação autenticada. Herda a identidade azul-marinho da VIVANCE e a aplica a telas operacionais claras, com estados explícitos e pouca decoração. O modo desta superfície é **Operate**: localizar uma área, entender sua disponibilidade e executar apenas as operações já conectadas.

`PRODUCT.md`, na raiz, descreve o contexto do produto. O `DESIGN.md` da raiz apenas aponta para este arquivo. Este guia é o sistema visual canônico da `apps/web` e não transforma exemplos do protótipo anterior em dados ou capacidades da aplicação autenticada.

## Colors

### Widgets médicos e fluidez — 11/10/2026

O Hoje médico apresenta oito ações independentes em grid de tamanhos variados:
Agenda alta, quatro atalhos horizontais, Planos/Documentos compactos e Equipe
horizontal. Branco, azul-gelo e marfim do convite mantêm a identidade Vivance.
Raio 22 px, intervalos 14 px e ícones lineares; em telas estreitas a Agenda
ocupa a largura inteira e as demais ações se reorganizam sem ocultar destinos.
Calendário e resumo vêm da data da clínica/contagens existentes, nunca de
estatísticas demonstrativas. O próximo passo vazio é uma faixa compacta.
Os outros papéis conservam suas ações existentes.

Interações usam transições de cor/borda/sombra de 180 ms, sem elevar ou mover
cards. Respeitar movimento reduzido. Indicadores de carregamento têm espaço
estável. Filtros de pacientes, data da Agenda e links de conversa da equipe
preservam a rolagem externa; a conversa controla somente sua área interna.
Foco programático na Agenda não deve disparar duas rolagens. No celular,
menu fecha na navegação e os estados da lista de pacientes ganham rótulos.

### Check-in e alimentação — 11/10/2026

Uma pergunta por etapa: Energia, Sono, Fome, Banheiro e recado opcional. Seleção
explícita avança, com aviso e edição pelo resumo; foco/hover não escolhem.
Ilustrações originais decorativas reforçam os rótulos, sem substituir texto.
Escalas 1–5 e banheiro Bom/Regular/Ruim preservam os contratos existentes.
Aplicação habilitada mantém etapa própria; demais dados ficam em expansão.

Reutilizar `MomentScale`, `MomentArtwork` e `MealKinds` na landing e nos fluxos
autenticados. Superfície clara, navegação navy, seleção dourada suave, campos
16 px, escolhas 12–13 px, títulos 22–26 px e alvos de pelo menos 44 px. Energia
tem mascote cansado e super-herói; sono, fome, banheiro e refeição têm figuras
próprias. Alimentação oferece foto, texto ou ambos, câmera/galeria e um envio.
Sem juízo de saúde, calorias ou análise automática. Demonstração pública anuncia
que nada é salvo. [Evidências](../../docs/UX_CHECKIN_ALIMENTACAO_2026-10-11.md).

O azul-marinho estrutura a navegação e as ações primárias. O azul de ação marca links, foco e orientação. Texto principal usa ink; descrições usam muted. Branco sobre canvas separa as superfícies de trabalho, com border como limite discreto.

Ice identifica orientação e hover secundário. Quiet-surface distingue a lista vazia de conversas e acessos restritos. Attention-surface, attention-border e attention identificam uma pendência que pede ação da pessoa, sem atribuir urgência clínica. Disabled identifica operações futuras, sempre acompanhado de texto que explique a indisponibilidade. A seleção de navegação combina nav-selected com texto claro e `aria-current`.

## Typography

A fonte carregada é **Geist**, por `next/font/google` em `app/layout.tsx`, exposta na variável `--font-geist-sans` e aplicada em `globals.css` como `font-family: var(--font-geist-sans), Arial, Helvetica, sans-serif`. **Arial é apenas o fallback**: em execução o navegador resolve `Geist, "Geist Fallback", Arial, Helvetica, sans-serif` e baixa o `.woff2`. Novas telas usam Geist.

Títulos de página usam headline; títulos de seção usam title. O corpo parte de body; navegação e textos auxiliares ficam entre 13 e 15 px. Estados vazios usam título de 19 px e descrição de 15 px. Rótulos de contexto podem usar caixa alta e espaçamento de label. Números de calendário e contadores usam algarismos tabulares.

## Layout

A área da equipe tem menu lateral de 224 px e conteúdo flexível com largura máxima de 1380 px. O conteúdo recebe 36 px de espaço vertical e margem interna horizontal entre 20 e 48 px. A visão geral do administrador mantém **oito cartões de ações rápidas** (`staffActions`), em quatro colunas, reduzidas para duas até 1150 px. O `Hoje` do médico também mostra **oito ações rápidas** (`staffActions`); a prévia fictícia usa seis atalhos (`staffShortcuts`). O menu principal continua oferecendo os destinos frequentes.

A área do paciente tem largura máxima de 1080 px. Sua navegação principal mantém **quatro entradas**: Hoje, Meu cuidado, Conversas e Evolução. Meu perfil fica separado, no contexto da clínica. O resumo usa duas colunas no desktop e uma até 760 px.

Calendário e conversas usam duas regiões adjacentes, empilhadas até 1050 px. Até 760 px, o menu da equipe vira uma faixa horizontal rolável; títulos e ações se empilham, painéis reduzem o espaço interno para 20 px e cabeçalhos de colunas vazias são ocultados. Abas podem rolar dentro da própria faixa. Preservar a página sem transbordamento horizontal estrutural desde 320 px.

## Elevation & Depth

As superfícies são predominantemente planas: fundos sólidos e bordas finas separam navegação, painéis e conteúdo. **Elevação existe e é discreta**, em três degraus recorrentes entre as 28 declarações de `box-shadow` do `globals.css`: `0 12px 32px rgba(3,19,45,.05)` para cabeçalho e blocos largos, `0 14px 36px rgba(3,19,45,.055)` para painéis de trabalho e `0 7px 18px` / `0 10px 28px` para elementos flutuantes e o dock do celular. **Desfoque de vidro existe em um único ponto:** `backdrop-filter: blur(18px) saturate(130%)` no painel do dock móvel. Usar esses degraus como estão; não criar novos níveis de sombra nem levar o vidro para cartões clínicos.

## Shapes

Painéis usam curvas amplas de panel; botões, cartões de ação e navegação externa usam control; campos e abas usam field. A navegação interna do paciente usa compact. Bordas de 1 px mantêm a separação. Ícones lineares pequenos apoiam estados vazios sem competir com os títulos.

## Components

- **Botões:** altura mínima de 44 px, texto semibold e preenchimento primário navy. Secundários têm superfície branca e borda clara. O foco geral é contorno azul de 3 px com afastamento de 4 px; sobre navegação escura, usa contorno claro interno.
- **Campos:** altura mínima de 48 px, borda input-border, fundo branco, rótulo visível e foco explícito. O compositor futuro de mensagens usa textarea desabilitado, com descrição de indisponibilidade legível.
- **Pendências:** cartões que pedem uma ação usam attention-surface, attention-border e texto attention, sempre com uma indicação textual da ação necessária; não representam alerta clínico.
- **Painéis e estados vazios:** superfície branca e borda clara. O estado vazio traz ícone decorativo, título e descrição curta; usa pelo menos 260 px de altura no desktop e se adapta no celular. Ausência de integração deve ser descrita como indisponibilidade, sem sugerir consulta bem-sucedida a uma coleção vazia.
- **Aviso de desenvolvimento:** bloco claro antes da área de trabalho explica que os dados e as ações ainda não estão conectados.
- **Operações futuras:** usam botão realmente `disabled`, fundo disabled, opacidade integral e cursor de indisponibilidade. Não simular sucesso, envio ou persistência.

### Navegação e disponibilidade

A navegação é funcional: a equipe pode abrir Agenda, Atendimentos, Planos de cuidado, Acompanhamento, Documentos, Mensagens, Relatórios e Central da IA. As abas atualizam a seleção pela URL. O calendário permite mudar mês, selecionar um dia e voltar para hoje; não consulta nem grava compromissos.

O paciente pode navegar pelas quatro entradas principais e pelas áreas de orientações, tratamento, diário, consultas e documentos dentro de Meu cuidado. Essas áreas clínicas exibem estados vazios, sem pessoas, medidas, mensagens, planos ou arquivos fictícios.

Continuam conectados os fluxos existentes de autenticação, cadastro e consulta de dados demográficos de pacientes, histórico de ações autorizado para administradores e acesso ao próprio perfil. Sua disponibilidade segue as permissões existentes. Os novos módulos não habilitam agendamento, atendimento clínico, criação/revisão/publicação de planos, check-ins, upload, mensagens, exportação ou geração por IA.

## Do's and Don'ts

- **Do** manter português do Brasil, títulos concretos e estados compreensíveis sem depender de cor.
- **Do** preservar as oito ações rápidas na visão geral do administrador e no `Hoje` do médico, além das quatro entradas principais do paciente.
- **Do** distinguir o link que permite conhecer uma área do botão que executaria uma operação ainda indisponível.
- **Do** preservar foco visível, alvos de pelo menos 44 px de altura e navegação por teclado.
- **Don't** preencher módulos novos com mocks clínicos, contadores fictícios, gráficos ou atividade simulada.
- **Don't** apresentar uma área navegável como funcionalidade clínica entregue ou integração ativa.
- **Don't** usar ouro fora da identidade do logo, efeitos decorativos de IA ou uma nova identidade visual sem direção explícita.
- **Don't** transferir dados demonstrativos ou alegações de capacidade do protótipo da raiz para esta aplicação.


## Briefing médico — 10/10/2026

### Padrão de leitura médica — PR/Preview de 10/10/2026

Nas superfícies médicas, mostrar primeiro o cabeçalho com identidade e contexto,
depois os seletores retangulares e, por fim, o conteúdo da seleção. Os seletores
compartilham estados ativos, foco visível, alvos de pelo menos 44 px e rótulos
textuais; contagens só aparecem quando vêm dos dados disponíveis. Navegação por
URL preserva o caminho e os parâmetros relevantes. Abas mantêm os painéis
montados para conservar formulários e rascunhos. Seleção de etapa não substitui
autosave, revisão ou finalização.

No Hoje médico, a consulta selecionada tem quatro abas: **Resumo**, **Exames e
documentos**, **Evolução** e **Solicitações**. O resumo abre primeiro; não há aba
“Preparar”; o botão que antes abria a Agenda foi removido. Em exames, uma faixa
de quatro filtros mostra a comparação com a referência do próprio laudo
(**Todos**, **Fora da referência**, **Dentro da referência**, **Sem comparação**).
O seletor secundário de revisão oferece **Todas**, **Para
conferir**, **Conferidas**, **Descartadas**). “Fora” pode ser refinado em acima ou
abaixo. Cores da comparação e estado de revisão são independentes; toda
indicação tem texto e nunca representa diagnóstico ou prioridade clínica. A
revisão de cada resultado fica abaixo da linha factual e conserva o acesso à
fonte original. A linha expandida usa duas colunas internas no desktop, fonte e
conferência, passando a uma coluna até 900 px sem reduzir a largura da tabela.

No **Resumo** desta rodada, cards neutros/brancos substituem o bloco azul
contínuo. Em desktop, objetivo e pendências ocupam cerca de um terço da largura,
com relatos nos dois terços restantes; fatos aparecem em grid. No celular,
as áreas se empilham em uma coluna. Os rótulos vêm da fonte disponível, sem
atribuir autoria nova. A hierarquia interna usa título do card em 18 px,
rótulos em 14 px, conteúdo em 16 px e fontes em 13 px; espaçamentos recorrentes
de 16, 20 e 24 px mantêm a leitura entre elementos, cards e seções.

Enquadramento: o Hoje tem largura máxima de 1440 px, contexto da consulta
compacto e seletores com rótulo e contagem na mesma linha. A faixa usa 56 px
sem contagem e mínimo de 60 px com contagem; textos extensos podem aumentar
a altura uniforme da faixa. Etapas continuam numeradas antes do rótulo.
Cabeçalho e ações não acumulam margens. Em telas estreitas, o controle de
expansão tem ícone e alvo de 44 px; o nome e os metadados usam toda a largura
disponível, sem avatar decorativo. Seletores ímpares completam a última linha.
Na composição sintética de 1330×625, os cards começam em 262 px a partir do
topo do briefing. Corpo e fontes preservam a hierarquia acima.

Agenda, ficha, convites, revisão dos envios, teleconsulta, atendimento e receitas
usam o mesmo vocabulário de seleção, respeitando papel, vínculo, URL, paginação
e rascunhos existentes. Filtros da lista de pacientes atuam **nesta página**,
sem sugerir contagem global. O padrão é uma mudança local de interface, sem
novos contratos de banco ou funções clínicas. [PR #119](https://github.com/vitormilanez/instituto-vivance/pull/119)
integrado e publicado tecnicamente em [institutovivance.app](https://institutovivance.app),
com testes e release da `main` aprovados. Login médico real com Guilherme passou
no Preview e no domínio final. Aceite médico continua separado;
detalhes nas [evidências](../../docs/UX_MEDICA_PADRAO_2026-10-10.md).
A direção desta rodada foi Product Design, sem Impeccable.

A base anterior do briefing (#112) usa um painel de leitura com cabeçalho compacto,
objetivo em destaque, relatos literais e uma seção única de exames/documentos.
Nessa base, azul claro delimitava o resumo; os cards neutros descritos acima
substituem esse bloco na implementação publicada. Navy identifica marca e ações. Cor não classifica
gravidade nem prioridade. Objetivo estruturado conserva autoria; quando ausente,
o objetivo do cadastro inicial conserva sua fonte e não se repete nos relatos.
Pré-consulta completa, comparação, históricos, cadastro e lista de arquivos
ficam sob expansões explícitas. Resultados conferidos mantêm fonte; extrações
pendentes aparecem apenas como contagem. Contagem indisponível não é zero.

Na base #112, fatos e peso ocupavam a coluna interna de 300–350 px; a
distribuição atual do Resumo segue a divisão um terço/dois terços acima. As filas dos demais pacientes ficam depois do
briefing, sem repetir o selecionado. Vazios clínicos são linhas compactas.
Receitas abrem em dialog lateral com título, fechamento por Escape e foco
restaurado, sem abas internas. Peso único aparece com valor, data e origem,
sem gráfico ou controles sem utilidade; o cadastro idêntico não se repete.
Séries preservam datas proporcionais, seleção acessível, controles de 44 px
e tabela textual, inclusive estabilidade entre datas. A prévia sintética
é exclusiva de desenvolvimento e não constitui integração validada.

### Leitura e espaço — 07/10/2026

O resumo do médico separa falas literais, solicitações sem resposta e documentos
para revisar. Títulos repetidos de documentos são distinguidos pela posição e
data; o link realça a linha de destino. O card da consulta pode ser minimizado
para identidade e horário, trazendo o conteúdo seguinte para cima sem navegação.
O controle mantém texto visível e usa disclosure nativo.

Na troca de áreas, a navegação aguarda o destino preservando a tela atual e
mostra atividade no link acionado. O compositor das mensagens deixa referências
opcionais recolhidas; no desktop, a lista aberta flutua sobre a conversa para
manter o histórico e o envio visíveis. No celular, as opções expandem no fluxo.

### Teleconsulta preparada — 14/10/2026

Teleconsulta permanece uma superfície **Operate** do workspace médico: branco,
navy, Figtree e uma única navegação inferior. O cabeçalho, paciente, horário,
estado e ação seguinte ficam no mesmo fluxo; ações de abrir o Meet, preparar a
sala, abrir atendimento e acessar a transcrição ficam junto da consulta. Foco
visível, alvos de pelo menos 44 px e foco no formulário respeitam teclado e
`prefers-reduced-motion`.

Estados não são misturados: `unconfiguredGoogle`/indisponibilidade técnica,
conexão individual, autorização específica, texto original imutável e revisão
médica têm cópia e ações próprias. O fallback manual permanece claro. A
transcrição é literal e somente leitura; revisão não publica ao paciente nem
preenche o registro. Não adicionar captura automática, gravador, texto ao vivo,
IA ou síntese nesta superfície.

O `BrowserTranscriptPanel` é a opção gratuita e manual preparada para desktop:
captura por microfone ou por aba + microfone em Chrome/Edge 135+, sempre depois
do consentimento, salvando o original e a revisão separadamente. Recursos são
encerrados ao finalizar e o retry fica congelado; o provider de voz real não
foi exercitado. O caminho `NativeMeet` permanece preparado, mas desativado por
flag.

Revisão visual desktop aceita o escopo preparado (`ship at prepared scope`).
CSS mobile a partir de 320 px foi validado sem overflow; abaixo de 400 px, o
dock usa os rótulos visuais **Vídeo** e **Chat**, mantendo `aria-label` completo.
Estados conectado/importado e o provider de voz real permanecem pendentes de
exercício técnico, conforme [o contrato da Teleconsulta](../docs/TELECONSULTA_GOOGLE_MEET.md).
