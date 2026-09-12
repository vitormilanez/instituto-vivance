# Processamentos privados — Slice 5D

## VALOR DESTA ENTREGA

A Vivance passa a ter uma base durável e privada para acompanhar tarefas técnicas autorizadas do cuidado, sem iniciar gravação, transcrição, IA ou envio de dados a fornecedores.

## RESULTADO DEMONSTRÁVEL

- Médico ou enfermagem com vínculo de cuidado ativo pode ver, na clínica, a fila privada de tarefas daquele paciente.
- Uma tarefa tem estados claros: pendente, em processamento, concluída ou falhou; a tela mostra apenas tipo, estado, tentativas e data.
- A mesma origem não duplica trabalho: uma chave idempotente devolve a tarefa já existente quando o contexto é o mesmo.
- Um executor de servidor, ainda não ativado, poderá recuperar uma reserva vencida, obter uma tarefa, concluí-la ou registrar uma falha controlada.

## POR QUE É NECESSÁRIA AGORA

Áudio e apoio assistivo não devem ser ligados diretamente a uma tela ou a um fornecedor. Esta fatia estabelece primeiro a fronteira de autorização, privacidade, repetição e falha; a futura captura de áudio poderá conectar uma origem específica sem criar uma fila improvisada.

## Privacidade, acesso e execução

- `processing_jobs` guarda somente clínica, paciente, tipo da tarefa, chave idempotente, estado, tentativas, reserva temporária e código genérico de falha. Não guarda áudio, texto clínico, prompt, resposta de fornecedor, token ou erro bruto.
- A leitura exige sessão, papel clínico (`doctor` ou `nurse`) e vínculo de cuidado ativo com o paciente. Paciente, administrador operacional, clínica diferente e vínculo revogado não veem a tarefa.
- O navegador não recebe permissão de inserir ou atualizar a tabela. A criação genérica fica no schema privado e futuras jornadas exporão somente uma operação estreita própria.
- O executor exige `service_role`; não há rota de navegador, Vercel Cron, Edge Function, fornecedor, segredo, gravação, transcrição ou IA ativados nesta entrega.
- A reserva dura cinco minutos. Falha recuperável volta à fila com espera limitada; falha permanente ou estouro de tentativas encerra a tarefa. A auditoria registra a alteração sem copiar conteúdo de origem.

## Rotas e migrações

- Tela de equipe: `/clinicas/:tenantId/processamentos`
- Banco de desenvolvimento: `20260912003803_processing_job_foundation`
- Índice complementar do vínculo de autoria: `20260912003922_processing_job_created_by_index`

## Evidências de desenvolvimento

- As duas migrações estão aplicadas no Supabase de desenvolvimento. A tabela está com RLS; `authenticated` só pode ler pela política de vínculo de cuidado e não pode inserir/atualizar. As RPCs do executor são exclusivas de `service_role`.
- A suíte local cobre criação idempotente, negação por papel, clínica e vínculo, ausência de escrita direta, reserva, token inválido, repetição, timeout, recuperação, falha definitiva e auditoria sem a chave de origem.
- A visualização pública foi conferida em desktop e 390 px: entrada renderiza, rota privada sem sessão volta à entrada e não houve estouro horizontal. A jornada autenticada depende de uma sessão legítima já existente; nenhuma credencial foi criada ou retida para esta prova.

## Limites

Esta é uma fundação de fila, não um processador em execução. Não há áudio, vídeo, upload, transcrição, modelo de IA, conteúdo clínico, notificação, agendamento automático, custo novo, fornecedor ou promessa de conclusão. Antes de conectar uma origem real, definir separadamente consentimento, retenção, fornecedor, custo, tratamento de falhas e revisão humana. O Gate P continua obrigatório antes de qualquer dado de saúde real ou entrada em operação.
