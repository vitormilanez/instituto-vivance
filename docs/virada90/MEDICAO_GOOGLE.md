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
- `virada90_presentation_start`, `virada90_step_view` (número de 1 a 10) e
  `virada90_presentation_complete` (visualização da etapa final, uma vez por
  página). Ir diretamente ao final também conta como visualização final;
  não comprova leitura de todos os tópicos.
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
final foi convertido em botão. A configuração de conversão primária/secundária,
campanhas associadas, realtime do GA4 e recebimento no Google Ads dependem da
conta Google e não são comprovados por um deploy ou teste sintético.

Fontes: [configuração gtag](https://developers.google.com/tag-platform/gtagjs/configure),
[consentimento básico](https://developers.google.com/tag-platform/security/guides/consent),
[conversão de cliques](https://support.google.com/google-ads/answer/6331304),
[medição automática e link_url](https://support.google.com/analytics/answer/9216061).
