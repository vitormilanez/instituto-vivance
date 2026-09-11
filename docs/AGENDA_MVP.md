# Agenda — primeira entrega operacional

## Atualização do slice 3D — 11/09/2026

- A Agenda agora usa os estados `agendado`, `em atendimento`, `concluído`, `cancelado` e `falta`, com transições atômicas e histórico operacional no banco.
- Abrir o atendimento muda imediatamente o compromisso para `em atendimento`; finalizar o registro o torna `concluído`. Cancelamento e falta são bloqueados depois do início, e falta só pode ser registrada após o horário.
- O nome exibido do profissional é o nome cadastrado preservado no compromisso e no atendimento. E-mails e fragmentos técnicos de identidade não são usados como nome clínico.
- Agenda, Atendimento e contexto do paciente retomam a direção visual do protótipo: navegação azul-marinho, tipografia, cards, agrupamento e densidade, sempre com dados reais do fluxo conectado. Os 8 atalhos do painel foram preservados.
- A área do paciente mostra o próximo compromisso real, seu estado e o profissional responsável, além de um contexto honesto quando ainda não há atendimento concluído.

## Publicação do slice 2 — histórico

- URL fixa: https://instituto-vivance-testes-vtr-consulting.vercel.app
- Target: Preview, status READY, sem promoção de produção.
- Deployment: `dpl_AN4yz2SAGRDSn6N95wha6i8ygCnz`; URL imutável: https://instituto-vivance-7gj95pgmu-vtr-consulting.vercel.app
- Commit: `d7907e7`; framework Next.js 16.3.4; build remoto: 15,241 segundos.
- Supabase Site URL: alias fixo com `/primeiro-acesso`. Quatro retornos exatos persistidos, preservando localhost e URLs anteriores; sem novos e-mails de recuperação nesta entrega.

## Escopo

- Calendário mensal com seleção de dia, indicação de horários e retornos futuros do mês.
- Criar, editar/remarcar, cancelar ou registrar falta em consulta/retorno. Cancelamento e falta preservam o registro; não existe exclusão nem reativação pela aplicação.
- Paciente e médico vinculados à mesma clínica por chaves compostas. Apenas médicos com vínculo ativo podem receber novos agendamentos.
- Administrador e enfermagem gerenciam a agenda operacional da clínica. Médico vê/gerencia apenas seus agendamentos. Paciente lê apenas os vinculados à sua ficha, sem poder alterar horários.
- Horário de Brasília (UTC−3), armazenamento em UTC; duração de 5 minutos a 8 horas; novos horários devem estar no futuro.
- Dupla reserva impedida no PostgreSQL para o médico e para o paciente, inclusive com gravações concorrentes. Intervalos adjacentes são permitidos.
- Edição com versão otimista: uma tela desatualizada recebe conflito em vez de sobrescrever outra alteração.
- Auditoria atômica de criação, alteração e cancelamento, sem copiar nomes, horários ou informações clínicas para o evento.
- Nenhum agendamento dá acesso a prontuário ou cria vínculo clínico automaticamente.

## API reutilizável

- `GET /api/v1/clinics/:tenantId/appointments?from=YYYY-MM-DD&until=YYYY-MM-DD`: início inclusivo/fim exclusivo; até 93 dias e 500 resultados, com indicador de truncamento.
- `POST /api/v1/clinics/:tenantId/appointments`: `patient_id`, `doctor_id`, `starts_at`, `ends_at`, `kind` (`consultation`/`return`). Instantes ISO UTC canônicos, incluindo milissegundos.
- `PATCH /api/v1/clinics/:tenantId/appointments/:id`: os mesmos campos mais `version`, ou apenas `status: cancelled|no_show` e `version`.
- Autenticação por sessão e RLS; mutações exigem JSON, corpo limitado e origem correspondente à autoridade HTTP. Não é uma API pública sem autenticação.
- Respostas privadas, sem cache compartilhado. Nenhuma chave administrativa no navegador.

## Validação

- No slice 3D, os 61 cenários diretamente afetados de Agenda, Atendimento, navegação e isolamento ficaram aprovados. TypeScript, lint e build também passaram; não houve ampliação adicional da suíte sem risco concreto.
- A migração remota `20260911055947_agenda_encounter_state_coherence` foi aplicada ao Supabase de desenvolvimento. O pós-check encontrou quatro compromissos e três atendimentos anteriores preservados, sem estado `em atendimento` órfão e sem nome profissional ausente.
- No navegador local conectado ao mesmo Supabase, um médico sintético abriu o compromisso pela Agenda e salvou a versão 2 do rascunho; o paciente sintético viu o mesmo compromisso como `em atendimento` na página Hoje e em Consultas. Desktop e celular de 390 px foram conferidos. Contas, ficha, vínculo, compromisso, atendimento, versões, eventos e auditoria sintéticos foram removidos ao final; os registros anteriores permaneceram intactos.
- O Security Advisor aponta os dois RPCs `start_encounter` e `transition_appointment` como `SECURITY DEFINER`; isso é intencional para as transições atômicas, e ambos validam sessão, papel, clínica, responsável e versão antes de escrever. Permanece também a proteção de senhas vazadas desativada.

- 44 testes automatizados: permissões, isolamento entre clínicas, sessões revogadas, campos imutáveis, conflitos, cancelamento, versionamento, atomicidade da auditoria e proteção de origem.
- Os cenários sintéticos rodam em PostgreSQL temporário (PGlite), sem criar usuários ou pacientes no Supabase.
- Validação local pela tela: login da administradora, criação e remarcação de agendamento do paciente de teste já existente; leitura pelo médico e paciente. Tentativa duplicada retorna 409; alteração pelo paciente e acesso a outra clínica retornam 403.
- Correção de origem local: Next.js pode reconstruir a URL com `localhost` mesmo quando o navegador usa `127.0.0.1`; a validação compara a origem com `Host` e protocolo, sem confiar em `X-Forwarded-Host`.
- Cancelamento pela tela confirmado no banco e no histórico: criação, remarcação e cancelamento. Resultado final da validação: zero agendamentos ativos e um cancelado do paciente de teste já existente; nenhum novo paciente e nenhum e-mail/notificação enviado.
- Na prévia online: login da administradora, calendário, médico e agendamento cancelado visíveis; API sem sessão retorna 401 com `private, no-store`. Visitante sem acesso Vercel recebe redirecionamento de autenticação. As mutações completas foram exercitadas localmente contra o mesmo Supabase; não foram repetidas online para evitar mais registros de teste.

## Limites e pendências

- Sem notificações, Google Calendar, confirmação bilateral, recorrência, disponibilidade por turno ou lista de espera. A conclusão existe apenas quando o médico finaliza o registro interno; ela não publica conteúdo ao paciente.
- O seletor do piloto carrega até 1.000 pacientes; ampliar com busca paginada antes de exceder esse volume. O paciente consulta os últimos 30 e próximos 60 dias.
- Perfis antigos sem nome profissional utilizam o texto neutro `Nome profissional não cadastrado`; o fluxo não inventa nomes nem exibe e-mail como identificação clínica. A edição do perfil profissional continua futura.
- Supabase Security Advisor: proteção contra senhas vazadas desabilitada. Habilitar/rever antes de dados clínicos reais: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Performance Advisor: falta um índice composto específico para a chave estrangeira de ator no histórico de estados; para o volume do piloto é informativo e não bloqueia o fluxo. Índices ainda sem uso e políticas permissivas separadas por papel devem ser reavaliados com volume real, sem remover garantias de integridade.
- Não é homologação para uso clínico em produção. Manter a prévia protegida e substituir senhas compartilhadas de teste antes de uso real.
