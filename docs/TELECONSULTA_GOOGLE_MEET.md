# Teleconsulta e transcrição nativa do Google Meet

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
endpoints exigem `GOOGLE_MEET_TRANSCRIPTION_ENABLED=true`; a variável não está
configurada e nenhuma credencial OAuth Google foi adicionada. Salas manuais
continuam gratuitas; conexão/sala automática permanece preparada para OAuth.

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

## Ativação técnica pendente

- Confirmar primeiro o projeto/conta/ambiente vivo. Ambiente único temporário
  autorizado: dev sintético `oxuwrdjojsmgxoljqkuk`; Gate P antes de dados reais.
- Schema `20261014202953_google_meet_doctor_oauth_transcripts.sql` já aplicado
  no dev sintético na publicação final de14/10; não reaplicar nem editar histórico.
- Habilitar Google Meet REST API no projeto Google autorizado e configurar
  consent screen/client OAuth web com usuários de teste ou verificação exigida.
- Registrar redirect URI exata do ambiente, terminando em
  `/api/integrations/google-meet/callback`; HTTPS fora de localhost.
- Configurar somente no servidor: `GOOGLE_MEET_CLIENT_ID`,
  `GOOGLE_MEET_CLIENT_SECRET`, `GOOGLE_MEET_REDIRECT_URI`,
  `GOOGLE_MEET_TOKEN_ENCRYPTION_KEY` (32 bytes aleatórios em base64 canônico),
  `SUPABASE_SERVICE_ROLE_KEY`, além de `NEXT_PUBLIC_SUPABASE_URL` existente.
  Não versionar valores. Perda/troca da chave requer recuperação ou reconexão;
  planejar backup/rotação antes do uso operacional.
- Scopes: `meetings.space.created`, `meetings.space.settings`, `openid`, `email`.
  Settings é necessário para desativar artefatos automáticos herdados. Sem
  acesso geral ao Drive, Calendar ou reuniões não criadas pelo aplicativo.
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
- Pendente antes de declarar integração nativa operacional: configuração Google,
  uma consulta sintética com conta elegível, permissão, importação, revisão,
  recarga, negação por outro usuário e desconexão. Publicação e aceite separados.

## Referências oficiais verificadas

- [Disponibilidade e operação da transcrição](https://support.google.com/meet/answer/12849897?hl=pt-BR).
- [Artefatos e disponibilidade dos trechos por 30 dias](https://developers.google.com/workspace/meet/api/guides/artifacts).
- [Autorização e scopes](https://developers.google.com/workspace/meet/api/guides/authenticate-authorize).
- [Configuração de artefatos automáticos](https://developers.google.com/workspace/meet/api/guides/meeting-spaces-configuration).

A disponibilidade da API não determina a retenção do documento original no
Google nem a política de retenção clínica do Vivance.
