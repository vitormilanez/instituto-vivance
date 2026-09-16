# Pré-consulta do paciente — lote 1

## Entrega e limites

Implementação na branch `codex/patient-preconsultation`, no app conectado `apps/web`.
Este lote não aplica migrações remotas, não faz merge e não publica em Production.

- Médico abre a Agenda e prepara cinco perguntas editáveis e reordenáveis para um compromisso futuro, de consulta ou retorno, com vínculo ativo e acesso do paciente.
- Cada solicitação preserva sua própria versão do roteiro. Alterar perguntas antes de solicitar não modifica envios antigos.
- Paciente encontra o card **Pré-consulta**, com quantidade de ações pendentes; pode salvar rascunho privado e confirmar o envio final.
- Paciente pode escolher até três assuntos em ordem. O primeiro é principal; os demais são secundários. Não responder não significa desinteresse.
- Médico recebe o envio na fila de revisão e encontra respostas originais e prioridades no **Preparo**, primeira etapa inline do atendimento do mesmo compromisso.
- A revisão não publica plano nem copia automaticamente o relato para conclusões clínicas ou prontuário.

“Tier” neste lote significa prioridade explicitamente declarada pelo paciente. Não existe inferência por IA, classificação de risco clínico ou pontuação de engajamento. Áudio e IA continuam adiados. Modelos de questionário reutilizáveis por médico/clínica e os demais cards do portal ficam para lotes posteriores.

## Perguntas iniciais

1. Qual é o principal assunto que você quer conversar nesta consulta? O que gostaria de conseguir com esse encontro?
2. Desde a última consulta — ou nas últimas semanas, se esta for a primeira — o que mudou na sua saúde ou no seu bem-estar?
3. Como estão seu sono, alimentação, atividade física e disposição? Qual desses pontos mais precisa de atenção para você?
4. Quais medicamentos, suplementos ou orientações você está seguindo? Teve alguma dificuldade ou percebeu algo que gostaria de relatar?
5. Quais dúvidas ou preocupações você não quer deixar de conversar com o médico? Qual delas deve vir primeiro?

Todas as respostas e a escolha de assuntos são opcionais. O médico pode ajustar o texto das perguntas; os IDs são referências da pergunta, não destinos automáticos em campos clínicos.

## Dados e destinos

| Informação | Persistência | Exibição |
|---|---|---|
| Texto e ordem das cinco perguntas | `return_preparation_questionnaires.questions`, versão imutável por solicitação | Formulário do paciente e respostas originais do médico |
| Clínica, médico, paciente e compromisso | `return_preparation_requests` e `questionnaire_version` | Agenda, card e Preparo do compromisso correto |
| Respostas ainda não enviadas | `return_preparation_drafts.answers`, `version` | Somente paciente autor |
| Assuntos ordenados do rascunho | `return_preparation_drafts.priorities` | Somente paciente autor |
| Relato final e assuntos escolhidos | `return_preparation_submissions.answers`, `priorities`, `submitted_at`, `submitted_draft_version` | Paciente e médico responsável autorizado |
| Confirmação de revisão e nota privada | `return_preparation_reviews` existente | Área de revisão do médico |

São reutilizadas as rotas autenticadas `return-preparations`, `/{id}/draft`, `/{id}/submission` e `/{id}/review`, sob `/api/v1/clinics/{tenantId}`. Sem nova API paralela.

## Estados, segurança e notificações

`requested → draft → submitted → reviewed`; cancelamento mantém o histórico permitido.

- Card conta todas as solicitações `requested`/`draft` via consulta agregada, independentemente da página do histórico. Abrir uma notificação não conclui a ação.
- Links do card e da fila abrem a solicitação exata, mesmo fora da primeira página.
- Solicitação e envio final têm proteção contra repetição; reutilizar uma chave com conteúdo diferente é rejeitado.
- Rascunhos exigem versão atual; envio final preserva o original e impede edição posterior.
- Isolamento por clínica, conta do paciente e médico responsável; testes incluem acessos cruzados e vínculo revogado.
- Notificações internas existentes são reaproveitadas, sem email/SMS/WhatsApp ou serviço novo.
- O conteúdo enviado não atualiza automaticamente medidas, medicamentos, diagnóstico, plano ou outras colunas clínicas. Exige leitura e decisão humana.

## Validação e ativação

Validação final local: **167/167 testes passando**, incluindo **81 testes de isolamento/banco**; lint, TypeScript e build de produção concluídos. Casos diretos de RPC com versão nula/negativa são rejeitados sem alteração de estado. Runtime de verificação: Node 24.21.0, dependências do lockfile existente.

Testes de banco executam as migrações em PGlite efêmero, com fixtures de autenticação/RLS. Isso não equivale a uma instância Supabase remota nem à validação operacional em produção.

Verificação visual local: componentes reais com dados sintéticos e respostas de API simuladas, desktop 1440px e mobile 390/320px. Foram conferidos edição/ordenação do roteiro, payload de salvamento de respostas/prioridades, cards, revisão e ausência de overflow. A rota temporária de QA foi removida. Revisão independente: **SHIP**, sem achados materiais nas dez capturas; não representa aceite clínico ou jornada autenticada remota.

Migração preparada: `supabase/migrations/20260915235245_extend_preconsultation_questionnaire.sql`.

Antes da ativação, mediante autorização:

1. Aplicar a migração em ambiente de teste controlado; verificar funções/permissões e atualização do schema da API.
2. Publicar Preview compatível. A migração deve anteceder o novo app; assinaturas com argumentos opcionais preservam chamadas antigas, mas não se deve usar cliente antigo para editar rascunhos com prioridades novas.
3. Com contas sintéticas reais de médico/paciente, solicitar → salvar → recarregar → enviar → revisar → abrir Preparo. Conferir notificação, contador e persistência em outra sessão.
4. Validar consulta cancelada, vínculo revogado, acesso de outro médico/paciente/clínica, envio repetido e versão desatualizada.
5. Só então aprovar merge e publicação deste lote. Em rollback, preservar os registros e a migração; não remover dados para voltar a UI anterior.
