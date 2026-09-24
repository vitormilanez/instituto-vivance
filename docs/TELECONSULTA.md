# Teleconsulta — primeira etapa

A agenda permite escolher Presencial ou Teleconsulta e salvar o link de uma reunião Google Meet já criada. A configuração aparece após criar um agendamento ou em **Modalidade / teleconsulta** na sua linha. A modalidade só pode mudar enquanto o agendamento estiver agendado.

Ao abrir um atendimento por vídeo pela agenda, o médico entra no **Modo atendimento**: chamada e contexto do paciente à esquerda, registro clínico à direita. Registros existentes também oferecem **Abrir modo atendimento**. O Meet abre em outra aba/janela; o Vivance não afirma que a pessoa entrou na reunião nem oferece controles falsos de câmera ou encerramento. O [picture-in-picture do Meet no Chrome](https://support.google.com/meet/answer/13665919?hl=pt-br) permite manter o vídeo sobre o registro.

No Modo atendimento, uma pausa de 1,5 segundo salva o rascunho pela API clínica existente. Há apenas um envio por vez; uma resposta não substitui texto digitado enquanto o envio estava em andamento. Falhas interrompem novas tentativas automáticas e mantêm o texto na tela para tentativa manual. Fechar a página com alterações pendentes continua exigindo confirmação. O navegador não armazena o texto em localStorage. Finalizar o registro e publicar orientações permanecem ações explícitas e independentes da chamada.

## Banco e API

- `public.appointment_teleconsultations`: uma configuração por `(tenant_id, appointment_id)`, modalidade, provedor, URL, versão, autoria e datas.
- Ausência de configuração mantém o comportamento presencial anterior.
- `GET /api/v1/clinics/:tenantId/appointments/:appointmentId/teleconsultation` devolve `{ teleconsultation: objeto | null }`.
- `PUT` no mesmo caminho recebe `{ delivery_mode: "in_person" | "video", join_url: string | null, version: number }`. Versão zero cria; a versão lida atualiza. O provedor é definido pelo servidor.
- Nesta etapa, apenas URLs canônicas `https://meet.google.com/xxx-xxxx-xxx`, sem parâmetros ou fragmentos. Presencial exige URL nula.
- RLS limita profissionais à clínica/papel/atribuição do agendamento. O paciente só lê sua própria configuração em agendamentos `scheduled` ou `in_progress`; não escreve. Anônimos não têm acesso. Não há DELETE para authenticated.
- Trigger invoker, lock do agendamento, versionamento otimista e auditoria existente. A auditoria guarda nomes de campos alterados, nunca o link da reunião.
- API valida origem, JSON e tamanho. Leituras usam a sessão do usuário, sem service role.
- A área do paciente mostra **Entrar na teleconsulta** na próxima consulta e na lista de consultas quando o acesso está permitido.

## Migrações aplicadas

Aplicadas no projeto conectado `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`) em 23/09/2026, horário de Brasília:

1. `20260924003423_appointment_teleconsultations.sql`
2. `20260924003636_consolidate_appointment_teleconsultation_read_policy.sql`

Os nomes locais correspondem ao histórico remoto. A segunda migração consolida os mesmos predicados de leitura em uma única policy SELECT. Nenhuma migração anterior foi reescrita. A verificação remota confirmou RLS, uma policy SELECT, ausência de SELECT para anon e de DELETE para authenticated. A tabela permaneceu vazia após a validação; nenhum link fictício foi atribuído a consultas existentes.

Advisors não apontaram avisos de segurança para a tabela nova. Os novos índices das FKs aparecem como [ainda não usados](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), esperado para uma tabela vazia. Permanecem findings anteriores em outros objetos: funções [SECURITY DEFINER públicas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), funções [autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), políticas e índices históricos, e [proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Esta etapa não altera essas configurações.

## Evidência e limites

- 351 testes passaram; typecheck, ESLint e build passaram.
- PGlite executa todas as migrações e testa isolamento entre clínicas, médicos, pacientes, papéis, estados do agendamento, reatribuição, versionamento, restrições de URL/NULL e auditoria sem URL.
- Testes de reconciliação protegem edição durante o salvamento e normalização pelo servidor.
- Navegador local com sessão médica real: agenda, carregamento da configuração pelo Supabase, rejeição de URL externa, entrada no Modo atendimento e estado sem link. Conferidas larguras de 1060 e 600 CSS px, sem overflow horizontal; editor de 360/260 px de altura mínima. Nenhum registro clínico foi alterado nessa conferência.
- Ainda requer aceitação com uma reunião real: salvar o link válido pela interface, acessar com o paciente correto, entrar na chamada e conferir salvamento/reabertura de um rascunho de teste. Áudio/vídeo e gravação não foram testados nem ativados.
- Código em branch própria dependente do redesign médico. Não houve merge nem promoção web para Production nesta etapa.
