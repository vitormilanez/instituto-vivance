# Teleconsulta e transcrição nativa do Google Meet

## Conta autorizada para o teste — 14/10/2026

Usuário confirmou `vtrconsultingbr@gmail.com` como sua conta Google para um
teste com dados fictícios. Não reutilizar a senha do Vivance no Google nem
habilitar captura em outras reuniões. Login inicialmente pendente de chave de
acesso; depois confirmado na interface do perfil Chrome **Vitor (VTR - Consulting)**,
diferente do perfil principal conectado à automação DOM. Não repetir login no
perfil errado.

O projeto `project-e8f7c9ff-f8b6-4886-ab0` contém credenciais do AI Video Creator;
não reutilizá-las nem alterar sua tela de consentimento. Preparação concluída no
projeto separado **Vivance Meet Teste** (`vivance-meet-teste`), organização
`vtrconsultingbr-org`, sem vincular faturamento ou contratar plano. O titular
finalizou a identidade/aceite da política Google. Meet REST API habilitada e
cliente Web **Vivance Meet Teste Web** criado com somente o callback
`https://institutovivance.app/api/integrations/google-meet/callback`.

Google Auth continua **External / Testing**, com somente
`vtrconsultingbr@gmail.com` na lista de teste. Escopos declarados: `openid`,
`userinfo.email`, `meetings.space.created` e `meetings.space.settings` (os três
últimos sob `https://www.googleapis.com/auth/`). Sem Drive, Calendar ou escopos
restritos; não publicar o app OAuth para usuários gerais.

Configuração de servidor publicada em Production do Vivance. Credenciais e chave
de criptografia ficam somente no servidor/cofre ignorado; nenhuma no Git ou
cliente. `GOOGLE_MEET_TRANSCRIPTION_ENABLED=false`. Status médico200 confirmou
`configured=true`, `available=true`, **`connected=false`**; paciente403 e endpoints
nativos409. Interface médica mostra **Conectar Google** habilitado. Ainda falta
o grant pessoal pela conta Google no mesmo navegador da sessão médica: não
transferir cookies/código OAuth entre perfis nem declarar conexão concluída.
[Registro da configuração e evidências](ENTREGA_WORKSPACE_E_TRANSCRICAO_2026-10-14.md#configuração-google-de-teste-publicada--14102026).

Nenhuma captura ou chamada real nesta preparação. Login, projeto, API e cliente
OAuth não comprovam licença, reconhecimento de áudio ou autorização da conta.

Revisão crítica confirmou que `meetings.space.settings`, necessário ao adapter
para declarar artefatos automáticos `OFF`, autoriza ver/editar configurações de
**todas as chamadas da conta**. O código limita suas operações a salas próprias,
mas isso não reduz o grant do Google. Explicar esse alcance e obter autorização
específica antes da concessão. Separar o projeto não estreita a permissão da conta.
Não remover `artifactConfig` apenas para reduzir o escopo: perderia a garantia
explícita de automações desativadas.
[Configuração de artefatos](https://developers.google.com/workspace/meet/api/guides/meeting-spaces-configuration#manage-auto-artifacts).

## Pedido de 14/10 — consentimento antes da entrada e arquivo pós-consulta

**Estado: fluxo proposto para confirmação; não implementado nem ativado.**
O usuário pediu enviar o consentimento ao paciente antes de entrar na chamada,
simplificar a operação médica e guardar resumo e transcrição juntos após a reunião.
Esta definição usa o Meet nativo como direção principal; não contrata plano,
inicia captura, dispara mensagem ou habilita fornecedor de IA. A preparação
OAuth acima é uma etapa técnica separada, não implementação desta jornada.

### Jornada pretendida

- **Paciente:** aviso no aplicativo vinculado ao agendamento, disponível antes
  da consulta e retomado ao tocar em Entrar. Página autenticada explica finalidade,
  Google/Vivance, armazenamento e acesso; transcrição/armazenamento e resumo por
  IA são escolhas explícitas, sem opções pré-marcadas. Recusar não cancela a
  consulta: oferece **Continuar sem transcrição**. Aviso externo, caso o canal
  seja autorizado/configurado, contém somente orientação genérica e link seguro;
  não envia dados clínicos nem termos sensíveis a destinatários não verificados.
- **Médico:** uma conexão Google inicial; em cada consulta, estado curto
  **Autorizado**, **Aguardando resposta** ou **Sem transcrição**, junto de
  **Entrar na consulta**. A captura só pode ser solicitada pelo Vivance com aceite
  vigente. Um passo adicional no Meet, se exigido pelo provedor, deve aparecer
  honestamente; não prometer controle remoto de início/parada sem teste.
- **Pós-consulta:** quando os artefatos finais estiverem disponíveis no Google,
  importação em segundo plano e um bloco na mesma consulta/ficha com
  **Resumo da consulta** e **Transcrição original**. Estados independentes:
  aguardando provedor, processando, disponível, falha recuperável e indisponível.
  O fim da chamada não significa que os arquivos já estejam prontos.
- **Resumo:** preferir as smart notes do próprio Google quando o plano,
  consentimento e permissões permitirem, evitando uma segunda geração paga.
  Preservar a origem e marcar **Gerado por IA — aguardando revisão médica**.
  Não substituir o texto completo, inferir conduta ou preencher/publicar o
  prontuário automaticamente. Sem notas disponíveis, mostrar resumo pendente
  ou permitir registro manual; outro provedor de IA exige decisão própria.
- **Acesso e continuidade:** original e resumo privados para o médico autorizado,
  vinculados a clínica/paciente/agendamento e localizáveis na ficha e no histórico
  da consulta. Compartilhamento ao paciente é ação médica separada. A identidade
  branca/azul e os componentes existentes são preservados, inclusive em320px.

### Contratos que a implementação precisa cumprir

1. Consentimento pelo próprio paciente autenticado: finalidade, decisões,
   versão/texto apresentado, horário do servidor e agendamento; evidência
   append-only. Checkbox preenchido pelo médico não substitui esse registro.
   Falta de resposta não é aceite; nova finalidade/versão exige nova decisão.
2. Recusa/retirada bloqueia novos trabalhos de captura/importação/síntese no
   Vivance. Revalidar antes de buscar a fonte, processar e confirmar a escrita;
   cancelar jobs concorrentes por versão de consentimento. Não prometer apagar
   registros existentes ou interromper o Google remotamente sem política/capacidade
   confirmadas. Retenção, retirada e direitos sobre registros ficam no Gate P.
3. Página de entrada não controla links diretos do Meet nem ações manuais do
   organizador fora do Vivance. Não declarar bloqueio de captura no provedor só
   porque há bloqueio no app. Participantes adicionais exigem tratamento próprio;
   o primeiro slice automático não deve presumir consentimento de terceiros.
4. O adapter atual exige sessão médica viva. Background precisa de autorização
   específica e estreita de job, não de sessão expirada, remoção desse controle
   ou leitura privilegiada geral. Revalidar vínculo ativo, médico responsável,
   conexão Google, consentimento e consulta a cada execução.
5. Associar exatamente a sala e sessão corretas; ambiguidade não importa dados
   de outra consulta. Paginação/lote final atômicos, deduplicação por fonte/hash
   e cache por clínica/consulta/fonte/modelo/versões. Não chamar IA ao abrir página.
   Preservar intervalos e lacunas: importar todo o texto disponibilizado não
   comprova que todas as falas da reunião foram captadas.
6. Artefatos e eventos do Google são sinais de disponibilidade, não comandos
   confiáveis para acesso clínico: validar remetente/evento, reconsultar o provedor
   e reautorizar antes da persistência. Eventos repetidos e retries não duplicam.
   Não criar Pub/Sub, novas permissões ou serviços pagos sem configuração aprovada.

### Estado conferido e próximos passos

Vercel `vtr-consulting/instituto-vivance`, Production, recebeu a configuração
Google de teste em14/10; transcrição nativa explicitamente desligada. Grant da
conta e licença continuam pendentes; não repetir a pergunta de licença nem
presumir elegibilidade. Código atual
salva transcrição de navegador manual e importação nativa preparada; não possui
este aceite registrado pelo paciente, resumo nativo ou sincronização automática.

Primeiro slice recomendado: consentimento paciente → entrada da mesma consulta
→ estado médico → recusa/retirada persistidas e conferidas. Segundo: background
Google + texto final e notas na consulta, depois de definir/configurar a conta,
permissões mínimas de leitura dos artefatos/Docs e mecanismo de eventos ou fila.
Não apresentar URL do Google como se o conteúdo já estivesse guardado no Vivance.

Aceites dirigidos: papéis/vínculos e acesso cruzado; aceite/recusa/retirada após
recarga; corrida entre retirada e job; artefato atrasado/incompleto; reenvio sem
duplicar; fonte preservada e resumo privado. Avaliação de conteúdo clínico e uso
de dados reais permanecem separados. Nesta rodada só houve definição/revisão;
não rodar aplicação/E2E apenas pela atualização documental.

Revisão crítica Astra identificou os pontos acima (link direto, revogação,
autorização background, completude e finalidade/retenção). As referências oficiais
consultadas em14/10 confirmam artefatos distintos e eventos de arquivo gerado:
[artefatos e smart notes](https://developers.google.com/workspace/meet/api/guides/artifacts),
[eventos do Meet](https://developers.google.com/workspace/events/guides/events-meet).
Não equivalem a uma chamada real com a conta médica conectada.

## Evolução autorizada — transcrição gratuita e publicação, 14/10/2026

Usuário confirmou transcrição gratuita pelo navegador, iniciada pelo médico,
e autorizou validação mobile/publicação. `BrowserTranscriptPanel` é a opção
ativa: microfone, ou áudio combinado de aba+microfone no Chrome/Edge desktop
135+. Mobile oferece o microfone; a fala remota pode faltar, especialmente com
fones. Nenhuma identidade de falante/completude é inferida. Não grava áudio.
O reconhecimento pode usar serviço do fornecedor do navegador; no Chrome,
Google. Requer autorização antes de iniciar, início/retomada manual e parada
explícita. Texto fica em memória até Salvar; a revisão preserva o original.

Transcrição **nativa do Meet permanece desativada no servidor**: os quatro
endpoints exigem `GOOGLE_MEET_TRANSCRIPTION_ENABLED=true`. Na publicação inicial,
não havia credenciais Google; na preparação posterior acima, credenciais foram
configuradas e a flag definida como `false`. Salas manuais continuam disponíveis;
conexão/sala automática ainda depende do grant pessoal Google.

Migration `20261014205608_browser_speech_transcripts.sql`: textos privados,
consentimento, idempotência e revisão auditada. Migrações de incentivo, Meet e
navegador aplicadas no dev sintético confirmado antes da integração frontend.
Adapters privados de RPC usam credencial somente no servidor com `server-only`,
sessão viva/papel/vínculo revalidados; o teste de fronteira permite exclusivamente
esses dois adapters revisados, preservando o bloqueio em componentes/clientes.

Astra revisou captura/persistência e confirmou cinco correções: permissão
documental em navegação SPA, aquisição de áudio cancelável, payload congelado
após tentativa de salvar, limite de texto com Unicode/separadores e deadline
total de quatro horas. O serviço do navegador não reinicia automaticamente.

Teste integrado sintético local: salvar/repetir/revisar/ler deram 200; mesmo
idempotency key com texto alterado deu 409; paciente recebeu 403; nativa
desativada deu 409. Original preservado, revisão após recarga confirmada. Um
texto explicitamente fictício foi mantido como fixture, sem áudio capturado.
Controller testado com reconhecimento determinístico; qualidade/disponibilidade
do serviço real de voz não é comprovada por esses testes.

Mobile 320 px efetivos conferido (controle compensado pelo zoom da janela),
sem overflow horizontal; formulário e transcrição visíveis. No domínio publicado,
salvar/replay/revisão/recarga deram200, conteúdo alterado409, paciente403 e nativa409.
Original/revisão também conferidos na interface após recarga. A checagem anterior
sem viewport válido abaixo é histórica.
[Publicação final, correção de configuração e evidências](ENTREGA_WORKSPACE_E_TRANSCRICAO_2026-10-14.md).

Referências: [API de reconhecimento](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition),
[entrada de áudio e compatibilidade](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/start),
[captura de aba com áudio](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia).

## Preparação inicial — 14/10/2026, antes da autorização de publicação

Usuário autorizou implementar a integração e refinar a Teleconsulta; não sabe
se a conta Google tem assinatura compatível e pediu **deixar preparada**.
Código e migration locais, sem OAuth real, migration remota ou publicação.
Escopo substitui o adiamento de áudio apenas para importar texto nativo do
Meet: não inclui gravador próprio, áudio no Vivance, IA ou notas automáticas.

## Jornada implementada

1. Médico conecta sua própria conta Google uma vez. Sem configuração técnica,
   o botão permanece indisponível com explicação e alternativa manual.
2. Para um horário existente da Agenda, cria uma sala exclusiva automaticamente.
   Não substitui links manuais existentes. Nova consulta pelo formulário manual
   continua disponível; criação automática parte de um agendamento existente.
3. Obtém autorização específica do paciente para transcrever no Google e importar
   no Vivance, registrando como/quando. A declaração do médico não é uma
   assinatura eletrônica do paciente nem valida, sozinha, toda a base legal.
4. Inicia a transcrição **no Meet**. Criação da sala desliga expressamente
   gravação, transcrição e notas automáticas; conectar não inicia captura.
5. Após a chamada, usa **Buscar transcrição no Meet**. É importação manual,
   não webhook, polling, sincronização em segundo plano ou texto ao vivo.
6. Lê falas/horários e registra nota de revisão ou rejeição. O original é
   imutável. Nenhuma revisão preenche o registro ou publica algo ao paciente.

Consulta recente e atendimento oferecem o texto no contexto correto.
Os participantes têm números locais para leitura: não há inferência de
identidade, nem atribuição automática de fala ao médico/paciente.

## Configuração técnica e ativação

- Confirmar primeiro o projeto/conta/ambiente vivo. Ambiente único temporário
  autorizado: dev sintético `oxuwrdjojsmgxoljqkuk`; Gate P antes de dados reais.
- Schema `20261014202953_google_meet_doctor_oauth_transcripts.sql` já aplicado
  no dev sintético na publicação final de14/10; não reaplicar nem editar histórico.
- Meet REST API e cliente Web configurados no projeto de teste acima. Google
  Auth permanece Testing; uma abertura futura exige decisão/verificação próprias.
- Redirect exato de Production registrado, terminando em
  `/api/integrations/google-meet/callback`; não há callback de Preview/local.
- Configurados somente no servidor: `GOOGLE_MEET_CLIENT_ID`,
  `GOOGLE_MEET_CLIENT_SECRET`, `GOOGLE_MEET_REDIRECT_URI`,
  `GOOGLE_MEET_TOKEN_ENCRYPTION_KEY` (32 bytes aleatórios em base64 canônico),
  `SUPABASE_SERVICE_ROLE_KEY`, além de `NEXT_PUBLIC_SUPABASE_URL` existente.
  `GOOGLE_MEET_TRANSCRIPTION_ENABLED=false`. Não versionar valores.
  Perda/troca da chave requer recuperação ou reconexão;
  planejar backup/rotação antes do uso operacional.
- Scopes: `meetings.space.created`, `meetings.space.settings`, `openid`, `email`.
  Settings é necessário para desativar artefatos automáticos herdados e permite
  ver/editar configurações de todas as chamadas da conta. O adapter só opera
  salas criadas por ele; não confundir essa restrição do código com o alcance
  da permissão concedida pelo Google. Sem escopos gerais do Drive ou Calendar.
- Médico autoriza pessoalmente. Confirmar licença, política do administrador e
  disponibilidade de transcrição em português; uma conexão não prova isso.

## Segurança e integridade

OAuth state com validade, uso único, PKCE e vínculo à sessão viva/clínica/médico.
Uma nova tentativa invalida inclusive callbacks anteriores em andamento.
Refresh tokens AES-256-GCM com contexto de clínica/médico; só servidor.
Endpoints mutáveis verificam origem. RPC acessível apenas ao serviço revalida
sessão, papel médico, atribuição da consulta e vínculo assistencial atual.
Tabelas privadas não oferecem leitura direta a pacientes/equipe/anon.

Sala exclusiva vinculada ao agendamento; criação concorrente é serializada.
Falha incerta depois da chamada externa deixa `creating`/`recovery_required`:
não gerar outra sala automaticamente. Operador deve conferir a sala no Google
e o vínculo antes de um reparo controlado, pois a API externa não fornece uma
chave de idempotência para esse create.

Importação aceita uma sessão inequívoca da sala, iniciada entre 30 minutos antes
e 120 minutos após o término agendado e encerrada dentro dessa janela. Casos
ambíguos/fora da janela exigem conferência; nunca escolher uma sessão ao acaso.
Somente `FILE_GENERATED`; todas as páginas/fontes antes do commit transacional.
Limites: 60 chamadas, orçamento de 45s, 4 MiB e até 5.000 itens por coleção.
Estouro/falha não salva um prefixo. Repetição preserva hash e fonte original.
Não há chamadas de LLM nem custo de síntese nesta entrega.

Fonte, permissão e revisão ficam separadas e auditáveis. Desconectar desativa
o acesso novo localmente e tenta revogar no Google; a UI informa se a revogação
remota não foi confirmada. Não apaga textos já importados. Política de retenção,
exclusão, consentimento, fornecedores e responsabilidades ainda integra Gate P.

## Evidências e limites

- 12 testes focados do backend passaram, incluindo PGlite com migrations
  canônicas: permissões/sessão/vínculo, replay e concorrência OAuth, sala única,
  consentimento, fonte imutável, lote atômico, reassignment e provider paginado.
- 9 testes de Teleconsulta existente passaram; lint dos componentes e backend
  passou. Build Webpack/TypeScript passou em espelho limpo (artefatos duplicados
  `* 2.*` preexistentes excluídos só do espelho, preservados no checkout).
- Astra encontrou duas falhas P2 (callback antigo e lote parcial), corrigidas;
  revisão delimitada confirmou os fixes e testes de regressão.
- Navegador local autenticado: configuração ausente explicada, agendamentos
  existentes visíveis, formulário com foco e fallback manual; sem criar sala,
  consulta, enviar mensagem ou abrir consentimento Google.
- Na preparação inicial, responsividade via CSS implementada; evidência móvel ainda pendente
  por limitação do controle de viewport. Estados conectados/importados tiveram
  validação de contratos, não aceite visual integrado com Google.
- Busca Asana por “Teleconsulta” não encontrou tarefa; nenhuma criada nesta rodada.
- Pendente antes de declarar integração nativa operacional: grant Google,
  licença e uma consulta sintética com conta elegível, permissão, importação, revisão,
  recarga, negação por outro usuário e desconexão. Publicação e aceite separados.

## Referências oficiais verificadas

- [Disponibilidade e operação da transcrição](https://support.google.com/meet/answer/12849897?hl=pt-BR).
- [Artefatos e disponibilidade dos trechos por 30 dias](https://developers.google.com/workspace/meet/api/guides/artifacts).
- [Autorização e scopes](https://developers.google.com/workspace/meet/api/guides/authenticate-authorize).
- [Configuração de artefatos automáticos](https://developers.google.com/workspace/meet/api/guides/meeting-spaces-configuration).

A disponibilidade da API não determina a retenção do documento original no
Google nem a política de retenção clínica do Vivance.
