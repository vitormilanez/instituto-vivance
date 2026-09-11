# Agenda — primeira entrega operacional

## Escopo

- Calendário mensal com seleção de dia, indicação de horários e retornos futuros do mês.
- Criar, editar/remarcar e cancelar consulta ou retorno. Cancelamento preserva o registro; não existe exclusão nem reativação pela aplicação.
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
- `PATCH /api/v1/clinics/:tenantId/appointments/:id`: os mesmos campos mais `version`, ou apenas `status: cancelled` e `version`.
- Autenticação por sessão e RLS; mutações exigem JSON, corpo limitado e origem correspondente à autoridade HTTP. Não é uma API pública sem autenticação.
- Respostas privadas, sem cache compartilhado. Nenhuma chave administrativa no navegador.

## Validação

- 44 testes automatizados: permissões, isolamento entre clínicas, sessões revogadas, campos imutáveis, conflitos, cancelamento, versionamento, atomicidade da auditoria e proteção de origem.
- Os cenários sintéticos rodam em PostgreSQL temporário (PGlite), sem criar usuários ou pacientes no Supabase.
- Validação local pela tela: login da administradora, criação e remarcação de agendamento do paciente de teste já existente; leitura pelo médico e paciente. Tentativa duplicada retorna 409; alteração pelo paciente e acesso a outra clínica retornam 403.
- Correção de origem local: Next.js pode reconstruir a URL com `localhost` mesmo quando o navegador usa `127.0.0.1`; a validação compara a origem com `Host` e protocolo, sem confiar em `X-Forwarded-Host`.

## Limites e pendências

- Sem notificações, Google Calendar, confirmação bilateral, recorrência, disponibilidade por turno, lista de espera, conclusão de consulta ou prontuário.
- O seletor do piloto carrega até 1.000 pacientes; ampliar com busca paginada antes de exceder esse volume. O paciente consulta os últimos 30 e próximos 60 dias.
- O nome de exibição dos médicos foi preenchido com o e-mail da conta existente; edição de perfil profissional é uma entrega futura.
- Supabase Security Advisor: somente o aviso de proteção contra senhas vazadas desabilitada. Habilitar/rever antes de dados clínicos reais: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Performance Advisor: índices novos ainda sem uso e múltiplas políticas permissivas para separar papéis. Não remover índices de exclusão; são garantias de integridade. Reavaliar planos de consulta com volume real.
- Não é homologação para uso clínico em produção. Manter a prévia protegida e substituir senhas compartilhadas de teste antes de uso real.
