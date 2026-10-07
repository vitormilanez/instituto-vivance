# Virada 90 — acesso à apresentação antes do contato

Publicado em 07/10/2026. O usuário solicitou mais entradas para a apresentação
e menos encaminhamento ao WhatsApp antes de entender o programa.

## Código e verificações

- [PR #87](https://github.com/vitormilanez/instituto-vivance/pull/87),
  merge `a436d3004379ec9da18ec14ff4573b7aa57c0895`.
- Oito entradas para `/virada90/conhecer`, com hero e menu já no início.
  Cards de formato deixam de abrir WhatsApp. Bloco editorial de descoberta,
  vídeo e identidade visual preservados. Valores e contato continuam ao final,
  acessíveis pelo seletor de tópicos sem leitura obrigatória.
- Evento consentido `virada90_presentation_entry` com enum de posição;
  não dispara conversão Ads, contato recebido ou dados de respostas.
- 440 testes, lint, typecheck e build locais aprovados com Node 24.21.0.
- [CI do PR](https://github.com/vitormilanez/instituto-vivance/actions/runs/37686012753),
  [Foundation da main](https://github.com/vitormilanez/instituto-vivance/actions/runs/37686276799)
  e [release](https://github.com/vitormilanez/instituto-vivance/actions/runs/37686277864)
  aprovados. No release, migration/Edge Functions e promoção efetiva foram
  ignoradas por configuração protegida ausente. Não há migration neste slice.

## Deployment e domínio

Equipe `vtr-consulting`, projeto `instituto-vivance`
(`prj_ligeZuFRycRXA21u5rRzaLAORTrI`), Root Directory `apps/web`.

Deployment `dpl_6sQpUfwvD6nSGCWYhau5FJ554uY4`, `target=production`, `READY`,
com metadata do mesmo merge SHA. URL técnica:
`https://instituto-vivance-cur8uj6xm-vtr-consulting.vercel.app`.
Antes de promover, `vercel curl` autenticado conferiu HTTP 200 e conteúdo
idêntico à main para landing, apresentação, CSS e core da medição.

Promoção manual concluída pelo CLI. Ambos os domínios resolvem para esse ID:
`institutovivance.app` e `instituto-vivance.vercel.app`. A landing principal
respondeu 200 nas três requisições (TTFB 0,057–0,062s, `x-vercel-id` em gru1);
o secundário respondeu 307 para o principal em todas. `/virada90/conhecer`
respondeu 200. HTML, CSS e core da medição públicos correspondem à main.

Artefato anterior preservado para rollback:
`dpl_2VxpTEMTUimABXpCW3Kyy1xS9K2y`,
`https://instituto-vivance-4u1j8p5tw-vtr-consulting.vercel.app`.

## Percurso público e limites

Navegador em 320/390/1440px confirmou oito destinos internos, nenhum link
direto para WhatsApp na landing e ausência de overflow horizontal. Hero e
card online abriram a apresentação. Após carregamento, o seletor abriu o
tópico dez com valores e `Conversar pelo WhatsApp` visível. Recusa de medição
preservou o percurso e nenhum SDK Google foi carregado. Nenhuma mensagem,
evento de conversão ou identificador sintético foi enviado ao Google.

A conferência comprova navegação/publicação, não qualidade de contato, venda,
recebimento de evento no GA4 ou mensagem no Pulse. A hipótese deve ser lida
com agendamentos e resultados no CRM. Orçamentos, lances, anúncios e webhook
não foram alterados neste release. PR #79 segue separado/desligado; nenhum
dado real entrou no banco clínico. [Contrato do funil](../../FUNIL_COMERCIAL_LEVE.md).
