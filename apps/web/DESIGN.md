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
typography:
  headline:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "clamp(28px, 4vw, 35px)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  navigation:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "14px"
  label:
    fontFamily: "Arial, Helvetica, sans-serif"
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

## Overview

**Creative North Star: "Clareza para cuidar".**

Este guia descreve somente `apps/web`, a aplicação autenticada. Herda a identidade azul-marinho da VIVANCE e a aplica a telas operacionais claras, com estados explícitos e pouca decoração. O modo desta superfície é **Operate**: localizar uma área, entender sua disponibilidade e executar apenas as operações já conectadas.

Os documentos `PRODUCT.md` e `DESIGN.md` da raiz descrevem o contexto e o protótipo anterior. Este guia registra o que esta aplicação implementa; não transforma exemplos daquele protótipo em dados ou capacidades da aplicação autenticada.

## Colors

O azul-marinho estrutura a navegação e as ações primárias. O azul de ação marca links, foco e orientação. Texto principal usa ink; descrições usam muted. Branco sobre canvas separa as superfícies de trabalho, com border como limite discreto.

Ice identifica orientação e hover secundário. Quiet-surface distingue a lista vazia de conversas e acessos restritos. Disabled identifica operações futuras, sempre acompanhado de texto que explique a indisponibilidade. A seleção de navegação combina nav-selected com texto claro e `aria-current`.

## Typography

A fonte atualmente carregada é a pilha **Arial, Helvetica, sans-serif**. Geist não está carregada nesta aplicação. Novas telas devem acompanhar a fonte real até uma mudança explícita e verificada.

Títulos de página usam headline; títulos de seção usam title. O corpo parte de body; navegação e textos auxiliares ficam entre 13 e 15 px. Estados vazios usam título de 19 px e descrição de 15 px. Rótulos de contexto podem usar caixa alta e espaçamento de label. Números de calendário e contadores usam algarismos tabulares.

## Layout

A área da equipe tem menu lateral de 224 px e conteúdo flexível com largura máxima de 1380 px. O conteúdo recebe 36 px de espaço vertical e margem interna horizontal entre 20 e 48 px. O painel mantém **oito cartões de ações rápidas**, em quatro colunas, reduzidas para duas até 1150 px.

A área do paciente tem largura máxima de 1080 px. Sua navegação principal mantém **quatro entradas**: Hoje, Meu cuidado, Conversas e Evolução. Meu perfil fica separado, no contexto da clínica. O resumo usa duas colunas no desktop e uma até 760 px.

Calendário e conversas usam duas regiões adjacentes, empilhadas até 1050 px. Até 760 px, o menu da equipe vira uma faixa horizontal rolável; títulos e ações se empilham, painéis reduzem o espaço interno para 20 px e cabeçalhos de colunas vazias são ocultados. Abas podem rolar dentro da própria faixa. Preservar a página sem transbordamento horizontal estrutural desde 320 px.

## Elevation & Depth

As superfícies são planas: fundos sólidos e bordas finas separam navegação, painéis e conteúdo. A implementação atual não usa sombras nem desfoque de vidro. Não introduzir esses efeitos como se já fossem parte desta superfície.

## Shapes

Painéis usam curvas amplas de panel; botões, cartões de ação e navegação externa usam control; campos e abas usam field. A navegação interna do paciente usa compact. Bordas de 1 px mantêm a separação. Ícones lineares pequenos apoiam estados vazios sem competir com os títulos.

## Components

- **Botões:** altura mínima de 44 px, texto semibold e preenchimento primário navy. Secundários têm superfície branca e borda clara. O foco geral é contorno azul de 3 px com afastamento de 4 px; sobre navegação escura, usa contorno claro interno.
- **Campos:** altura mínima de 48 px, borda input-border, fundo branco, rótulo visível e foco explícito. O compositor futuro de mensagens usa textarea desabilitado, com descrição de indisponibilidade legível.
- **Painéis e estados vazios:** superfície branca e borda clara. O estado vazio traz ícone decorativo, título e descrição curta; usa pelo menos 260 px de altura no desktop e se adapta no celular. Ausência de integração deve ser descrita como indisponibilidade, sem sugerir consulta bem-sucedida a uma coleção vazia.
- **Aviso de desenvolvimento:** bloco claro antes da área de trabalho explica que os dados e as ações ainda não estão conectados.
- **Operações futuras:** usam botão realmente `disabled`, fundo disabled, opacidade integral e cursor de indisponibilidade. Não simular sucesso, envio ou persistência.

### Navegação e disponibilidade

A navegação é funcional: a equipe pode abrir Agenda, Atendimentos, Planos de cuidado, Acompanhamento, Documentos, Mensagens, Relatórios e Central da IA. As abas atualizam a seleção pela URL. O calendário permite mudar mês, selecionar um dia e voltar para hoje; não consulta nem grava compromissos.

O paciente pode navegar pelas quatro entradas principais e pelas áreas de orientações, tratamento, diário, consultas e documentos dentro de Meu cuidado. Essas áreas clínicas exibem estados vazios, sem pessoas, medidas, mensagens, planos ou arquivos fictícios.

Continuam conectados os fluxos existentes de autenticação, cadastro e consulta de dados demográficos de pacientes, histórico de ações autorizado para administradores e acesso ao próprio perfil. Sua disponibilidade segue as permissões existentes. Os novos módulos não habilitam agendamento, atendimento clínico, criação/revisão/publicação de planos, check-ins, upload, mensagens, exportação ou geração por IA.

## Do's and Don'ts

- **Do** manter português do Brasil, títulos concretos e estados compreensíveis sem depender de cor.
- **Do** preservar oito ações rápidas na visão geral da equipe e quatro entradas principais do paciente.
- **Do** distinguir o link que permite conhecer uma área do botão que executaria uma operação ainda indisponível.
- **Do** preservar foco visível, alvos de pelo menos 44 px de altura e navegação por teclado.
- **Don't** preencher módulos novos com mocks clínicos, contadores fictícios, gráficos ou atividade simulada.
- **Don't** apresentar uma área navegável como funcionalidade clínica entregue ou integração ativa.
- **Don't** usar ouro fora da identidade do logo, efeitos decorativos de IA ou uma nova identidade visual sem direção explícita.
- **Don't** transferir dados demonstrativos ou alegações de capacidade do protótipo da raiz para esta aplicação.
