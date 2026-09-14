---
name: "VIVANCE"
description: "Uma área de cuidado clara, elegante e orientada ao que o profissional precisa fazer agora."
status: "Referência visual preservada; a implementação atual está em apps/web."
colors:
  midnight: "#03132d"
  midnight-soft: "#082553"
  action-blue: "#124da0"
  action-blue-hover: "#0f3f83"
  deep-ink: "#071a3a"
  body-ink: "#405675"
  muted-ink: "#61718a"
  canvas: "#f6f9fe"
  white: "#ffffff"
  ice: "#edf3fb"
  border: "#dbe4f0"
  gold-logo: "#d7a33c"
  amber-soft: "#fff0ca"
  amber-ink: "#77500a"
  rose-soft: "#fdecea"
  rose-ink: "#9c453f"
typography:
  headline-mobile:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "2.2rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.3
  action:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.25
  brand:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.25
  support:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.25
  badge:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.5625rem"
    fontWeight: 700
    lineHeight: 1
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
---

# Sistema visual VIVANCE

## Direção

**Ideia central: “Clareza para cuidar”.**

A área do profissional deve parecer segura e calma. O azul-marinho cria identidade e contraste; o restante da tela fica claro para que consultas, pendências e ações sejam lidas rapidamente. A aparência de vidro é reservada aos menus e às barras. Cartões de trabalho são quase planos, com borda fina e sombra discreta.

O produto não deve parecer um aplicativo de IA. A tecnologia aparece como apoio dentro do trabalho do médico, sempre com fonte, estado e revisão humana.

## Regras de cor

- **Azul-marinho `#03132d`:** menu lateral, ação principal e texto de maior destaque.
- **Azul-marinho suave `#082553`:** hover, seleção e pequenas variações de profundidade.
- **Azul de ação `#124da0`:** links, foco, contadores e informação selecionada.
- **Azul-claro `#edf3fb`:** linha selecionada, avatar e áreas de orientação.
- **Fundo `#f6f9fe`:** tela principal, sem grande degradê.
- **Branco `#ffffff`:** cartões e áreas de leitura.
- **Dourado `#d7a33c`:** somente no logo oficial. Não usar como cor decorativa comum.
- **Âmbar e rosa:** apenas para estados que pedem revisão, sempre acompanhados de texto.

## Transparência

- Menu lateral, barra superior e menu móvel podem usar fundo translúcido e desfoque.
- O efeito deve continuar legível quando o desfoque não estiver disponível.
- Cartões clínicos não devem parecer vidro; usam branco quase sólido.
- Evitar brilhos fortes, bordas luminosas ou grandes manchas em degradê.

## Tipografia

- Geist em toda a área profissional.
- Título principal entre 32 e 35 px no computador; 30 a 32 px no celular.
- Títulos de cartão entre 16 e 20 px.
- Texto comum entre 14 e 16 px.
- Rótulos curtos podem usar caixa alta e espaçamento leve entre letras.
- Não usar fonte editorial em tabelas, botões, números ou rotinas clínicas.

## Espaço e forma

- Ritmo base de 4 px.
- Distância comum entre blocos: 20 a 24 px.
- Cartões: 16 px de arredondamento.
- Botões e menus: 12 px de arredondamento.
- Alvos de clique e toque: pelo menos 44 px.
- Sombra discreta; borda clara continua sendo a separação principal.

## Estrutura do painel do médico

1. Identidade VIVANCE e perfil do médico.
2. Menu principal curto e previsível.
3. Saudação compacta com data e aviso de dados de exemplo.
4. Próxima consulta com uma única ação principal: **Atender agora**.
5. Consultas do dia em lista fácil de percorrer.
6. Pessoas que precisam de atenção em uma coluna de apoio.

## Texto da interface

- Usar português do Brasil e palavras de uso comum.
- Preferir “histórico” a “dossiê” e “acompanhamento” a “visão longitudinal”.
- Explicar estados pelo que aconteceu: “Pré-consulta pendente”, “Relatório pronto para revisar”.
- Não chamar atenção de “urgência” quando o produto só ordena itens para revisão.

## Estados e segurança

- Cor nunca é a única forma de explicar um estado.
- A IA pode organizar e sugerir perguntas, mas não diagnostica, prescreve, altera doses ou decide conduta.
- Todo rascunho deve mostrar fonte e exigir revisão do profissional.
- Dados do protótipo são identificados como exemplos e não representam pessoas reais.

## Responsivo

- No computador, menu lateral fixo e conteúdo em duas colunas quando houver espaço.
- No celular, marca compacta, menu horizontal rolável e conteúdo em uma coluna.
- A próxima consulta e a ação principal aparecem antes das listas.
- Nenhuma rolagem horizontal estrutural a partir de 320 px.

## Fazer

- Usar azul-marinho forte em poucas áreas decisivas.
- Deixar o branco e o espaço organizarem o conteúdo.
- Manter uma ação principal clara em cada bloco.
- Preservar foco visível, contraste e uso por teclado.

## Evitar

- Grandes degradês, brilho neon e excesso de transparência.
- Cartões demais, todos com o mesmo destaque.
- Estrelas, robôs ou outros sinais visuais genéricos de IA.
- Termos técnicos quando uma palavra simples comunica melhor.
- Dourado fora do logo ou sem uma função real.
