# Estado atual do Vivance

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

| Frente | Estado documentado | Próxima evidência necessária |
| --- | --- | --- |
| **C1 — base operacional** | Ambiente único temporário de testes sintéticos. Inventário de 29/09 registrou 57 migrations pareadas; contagem histórica, anterior ao piloto IA2. | Reconciliar migrations no destino confirmado, produção separada e backup/restauração antes de dados reais. [Registro C1](C1_BASE_OPERACIONAL_2026-09-29.md). |
| **C2 — demonstração longitudinal** | Carga de autorrelatos sintéticos e documentos conferida parcialmente no médico em 29/09. As contagens antigas não são inventário atual. | Sessão do paciente, consulta/retorno e aceite da demonstração. Preservar origem incerta; nenhuma limpeza é autorizada por este texto. |
| **C3 — contexto e operação** | PR #93 em rascunho; pedido → resposta → recibo inicial e fila, mais envio avulso fictício → revisão médica → recibo posterior e acompanhamento em aberto, observados no Preview sintético; sem aceite operacional registrado. | Origem sintética da imagem do pedido, isolamento de UI entre outros papéis/vínculos e aceite; a imagem anterior segue sem revisão. |
| **C3 — contexto longitudinal** | [PR #94](https://github.com/vitormilanez/instituto-vivance/pull/94) draft, branch `codex/c3-contexto-longitudinal-20261008` baseada no PR #93. Mostra objetivo/prioridade literal com fonte, autoria, data e original na ficha/briefing; 16 testes focados e CI passaram. O [Preview C2/C3](https://instituto-vivance-rh0zu8cgg-vtr-consulting.vercel.app) (`dpl_J1HZZ3Na7pvCEfWuCgPCbSTH6ZMf`) ficou `Ready` como Preview, com TypeScript concluído no build. Sessão médica autenticada conferiu estado sem objetivo e link para próxima consulta. | Validação do componente com objetivo preenchido, percurso consulta/retorno e aceite pendentes. Typecheck local não concluiu por I/O; o build remoto completou. Não é aceite operacional ou clínico. |
| **IA1 — governança** | [PR #64](https://github.com/vitormilanez/instituto-vivance/pull/64) aberto e em rascunho, confirmado em 08/10. | Decisão sobre finalidade, fontes, fornecedor, privacidade e revisão. |
| **IA2 — extração verificável** | [PR #78](https://github.com/vitormilanez/instituto-vivance/pull/78) aberto, draft e com conflito, fora da main; head `1e4493a`. O PR registra texto por página e Preview. Há complemento local staged no checkout IA2 (worker e migration de itens), com PGlite focado e `deno check` registrados, sem commit/deploy. | Reconciliar branch e migrations; concluir lint/typecheck, validar retry e paciente no dev, estruturar itens e revisão na interface. Não há aceite clínico ou incorporação na main. |
| **IA3–IA6** | Plano futuro, sem entrega confirmada nesta revisão. | Gates e critérios do [plano de IA](PLANO_IA_CLINICA.md). |
| **Gate P** | Sem fechamento documentado. | Ambiente separado, restauração, segurança, jornadas por papel e demais [critérios](GATE_P.md). |

**Decisão preservada de 29/09:** `instituto-vivance-dev`
(`oxuwrdjojsmgxoljqkuk`) é o único projeto temporário de testes sintéticos.
A existência de um frontend publicado não o transforma em banco liberado
para dados reais. Registros cuja origem não foi estabelecida devem ser preservados.

## Trabalho paralelo e retomada

- PR #78 registra três migrations aplicadas ao projeto de teste compartilhado
  mesmo com o código fora da main. Em 08/10, o projeto tinha 60 migrations antes
  do C3 e 63 depois, incluindo a correção da fila médica. Os três arquivos IA2
  continuam ausentes da main e da
  branch C3; por isso, **não executar `db push` nem integrar/publicar C3 pela
  pipeline de release** antes de reconciliar esse histórico. As três migrations
  C3 locais usam as versões exatas registradas remotamente.
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
