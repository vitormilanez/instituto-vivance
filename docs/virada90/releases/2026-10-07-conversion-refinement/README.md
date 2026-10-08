# Virada 90 — clareza e conversão: publicação de 07/10/2026

Publicado em [landing](https://institutovivance.app/virada90) e
[apresentação](https://institutovivance.app/virada90/conhecer).

## Artefato e publicação

- [PR #91](https://github.com/vitormilanez/instituto-vivance/pull/91), merge
  `f1a7a575fc036aade44db4c8759bf2a834ef51ab`.
- [CI PR](https://github.com/vitormilanez/instituto-vivance/actions/runs/37719604311),
  [CI main](https://github.com/vitormilanez/instituto-vivance/actions/runs/37719747764)
  e [release](https://github.com/vitormilanez/instituto-vivance/actions/runs/37719747974)
  concluídos com sucesso. Etapas efetivas de migration, Edge Functions,
  promoção e confirmação do domínio no workflow foram ignoradas por falta de
  configuração protegida. Banco e Edge Functions não necessários neste lote;
  publicação realizada pelo caminho manual autorizado.
- Vercel `vtr-consulting/instituto-vivance`, projeto
  `prj_ligeZuFRycRXA21u5rRzaLAORTrI`, Root Directory `apps/web`, Node 24.
  Build automático Git do merge: `dpl_CX5tbs3FCgC9Jm94goAnHoikGTmj`,
  production/READY, criado em 08/10 às 02:49:24 UTC
  (07/10 às 23:49:24 em Brasília),
  https://instituto-vivance-ogo3nm9ik-vtr-consulting.vercel.app .
- Antes da promoção, seis arquivos estáticos foram comparados byte a byte com
  o merge por `vercel curl` autenticado. `/virada90/` normaliza para a rota sem
  barra com HTTP 308; `/virada90` entrega o HTML conferido com HTTP 200.
- Promote CLI concluído. Inspeção de `institutovivance.app` e
  `instituto-vivance.vercel.app` confirmou o mesmo novo deployment. Principal
  retornou HTTP 200 nas duas páginas e login; secundário, HTTP 307 para o
  principal com caminho preservado. Seis arquivos públicos continuam idênticos
  ao merge. [Requests e hashes](http-checks.json), incluindo IDs de request.
- Reversão disponível no artefato anterior `dpl_dTKFioAg97ySk7ZNBnCS4YYQdzSj`,
  https://instituto-vivance-hffaqfj08-vtr-consulting.vercel.app . Nenhuma reversão
  executada. Documentação posterior não exige nova promoção da aplicação.

## Mudança e evidência

Implementação delimitada por dois agentes `gpt-6.1-sol`, raciocínio medium,
com revisão integrada do principal. Landing: primeira leitura mais curta,
quatro detalhes nativos, diferença presencial/online na abertura, oito entradas
com o mesmo rótulo e alvos de toque ampliados. Apresentação: seletor completo
no celular, personalização opcional recolhida, plano inicial separado do
acompanhamento e informações originais preservadas em detalhes acessíveis.
Cinco etapas, valores somente no final, vídeo original somente na landing,
consentimento livre e rascunho de WhatsApp editável permanecem.

441 testes, lint, tipos e build passaram com Node 24. Navegador local em
320/390/768/1440px: landing e cinco etapas sem overflow; detalhes, escolha
opcional, avanço/volta, teclado/foco, atalho fixo e movimento reduzido
conferidos. Handoff local interceptado, sem abrir WhatsApp ou enviar mensagem.
O [parecer local](../../../../apps/web/.impeccable/review/virada90-conversion-refinement/evidence.md)
foi escrito antes da publicação; este registro confirma o estado final.

Navegador público confirmou as oito entradas, distinção de formatos, vídeo
original, entrada pelo hero, detalhes originais e etapas 1/3/5 em 390/1440px.
Atalho permaneceu visível após rolagem e levou aos valores finais. Recusa de
medição preservada; nenhum script Google carregado ou erro de página.
[Resultados do navegador](browser-checks.json). Na primeira tentativa, o
ensaio selecionou tópicos antes de o script diferido terminar de carregar;
aguardar o evento de carregamento e confirmar a etapa ativa resolveu o
problema do ensaio, sem alteração no código publicado.

## Limites e acompanhamento

Layouts locais com detalhes fechados ficaram aproximadamente 18% menores na
landing e 31% menores na etapa 3 em 390px. Isso mede altura, não conversão.
Sem ensaio em aparelho físico ou leitor de tela nesta rodada. Nenhuma mensagem
real de QA, conversão Google ou alteração de schema, campanha, budget,
checkout, integração Pulse ou fluxo clínico. Chegar ao final não prova leitura
integral nem venda. Acompanhar contatos recebidos, qualificação, agendamento e
matrícula no CRM para avaliar a hipótese comercial.

[Asana](https://app.asana.com/0/1218382636610484/1219288382329047).
