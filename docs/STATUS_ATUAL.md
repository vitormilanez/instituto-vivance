# Estado atual do Vivance

## Pacote integrado — 09/10/2026

**Checkout oficial para continuar:** `/Users/vitormilanez/Desktop/Codes/vivance-package-20261009`, branch `codex/vivance-package-20261009`, [PR #95](https://github.com/vitormilanez/instituto-vivance/pull/95) em rascunho. Reúne C3/PR #93, contexto longitudinal/PR #94 e IA2/PR #78 sem alterar os três PRs de origem nem o clone IA2. `origin/main` estava em `ebadaab8` na última conferência; o pacote ainda não foi integrado à `main`.

**Preview do pacote:** [Vercel](https://instituto-vivance-m4cifg9re-vtr-consulting.vercel.app), deployment `dpl_4xTHa8p8DKKRrQWQ9gCYZ5RSC8Q7`, alvo `preview`, `Ready`, código `ea199ee`. O login médico real no Preview anterior do mesmo fluxo mostrou o paciente fictício, os documentos e os itens IA2. O CI de `ea199ee` passou (testes, lint, typecheck e build). No Preview desse código, a sessão médica autenticada confirmou também o rótulo em português “revisão 1: transcrição confirmada” e o contador persistido “1 de 45 com decisão”.

**Banco e worker sintéticos:** destino confirmado `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`), com 64 migrations após aplicar somente `20261009231639_ia2_structured_exam_items.sql`. A Edge Function `exam-text-worker` v2 foi implantada com autenticação própria por segredo; `pg_cron`/`pg_net` foram instalados e o job `vivance-ia2-exam-text-worker-synthetic` está ativo a cada minuto, com URL e segredo guardados no Vault. Uma chamada sem segredo recebeu 401; com segredo e fila vazia, 204. Nenhuma credencial foi gravada no Git.

**Teste integrado IA2, exclusivamente fictício:** o médico enviou `vivance-ia2-synthetic-cron-20261009.pdf` para `Paciente Sintético IA2` como arquivo interno (documento `d1c16e38-6aaf-482b-83c5-0e335fc4d8a2`). Após enfileirar, a aba foi fechada. O job `38c3bcfc-17de-4da1-b556-0d2c1f7919df` permaneceu pendente até o Cron e terminou em uma tentativa às **21:02 de 09/10, horário de São Paulo**: 3 páginas, 45 itens (44 marcadores fictícios e 1 trecho narrativo), execução `requires_review`. No Preview, a sessão médica exibiu página, trecho e link ao original; uma confirmação de transcrição fictícia ficou como revisão 1 e persistiu após recarga. A sessão autenticada de paciente foi negada no endpoint de extração. O primeiro envio fictício da rodada (`cc18f7f1-a6e6-43b9-8846-34830775f748`) registrou 3 páginas sem itens porque a rota web antiga consumiu o job antes do Cron; o commit `f21cf09` retirou esse executor concorrente, e o segundo teste comprovou o caminho agendado. Ambos permanecem no dev como registros de teste, sem revisão clínica.

**Falha controlada IA2:** no mesmo job exclusivamente fictício, uma lease já concluída foi simulada como expirada no dev. O Cron recuperou o job e concluiu a segunda tentativa às **21:15 de 09/10** (São Paulo), sem aba aberta. Permaneceram **1 execução de extração e 45 itens**; não houve duplicação. Isso comprova recuperação de lease expirada e idempotência nesse cenário, não cobre todas as falhas externas. Na pré-consulta, o link ambíguo de correção foi substituído por uma ação que permite explicar a divergência à equipe ou consultar os registros, deixando explícito que o comentário não altera o original. A edição de uma resposta na revisão agora salva e retorna à revisão.

**Pré-consulta no Preview do pacote:** o código `4e61963` foi publicado apenas em [Preview](https://instituto-vivance-kt43rdyvx-vtr-consulting.vercel.app), deployment `dpl_5XAP25dfw4pcGGpBqeFGpPeivXSE`, alvo `preview`, `Ready`; o CI passou. Na sessão autenticada da conta paciente de teste, a correção do resumo foi preenchida, salva, reapareceu na pergunta “O que mudou”, foi editada pela revisão e voltou à revisão sem refazer as outras etapas. O texto persistiu após recarga. Capturas em 390 px e desktop e conferência a 320 px não mostraram transbordamento horizontal. Ficou somente como rascunho sintético; nenhuma pré-consulta foi enviada ou aprovada.

**Percurso C2/C3 em 09/10, somente sintético:** no [Preview do pacote](https://instituto-vivance-kt43rdyvx-vtr-consulting.vercel.app), a conta paciente enviou a pré-consulta da consulta de 08/10 às 21:37 (Brasília); as respostas originais apareceram no preparo médico. O médico de teste abriu e finalizou o atendimento `3bc111f5-149e-4cf0-9850-409fd702cfca`, com registro que declara expressamente não conter avaliação, diagnóstico, prescrição nem conduta clínica. O plano demonstrativo `b0e8de2b-8772-4ea3-93be-a89f625229f2` percorreu rascunho → revisão → aprovação → publicação em ações separadas. A conta paciente viu a revisão 1 em “Orientações médicas” e confirmou apenas a leitura. Um retorno sintético foi agendado para **sexta-feira, 16/10/2026, 20:55–21:25**; Agenda médica e Home paciente mostraram o mesmo horário após recarga. Isso fecha a verificação técnica do percurso, não o aceite clínico.

**Falhas de UX encontradas no percurso:** o Preview ainda mostra “Aprovado, ainda não publicado” no fechamento da consulta mesmo após a publicação confirmada pelo banco e pelo paciente: `care_plan_publications.source_version=3` corresponde a `care_plans.version=3`, enquanto a UI comparava com `revision=1`. O PR #95 agora compara as versões técnicas corretas, aguardando CI e novo Preview. A Home também atribuía ao médico uma pré-consulta gerada automaticamente para o retorno; o rótulo foi corrigido para “Para sua próxima consulta”.

**Limites:** C3 ainda precisa de isolamento visual por outros papéis/vínculos e aceite operacional. IA2 ainda precisa de contrato de laudo com o médico, avaliação de cobertura e aceite clínico. O parser reconhece somente a fixture explicitamente fictícia, sem Claude, OCR ou interpretação clínica. Não há autorização para dados reais; C1/Gate P e separação de produção seguem abertos. [Checkpoints](CHECKPOINTS_ENTREGAS.md) distingue cada entrega.

O restante deste documento preserva evidências anteriores a este pacote; quando houver divergência temporal, prevalece a seção acima.

Consolidado documental em **08/10/2026**, sobre a `origin/main`
`ebadaab8e5fa64d49355c459dee92707edbe5557` (PR #92). Git e situação dos PRs
foram conferidos nesta data. Os registros de publicação abaixo são evidências
anteriores, até 07/10. O projeto Supabase sintético e o Preview C3 foram
conferidos em 08/10; as sessões do Preview foram revalidadas parcialmente
como descrito abaixo. Domínio público e produção separada **não foram
revalidados nesta implantação**. Este documento não autoriza uso clínico.

[Direção e prioridades](DIRECAO_E_SLICES.md) ·
[Checkpoints das entregas](CHECKPOINTS_ENTREGAS.md) · [Índice](README.md) ·
[Decisões e evidências históricas](historico/README.md)

## Avaliação de UX e dados em 08/10

A [avaliação Paciente × Médico × IA](AVALIACAO_JORNADA.md) acrescenta inspeção
do código e observação autenticada, somente leitura, de Hoje médico e ficha
sintética. Isso não revalida banco, sessão do paciente, jornada completa ou
deployment servido. Identificou lacunas de vínculo pedido/resposta, continuidade
da revisão e visibilidade para o paciente. A proposta de priorizar um slice C3
de exames antes da ampliação de IA2 foi aceita como ponto de partida; não
promoveu aceite operacional ou clínico.

**Branch de execução:** `codex/c3-exame-solicitado-20261008`, publicada no
[PR #93](https://github.com/vitormilanez/instituto-vivance/pull/93) em rascunho,
criada sobre os dois commits documentais após `origin/main` `ebadaab8`. O código vincula
o documento ao pedido explícito, conserva a fila quando a última revisão pede
acompanhamento e mostra ao paciente somente estado operacional de revisão.
O CI do SHA `1e5af18` passou e o [Preview C3 atual](https://instituto-vivance-dkb5hxd6m-vtr-consulting.vercel.app)
(`dpl_6myzQxMea2EPDkNcFnoVhWyyUvqL`) ficou `Ready` como Preview. Login real
do paciente nesse Preview exibiu no comprovante "quinta-feira, 08/10/2026,
15:29:57" e na lista "qui. · 08/10/2026, 15:29" após recarga. O título genérico
passou a dizer "Exame enviado em 08/10/2026", sem confundir envio com a data de
realização do exame, que ainda não é coletada. No projeto sintético confirmado
`instituto-vivance-dev`, as migrations `20261008174209`, `20261008174346` e
`20261008184620` foram aplicadas, e a Edge
Function `private-documents` v5 foi publicada com JWT obrigatório; a fonte
remota foi conferida contra o checkout. A segunda migration move a função
privilegiada de recibo para `private`; o advisor deixou de apontá-la no
schema público. Isso é **implantação técnica sintética**, não aceite.

No Preview, houve login real com os dois perfis de teste: o médico criou um
pedido de exame e o paciente respondeu com uma imagem em 08/10/2026 às
15:29 (São Paulo). O banco confirmou `completed` no pedido e vínculo com o
documento; após recarga, a Home mostrou o envio ligado ao pedido e o
comprovante preservou data/hora e estado "disponível para revisão". A fila
"Para revisar" inicialmente ocultava envios do paciente por falta de leitura
do mapeamento `patient_accounts` pelo profissional vinculado. A migration
`20261008184620` corrigiu a política de leitura no projeto dev: 114 testes de
isolamento passaram, e o Preview mostrou 6 exames para esse paciente, incluindo
o envio de 08/10 às 15:29, sem abrir o arquivo nem registrar revisão. A origem
sintética do arquivo enviado ainda não foi confirmada; preservar esse registro.
O timestamp de envio é persistido e aparece como data/hora local; a interface
explicita o dia da semana e distingue a data de envio da data de realização do
exame, que ainda não é coletada.
Em 08/10, um segundo envio **avulso, inteiramente fictício**
(`vivance-c3-exame-ficticio.pdf`, documento
`5acc7676-7950-457e-b08c-b5b228d8d1de`) mostrou data e dia no comprovante
às 16:54:16. O original foi visto no perfil médico com a marca explícita de
teste. O médico registrou `needs_follow_up` às 16:55 e uma nota interna sem
conduta clínica. Após recarga, a ficha manteve o histórico, a fila conservou o
envio e a Home médica mostrou **1 acompanhamento em aberto**. Na conta do
paciente, Home e recibo mostraram apenas “Revisão registrada pela equipe”, sem
nota/decisão interna ou orientação. A imagem do envio solicitado anterior
continua preservada, **sem abrir ou revisar**, pois sua origem sintética não
foi confirmada. Isolamento de UI entre outros papéis/vínculos, decisão sobre
data de realização do exame, aceite operacional e aceite clínico seguem
pendentes. C3 continua aberto.

Em 08/10, o percurso pedido → resposta foi repetido somente com PDF de teste:
pedido `775b1512-1dba-46c6-8dca-916db544550b`, documento
`6b8ed9b5-08a1-474e-80ad-07361ac2b053`. O paciente viu o comprovante
persistido após recarga, com **quinta-feira, 08/10/2026, 17:17:22** e
“Resposta ao pedido de 08/10/2026”; o pedido saiu das pendências. Na sessão
médica, o arquivo identificado como fictício entrou em “Para revisar”, foi
aberto e permaneceu em **“Já aberto · revisão não registrada”**. Não houve
revisão, orientação nem publicação clínica nesse percurso. O documento
`IMG_4022.PNG` anterior permanece sem abrir/revisar por origem incerta.

## Base confirmada no repositório

- Aplicação em `apps/web`: Next.js, Node 24. `app/`, `db/` e `drizzle/` na raiz
  são protótipo legado e não participam do deploy atual.
- Código de identidade por clínica/papel, vínculos, onboarding, pré-consulta,
  agenda, atendimento versionado, planos, check-ins, refeições, medidas,
  documentos privados, mensagens, pedidos e relatórios. Ver [contratos](FUNCIONALIDADES.md).
- Briefing contínuo, relatos literais com fontes, pendências, documentos,
  gráfico factual de peso, navegação persistente e ajustes de Mensagens
  integrados pelos PRs #82/#84. [Contrato e validações](BRIEFING_CONSULTA_2026-10-07.md).
- O [serviço do briefing](../apps/web/modules/ai/consultation-brief.ts) tem fallback
  determinístico e exige ativação/configuração explícita para chamar o provedor.
  A última conferência registrada encontrou a IA desligada; isso não foi
  reconsultado no ambiente em 08/10.
- Virada 90 com apresentação em cinco etapas e refinamento de leitura/conversão
  integrado pelos PRs #87/#89/#91; [contrato atual](VIRADA90_JORNADA.md).

## Entregas e limites da evidência

| Frente | Último registro disponível | Limite que permanece |
| --- | --- | --- |
| Área médica | PR #84, `5466eb2`, publicação em 07/10; 439 testes e checks registrados; navegação e Mensagens conferidas com sessão médica. | Card minimizável e grupos do briefing conferidos na prévia sintética; sem consulta futura na conferência publicada. Não fecha C3. |
| Virada 90 | PR #91, `f1a7a57`, publicação em 07/10; 441 testes e checks registrados; navegador público conferido. [Evidência](virada90/releases/2026-10-07-conversion-refinement/README.md). | Não comprova conversa recebida, venda ou conversão real no Ads. |
| Medição comercial | [Modelo de acompanhamento](virada90/MODELO_ACOMPANHAMENTO.md) e [funil](virada90/FUNIL_COMERCIAL_LEVE.md). | Clique em WhatsApp permanece distinto de mensagem recebida e das etapas do CRM. |

Os SHAs acima identificam entregas específicas, não afirmam qual deployment
está servindo o domínio agora. Contagens de testes também são daquele lote;
não representam uma execução nova.

## Slices e bloqueios

| Frente | Estado conferido | Próxima evidência |
| --- | --- | --- |
| **C1 / Gate P** | Dev único temporário para testes sintéticos; 64 migrations no destino confirmado. | Produção separada, restauração, segurança e papéis antes de dados reais. |
| **C2/C3 — continuidade** | PR #95 inclui contexto longitudinal do PR #94; percurso sintético da pré-consulta ao retorno observado nos dois perfis. | CI/Preview das correções de rótulo e publicação; aceite operacional e clínico separados. |
| **C3 — exame solicitado** | PR #95 inclui pedido/resposta, fila, revisão e recibos do PR #93; Preview anterior com PDF fictício. | Isolamento visual por outros papéis/vínculos e aceite operacional; preservar `IMG_4022.PNG` sem abrir/revisar. |
| **IA2 — extração e itens** | PR #95 inclui PR #78, Edge/Cron no dev; PDF fictício concluído sem aba, 3 páginas/45 itens, uma revisão persistida e paciente negado. | Falha/retry sintéticos, contrato de laudo e avaliação clínica. |
| **IA1 / IA3–IA6** | PR #64 de governança e plano futuro sem decisão clínica. | Finalidade, fornecedor, dados, fontes versionadas e gates de IA. |

**Decisão preservada de 29/09:** `instituto-vivance-dev`
(`oxuwrdjojsmgxoljqkuk`) é o único projeto temporário de testes sintéticos.
A existência de um frontend publicado não o transforma em banco liberado
para dados reais. Registros cuja origem não foi estabelecida devem ser preservados.

## Trabalho paralelo e retomada

- As três migrations do PR #78 e as três C3 já aplicadas foram reconciliadas
  por versão com o checkout do pacote. Em 09/10, aplicou-se somente a nova
  `20261009231639` ao dev, totalizando 64. O código permanece fora da main;
  qualquer próxima migration ou release exige nova comparação de destino e
  histórico, sem `db push` cego.
- [PR #79](https://github.com/vitormilanez/instituto-vivance/pull/79) continua aberto
  para atribuição Pulse; o registro vigente o mantém desligado. Não tratar o
  webhook ou a importação Ads como integração operacional confirmada.
- [PR #40](https://github.com/vitormilanez/instituto-vivance/pull/40) permanece aberto
  para limpeza de cópias do iCloud. Esta organização remove os sete MDs antigos;
  reconciliar as exclusões sobrepostas antes de integrar aquele PR.
- Primeira entrega em Preview sintético: **C3 — fechar o ciclo de um exame
  solicitado**, conforme [achados e aceites](AVALIACAO_JORNADA.md). O
  [handoff IA2](IA2_EXAMES.md) permanece válido; C2/C3 seguem sem aceite
  integrado. O percurso do PDF inteiramente fictício chegou à revisão e ao
  recibo após recarga. Próximo marco: isolamento por outros papéis/vínculos,
  aceite operacional C3 e consulta → retorno no PR #94.
