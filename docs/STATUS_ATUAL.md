# Estado atual do Vivance

**Atualizado em 10/10/2026 — slice de retomada operacional e destaque de referências implementado; publicação e recuperação em andamento.** Checkout Git único: `/Users/vitormilanez/Desktop/Codes/vivance`. SHA da aplicação ainda publicada: `9fcda9437ebe2786eaa4395c388fcaacecb6bdfc`. O HEAD documental pode diferir do SHA da aplicação por commits somente de documentação. Confirmar Git, Supabase e Vercel antes de reutilizar este registro. Preview, aceite clínico e [Gate P](GATE_P.md) são marcos separados.

## IA2 — retomada operacional e referências (10/10)

Branch `codex/exames-retomada-referencia-20261011`. Médico responsável pode
retomar job falho/esgotado ou com lease expirado pelo botão **Retomar organização**.
A RPC exige sessão viva, papel, vínculo e documento elegível; conserva o mesmo
job, texto, runs e checkpoints, reinicia tentativas e audita a transição.
Pedidos duplicados em fila/processamento ativo são idempotentes. A finalização
agora exige o token da lease vigente sob lock; execução antiga não pode gravar
resultados sob uma lease nova.

Adapter `.7`, prompt `.4` preservado: antes de novas chamadas, o worker reserva
tempo para persistir e devolver a lease. A pausa com progresso durável devolve
exatamente a tentativa da claim; falha ou pausa sem progresso segue o limite
existente. Haiku inicial e Sonnet seletivo permanecem. A interface acompanha o
andamento por janela limitada e mantém atualização manual.

Referências: verde discreto para **Dentro da referência do laudo**; âmbar com
seta, rótulo, fundo e valor destacado para **Acima/Abaixo**; cinza quando a
comparação é indisponível. Usa valor/unidade/referência efetivos da revisão e
somente faixas fechadas inequívocas com unidade idêntica. Não converte unidades,
não escolhe faixa por população e não classifica saúde/conduta. Filtros permitem
ver exceções e resultados dentro da faixa. Interface local em 1440/390/320 px;
fixtures explícitas, sem dados reais nas capturas.

Publicação da migration `20261011002635`, Edge, aplicação e recuperação do
documento `89d96ca4-f5e9-427e-acd4-1a0116b4f749` ainda pendentes neste registro.
O PDF reportado tem 25/25 páginas de texto no job
`fd1100d4-7000-4254-b1ee-6436d9256f92`, run
`08779990-c35f-41b9-ae80-12493d5b5ba7`, sem checkpoints nem itens antes da retomada.
Original e histórico serão preservados; não há publicação clínica ao paciente.

## IA2 — texto primeiro, checkpoints e qualidade literal (#114/#115)

[PR #114](https://github.com/vitormilanez/instituto-vivance/pull/114) integrado
em `0d4619b808ee272f9721b0002b7036ea1a1855fe`. CI `38096376336` e release
`38096478634` passaram 512 testes, lint/typecheck/build; Deno check local passou.
Etapas de migration, Edge, promoção e domínio ficaram skipped por configuração.
Migration `20261010234104` aplicada manualmente: 69 no dev `oxuwrdjojsmgxoljqkuk`.
Checkpoints com RLS; SELECT apenas service_role e escrita pela RPC de lease.
Advisor novo: INFO de RLS sem policy, intencional para tabela interna; nenhum WARN
novo. [Contrato, custos e limites](IA2_EXAMES.md).

Publicação inicial #114: Edge `exam-text-worker` v12 ACTIVE, hash
`e089e6707e245155113ecb31fb15d8661c09670a45d408aa26158b8ddefb2e4f`,
adapter `.5`, prompt `.4`. Haiku 5.5 inicial e Sonnet 5.5 seletivo disponíveis no
inventário real. Deployment Git `dpl_Fp46Tkhys3rTQT6BpNABqh48AY4S`
([URL técnica](https://instituto-vivance-jl769y7x6-vtr-consulting.vercel.app))
READY/production no SHA integrado. Ambos os aliases apontados pela CLI e
inspecionados no mesmo ID: principal três HTTP 200 (TTFB 0,383–0,901 s), secundário
três 307 (0,228–0,590 s). Rollback anterior: `dpl_14N5Hy9FG2sZs8EjrMKBJgzhPArY`.

Upload pela sessão QA: PDF inteiramente fictício de 25 páginas, documento
`42c0f0a4-9d38-490a-815d-3f976b161a5a`, run
`5a8fa8a9-0dc5-4a3b-b217-8e3434fd0f10`, job
`48895349-5ceb-42c1-87c1-2a8724ce659c`. Cron salvou 25/25 páginas; primeira
tentativa guardou dois lotes e a segunda completou a mesma run. Nove checkpoints
(cinco iniciais + quatro auditorias), nome multiline preservado. **Esta execução
produziu 29 itens para 25 medições e perdeu referências no grounding**; é evidência
de retomada, não de qualidade completa. Histórico imutável preservado.

O [PR #115](https://github.com/vitormilanez/instituto-vivance/pull/115) corrigiu linha
de referência confundida com próximo analito, unidade repetida impedindo
deduplicação e auditoria de Resultado/Valor vinculada à ocorrência literal do
nome. Integrado em `9fcda9437ebe2786eaa4395c388fcaacecb6bdfc`, adapter
`1.8.1+vivance-claude.6`, prompt `.4` preservado para reutilizar respostas pagas.
Local, CI `38096991481` e release `38097072816`: 518 testes,
lint/typecheck/build passaram; Deno check local passou. Reaplicação offline
às nove respostas QA salvas trouxe 25 itens/25 páginas, 25 referências, unidades e
datas, zero offsets inválidos e zero lacunas detectadas, sem nova chamada Claude
ou alteração do histórico. Os 29 itens da primeira run permanecem como histórico;
não foram substituídos pelo resultado offline.

Publicação vigente #115: Edge `exam-text-worker` v13 ACTIVE, hash
`e154b52c4d1b2750f60abd28c854c14e3d3e9e0ea525fd4337f63af93cfc0ac3`.
Sem nova migration; 69 no dev. Etapas automáticas de banco/Edge/promoção/domínio
ficaram skipped por configuração; Edge e aliases publicados pela CLI e conferidos.
Deployment Git `dpl_f6HaN9AF3ogADrmgMZG1tFRkovYC`
([URL técnica](https://instituto-vivance-2brkxghbe-vtr-consulting.vercel.app))
READY/production no SHA #115. Conta `vtrconsulting`, equipe `vtr-consulting`,
projeto `instituto-vivance`/`prj_ligeZuFRycRXA21u5rRzaLAORTrI` conferidos.
Ambos os aliases inspecionados no mesmo ID: principal três HTTP 200 (TTFB
0,388–1,648 s); secundário três 307 para o principal (0,114–0,159 s).
Rollback conhecido: `dpl_Fp46Tkhys3rTQT6BpNABqh48AY4S` (#114).

Confirmação remota #115: novo PDF **inteiramente fictício** de três páginas,
documento `976f638e-7235-4fd1-84ce-767c89a997f7`, run
`2be8f60d-1e11-4b92-b775-9b725b4a1fd2`, completou na primeira tentativa.
Três páginas/medições com unidade `mg/dL`, referência `70 a 120 mg/dL` e data
`2026-10-09`; nome com quebra de linha preservado. Dois checkpoints: Haiku inicial
e auditoria Sonnet de uma página. A sessão médica autenticada no domínio principal
mostrou três resultados desse documento, origem na página 2, referência/data e
formulário de conferência. Total da ficha: 77 resultados/76 pendentes/oito arquivos,
incluindo histórico; contagem não comprova completude clínica. Não houve decisão
médica, publicação ao paciente, novo teste de isolamento ou Preview separado.

Médico autenticado confirmou no domínio a mensagem **Organização não concluída**
do PDF anteriormente reportado: texto das 25 páginas disponível e original
acessível. Esse PDF esgotou tentativas e não foi reprocessado nesta rodada;
recuperação operacional permanece pendente. Continuação entre leases e retomada
médica de job esgotado são próximos reforços; publicação ao paciente segue separada.

## UX do briefing — publicação e conferência de 10/10

O [PR #112](https://github.com/vitormilanez/instituto-vivance/pull/112) integrou
objetivo em destaque, exames/revisão reunidos, originais recolhidos e peso único
compacto, usando os caminhos existentes. Implementação por GPT-6 Sol e revisão
independente Ultra/Impeccable 4.5.0. Conferência local em 1440/390/320 px sem
overflow, alvos de 44 px, expansão de fontes, comparação, erros explícitos e
teclado do gráfico. Os 504 testes, lint, typecheck e build passaram localmente,
no CI `38093585290` e na verificação da main `38093827404`. O lint conserva um
aviso anterior no onboarding. [Detalhes](BRIEFING_CONSULTA_2026-10-07.md).

O release da main passou, mas aplicar migrations, publicar Edge Functions e
promover/confirmar domínio ficaram **skipped** por configuração. Banco e Edge
não eram necessários neste lote. O primeiro deployment Git
`dpl_9hwYamJoQiohL39mbyPXVK5Y4yrR` falhou antes do build com `git_info_fail`.
Redeploy pela CLI do mesmo SHA gerou `dpl_14N5Hy9FG2sZs8EjrMKBJgzhPArY`
([URL técnica](https://instituto-vivance-reh0q9f7j-vtr-consulting.vercel.app)),
READY/production. Conta `vtrconsulting`, equipe `vtr-consulting`, projeto
`instituto-vivance`/`prj_ligeZuFRycRXA21u5rRzaLAORTrI`, root `apps/web` e Node 24
foram conferidos. Ambos os aliases foram apontados manualmente e inspecionados
no novo ID: principal três HTTP 200 (TTFB 0,128–0,972 s), secundário três 307
para o principal (0,097–0,249 s), `x-vercel-id` em `gru1`. Rollback conhecido:
`dpl_DH5etxpExwKTLPDU5d6qj6LttkwU`, publicação anterior #110.

Na sessão real do médico Guilherme em `institutovivance.app`, a consulta
sintética selecionada mostrou objetivo sem repetição nos dois relatos, três
arquivos disponíveis, Glicose revisada 92 mg/dL e 24 resultados pendentes.
Arquivos e cadastro começaram recolhidos e abriram com fontes, datas e respostas
originais. O link do resultado abriu Documentos do mesmo paciente, com Glicose,
referência 70–99 mg/dL, revisão v5 e página 1 de origem. Peso 72,4 kg apareceu
com data/origem, sem gráfico de um ponto ou cadastro idêntico; oito atalhos e
Agenda foram preservados. Sem gravações clínicas, reprocessamento ou novas
chamadas de IA. Estilos computados do bloco publicado mantiveram contraste AA
textual; a verificação mobile, série e comparação foi local. Preview separado
não foi executado. Tarefa Asana `1219378497566919` registra a entrega técnica;
aceite de usabilidade do médico permanece pendente. O contrato IA2 e os gates
abaixo não mudaram.

## IA2 — histórico das correções #109/#110

O [PR #109](https://github.com/vitormilanez/instituto-vivance/pull/109) foi integrado. CI `38091031080` e release `38091148065` passaram com **499 testes**. A migration `20261010220240` foi aplicada ao `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`), totalizando 68; `exam-text-worker` v10 executava extractor .3 nessa publicação anterior. O deployment `dpl_RA2tuX9j5juaihWkbskxgA4cWvQd` foi conferido production/READY no SHA `8be017c` do #109; é histórico e não o frontend vigente. Publicação técnica não constitui aceite médico.

Na interface médica autenticada, foram corrigidos unidade `mg/dl` e referência `70 a 99 mg/dl` na revisão v2, data de 9 de outubro na v3 e confirmação sem recarga na v4. Após recarga, a revisão e o briefing conservaram data e unidade; em 390 px não houve overflow. A fixture original foi restaurada pela interface na v5. O item sintético de Glicose é `c56ba11a-9fa3-4a5e-aab0-67c8c5da228a`; a conta QA permanente permaneceu intacta. Essas revisões verificam correção e persistência do item, sem publicar resultados ao paciente.

O reprocessamento com extractor .3 revelou **10 itens para cinco resultados** quando número e unidade apareciam ora juntos, ora separados. O [PR #110](https://github.com/vitormilanez/instituto-vivance/pull/110) integrou a deduplicação em `91970c09f35469673674adc32a661d8d174d9820`. CI `38091972763` e release `38092076115` passaram com **504 testes**, lint, typecheck e build; 16 testes focados finais também passaram. Etapas automáticas de migration, Edge, promoção e confirmação de domínio foram ignoradas por configuração; a execução manual foi conferida. Não houve nova migration nessa rodada: `20261010220240` era a última, 68 no total. Edge `exam-text-worker` v11 ACTIVE tem hash `ea9ade65a514e0c02b6a6210dbe9d1f740d28382650e6bee44eeb31127f83a85`, extractor 1.8.1, adapter `vivance-claude.4` e prompt `vivance-exams-20261010.3`. A versão completa do extractor é `1.8.1+vivance-claude.4`.

Deployment Git nativo `dpl_DH5etxpExwKTLPDU5d6qj6LttkwU` ([URL](https://instituto-vivance-bvmo5vtts-vtr-consulting.vercel.app)) está READY/production no SHA #110. Os dois aliases foram apontados manualmente e inspecionados no mesmo deployment. Domínio principal: três HTTP 200 com TTFB 0,132–0,269 s; secundário: três 307 (0,076–0,105 s) para o principal; `x-vercel-id` em `gru1`. Isso confirma publicação técnica, não aceite clínico.

O Cron reprocessou **somente** a fixture sintética de medidas: job `e6429164-3a14-45f3-9837-daa8f6015500`, primeira tentativa; run atual `17d4fdf6-8be5-4159-9829-d7ee597a4b43`. A versão .4 gerou cinco itens `requires_review`: Peso 72,4 kg, Altura 1,70 m, Cintura 84 cm, Gordura 25,4% e Massa 29,8 kg. As execuções .3 com dez itens e .2 anteriores foram preservadas. Na interface autenticada do médico Guilherme, após recarga no domínio principal, o DOM mostrou 25 resultados e 24 pendentes (cinco medidas, sete itens narrativos e 13 do PDF), Glicose v5 preservada com `mg/dL`, referência `70–99 mg/dL` e data de 10 de outubro; o novo formulário abriu. A conferência de unidade/referência/data e briefing com mutações ocorreu no #109 e não foi repetida no #110. O 403 do paciente e download/hash do original são evidências históricas do #106/#107, sem novo teste desses caminhos no #110.

Em 390 px, o formulário local não teve overflow; `output/playwright/20261010-exams-corrections/form-mobile.png` registra essa verificação local. O fluxo #110 foi conferido por DOM real no domínio publicado; não houve nova captura nativa do formulário publicado por bloqueio do macOS.

No corpus fictício, uma chamada API real atingiu 19/19 campos após fallback Sonnet, com variabilidade entre execuções. A avaliação privada final **offline** fundamentou **81 itens** (64 PDF, 9 JPEG A, 8 JPEG B), com zero offsets inválidos. O número anterior de 82 não se reproduziu no grounding final. A página 21 continha continuação de referências/metodologia, sem resultado atual. Os arquivos privados não foram importados no app/Git; essa avaliação não mede completude clínica, estabilidade geral ou custo em USD.

| Marco | Estado |
| --- | --- |
| Código e publicação #109 | Integrado; 499 testes; SHA `8be017c`; migration 68; Edge v10; deployment acima conferido |
| Deduplicação .4 / #110 | Integrado e publicado; 504 testes; Edge v11; cinco medidas na run atual; DOM médico autenticado conferido |
| Preview | Não executado nesta rodada |
| Publicação ao paciente | Próxima entrega separada, com aprovação médica explícita; revisão de extração não publica |
| Aceite operacional/clínico | Pendente; IA1, produção separada e Gate P antes de dados reais |

## Histórico e limites que permanecem

Os [PRs #106](https://github.com/vitormilanez/instituto-vivance/pull/106) e [#107](https://github.com/vitormilanez/instituto-vivance/pull/107) integraram extração com Haiku 5.5/fallback Sonnet 5.5, fila/Cron, original navegável, revisão por item e briefing de fatos revisados. No domínio publicado daquela rodada, médico e paciente fizeram login real; paciente recebeu 403 na extração interna. Três fixtures geraram 25 itens em quatro páginas e três metadados na versão então testada. O PDF original protegido retornou HTTP 200, 68.787 bytes e SHA-256 `93cd16c4fbfecf7c3812f9200451a68682a4bf930fc793d141eb8bb6a1123c7e`. Essa evidência é **histórica**, anterior ao reprocessamento e à deduplicação atuais; o original não foi retestado nesta rodada.

O [PR #95](https://github.com/vitormilanez/instituto-vivance/pull/95) e os [PRs #103/#104](https://github.com/vitormilanez/instituto-vivance/pull/104) entregaram a base de contexto, onboarding, convites e ficha. Vitor percorreu convite e jornada no domínio principal, mas sua conta foi removida no reset de 10/10 às 17h38. O próximo aceite manual dele requer **convite novo** para `vitor.milanezz@gmail.com`; não recriar/preencher sua conta antes dele. Capturas sintéticas sem tokens estão em `output/playwright/20261010-onboarding/` e `output/playwright/20261010-exams/` no checkout canônico.

`instituto-vivance-dev` é o único projeto temporário para testes sintéticos, inclusive no domínio público. Preservar registros de origem incerta. A [conta QA](CONTA_TESTE.md) acompanha este piloto. A tarefa Asana `1219002739975041` foi atualizada com esta publicação e permanece aberta para aprovação/publicação ao paciente, qualidade e IA3; confrontar o quadro com Git e ambiente nas próximas rodadas. Separação de produção, restauração, papéis/vínculos, IA1 e [Gate P](GATE_P.md) precedem dados reais. O médico decide interpretação e conduta; extração, revisão, aprovação e publicação são estados distintos.
