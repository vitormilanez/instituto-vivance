# Virada 90 — medição Google e WhatsApp

Decisão e implementação em 03/10/2026. O usuário pediu tags para a campanha e
indicou o projeto `vtr-consulting/instituto-guilherme-martins` como fonte.

## Destinos conferidos

O site público `www.institutoguilhermemartins.com.br` carrega o container
`GTM-W582L6XS`. O recurso publicado desse container, versão 25, confirmou:

| Uso | Destino |
| --- | --- |
| Google Analytics 4 | `G-L8QMHVRV68` |
| Google Ads | `AW-818747876` |
| Conversão de clique em WhatsApp | `AW-818747876/zzjqCNb0r4wYEOSztIYD` |

A conversão acima é a tag disparada pelo evento de clique em URL contendo
`wa.me`. As outras duas labels do container pertencem a formulário/obrigado e
não foram reutilizadas. Os identificadores são públicos, não credenciais.

O container completo também injeta widget Pulse, tags Meta e remarketing.
A implementação usa somente os destinos Google por `gtag`, sem importar
esse pacote de integrações para o Vivance.

## Contrato de medição

- Só `/virada90` e `/virada90/conhecer`, no domínio
  `https://institutovivance.app`, podem carregar o SDK externo. Localhost,
  Preview, login e áreas clínicas não produzem eventos reais.
- Modo básico de consentimento: antes do aceite ou após recusa, nenhum SDK
  Google é carregado. Preferência versionada em cookie de 180 dias, restrito
  a `/virada90`, com reabertura em “Preferências de cookies”. Retirar o aceite
  recarrega a página para remover os listeners do fornecedor. Google Signals
  e personalização de anúncios ficam desabilitados.
- `page_view`: URL pública com parâmetros de campanha permitidos; sem
  fragmento ou parâmetros arbitrários. Referrer externo contém só a origem;
  referrer clínico do app é omitido.
- `virada90_presentation_start`, `virada90_step_view` (número de 1 a 5 desde a revisão de 07/10) e
  `virada90_presentation_complete` (visualização da etapa final, uma vez por
  página). Ir diretamente ao final também conta como visualização final;
  não comprova leitura de todos os tópicos.
- `virada90_presentation_entry`: navegação da landing para a apresentação,
  com posição fixa (`header`, `hero`, `method`, `discovery`,
  `landing_presencial`, `landing_online`, `faq`, `contact`), somente após
  consentimento. Não dispara conversão Ads nem clique em WhatsApp.
- `whatsapp_click` com posição fixa do CTA e a conversão Ads acima somente
  na ativação explícita de WhatsApp. Sem evento de compra ou `generate_lead`.
  Uma ativação gera uma conversão, sem aguardar o Google para abrir o canal.
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `gclid`,
  `gbraid` e `wbraid` válidos seguem no link entre as duas páginas. Cookies
  de medição usam o caminho `/virada90`.
- Objetivo, texto de mensagem, contato, prontuário e respostas sobre saúde
  não entram em payloads. A mensagem personalizada fica em memória; o CTA
  final é um botão, sem URL personalizada no DOM que a medição automática
  de links possa capturar. Sem JavaScript, o link genérico de `noscript`
  continua disponível.

Não há armazenamento de lead nem mudança em Supabase. Bloqueadores, recusa
ou falha de carregamento não impedem leitura e contato pelo WhatsApp.

## Conversa recebida: etapa separada

Na sessão autenticada do Pulse, a página
`https://visus.wts.chat/integration` oferece **Webhooks** para eventos,
incluindo mensagens recebidas, e **Widget de Atendimento** com registro da
origem da visita. A disponibilidade foi lida; nenhuma integração foi criada,
token gerado ou mensagem enviada.

Para otimizar por contato recebido, ainda é necessário um contrato separado:
associar atribuição consentida ao contato, receber evento de mensagem, deduplicar
e importar a conversão apropriada no Google Ads. Um clique em `wa.me` não
comprova envio de mensagem. A ação de conversão atual continua com esse limite.

## Validação e operação

Oito testes focados cobrem consentimento, isolamento, destinos, ausência de
respostas nos payloads, etapas, bloqueio do SDK e handoff independente. A revisão
independente identificou perda de escolhas em abertura nativa do link; o CTA
final foi convertido em botão. Em 07/10/2026, na conta Google Ads `421-617-2711`, foi conferido que a label
publicada pertence à ação **“Botão do Whatsapp”** (ID `6468401750`),
classificada como **Contatos / Ação principal** e ativa no nível da conta.
A última conversão dessa ação foi em 03/10; o relatório não prova que tenha
vindo do Virada 90. A ação antiga **“Clique no WhatsApp”** (ID `7523312347`)
usa a label distinta `AW-818747876/jCxeCNvFsoMcEOSztIYD` e não recebia
pings desde julho; foi preservada por poder atender outras campanhas.

As campanhas de busca online (`24310407311`) e presencial (`24316075414`)
herdavam metas padrão sem **Contatos**. Ambas foram alteradas para a meta
específica **Contatos**; a configuração foi reaberta e confirmada. Os lances
seguem **Maximizar cliques**, sem mudança de orçamento. A mudança alinha a
meta exibida à ação publicada, mas não demonstra um ping da landing Virada 90,
atribuição de clique ou conversa efetivamente recebida. Realtime do GA4 e
importação de conversa continuam sem validação. [Modelo semanal](MODELO_ACOMPANHAMENTO.md).

Fontes: [configuração gtag](https://developers.google.com/tag-platform/gtagjs/configure),
[consentimento básico](https://developers.google.com/tag-platform/security/guides/consent),
[conversão de cliques](https://support.google.com/google-ads/answer/6331304),
[medição automática e link_url](https://support.google.com/analytics/answer/9216061).

## Mudança de sequência — 07/10/2026

Os eventos de início, etapa e conclusão passam a incluir `presentation_version=five_steps` e `step_count=5`. A conclusão indica chegada à etapa final, inclusive pelo atalho; não comprova leitura integral, interesse, conversa recebida ou venda. Não comparar números de etapa entre a versão histórica de dez tópicos e esta. As conversões Ads continuam restritas à ativação explícita de WhatsApp após consentimento.
