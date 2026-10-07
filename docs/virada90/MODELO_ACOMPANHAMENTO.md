# Virada 90 — modelo de acompanhamento comercial

Atualizado em 07/10/2026. Modelo operacional para os dois formatos de três
meses (presencial e online). O CRM existente da closer é a fonte de verdade
para as etapas posteriores ao contato; a landing e o Google Ads não substituem
esses registros. Este documento não autoriza coleta de dados clínicos nem
ativação do PR #79.

## Funil e fonte de cada número

| Etapa | O que conta | Fonte | Situação em 07/10 |
| --- | --- | --- | --- |
| Clique no anúncio | Clique contabilizado pela campanha | Google Ads | Disponível |
| Clique no WhatsApp | Ativação explícita do CTA, com consentimento de medição | GA4 / ação Ads “Botão do Whatsapp” | Tag publicada; recebimento específico do Virada 90 não confirmado |
| Conversa recebida | Primeira mensagem efetivamente recebida de um contato | Pulse / CRM | Processo manual; webhook de mensagem não validado |
| Avaliação agendada | Agendamento confirmado pela equipe | CRM existente | Registrar por formato e origem |
| Compareceu | Comparecimento confirmado pela equipe | CRM existente | Registrar sem inferir pelo horário |
| Entrou no programa | Adesão confirmada pela equipe | CRM existente | Separar de venda ou pagamento não confirmado |

**Nunca somar as etapas como se fossem equivalentes.** “0” significa consulta
feita e nenhum evento encontrado; **não medido** significa que a fonte ainda
não está disponível ou não foi validada. Cliques de anúncio não são cliques
no CTA; cliques no CTA não são mensagens enviadas.

## Quadro semanal mínimo

Uma linha por **semana × formato × origem**. Colunas: semana; formato
(presencial, online ou indefinido); origem (Google Ads, redes, orgânico,
indicação ou não identificada); campanha, quando comprovada; cliques no
anúncio; gasto; cliques no WhatsApp; conversas recebidas; avaliações
agendadas; comparecimentos; entradas no programa; custo por avaliação
agendada. Informar período, fuso e fonte em cada exportação. Não publicar
nomes, telefone, texto da conversa, motivo de saúde ou IDs de clique nesse
quadro.

Calcular custo por avaliação agendada apenas quando gasto e agendamentos do
**mesmo período, formato e origem** forem atribuídos com evidência. Sem
agendamento confirmado, mostrar “não calculável”; não dividir por zero nem
atribuir toda venda à campanha mais recente.

| Recorte verificado (07/09–06/10/2026, fuso da conta Ads) | Cliques no anúncio | Gasto | Cliques WhatsApp | Conversas | Avaliações | Comparecimentos | Entradas |
| --- | ---: | ---: | --- | --- | --- | --- | --- |
| Online · campanha `24310407311` | 66 | R$ 276,12 | Não medido neste recorte | Não medido | Não medido | Não medido | Não medido |
| Presencial · campanha `24316075414` | 24 | R$ 158,56 | Não medido neste recorte | Não medido | Não medido | Não medido | Não medido |
| **Total** | **90** | **R$ 434,68** | **Não medido** | **Não medido** | **Não medido** | **Não medido** | **Não medido** |

O relatório de campanhas indicou **zero conversões atribuídas** no recorte
acima. Não converter isso em “zero conversas”: o vínculo e a validação do
recebimento ainda faltam.

## Registro enxuto no CRM

A closer mantém um registro por contato existente, com interesse
(presencial/online/indefinido), origem com evidência ou “não identificada”,
etapa atual e datas da primeira mensagem, agendamento, comparecimento e
entrada, quando ocorrerem. Deduplicar pela identidade do contato no CRM:
mensagens repetidas na mesma conversa não criam novos leads. Quando a pessoa
mudar de formato, conservar o histórico e marcar o formato vigente; não
inventar origem a partir do conteúdo da conversa. O rótulo de origem no
WhatsApp é editável e serve como indício, não prova automática.

## Configuração Google Ads conferida

Conta `CA - Dr. Guilherme Martins` (`421-617-2711`). Em 07/10, as campanhas
`VIRADA90 | ONLINE | BRASIL | SEARCH` (`24310407311`) e
`VIRADA90 | PRESENCIAL | 100KM PRUDENTE | SEARCH` (`24316075414`) passaram de
metas padrão da conta para a meta específica **Contatos**. A ação publicada
na landing é “Botão do Whatsapp”, `AW-818747876/zzjqCNb0r4wYEOSztIYD`,
ID `6468401750`, principal e ativa. A ação legada “Clique no WhatsApp” usa
outra label e está sem ping recente; não foi excluída. Os dois orçamentos
(R$ 45/dia online; R$ 35/dia presencial) e **Maximizar cliques** permaneceram
iguais. A mudança não produz conversões retroativas nem demonstra que uma
mensagem chegou ao Pulse.

## Próxima condição de ativação

Validar em ambiente apropriado o evento real de mensagem recebida no Pulse,
o identificador deduplicável, o vínculo consentido com a origem e a entrega
segura ao destino correto. Conferir amostra com a equipe antes de importar
qualquer conversão de conversa ao Google Ads. Só discutir mudança de lances
para otimizar por mensagens/avaliações após dados consistentes e volume
suficiente; hoje as campanhas continuam otimizando cliques. O webhook e o
importador do PR #79 permanecem desligados. Não enviar dados de saúde ao
Google nem ao banco clínico; Gate P continua aberto.
