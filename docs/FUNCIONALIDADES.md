# Funcionalidades atuais

Este é o contrato funcional consolidado da aplicação em `apps/web`. Detalhes de
implementação pertencem ao código, às migrations e aos testes da `main`.

## Acesso e organização

- Login individual com Supabase Auth e sessão em cookies seguros.
- Seleção explícita de clínica e isolamento entre tenants.
- Papéis de administrador, médico, enfermagem e paciente vindos do banco, nunca
  de metadados editáveis pelo usuário.
- Primeiro acesso, definição e recuperação de senha com retorno permitido e
  falha fechada quando a configuração obrigatória estiver ausente.

## Equipe e pacientes

- Cadastro demográfico, busca e ficha individual do paciente.
- Convites de equipe, aceite, suspensão e reativação.
- Atribuição, aceite, revogação e reatribuição do vínculo de cuidado.
- Administradores operam cadastro e equipe, mas não recebem acesso automático a
  conteúdo clínico.

## Agenda e atendimento

- Agendamento, remarcação, cancelamento e registro de falta.
- Prevenção de conflitos, versão otimista e auditoria.
- Início explícito do atendimento pela Agenda, rascunho, retomada, finalização
  e adendos imutáveis.
- Conteúdo clínico exige vínculo ativo; escrita permanece restrita ao autor e às
  regras de papel previstas no banco.

## Cuidado longitudinal

- Plano de cuidado interno e versionado.
- Revisão/aprovação médica separada da publicação ao paciente.
- Substituição e retirada preservam histórico.
- Check-ins manuais mantêm o relato original e a revisão interna separada.
- Evolução apresenta somente medidas e eventos persistidos, com data, unidade e
  origem; não infere diagnóstico, urgência, meta ou tendência.

## Pré-consulta

- O profissional solicita uma preparação de retorno com cinco perguntas
  versionadas e ordenadas.
- O paciente pode salvar rascunho parcial, mas só envia após responder às cinco
  perguntas e confirmar explicitamente.
- A tarefa obrigatória aparece antes das demais ações do paciente.
- Respostas canceladas permanecem legíveis e não são reabertas para edição.

## Diário alimentar do paciente

- O paciente registra tipo da refeição, data e horário e uma descrição entre 1 e
  2.000 caracteres, gravada e exibida literalmente como enviada, inclusive
  espaços, acentos e quebras de linha nas extremidades.
- O histórico exibe os 20 relatos mais recentes do próprio paciente, com data e
  horário, sem reescrever o texto.
- A gravação é idempotente por `request_key`: reenviar a mesma solicitação não
  cria uma segunda refeição. A tabela não aceita inserção, alteração ou exclusão
  direta; apenas a função versionada grava.
- Leitura restrita ao próprio paciente e à equipe com vínculo de cuidado ativo.
  Administrador, outra clínica, outro paciente, profissional sem vínculo e
  vínculo revogado não acessam.
- "Meu diário" permanece dentro da jornada já existente, sem criar uma nona ação
  rápida, e a Agenda e a pré-consulta obrigatória seguem inalteradas.
- O recurso não calcula calorias ou nutrientes, não avalia a qualidade da
  alimentação e não produz diagnóstico, alerta, meta ou recomendação automática.

## Documentos, conversas e avisos

- Documentos PDF/JPG/PNG privados, com validação, armazenamento não público,
  acesso por vínculo e download temporário.
- Separação entre documento interno e compartilhado com o paciente.
- Conversas assíncronas entre paciente e médico vinculado, persistentes e
  paginadas.
- Avisos internos por destinatário, sem expor conteúdo clínico no resumo.
- Não há WhatsApp, SMS, push, promessa de prazo ou canal de urgência.

## Relatórios e área do paciente

- Relatórios manuais com fontes autorizadas, versões, revisão e aprovação.
- Publicação ao paciente usa conteúdo próprio, pode ser substituída ou retirada
  e gera PDF privado identificado.
- A área do paciente reúne Hoje, Meu cuidado, Conversas e Evolução.
- Consultas, plano publicado, ciência de leitura, documentos compartilhados,
  conversas e relatórios usam dados persistidos e autorizados.

## Processamentos e IA

- Existe uma fundação privada para tarefas idempotentes, tentativas e reserva de
  executor.
- Não há worker, áudio, transcrição, modelo de IA, diagnóstico ou decisão
  clínica automática ativos.
- Qualquer uso futuro de IA deve preparar ou organizar informação para revisão
  humana; aprovação e publicação continuam explícitas e médicas.

## Limites atuais

- O artefato técnico publicado não comprova banco de produção reconciliado nem
  jornada autenticada completa.
- Dados reais, integrações clínicas, fornecedores novos, áudio e IA dependem de
  autorização específica e do Gate P.
- O sistema não deve ser usado como canal de emergência.
