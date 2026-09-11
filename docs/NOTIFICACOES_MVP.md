# Avisos internos — Slice 5C

## Valor desta entrega

Paciente e médico recebem, dentro da própria Vivance, um aviso persistente quando há uma mensagem direta nova ou uma orientação publicada. O aviso apenas conduz a pessoa ao lugar certo; ele não transporta conteúdo clínico.

## Resultado demonstrável

- **Avisos** fica disponível no cabeçalho para paciente e equipe, e na navegação lateral da equipe.
- Cada pessoa vê somente seus próprios avisos, paginados em grupos de 20.
- Abrir um aviso marca somente aquele aviso como lido e encaminha para a conversa ou orientação correspondente.
- A pessoa pode pausar ou retomar os próximos avisos internos sem apagar o histórico.
- Mensagem direta e publicação de plano geram os dois primeiros tipos permitidos: `message` e `plan_published`.

## Privacidade, acesso e persistência

- O banco armazena somente tipo do evento, chave idempotente, caminho interno, hora e estado de leitura. Não há título livre, corpo de mensagem, nome de paciente, conteúdo do plano, horário de consulta ou outro dado clínico no aviso.
- `in_app_notifications` e `notification_preferences` usam RLS e seleção exclusiva do próprio destinatário com sessão, clínica e membership ativos. Administrador operacional não recebe nem lê os avisos de outras pessoas.
- Não existe escrita direta pelo navegador. As únicas mutações são RPCs estreitas para marcar a própria leitura e alterar a própria preferência; produtores internos privados geram avisos com caminho limitado à própria clínica.
- A mensagem e a publicação mantêm seu dado real somente nas tabelas já autorizadas. A criação/leitura/preferência de aviso é auditada apenas por evento e campos alterados, sem copiar conteúdo.
- A chave única por clínica, destinatário e evento evita duplicidade. Sessão, vínculo ou membership revogados cortam leituras e mutações imediatamente.

## Rotas e migração

- Tela: `/clinicas/:tenantId/avisos`
- Leitura: `POST /api/v1/clinics/:tenantId/notifications/:notificationId/read`
- Preferência: `POST /api/v1/clinics/:tenantId/notification-preferences`
- Banco de desenvolvimento: `20260911234004_in_app_notifications`

## Evidências de desenvolvimento

- A suíte local passou com 100 testes, incluindo isolamento entre destinatários/clínicas, preferência individual, leitura idempotente, negação de escrita direta, rollback de mensagem e ausência de conteúdo no audit.
- Tipos, lint, build e `git diff --check` passaram.
- No Supabase de desenvolvimento, as duas tabelas estão com RLS e uma política de leitura própria cada. O advisor não encontrou alerta novo introduzido por esta migração; os avisos existentes de senhas vazadas, funções antigas e desempenho permanecem fora desta fatia.
- Médico e paciente sintéticos autenticados enviaram mensagens nos dois sentidos. A sequência visível foi: mensagem → aviso genérico → marcação de leitura → conversa correta; pausar a preferência suprimiu o próximo aviso e retomar restaurou a entrega. A tela do paciente foi conferida em 390 px. Clínica, identidades, sessões, mensagens, avisos, preferências e auditorias sintéticos foram removidos por IDs conferidos.

## Limites

Esta entrega usa somente o canal interno da Vivance. Não envia e-mail, WhatsApp, SMS, push do dispositivo ou dados a outro fornecedor; portanto não cria custo, prazo, cobertura, plantão, tentativa de entrega externa ou obrigação de resposta. Não há avisos de agenda nesta fase. O canal de mensagens continua direto, assíncrono e não emergencial.

O Gate P continua obrigatório antes de qualquer dado de saúde real ou entrada em operação.
