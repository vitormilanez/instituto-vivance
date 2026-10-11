# Checkpoints das entregas

## Check-in e alimentação — 11/10/2026

- [x] Direção aprovada: Energia/Sono/Fome/Banheiro, recado opcional, poucos toques e figuras expressivas; aplicar também à alimentação. Product Design e revisão GPT-6 Astra, sem Impeccable.
- [x] Implementação: escolhas explícitas, edição pelo resumo, dados adicionais preservados/recolhidos, aplicação condicionada; foto/texto ou ambos em alimentação e Diário, exemplos públicos sem persistência.
- [x] 526 testes, build e tipos passaram; lint zero erros/um aviso anterior. Desktop/tablet/celular até 320 px sem overflow, teclado e opções ≥44 px.
- [x] Login real paciente/médico no local; check-in e refeições sintéticos persistidos e relidos nos dois percursos, foto privada 200; recuperação após 503 simulada e idempotência real.
- [x] Dois P2 dos campos adicionais corrigidos: motivo oculto e peso inválido. Revisão independente final sem achado restante nessas correções.
- [x] [PR #121](https://github.com/vitormilanez/instituto-vivance/pull/121), [Preview](https://instituto-vivance-lm6t8xa62-vtr-consulting.vercel.app) READY/preview do código `5249e56`; login real paciente/médico, sessão após recarga, quatro larguras sem overflow e médico lendo originais/foto 200. Asana C3 atualizado e aberto.
- [ ] Publicação técnica desta rodada e aceite de usabilidade; aceite clínico/Gate P separados. [Registro](UX_CHECKIN_ALIMENTACAO_2026-10-11.md).

**IA2 sintética, 10/10/2026.** Código, banco/Edge, Preview, integração, publicação e aceite exigem evidências próprias. [Status](STATUS_ATUAL.md) contém os identificadores confirmados.

## UX — padronização médica publicada tecnicamente (10/10)

- [x] Direção Product Design, sem Impeccable: cabeçalho de contexto → seletores retangulares → conteúdo; sem banco ou funções clínicas novas.
- [x] Código local: Hoje com Resumo, Exames e documentos, Evolução e Solicitações, sem “Preparar”; exames com quatro filtros de comparação e quatro de revisão independentes, refinamento acima/abaixo e revisão abaixo da linha factual.
- [x] Código local: seletores compartilhados nas superfícies médicas adjacentes; preservar URL, papel/vínculo, paginação, datas, formulários e rascunhos. Filtro de pacientes identificado como limitado à página.
- [x] Refinamento local do Resumo: cards neutros/brancos; objetivo e pendências 1/3, relatos 2/3 no desktop; fatos em grid, uma coluna no celular; rótulos conforme a fonte, hierarquia 18/14/16/13 px e espaços 16/20/24 px.
- [x] Enquadramento revisado: Hoje máximo 1440 px, contexto compacto, rótulo/contagem horizontal e faixa 56/60 px; card começa em 262 px do briefing em 1330×625. Celular 390/320 px sem overflow, controle de expansão 44 px, última opção ímpar completa a linha. Corrigidos CSS conflitante da Agenda e alvo do envio de mensagem; revisão visual independente sem impedimento.
- [x] Validação local: 525 testes, typecheck, lint com zero erros e um aviso anterior. Browser Hoje/exames em 1440/900/390/320 px sem overflow; exames com alvos ≥44 px, teclado Home/End e edição preservada ao trocar aba, resultado e filtro.
- [x] Resposta API **simulada** para 99 no limite máximo: verde, fonte 108 e histórico preservados; sem mutação remota.
- [x] Build final aprovado após os ajustes; login real do paciente de QA, sessão após recarga e bloqueio 404 à ficha médica.
- [x] [PR #119](https://github.com/vitormilanez/instituto-vivance/pull/119) integrado à `main` (`e05cb4c`); [CI 38105274475](https://github.com/vitormilanez/instituto-vivance/actions/runs/38105274475) aprovado no SHA do código `5445083`; [Preview](https://instituto-vivance-pq76f1h6n-vtr-consulting.vercel.app) anterior READY/build. Identificadores no [status](STATUS_ATUAL.md).
- [x] Login real do paciente QA no novo Preview, sessão preservada após recarga, ficha médica bloqueada com 404 e extração com 403; proteção Vercel preservada.
- [x] Tarefas Asana `1219378497566919` (UX) e `1219002739975041` (IA2–IA3) atualizadas com direção, PR/Preview e evidências; histórico preservado e tarefas abertas para os aceites pendentes.
- [x] Login médico real com Guilherme localmente e no Preview; sessão após recarga, ficha, fonte original, histórico v5, filtros 4/30/108, link direto, voltar e correção em edição preservados, sem envio de correção.
- [x] [Release da main 38105844754](https://github.com/vitormilanez/instituto-vivance/actions/runs/38105844754) aprovado no SHA integrado `e05cb4c`; migration, Edge e promoção automáticas skipped. Sem arquivos `supabase/` no PR, migration ou Edge nova neste lote. Promoção manual pela CLI.
- [x] Deployment production `dpl_4ckHiqrEM1NdXqaf6cUFTigvHt2X` READY no SHA integrado; `targets.production` e os dois domínios apontam para esse ID. Principal três HTTP 200 (TTFB 0,102–0,155 s), secundário 307 para o principal; anterior `dpl_692H3GxaZpMVK7tCczcnBD9FT31N` preservado.
- [x] Domínio final: login real de Guilherme com sessão após recarga, ficha/extração/original 200, Glicose v5 92 mg/dL, filtros 142 = 4/30/108, link direto, URL/voltar e edição não enviada preservados. Paciente QA chegou a Meu cuidado, manteve sessão e recebeu ficha 404 e extração 403.
- [ ] Aceite de usabilidade e, separadamente, aceite clínico quando aplicável. O histórico publicado #117 e o PR documental #118 não os substituem.

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

## IA2 — texto primeiro e checkpoints por lote (10/10)

- [x] Diagnóstico: PDF de 25 páginas lido 25/25; falha na gravação por nome literal com controle de formatação. Upload/texto não perdidos.
- [x] Nome/valor preservam TAB/LF/CR; controles restantes proibidos. Validação de Unicode, campos opcionais e notas antes da RPC.
- [x] Checkpoints internos imutáveis de lotes/auditorias, versão/hash/páginas/lease, RLS e retomada sem repetir lotes concluídos.
- [x] Modelos disponíveis confirmados: Haiku 5.5 inicial, Sonnet 5.5 seletivo. Política/preços/exemplo e limites em [IA2_EXAMES](IA2_EXAMES.md).
- [x] Local: 512 testes, lint/typecheck/build, Deno check; teste de falha/retomada de 25 páginas, multiline, Unicode, isolamento de checkpoint e idempotência. Aviso lint anterior.
- [x] [#114](https://github.com/vitormilanez/instituto-vivance/pull/114) integrado/publicado: 512 testes CI/release; migration `20261010234104` (69), Edge v12/adapter `.5`, deployment `dpl_Fp46Tkhys3rTQT6BpNABqh48AY4S`, ambos os aliases conferidos.
- [x] Retomada remota sintética: 25/25 páginas, mesma run, dois lotes preservados da primeira tentativa, segunda tentativa completa; nove checkpoints. DOM médico confirmou texto disponível no PDF esgotado, que não foi recuperado.
- [x] Correção local dos achados remotos: referência não é próximo analito, unidade repetida deduplica e Resultado/Valor só fica coberto na mesma ocorrência do rótulo. 518 testes e Deno check; reaplicação offline do cache: 25 itens/25 páginas com referência/unidade/data, zero offsets inválidos/lacunas; nenhuma nova chamada Claude.
- [x] [#115](https://github.com/vitormilanez/instituto-vivance/pull/115) integrado em `9fcda943`; CI `38096991481` e release `38097072816` passaram 518 testes. Edge v13/adapter `.6`, prompt `.4`; deployment `dpl_f6HaN9AF3ogADrmgMZG1tFRkovYC`, ambos os aliases conferidos. Sem migration nova; publicação manual após etapas automáticas skipped.
- [x] Novo PDF fictício de três páginas completou na primeira tentativa: três medições com unidade/referência/data, nome multiline, dois checkpoints (Haiku + auditoria Sonnet). Médico autenticado abriu item, fonte na página 2 e conferência no domínio principal. Histórico anterior de 29 itens imutável; PDF esgotado continua sem reprocessamento. IDs em [CONTA_TESTE](CONTA_TESTE.md).
- [x] A lacuna operacional observada no #115 foi encaminhada ao #117 abaixo. Medir cobertura/estabilidade com gabarito médico continua pendente.

## IA2 — retomada operacional e referências (#117, 10/10)

- [x] Retomada pelo médico responsável de job falho/esgotado ou lease expirada; sessão, papel, vínculo, elegibilidade e autoria exigidos; mesmo job, histórico e texto preservados; duplicatas idempotentes e auditadas.
- [x] Continuação com checkpoints e margem de runtime; tentativa devolvida somente com novo progresso durável. Falhas reais mantêm limite de tentativas. Finalização protegida pelo token da lease vigente; writers antigos sem token ficam internos.
- [x] Dentro da faixa em verde discreto; acima/abaixo com ícone, texto, âmbar e valor destacado; comparação indisponível em cinza. Filtros e correções efetivas preservados; sem conversão ou conclusão clínica.
- [x] Conferência visual local com fixtures em desktop e celular, retomada simulada e filtros. Artefatos em `output/playwright/20261011-exams-resume/`; Preview remoto separado não executado.
- [x] Local: 525 testes, lint/typecheck/build e Deno check passaram; revisão independente da retomada/lease sem impeditivos. Um aviso lint anterior no onboarding. Celular 320/390 e desktop 1440 sem overflow, filtros 2 fora/2 dentro e alvos de resultado ≥44 px.
- [x] [#117](https://github.com/vitormilanez/instituto-vivance/pull/117) integrado em `2454345626b56d259a71aa59c34d23a688e13850`. CI do PR `38099060369`, verificação da main `38099138337` e release `38099138340`: 525 testes, lint/typecheck/build; Deno local passou. Aviso anterior de lint no onboarding.
- [x] Publicação manual confirmada após etapas automáticas skipped: migration `20261011002635` (70 no dev `oxuwrdjojsmgxoljqkuk`), Edge v14 ACTIVE/adapter `.7`/prompt `.4`, hash `59373719ea1302d7982dfeaa197be58db84ca9a32f6d0b828b71f3abdfd1300c`; quatro achados de advisor sem novos e revogação dos writers legados conferida. Deployment `dpl_692H3GxaZpMVK7tCczcnBD9FT31N` READY/production no SHA integrado; ambos os aliases no mesmo ID, principal 3×200 e secundário 3×307, região `gru1`. Conta/equipe/projeto confirmados no [status](STATUS_ATUAL.md); rollback `dpl_f6HaN9AF3ogADrmgMZG1tFRkovYC`.
- [x] Médico fez login real pela interface via Playwright CLI no domínio publicado e acionou **Retomar organização** do documento `89d96ca4-f5e9-427e-acd4-1a0116b4f749`. Mesmo job `fd1100d4-7000-4254-b1ee-6436d9256f92` e run `08779990-c35f-41b9-ae80-12493d5b5ba7`; original/hash/texto 25/25 preservados. Auditoria: médico autor às 00:41:34 UTC de 11/10, claim às 00:42 UTC.
- [x] Recuperação técnica concluída em `2026-10-11T00:43:31.835663Z`: mesmo job/run/hash, `completed`, tentativa 1, 13 checkpoints (cinco iniciais, oito auditorias), 65 itens em 24 páginas, 50 com unidade, 47 com referência, 60 com data 13/08/2026 e nenhum offset inválido. UI publicada após recarga: **Exames sangue .pdf**, 65/65 para conferir, sem falha; ficha 142 resultados/141 pendentes e filtros globais 4 acima/0 abaixo/30 dentro. Contagens não comprovam completude clínica.
- [x] UI publicada: filtro **Fora da referência** mostrou quatro itens do PDF recuperado com destaque âmbar; fonte de **Eritrócitos** abriu na página 1 com valor, unidade, referência, data 13/08/2026 e formulário de conferência. **Retomar organização** sumiu, sem alerta de erro. Captura: `output/playwright/20261011-exams-resume/published-outside-reference.png`. Nenhuma gravação médica.
- [x] Tarefa Asana `1219002739975041` atualizada com publicação, recuperação e verificação; permanece aberta para qualidade, aprovação/publicação ao paciente e IA3.
- [ ] Conferir completude e qualidade dos 65 itens com gabarito médico; `quality_notes` sinalizam possíveis ausências nas páginas 3, 5, 7, 8, 13, 16 e 17. Auditoria seletiva limitada a quatro páginas; nenhuma revisão/aprovação/publicação ao paciente ocorreu.

## Próximos gates clínicos

- [ ] Publicar explicitamente ao paciente apenas fatos aprovados pelo médico, em entrega separada. Revisão de extração não publica conteúdo.
- [ ] Ampliar corpus por tipo de laudo, medir estabilidade entre execuções e obter avaliação médica do contrato/qualidade.
- [ ] Aceite operacional, IA1, produção separada e [Gate P](GATE_P.md) antes de dados reais ou uso clínico.

O domínio público usa temporariamente `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`) apenas para testes sintéticos. Preservar registros de origem incerta. C2/C3 ainda requerem outros papéis/vínculos e aceite operacional. Atualizar [direção](DIRECAO_E_SLICES.md), [status](STATUS_ATUAL.md) e tarefa Asana após novas decisões e evidência viva.
