# Proposta — estado de "não visto" por profissional

**Status: aprovada em 22/09/2026.** A migration foi movida para
`supabase/migrations/20260923120000_patient_item_reads.sql` e o teste para
`tests/isolation.test.ts`. Aplicação no Supabase de desenvolvimento: pelo
comando do protocolo abaixo, rodado no Mac (o ambiente do agente não tem o
token da CLI). O `rollback.sql` continua nesta pasta.

## O que muda para o médico

Hoje a Home diz "3 recebidos desde a última consulta". Com esta fatia ela
passa a dizer quantos ele ainda não abriu ("3 recebidos · 2 novos") e marca
cada item não aberto com um ponto neutro — estado de leitura, nunca cor de
prioridade. Abrir o item marca como visto **só para quem abriu**.

## Arquivos

- `20260923120000_patient_item_reads.sql` — tabela `patient_item_reads`
  (append-only), RLS de leitura e inserção só do próprio profissional com
  vínculo ativo, e a função `mark_patient_item_read` (security invoker,
  idempotente, falha fechada para item inexistente, de outra clínica ou de
  outro paciente).
- `rollback.sql` — remove a função e a tabela; não toca em dado clínico.
- O teste está em `tests/isolation.test.ts` ("não visto é por profissional…").

## Verificação feita

Numa cópia do repositório (PGlite, todas as migrations + esta): **94/94** no
`isolation.test.ts`, incluindo o teste novo (idempotência, id inventado,
tipo errado, outra clínica, autoria forjada, update/delete negados,
enfermagem sem vínculo e paciente sem acesso, revogação esconde a leitura) e
um teste de que o rollback remove só o que a proposta criou.

## Protocolo para aplicar (depois do OK)

1. Mover o `.sql` para `supabase/migrations/` e o trecho de teste para
   `tests/isolation.test.ts`; rodar a suíte.
2. Aplicar no **dev** com `db query --file` (sem `db push`), conferindo o
   `project-ref`; registrar que o histórico não foi gravado, ou reparar como
   no commit `52d22cb`.
3. Só então a camada da aplicação: rota `POST .../items/read` chamando a
   função, marcação ao abrir o item a partir da Home (antes da navegação),
   e a contagem "N novos" por anti-join com `patient_item_reads`.

## Decisões

- Mensagens seguem a mesma regra dos outros itens na Home (uma regra só). O
  cursor da conversa (`care_conversation_reads`) continua valendo na tela de
  Mensagens; os dois não se sincronizam — abrir pela Home marca na Home.
- Não há auditoria de leitura (não é ato clínico). Se a clínica precisar de
  trilha de "quem viu o quê", isto muda.
