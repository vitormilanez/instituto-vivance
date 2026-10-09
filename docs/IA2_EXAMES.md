# IA2 — continuidade dos exames sintéticos

> **Atualização de 09/10/2026:** o pacote local de integração está em
> `/Users/vitormilanez/Desktop/Codes/vivance-package-20261009`, branch
> `codex/vivance-package-20261009`. Ele agrega o PR #78 ao C3/PR #94 e inclui
> worker Edge e a migration local de itens revisáveis, renumerada para
> `20261009231639_ia2_structured_exam_items.sql` após as migrations C3.
> O worker reconhece apenas a fixture PDF explicitamente fictícia: 44
> marcadores e um trecho narrativo ficam ligados a página/trecho, e a tela
> médica oferece revisão versionada por item sem publicação ao paciente.
> Parser e PDF de fixture passaram localmente; essa experiência ainda não foi
> implantada nem validada no Preview.
> Nada foi publicado ou aplicado. Os passos de ativação controlada estão em
> `scripts/ops/activate-ia2-synthetic-worker.sql` e
> `scripts/ops/deactivate-ia2-synthetic-worker.sql`; exigem projeto dev
> confirmado, função publicada, `pg_cron`/`pg_net` instalados e Vault com
> `vivance_ia2_worker_url` e `vivance_ia2_worker_cron_secret` correspondente
> ao segredo Edge `EXAM_WORKER_CRON_SECRET`. Antes de uso, revisar os
> privilégios do executor do job e conferir job, tentativa, falha/retry e
> negação em sessão autenticada. O texto abaixo registra o estado histórico
> do PR #78 e não substitui os [checkpoints atuais](CHECKPOINTS_ENTREGAS.md).

Consolidado em **08/10/2026**. Este handoff resume o trabalho que existe fora da
main e aponta ao contrato/evidências originais; não duplica o plano de IA.

## Onde continuar

- Checkout: `/Users/vitormilanez/Desktop/Codes/vivance-ia2-exams`.
- Branch: `codex/exames-consolidados-contrato-20261003`.
- [PR #78](https://github.com/vitormilanez/instituto-vivance/pull/78): aberto,
  rascunho; HEAD `1e4493a3149a3b95efc597f1baa94847e7cf0b42`, árvore limpa
  na conferência de 08/10.
- [Contrato, formatos, critérios e evidências no commit conferido](https://github.com/vitormilanez/instituto-vivance/blob/1e4493a3149a3b95efc597f1baa94847e7cf0b42/docs/EXAMES_CONSOLIDADOS_IA2.md).
  Localmente: `docs/EXAMES_CONSOLIDADOS_IA2.md` nesse checkout.

Antes de implementar, comparar a branch com a main atual e preservar as mudanças
do briefing e da campanha. Não copiar todo o status antigo da branch para a main,
nem substituir seu código por uma versão anterior. Este handoff não fez merge,
rebase, alteração no PR ou atualização do banco.

## O que já funciona no piloto

- Upload privado do PDF fictício e autorização nominal em duas listas do piloto.
- Execuções por documento/hash/versão e texto persistido por página, com RLS.
- Extração convencional de texto embutido; possível repetição vira
  `requires_review`, preservando texto e página original.
- Enfileiramento idempotente pelo médico vinculado, resposta `202`, lease e
  tentativas limitadas; worker usa a sessão médica, sem chave privilegiada no app.
- Aba Documentos mostra o andamento, texto recolhido por página e acesso ao original.

O registro de 04/10 documenta um segundo PDF inteiramente fictício no Preview
`dpl_6sSuxXjivv2c6e4sFpTvFgWeuqDY`, código `127e046`: tarefa `completed` na
primeira tentativa, três páginas persistidas e execução `requires_review` pela
possível repetição na página 2. Persistência e interface foram conferidas na
sessão médica. Esses resultados são evidências registradas, não um teste repetido
em 08/10; IDs completos estão no contrato original.

## O que ainda não está entregue

- Fila autônoma: a execução começa após a resposta HTTP e a leitura da aba retoma
  tentativas vencidas; não há agendador independente para recuperação.
- Validação autenticada com paciente e exercício de falha/retentativa no Preview.
- Segmentação em laudos, resultados clínicos estruturados, narrativas atribuídas
  ao emissor, consolidação e revisão por resultado.
- Claude, OCR, interpretação clínica, aceite clínico ou liberação de dados reais.

O contrato original acumula etapas históricas: trechos de 03/10 falam em
“manual e síncrono” e “migration pendente”. Para o último estado, prevalece sua
seção **Fila do piloto — continuação de 04/10/2026**, sem apagar a cronologia.

## Próxima entrega da frente IA2

A prioridade entre frentes está em [Direção e slices](DIRECAO_E_SLICES.md).
A avaliação de 08/10 propõe fechar um percurso C3 antes de ampliar IA2;
essa proposta aguarda validação e não altera as evidências deste piloto.

**Exames sintéticos conferíveis pelo médico**, continuando IA2-A/IA2-B sem criar
outra frente. Valor: sair da leitura de páginas soltas para resultados e narrativas
com origem verificável, mantendo a decisão com o médico.

1. Fechar a base técnica: testar negação em sessão de paciente, falha recuperável,
   idempotência e comportamento sem aba aberta. Se o slice prometer recuperação
   autônoma, implementar e comprovar o agendador; caso contrário explicitar o limite.
2. Validar o contrato de laudos/observações: valor literal, unidade, referência
   do emissor, data e página/trecho; distinguir arquivo, laudo e resultado.
3. Implementar um recorte sintético numérico e narrativo com revisão por item,
   correção versionada e acesso ao original. Ausência ou ambiguidade exige conferência.

**Dependências e riscos:** reconciliar a branch com main e migrations aplicadas,
preservar permissões/vínculo, fontes e correções humanas. Manter o corpus fictício
autorizado; fornecedor/modelo exige IA1. Usar parser determinístico ou fixture
explícita para o recorte sem afirmar extração genérica de qualquer PDF.

**Aceite:** resultado liga arquivo/página/trecho; duplicatas não apagam fonte;
reprocessar não duplica resultado nem sobrescreve revisão; correção é auditável;
falha não vira vazio; permissões negadas e recarga/persistência conferidas.
Nada é publicado automaticamente ao paciente. Testes dirigidos ao contrato,
permissões e fila, seguidos de um percurso integrado sintético em Preview.
A direção médica avalia cobertura/erros separadamente; aprovação de extração
não equivale a aceite clínico. A implementação do próximo recorte depende da
validação do contrato, conforme o [brief de retomada](RETOMADA_DESENVOLVIMENTO.md).

## Banco e gates

O PR registra estas migrations aplicadas no projeto único de teste
`instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`), compartilhado com o app publicado:

- `20261004142437_ia2_document_text_extraction.sql`;
- `20261004153431_exam_extraction_worker.sql`;
- `20261004154416_exam_doctor_worker_access.sql`.

Elas estão na branch IA2; não assumir que a main representa todo o histórico do
banco. Antes de outra migration, conferir o destino e comparar os históricos
sem reaplicar ou renumerar versões existentes. Nenhum acesso ao banco ocorreu
nesta organização. O [plano de IA](PLANO_IA_CLINICA.md), IA1 e o
[Gate P](GATE_P.md) permanecem aplicáveis. C2/C3 seguem sem aceite operacional.
