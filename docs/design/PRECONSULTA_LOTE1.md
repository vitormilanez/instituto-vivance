# Pré-consulta — lote 1

Registro visual factual do fluxo de pré-consulta em `apps/web`. Esta é uma extensão **Operate** da superfície autenticada VIVANCE: preserva a linguagem existente e torna visível o próximo trabalho humano. As capturas `.impeccable/review/preconsulta-*` são fixtures locais para revisão visual; não comprovam autenticação, dados reais ou integração clínica.

## Estrutura do fluxo

- A equipe abre um preparo inline na Agenda/área de preparo. `PreparationRequestEditor` exibe o nome do paciente, permite editar e reordenar exatamente cinco perguntas e envia um roteiro preservado para aquele encontro. Não usa modal.
- O paciente recebe o preparo em `PatientReturnPreparationWorkspace`. As cinco perguntas aparecem como campos opcionais; o rascunho é privado, pode ser salvo para continuar depois e o envio final exige confirmação explícita. Depois do envio, o relato original fica somente leitura.
- A equipe visualiza a resposta em `StaffReturnPreparationWorkspace` e em `EncounterPreparationSummary`. A revisão interna fica separada do relato original; revisar não altera o conteúdo enviado nem preenche o registro clínico automaticamente.

## Hierarquia de ação

- Cards e badges distinguem trabalho pendente de simples informação: `1 ação pendente`, `1 revisão pendente` e `Aguardando paciente` orientam a próxima operação; `Solicitado`, `Enviado`, `Revisado` e `Cancelado` comunicam estado.
- Na área do paciente, o quick action de pré-consulta é um item acionável e muda entre `Responder pré-consulta` e `Continuar preenchimento`. O estado não deve ser tratado como notificação genérica.
- Feedback de salvamento, envio e revisão usa `notice`, `feedback` e `role="status"`/`role="alert"`; estados de erro de rede mantêm a tentativa idempotente identificável.

## Conteúdo e limites

- `PreparationPriorities` mostra prioridades declaradas em ordem, com no máximo três assuntos. O primeiro é “Principal”; os demais são “Secundária”. A cópia explicita que são assuntos para conversa, não risco ou avaliação clínica.
- Estados vazios dizem o que falta e como o item surgirá: nenhum preparo disponível, solicitação aguardando o paciente ou consulta cancelada com histórico preservado. Não preencher ausência com dados fictícios.
- A linguagem é pt-BR, direta e não alarmista. IA e áudio permanecem adiados neste lote; não criar affordances para geração, transcrição, decisão ou recomendação clínica.

## Responsividade e tokens incumbentes

- O fluxo usa painéis e cartões existentes, com agrupamento em coluna e ações com `min-height` de 44 px. Até 760 px, cabeçalhos e grids de revisão se empilham e o painel reduz o espaçamento interno; a página deve continuar utilizável desde 320 px, sem rolagem horizontal estrutural.
- A folha `apps/web/app/globals.css` define o vocabulário usado: `--navy: #03132d`, `--blue: #124da0`, `--blue-soft: #edf3fb`, `--ink: #071a3a`, `--muted: #405675`, `--canvas: #f6f9fe`, `--border: #dbe4f0`, com `--positive` para revisão e `--attention` disponível para estados de atenção. Superfícies são brancas/claras, bordas finas e sem sombras ou desfoque novos.
- Acento azul-claro marca orientação e estados do preparo; ouro continua restrito à identidade do logo. Manter foco visível, labels persistentes, leitura por teclado e não depender apenas de cor.

## Evidência de revisão

As capturas locais servem para conferir a composição do lote 1 em estados de solicitação, preenchimento, revisão, vazio e mobile. Elas não substituem aceite autenticado, validação de autorização/RLS, integração externa ou aceitação clínica.
