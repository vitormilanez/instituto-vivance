# Documentação do Vivance

Organizada em 08/10/2026. Comece pelos documentos vigentes abaixo; evidências
com data e material de protótipos ficam identificados como histórico.

## Comece aqui

| Documento | Pergunta que responde |
| --- | --- |
| [Direção e slices](DIRECAO_E_SLICES.md) | O que estamos construindo e em que ordem? |
| [Estado atual](STATUS_ATUAL.md) | O que existe, qual evidência o sustenta e o que falta? |
| [Checkpoints das entregas](CHECKPOINTS_ENTREGAS.md) | Qual item executar agora e o que falta para marcar cada slice? |
| [Avaliação Paciente × Médico × IA](AVALIACAO_JORNADA.md) | Quais lacunas de UX/dados foram encontradas e qual sequência está proposta? |
| [Handoff dos exames IA2](IA2_EXAMES.md) | O que já funciona no PR #78 e qual é a próxima entrega? |
| [Retomada do desenvolvimento](RETOMADA_DESENVOLVIMENTO.md) | Como preparar a próxima proposta e desenvolver/testar por slice? |
| [Funcionalidades](FUNCIONALIDADES.md) | Quais contratos funcionais a aplicação preserva? |
| [Plano de IA clínica](PLANO_IA_CLINICA.md) | Quais capacidades são futuras e quais gates exigem? |
| [Gate P](GATE_P.md) | O que precisa estar aceito antes de dados clínicos reais? |

## Implementação e operação

- [Aplicação atual](../apps/web/README.md): entrada para `apps/web`.
- [Guia operacional Codex](GUIA_OPERACIONAL_CODEX.md): localizar áreas, conferir
  destinos, publicar, verificar e recuperar uma versão.
- [Pipeline de publicação](PIPELINE_PUBLICACAO.md): contrato de código, banco e Vercel.
- [Teleconsulta](TELECONSULTA.md): contrato do link externo e evidência datada.
- [Briefing da consulta e peso](BRIEFING_CONSULTA_2026-10-07.md): contrato e evidências
  dos PRs #82/#84; limites da conferência autenticada.

## Virada 90 — frente comercial

- [Jornada](VIRADA90_JORNADA.md), [conteúdo](virada90/CONTEUDO_E_IMAGENS.md) e
  [design](virada90/DESIGN.md).
- [Funil](virada90/FUNIL_COMERCIAL_LEVE.md), [medição Google](virada90/MEDICAO_GOOGLE.md)
  e [acompanhamento no CRM](virada90/MODELO_ACOMPANHAMENTO.md).
- [Último release registrado](virada90/releases/2026-10-07-conversion-refinement/README.md).
  Os demais registros permanecem em `virada90/releases/`, por data.

## Histórico e evidências

- [Histórico útil](historico/README.md): decisões únicas e evidências de regressão;
  cópias redundantes foram removidas, com recuperação pelo Git.
- [C1 em 29/09](C1_BASE_OPERACIONAL_2026-09-29.md): inventário operacional daquela data.
- [Plano de convite/atendimento de 25/09](historico/PLANO_CONVITE_E_ATENDIMENTO_2026-09-25.md)
  e [entrega local correspondente](historico/ENTREGA_LOCAL_REFINAMENTOS_2026-09-25.md).
- [QA da continuidade do paciente](qa/patient-continuity/README.md) e
  [proposta de não visto](propostas/2026-09-22-nao-visto/README.md).

## Referências na raiz

[README](../README.md) · [Produto](../PRODUCT.md) · [Design](../DESIGN.md) ·
[AGENTS](../AGENTS.md). `app/`, `db/` e `drizzle/` são legado; a aplicação atual
fica em `apps/web/`.

## Como manter

- **Direção** guarda objetivos, decisões e sequência; **status** guarda o resumo
  datado das evidências e pendências. Logs extensos e IDs de release ficam nos
  registros específicos, com links a partir desses dois documentos.
- Código, migrations e evidência viva sustentam afirmações de implementação.
  Conversas autorizadas e direção aprovada sustentam escopo; uma não substitui a outra.
- Distinguir `proposto`, `implementado`, `validado localmente`, `validado em Preview`,
  `publicado tecnicamente` e `aceito clinicamente`. Não promover um estado por inferência.
- Atualizar a seção correspondente, em vez de colar o mesmo relatório em vários MDs.
  Usar links relativos e nomes sem sufixos de cópia, como ` 2.md`.
- Após decisões de produto, reconciliar direção/status e a tarefa existente do Asana.
  Um card pode estar atrasado; não comprova entrega. Esta organização documental
  não altera tarefas nem declara um novo aceite.
- Ao retomar um histórico, conferir novamente branch, PR, ambiente e permissões.
  `READY`, HTTP 200 e uma captura não provam a jornada completa nem o Gate P.
