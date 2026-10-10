# Checkpoints das entregas

**IA2 sintética, 10/10/2026.** Código, banco/Edge, Preview, integração, publicação e aceite exigem evidências próprias. [Status](STATUS_ATUAL.md) contém os identificadores confirmados.

## Base e jornada

- [x] PRs #95, #103/#104 e #106/#107 integrados e publicados tecnicamente; detalhes históricos no [status](STATUS_ATUAL.md).
- [x] Reset de Vitor às 17h38 de 10/10 conferido; médico e conta QA preservados. Links anteriores inválidos.
- [ ] Vitor percorrer convite **novo** para `vitor.milanezz@gmail.com` e dar aceite de usabilidade. Não recriar/preencher sua conta antes dele.

## IA2 — correções por campo (#109)

- [x] Revisão versionada e acumulada de unidade, referência e data; histórico e extração bruta preservados. Tabela e briefing usam correções efetivas; só fatos revisados entram no briefing.
- [x] [PR #109](https://github.com/vitormilanez/instituto-vivance/pull/109) integrado no SHA `8be017c`; CI `38091031080` e release `38091148065` passaram 499 testes. Migration `20261010220240` aplicada (68 no dev); Edge v10 com extractor .3 ativa.
- [x] Deployment `dpl_RA2tuX9j5juaihWkbskxgA4cWvQd` production/READY. UI médica autenticada corrigiu Glicose: unidade `mg/dl` e referência `70 a 99 mg/dl` (v2), data de 9 de outubro (v3), confirmação sem recarga (v4), recarga persistente e briefing atualizado. Fixture original restaurada na v5; celular 390 px sem overflow; conta QA intacta.
- [x] Corpus fictício: 19/19 campos em uma execução API real após fallback, com variabilidade registrada. Avaliação privada final offline: 81 itens fundamentados (64 PDF, 9 JPEG A, 8 JPEG B), zero offsets inválidos. O valor anterior de 82 não se reproduziu; página 21 não contém resultado atual. Sem alegar completude clínica.

## IA2 — deduplicação .4 (#110)

- [x] Corrigir localmente duplicatas de representações número/unidade juntas ou separadas: reprocessamento .3 produziu 10 itens para cinco resultados; teste offline .4 passou 19/19 e reduziu 10→5.
- [x] [PR #110](https://github.com/vitormilanez/instituto-vivance/pull/110) integrado em `91970c0`; CI `38091972763` e release `38092076115` passaram 504 testes, lint, typecheck e build.
- [x] Edge v11 ACTIVE com extractor `1.8.1+vivance-claude.4`; deployment `dpl_DH5etxpExwKTLPDU5d6qj6LttkwU` READY/production no SHA integrado. Ambos os aliases conferidos; principal três HTTP 200, secundário três 307. Operações automáticas de banco/Edge/promoção ficaram skipped; publicação manual conferida, sem migration nova.
- [x] Cron reprocessou somente a fixture de medidas na primeira tentativa: cinco resultados sem duplicatas, run `17d4fdf6-8be5-4159-9829-d7ee597a4b43`, histórico preservado. Médico autenticado recarregou no domínio final: 25 resultados, 24 pendentes, Glicose v5 e formulário de correção preservados. Mutações/briefing são evidência do #109; paciente 403 e original/hash são históricos #106/#107, sem novos testes desses caminhos no #110.
- [ ] Preview autenticado: não executado nesta rodada; verificação pós-publicação não o substitui.

## UX — briefing médico (10/10)

- [x] Direção autorizada: consolidar exames/revisão, reduzir repetições e usar as rotas atuais; tarefa Asana `1219378497566919`.
- [x] Implementação revisada por GPT-6 Sol Ultra/Impeccable: objetivo em destaque, exames reunidos, originais recolhidos e peso único compacto. Local em 1440/390/320 px sem overflow, alvos 44 px, fontes por expansão, gráfico por teclado, comparação e erros explícitos; fixture temporária restaurada. Artefatos em `output/playwright/20261010-briefing-ux/`.
- [x] [PR #112](https://github.com/vitormilanez/instituto-vivance/pull/112) integrado em `7e3b849`; CI `38093585290` e release verify `38093827404` passaram 504 testes, lint, typecheck e build. Banco/Edge não necessários; etapas automáticas de publicação skipped. Redeploy do mesmo SHA após `git_info_fail`: `dpl_14N5Hy9FG2sZs8EjrMKBJgzhPArY` READY/production, ambos os aliases inspecionados, três HTTP 200 no principal e três 307 no secundário.
- [x] Sessão médica no domínio publicado: objetivo sem repetição, três arquivos com fontes/datas por expansão, cadastro completo preservado, 24 pendentes e Glicose revisada; link abriu resultado/revisão v5/página de origem do mesmo paciente. Peso único compacto, oito ações rápidas e Agenda preservados. Mobile/séries/comparação foram conferidos localmente; sem nova mutation, reprocessamento, IA ou Preview separado.
- [ ] Aceite de usabilidade do médico.

## Próximos gates clínicos

- [ ] Publicar explicitamente ao paciente apenas fatos aprovados pelo médico, em entrega separada. Revisão de extração não publica conteúdo.
- [ ] Ampliar corpus por tipo de laudo, medir estabilidade entre execuções e obter avaliação médica do contrato/qualidade.
- [ ] Aceite operacional, IA1, produção separada e [Gate P](GATE_P.md) antes de dados reais ou uso clínico.

O domínio público usa temporariamente `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`) apenas para testes sintéticos. Preservar registros de origem incerta. C2/C3 ainda requerem outros papéis/vínculos e aceite operacional. Atualizar [direção](DIRECAO_E_SLICES.md), [status](STATUS_ATUAL.md) e tarefa Asana após novas decisões e evidência viva.
