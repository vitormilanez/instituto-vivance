# Proposta — estado de "não visto" por profissional

**Status: aguardando aprovação. Nada foi aplicado em nenhum banco.** A
migration está aqui, fora de `supabase/migrations/`, de propósito: o
workflow `release.yml` faz `supabase db push` quando `supabase/**` muda na
`main`, e esta mudança só entra no banco depois da sua aprovação.

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
- `patient-item-reads.isolation.test.snippet.ts` — teste para
  `tests/isolation.test.ts`.

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

## Decisões em aberto para você

- Mensagens já têm cursor próprio (`care_conversation_reads`). A proposta
  trata mensagem como item também, para a Home ter uma regra só. Se preferir,
  mensagens podem usar o cursor existente.
- Não há auditoria de leitura (não é ato clínico). Se a clínica precisar de
  trilha de "quem viu o quê", isto muda.
