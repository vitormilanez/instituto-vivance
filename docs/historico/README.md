# Histórico útil

Estes registros preservam conteúdo único; não definem prioridade, estado atual
ou autorização. Comece pelo [índice vigente](../README.md).

- [C2/C3 em 29/09](C2_C3_2026-09-29.md): decisões e evidências de carga, documentos
  e primeira validação; nenhuma nova limpeza é autorizada por esse relato.
- [Convite e atendimento](PLANO_CONVITE_E_ATENDIMENTO_2026-09-25.md) e
  [entrega de 25/09](ENTREGA_LOCAL_REFINAMENTOS_2026-09-25.md): contrato detalhado
  e evidências locais, úteis para regressão.
- [QA da área médica](QA_MEDICO_2026-09.md): verificações e limitações do redesign.
- [Contexto comercial inicial](CONTEXTO_COMERCIAL_2026-08-31.md): trechos únicos
  do guia antigo; não são condições comerciais atuais confirmadas.

## Limpeza de 08/10/2026

Removidos sete MDs com sufixo ` 2.md`: quatro cópias de índice/status/contratos e
três guias/prompts de protótipo superados. Conteúdo de produto aplicável já está
em Produto, Direção, Funcionalidades e Gate P; o trecho comercial único foi
preservado acima. O plano Skip e o prompt genérico não permanecem como tarefas.

Não foram mantidas cópias integrais de Direção/Status: resumos atuais apontam
para evidências próprias, e apenas o registro único de C2/C3 foi extraído.
O texto anterior completo segue recuperável no
[commit base ebadaab8](https://github.com/vitormilanez/instituto-vivance/tree/ebadaab8e5fa64d49355c459dee92707edbe5557).
Exemplo: `git show ebadaab8:docs/STATUS_ATUAL.md`.

Os registros de release permanecem em `docs/virada90/releases/`, o briefing tem
seu contrato/evidências, e IA2 permanece na branch do PR #78. Não se apagaram
código, migrations, imagens, fixtures ou alterações locais de outros checkouts.
A limpeza documental sobrepõe as duas exclusões de MD do PR #40; reconciliar
esse PR antes de integrá-lo, preservando seu restante.
