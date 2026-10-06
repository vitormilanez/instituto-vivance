# Virada 90 — conversa recebida no Pulse

Preparação iniciada em 03/10/2026, após o pedido de configurar a integração.
Em 05/10/2026, o convite do Google Ads foi aceito e a conta correta foi
verificada na interface.
Este documento registra o contrato e as pendências; não representa integração
implementada, webhook ativado ou conversão importada.
[Acompanhamento no Asana](https://app.asana.com/1/1192450062279073/project/1218382636610484/task/1219190189916726).

## Acessos e estado conferidos

- Checkout Git: aplicação `apps/web`, base `origin/main` em `d277a12`.
- CLI Vercel: usuário `vtrconsulting`, equipe `vtr-consulting`, projeto
  `instituto-vivance`, ID `prj_ligeZuFRycRXA21u5rRzaLAORTrI`, Root Directory
  `apps/web`, Node 24. O conector Vercel mostrou outra equipe e não foi usado
  para alterar este projeto.
- Pulse: acesso autenticado. O formulário de novo webhook permite selecionar
  apenas **Mensagem recebida**. Há dois webhooks ativos de eventos de contato
  e um inativo com diversos eventos; nenhum foi alterado. Nenhuma URL privada,
  credencial ou conversa de cliente é reproduzida neste documento.
- Google Ads: acesso de `vitor.milanezz@gmail.com` à conta **CA - Dr.
  Guilherme Martins**, Customer ID `421-617-2711`, confirmado na interface em
  05/10. A listagem filtrada por WhatsApp mostrou ações de clique do site,
  GA4 e UA; não mostrou ação de **conversa recebida**. `Clique no WhatsApp`
  (ID `7523312347`) é principal, origem Site e tem diagnóstico de
  configuração incorreta/sem pings recentes. Não foi alterada. A listagem
  não prova que o ID/label da landing Vivance corresponda a essa ação antiga.
- A criação de conversão off-line permite selecionar a categoria **Contato**,
  uma ação secundária e a fonte posterior por API. O fluxo exige declaração
  sobre conformidade de coleta/compartilhamento de dados do cliente; ela não
  foi marcada, e nenhuma ação foi criada. A página de configurações registra
  que os termos gerais de dados do cliente já foram aceitos na conta; isso
  não valida automaticamente o novo fluxo de dados proposto. A conta já mostra uma conexão
  Zapier, mas não há evidência de que seja a origem correta para este fluxo.
- Google Cloud: no navegador de `vitor.milanezz@gmail.com`, não apareceu
  projeto dedicado ao Vivance/Instituto. Em 05/10 foi criado o projeto
  **Virada 90 Attribution** (`virada-90-attribution`, número `1032696782997`)
  sob **Nenhuma organização**, na conta de Vitor. Em 05/10, a Data Manager API
  foi ativada com autorização do usuário. O IAM do projeto confirma
  `guilhe.martins@gmail.com` e `vitor.milanezz@gmail.com` como Proprietários;
  a política foi atualizada e pode levar alguns minutos para propagar. O
  `gcloud` local está autenticado em outra conta/projeto
  (Autisfera) com sessão expirada e não foi usado para mutação.
- A interface do Firestore tentou ativar automaticamente a API Firestore ao
  abrir sua lista de bancos e mostrou uma confirmação de API ativada. Não há
  banco criado. O formulário oferece edição Standard ou Enterprise e avisa
  que o serviço é faturado conforme uso, com cota gratuita para o primeiro
  banco. Nenhum plano pago ou orçamento foi aceito.
- No Pulse, o widget legado **Larissa - Closer** está configurado para o canal
  `(18) 99755-1234 - Instância e725c7`, o mesmo número da landing. Sua opção
  de rastreamento está ativa, porém a landing atual usa links diretos `wa.me`
  e não instala o widget. A existência do canal não prova o formato do evento
  nem a atribuição de uma conversa recebida.
- A página de Integrações do Pulse confirma que webhooks enviam eventos por
  `POST` à URL configurada e que o widget registra a origem da visita. Ela não
  documenta o payload, a autenticação ou se essa origem contém identificadores
  de clique compatíveis com a importação ao Google Ads.
- Não há configuração Google/Pulse de servidor entre as variáveis listadas
  no projeto Vercel. Apenas nomes e ambientes foram consultados; valores não
  foram expostos. Banco e domínio publicado não foram modificados.

## Contrato de implementação

1. Após consentimento, criar referência aleatória para a passagem da landing
   ao WhatsApp. Associar apenas os identificadores de clique admitidos e a
   campanha. Incluir a referência na mensagem revisável; abrir o canal mesmo
   se a medição falhar. Não transportar objetivo de saúde para a medição.
2. Conferir o formato real do evento Pulse e seu mecanismo de autenticação
   antes de escrever o receptor. O formulário mostrou nome, URL e eventos;
   assinatura, cabeçalhos, retries e schema não foram confirmados. Não
   presumir o schema de outro provedor WhatsApp.
3. Reconhecer mensagem recebida de cliente com referência válida, consentida
   e vigente. Registrar somente a primeira conversão daquela oportunidade,
   deduplicando a referência e o evento. Excluir mensagens enviadas pela
   equipe, eventos de contato e repetições. Texto, anexos, nomes, telefones e
   dados de saúde não entram em logs, persistência de medição ou Google.
4. Criar ação separada **Conversa recebida no WhatsApp**, apropriada à
   importação de conversões. Usar Data Manager API com credenciais de servidor
   autorizadas. Confirmar o Customer ID da conta e o ID da ação; o destino
   público `AW-818747876` e sua label de clique não substituem esses IDs.
   Preparar identificação da ação, clique, horário real e `transactionId`
   estável; conferir requisitos de consentimento na conta.
5. Validar recebimento e atribuição antes de mudar a campanha. Depois, usar a
   conversa como meta principal e manter o clique como observação secundária.
   Não alterar orçamento, anúncio ou lance durante esta configuração.

O armazenamento de atribuição deve ser próprio da medição, com expiração,
acesso restrito e retentativas auditáveis. Ainda não há destino escolhido ou
provisionado. Não usar o banco clínico de testes para guardar conversas reais;
o Gate P permanece aberto. Se a pessoa apagar a referência ou recusar medição,
o contato funciona, mas não se promete atribuição ao anúncio.

## Acesso resolvido e próxima etapa

O acesso humano ao Google Ads foi resolvido. O projeto Cloud dedicado existe,
com Data Manager API ativa e os dois Proprietários conferidos no IAM, mas a
autorização de servidor ainda exige credenciais próprias/autorizadas e acesso
à conta de destino. O formulário Pulse confirma
**Mensagem recebida** e exige apenas nome, URL e seleção de eventos; não
documenta ali assinatura, cabeçalhos, retries nem schema. Nenhum webhook foi
criado ou ativado. Antes de conectar, obter contrato/payload de teste do Pulse
sem dados reais, provisionar receptor autenticado e armazenamento de medição
separado do banco clínico, e revisar a declaração de dados do Google.

Depois: fechar autenticação e schema do Pulse, definir armazenamento,
implementar e testar consentimento, duplicatas, evento
inadequado, falhas/retries e ausência de dados de saúde. Testes locais usam
dados sintéticos; importação em validação não comprova atribuição em anúncio.
Ativação e teste de mensagem efetivamente recebida ficam pendentes.

## Contrato do evento — investigação em 05/10/2026

O usuário informou que representa a equipe Pulse e pode decidir a configuração
do lado dessa conta. A [documentação de webhooks da plataforma WTS](https://docs.dyamante.com.br/reference/webhooks-1)
descreve `POST` com `application/json` e envelope `eventType`, `date` e
`content`. A [lista de eventos](https://docs.dyamante.com.br/reference/get_v1-webhook-event.md)
inclui `MESSAGE_RECEIVED`. A tela autenticada de novo webhook no Pulse oferece
nome, URL e seleção de **Mensagem recebida**, sem campo visível para cabeçalho
secreto, assinatura ou evento de teste. A documentação consultada não especifica
o `content` desse evento, a autenticação da chamada nem a política de tentativas.
Essas páginas WTS são referência para investigar a instalação Pulse; a
equivalência do payload nesta conta ainda precisa ser confirmada por um evento
sintético da plataforma ou por teste controlado após os gates aplicáveis.

Nova inspeção da interface em 05/10: o formulário de edição oferece filtros
por canal, equipe, usuário e outros atributos, além de status inativo. A lista
oferece histórico por assinatura. Nenhum comando de disparo sintético foi
identificado. O filtro por canal permite reduzir o alcance do teste caso exista
um canal dedicado, mas não filtra por telefone do remetente; ativar no canal
comercial atual ainda encaminharia mensagens reais de outras pessoas. Nenhuma
assinatura ou filtro existente foi modificado.

O módulo `apps/web/modules/virada90/pulse-event.ts` é um **adaptador candidato,
somente local**. Ele aceita a forma da [API de mensagens](https://docs.dyamante.com.br/reference/get_v1-message-id.md)
como hipótese para `content`, exige evento de entrada `TO_HUB`, texto com
referência `V90-...` e ID de mensagem válido; a saída contém só referência,
ID e horário. Não grava nem encaminha texto, telefone, nome ou anexo. Um
teste sintético comprova a seleção e a exclusão de eventos incompatíveis;
**não comprova que o webhook real use esse schema**. Nenhuma rota pública,
assinatura Pulse, persistência ou importação Ads foi adicionada.

Decisão operacional para o próximo passo: usar assinatura exclusiva de
**Mensagem recebida**, não modificar os webhooks existentes, exigir segredo
aleatório de alta entropia no caminho da URL do receptor caso o Pulse não
suporte assinatura/cabeçalho, limitar tamanho e tipo do corpo, e aplicar
restrição de origem de rede apenas como defesa adicional após confirmar o IP
do emissor. Nunca confiar somente em `X-Forwarded-For`. O receptor deve
responder de forma idempotente e guardar exclusivamente os campos mínimos de
atribuição em armazenamento separado. Antes de ativá-lo, validar o contrato
com carga sintética, revisar a coleta de dados/consentimento e concluir o
Gate P aplicável a mensagens reais de saúde.
O teste de ponta a ponta poderá usar uma mensagem neutra enviada
voluntariamente pelo usuário depois que receptor e escopo estiverem prontos;
o número pessoal não será gravado no contrato nem no código.

Fontes oficiais consultadas em 03–05/10/2026:
[níveis de acesso Google Ads](https://support.google.com/google-ads/answer/9978556),
[importação de eventos](https://developers.google.com/data-manager/api/devguides/events/google-ads/offline/send-events),
[acesso à API](https://developers.google.com/data-manager/api/devguides/quickstart/set-up-access).
