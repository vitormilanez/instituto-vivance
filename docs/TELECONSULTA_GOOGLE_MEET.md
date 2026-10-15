# Google Meet e transcrição da consulta

**Contrato vigente em 14/10/2026.** Preparação, conexão, captura e aceite são
estados diferentes. Agendamento/link externo em [Teleconsulta](TELECONSULTA.md);
o novo fluxo ainda não implementado em [Consentimento e pós-consulta](CONSENTIMENTO_E_POS_CONSULTA.md).

## Estado efetivo

| Parte | Situação |
| --- | --- |
| Transcrição gratuita do navegador | Implementada/publicada; início e salvamento manuais pelo médico. |
| Google API, cliente Web e servidor | Configurados para teste sintético. |
| Conexão pessoal Google | Pendente: status200/configurado/disponível, `connected=false`. |
| Transcrição nativa | **Desligada**: `GOOGLE_MEET_TRANSCRIPTION_ENABLED=false`; endpoints409. |
| Consentimento direto do paciente e automação pós-call | **Não implementados**. |
| Chamada real, áudio remoto e licença | Não validados. |

## Opção gratuita: navegador

`BrowserTranscriptPanel` usa reconhecimento de fala `pt-BR`. Médico autoriza
e inicia manualmente; no desktop Chrome/Edge compatível pode compartilhar uma
aba com áudio e combinar microfone. No mobile a opção é microfone; com fones
a fala remota pode faltar. Não atribui automaticamente médico/paciente, não
garante cobertura integral e não reinicia o serviço sozinho.

Não grava arquivo de áudio. O fornecedor do navegador pode processar áudio
externamente (Google no Chrome); explicar isso antes de iniciar. Texto fica em
memória até Salvar, ligado a clínica/paciente/agendamento. Original privado
imutável, revisão humana separada, idempotência e auditoria; retry mantém o
payload original. Não preencher prontuário nem publicar ao paciente automaticamente.

A declaração/autorização manual atual não é a decisão registrada pelo próprio
paciente que foi pedida depois. Consentimento pré-entrada e retirada exigem o
novo contrato, não um checkbox marcado pelo médico.

## Preparação Google de teste

Titular autorizou `vtrconsultingbr@gmail.com` para testes fictícios. Não usar
senha do Vivance no Google nem habilitar captura em outras reuniões.

- Projeto **Vivance Meet Teste** (`vivance-meet-teste`), organização
  `vtrconsultingbr-org`, separado do projeto do AI Video Creator.
- Meet REST API e cliente Web **Vivance Meet Teste Web** configurados.
  Sem faturamento vinculado ou plano contratado por esta preparação.
- Google Auth **External / Testing**, somente a conta acima na lista de teste.
  Não publicar o app OAuth amplamente por consequência da publicação do Vivance.
- Redirect único:
  `https://institutovivance.app/api/integrations/google-meet/callback`.
  Não há callback de Preview/local preparado.
- Scopes no adapter: `meetings.space.created`, `meetings.space.settings`,
  `openid`, `email`; no console, e-mail corresponde a `userinfo.email`.
  Sem escopos gerais de Drive/Calendar.

**Alcance importante:** `meetings.space.settings` permite ver/editar
configurações de **todas as chamadas da conta**, embora o adapter opere apenas
salas próprias. É usado para declarar gravação, transcrição e smart notes
automáticas OFF. Restrição do código não estreita o grant do Google. Obter
ciência na concessão; não remover `artifactConfig` só para reduzir escopo e
perder a garantia de automações desativadas.

Grant pessoal deve ocorrer no mesmo navegador da sessão médica. Não transferir
cookies/código OAuth entre perfis para contornar vínculo de sessão. Projeto
Cloud autenticado, API habilitada ou botão Conectar Google não provam conexão,
licença compatível ou chamada bem-sucedida.

## Configuração e operação preparadas

Somente no servidor/cofre ignorado:
`GOOGLE_MEET_CLIENT_ID`, `GOOGLE_MEET_CLIENT_SECRET`,
`GOOGLE_MEET_REDIRECT_URI`, `GOOGLE_MEET_TOKEN_ENCRYPTION_KEY`
(32 bytes aleatórios em base64 canônico) e flag nativa explicitamente `false`.
Adapters privados revalidam sessão/papel/vínculo; credencial de serviço nunca
vai ao cliente. [Inventário sem valores](../CREDENCIAIS.md).

Não regenerar a chave ou reprovisionar cegamente. Troca/perda requer recuperação
ou reconexão planejada; rollback de frontend não revoga grants nem apaga segredos.

Quando autorizada/elegível, a integração permite sala exclusiva de agendamento
existente, sem substituir link manual ou criar outro horário. A sala nasce
restrita e com artefatos automáticos OFF. Após autorização específica e início
manual da transcrição no Meet, há importação manual preparada. **Não há polling,
webhook, sincronização em background, smart notes ou resumo automático ativos.**

## Segurança e integridade

- OAuth state com expiração, uso único, PKCE e vínculo à sessão/clínica/médico.
  Nova tentativa invalida callback anterior, inclusive em andamento.
- Refresh token AES-256-GCM com contexto; somente servidor. Endpoints mutáveis
  verificam origem e sessão médica viva/atribuição/vínculo atual.
- Criação concorrente serializada por agendamento. Falha externa incerta vira
  recuperação controlada; não gerar outra sala automaticamente.
- Importar somente sessão inequívoca da sala na janela da consulta e artefato
  final `FILE_GENERATED`. Coletar todas as páginas antes do commit atômico.
  Adapter admite início desde 30 min antes até 120 min após o fim agendado e exige
  encerramento dentro da janela; ambiguidade não escolhe uma sessão ao acaso.
  Ambiguidade, limite ou falha não salva prefixo como fonte completa.
- Orçamento do adapter:60 requisições/45 s/4 MiB/até 5.000 itens por coleção.
  Limites não são promessa de cobrir qualquer reunião.
- Fonte original, autorização e revisão são privadas/separadas. Participantes
  recebem identificadores locais, sem inferência automática de identidade.
- Desconectar bloqueia acesso novo local e tenta revogar no Google, informando
  falha remota. Não apaga textos já importados nem resolve retenção automaticamente.

## Evidência, pendências e referências

[Release e configuração](historico/entregas/WORKSPACE_E_TRANSCRICAO_2026-10-14.md):
591 testes no workspace e21 focados no preparo Google; médico 200,
paciente 403/nativa 409; original/revisão de texto fictício preservados e mobile320
conferido. Controller determinístico e persistência não comprovam reconhecimento
real de voz. Nenhuma reunião real foi validada.

Próximo gate: grant/licença/chamada de teste; para o novo fluxo, implementar
primeiro consentimento por consulta e autorização própria de background.
[Checkpoints](CHECKPOINTS_ENTREGAS.md) e [Gate P](GATE_P.md) continuam separados.

Referências técnicas consultadas na implementação (revalidar antes de ampliar):
[Meet artefatos](https://developers.google.com/workspace/meet/api/guides/artifacts),
[scopes](https://developers.google.com/workspace/meet/api/guides/authenticate-authorize),
[configuração de artefatos](https://developers.google.com/workspace/meet/api/guides/meeting-spaces-configuration),
[SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).
