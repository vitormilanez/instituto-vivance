# Estado atual do Vivance

## Reset de Vitor para primeiro acesso — 10/10/2026

A pedido explícito do usuário, excluídas pelo Auth Admin as duas contas
`vitor.milanezz@gmail.com` e `vitor@valuefirstconsulting.com` no dev sintético
confirmado `oxuwrdjojsmgxoljqkuk`. Removidos o paciente
`666b8ab9-31c7-491e-a53c-5340f2baf055`, cadastro em rascunho, contexto de
acolhimento e sua versão, vínculo de cuidado, associação à clínica e dois
convites. As 12 sessões anteriores foram removidas antes da exclusão do Auth.
Não havia documentos nem objetos de Storage de Vitor nesta rodada.

Conferência posterior: zero contas Auth, sessões, vínculos, paciente,
onboarding e convites de Vitor. Médico Guilherme ativo e conta QA separada
preservados, incluindo seus quatro documentos. A evidência anterior de Vitor
em `draft/profile` abaixo é histórica. Nenhuma alteração de código, migration,
Edge Function ou deployment foi necessária.

**Próximo checkpoint:** o próprio usuário fará o teste com convite novo para
`vitor.milanezz@gmail.com`, primeiro acesso pelo e-mail, criação de senha,
onboarding e chegada em Hoje. Não recriar a conta ou preencher por ele;
recebimento de e-mail novo e aceite de usabilidade seguem pendentes.

## Entrada correta e medidas intuitivas — 10/10/2026

Branch `codex/invitation-account-handoff-20261010`, baseada em `33f6f42`.
Corrige sessão de outra pessoa no convite, retomada de onboarding draft no
login, medidas em metros/vírgula e saídas que salvam o rascunho. Convites antigos
não sugerem mais e-mail enviado: 410 com recuperação explícita; falhas de envio
retornam 503 e liberam nova tentativa. Edge Function `claim-patient-invitation`
v6 aplicada no dev confirmado `oxuwrdjojsmgxoljqkuk`; nenhuma migration.

Percurso autenticado local com dados persistidos no dev: convite criado pelo
médico, claim com conta QA existente, encerramento da sessão médica, login
pré-preenchido, aceite, onboarding completo com edição de medidas, conclusão
animada, Hoje, alimentação salva/retomada, três PNGs sintéticos e PDF fictício.
175 cm/76,10 kg/data 10/10 e submissões das três seções confirmados em SQL.
Vitor possui vínculo e onboarding `draft/profile`; suas medidas seguem vazias.
Os convites de 00h56/01h03 continuam ausentes. Conta existente não recebe novo
e-mail; recebimento de e-mail para conta inexistente não foi validado.
Impeccable 4.5 revisou mobile/desktop e estados; 468 testes, typecheck, lint
sem erros (um aviso preexistente) e build passaram. Publicado no [PR #100](https://github.com/vitormilanez/instituto-vivance/pull/100),
main `0ae37fee882e02b379813c6bde1edaf8560a4eb6`. Vercel CLI confirmou
`vtr-consulting/instituto-vivance` e promoveu
`dpl_1R4WspV51ZdTJ8cyyyamZqquQyeF`
(https://instituto-vivance-58f1g9339-vtr-consulting.vercel.app).
Ambos os domínios resolveram para esse ID: principal `/login` HTTP 200,
secundário HTTP 307. No domínio publicado, login real de Vitor a 390 px
retomou `primeiros-passos/profile`, mostrou altura em metros e medidas vazias,
sem overflow. Nenhum preenchimento ou submissão da conta de Vitor neste teste.
CI do head `c52f041`: run `38053508584` aprovado; release da main:
`38053586085`, verificação aprovada e operações automáticas de migration,
Edge Functions e promoção skipped. Edge Function e promoção manuais conferidas.
Recuperação de código: deployment anterior `dpl_CJTnT79AX7pq7EALs7oPqiTNmTMh`.

A ficha médica autenticada mostrou medidas/objetivo do cadastro inicial com
origem explícita, nascimento informado pelo paciente, alimentação e seções
de fotos/exames compartilhadas. A confirmação visual final de e-mail longo
usou uma resposta de claim interceptada apenas para layout; o percurso real
do convite anterior foi executado sem interceptação. Convite removido retornou
410 pela API real. Gmail conectado exige reautenticação; não foi possível
comprovar recebimento de e-mail novo por esse conector.


## Publicação de convites e onboarding — 10/10/2026

PRs #97 e #98 integrados. Código publicado: `95bc995965d51a10df381c5cdc717f7239feb912`.
Vercel CLI 63.1.2 confirmou `vtr-consulting/instituto-vivance`, Root Directory
`apps/web`, Node 24.x. Build remoto READY/production:
`dpl_CJTnT79AX7pq7EALs7oPqiTNmTMh`,
https://instituto-vivance-cq6zs5293-vtr-consulting.vercel.app.
Promovido manualmente; os dois domínios resolvem para esse ID. Principal:
https://institutovivance.app/login (HTTP 200, TTFB 1,251 s, `gru1`).
Secundário: HTTP 307 para o principal, TTFB 0,050 s. Deployment anterior:
`dpl_9oRUsriSW34mP4LqFJWvhDhEo83U` (recuperação de código).

Node 24 em cópia limpa: typecheck, lint (zero erros, um aviso preexistente),
460 testes e build passaram. CI do PR #97: run `38051482376` aprovado;
CI do ajuste CSS #98: run `38051684660` aprovado. Verificação visual local
autenticada em 1440 e 390 px, incluindo menu mobile e layout final.
Workflow release do SHA publicado: run `38051715988`, verificação aprovada;
migration/Edge Functions e promoção automáticas skipped por configuração.
Promoção executada manualmente pela CLI e domínios conferidos.
No domínio publicado: login médico real, menu desktop/mobile para o formulário,
filtro aguardando aceite/estado vazio/retorno a Todos e viewport sem overflow
confirmados em 390 px. Não houve criação nem envio de convite nesta conferência.
O menu mobile precisa ser fechado pelo próprio botão Menu após selecionar o
atalho na mesma página; isso não bloqueia o acesso ao formulário.
O ambiente público continua no Supabase sintético `oxuwrdjojsmgxoljqkuk`;
nenhuma migration ou Edge Function necessária para este lote.
O convite de Vitor de 08:27 aparece CANCELADO na leitura atual, não pendente.
Para recomeçar, gerar novo convite pela página publicada. Não criei nem consumi
convites durante esta publicação. Google OAuth e QR coletivo ainda pendentes.


## Página de pacientes — histórico da implementação local de 10/10/2026

O domínio fotografado pelo usuário ainda mostra a versão anterior; o trabalho
na branch `codex/onboarding-novo-paciente-20261009` não foi publicado.
A nova organização reúne convite inline e acompanhamento na mesma superfície,
com menu “Adicionar novo paciente” no desktop e no Menu mobile. Os convites
recentes têm filtros/contagens por aceite e encerramento, canal e data/hora
em `America/Sao_Paulo`. O cadastro sem app fica na lateral e empilha no mobile.
Mantida a identidade navy/creme/dourado. Referência: modelo Claude fornecido e
https://www.nngroup.com/articles/data-tables/.
Não há métricas inventadas de abertura nem QR inoperante: QR coletivo depende
de entrada/aprovação, e Google permanece desabilitado no Auth. Sintaxe TSX e
7 testes focados passaram; a verificação visual e lint/typecheck ficam pendentes
se o ambiente local continuar travando. Prévia sintética: desenvolvimento apenas,
`/refinamentos-preview?tela=convites`. Nenhum convite foi consumido neste ajuste.

## Convites e entrada no onboarding — 10/10/2026 (trabalho local)

Após o reset sintético, o usuário relatou que dois links de WhatsApp criados
em 10/10 não levaram ao onboarding. Esses convites antigos foram removidos
com os pacientes e não podem ser reutilizados. Pela implementação, há uma
falha de orientação: quando a pessoa informa no link um e-mail que já possui
conta, o convite fica associado a ela sem novo envio de e-mail, mas a tela
manda aguardar instruções por e-mail. Além disso, havia um link para login
antes da confirmação do e-mail, que podia deixar o convite sem associação.
O relato é compatível com essas falhas;
não há confirmação do passo exato em que as duas tentativas pararam.

Na branch local `codex/onboarding-novo-paciente-20261009`, o médico passa a
ver convite e convites recentes acima da lista de pacientes. O formulário
aceita nome e um contato, identifica e-mail ou telefone e apresenta uma ação
coerente; a opção sem app fica secundária. O link de WhatsApp e a tela do
paciente orientam quem já tem conta a confirmar o mesmo e-mail, entrar e
aceitar o convite em `/clinicas`; quem ainda não tem conta confere o e-mail
de criação de acesso. O atalho de login antes da confirmação foi removido.
O status médico distingue conta existente de e-mail efetivamente enviado.
Em sessão médica autenticada local, a tela foi vista em 1440 px e 390 px;
a tela de convite foi vista em 390 px com token fictício, sem enviá-lo.
O teste focado de rótulos (7 casos), análise sintática TSX e uma rodada
inicial de lint passaram. A rodada final de lint e o typecheck completos
foram interrompidos após espera sem progresso no checkout local.
São mudanças locais, ainda sem Preview ou aceite do fluxo completo.

O Google Sign-In foi consultado no projeto `instituto-vivance-dev` e está
**desativado**. Precisa de OAuth Client ID/secret do Google, callback e
redirecionamentos permitidos antes de expor um botão funcional. O QR genérico
da recepção, sugerido no conceito visual do Claude, também exigiria definir
uma aprovação de vínculo antes de criar ficha; não foi incluído neste ajuste.

## Reset sintético para novo onboarding — 10/10/2026 (São Paulo)

Por pedido explícito do usuário, o projeto `instituto-vivance-dev`
(`oxuwrdjojsmgxoljqkuk`) foi limpo para reiniciar a jornada do paciente.
Os três pacientes existentes e seus registros dependentes foram removidos;
18 arquivos do bucket `vivance-documents` foram excluídos pela Storage API.
O endpoint temporário usado para isso foi substituído por uma resposta inerte
`410` com JWT obrigatório; não executa novas exclusões.
Também foram removidos os dois vínculos de paciente e 11 notificações desses
vínculos. Conferência posterior: **0 pacientes, 0 vínculos de paciente,
0 documentos, 0 objetos no bucket**; o vínculo médico permanece ativo.
Os registros de demonstração descritos abaixo são evidência histórica e não
existem mais nesse banco. Isso inclui o registro de origem antes incerta;
a exclusão decorre da nova instrução explícita de apagar todos os pacientes.

O usuário Auth existente de `vitor.milanezz@gmail.com` foi preservado. Um novo
convite por e-mail para Vitor foi criado com estado `pending` (ID
`8f336ac8-729b-46b5-9bb9-054f31c4eba2`); como a conta já existe, o
serviço marcou a entrega de e-mail `not_applicable`. Vitor deve entrar com
esse endereço em `/clinicas` e aceitar o convite para criar uma ficha e
iniciar o onboarding do zero. O endereço `gamail.com` na solicitação foi
tratado como erro de digitação; nenhum convite foi dirigido a ele. O novo
percurso ainda não foi testado ou aceito.

## Onboarding com conta nova — 09/10/2026, 23h (São Paulo)

Na branch `codex/onboarding-novo-paciente-20261009`, criada da `main` publicada
`9d10ec4a`, uma conta **inteiramente sintética** foi convidada pelo percurso
médico existente no projeto `instituto-vivance-dev` e aceitou o vínculo.
Em sessão real no domínio principal, viewport de 390 px, o paciente iniciou
o cadastro, saiu após informar nascimento/medidas, retomou o rascunho com os
valores preservados, preencheu as demais seções fictícias, editou o objetivo
pela revisão, enviou e chegou a Hoje pela conclusão animada. Hoje destacou
alimentação e mostrou o recibo do cadastro. Isso confirma o fluxo publicado
para essa identidade de teste, não o aceite de usabilidade nem uso clínico.

Três achados estão corrigidos **somente na branch**: erro de objetivo vazio
deixa de oferecer uma tentativa de salvar que não corresponde à falha;
conclusão usa texto que funciona para nomes diferentes de clínica; Hoje não
repete “Atualizar medidas” quando o cadastro enviado já contém medidas
iniciais, preservando a tarefa de pedido médico explícito. TypeScript e 27
testes focados passaram localmente. O [PR #97](https://github.com/vitormilanez/instituto-vivance/pull/97)
segue draft; o run [38016706575](https://github.com/vitormilanez/instituto-vivance/actions/runs/38016706575)
passou. O [Preview](https://instituto-vivance-i2p4jke7w-vtr-consulting.vercel.app)
`dpl_4nbHQib1f2yMmzBm6MjVKNJQrxdf` foi implantado via Vercel CLI no alvo
`preview`, build concluído com Node 24. Na sessão autenticada a 390 px,
conclusão e CTA corrigidos levaram a Hoje; alimentação ficou em destaque e o
lembrete genérico de medidas não apareceu. A validação de objetivo vazio ainda
não foi repetida visualmente no Preview. Não há nova migration nem publicação
de produção; aceite de usabilidade permanece pendente.

## Publicação técnica — 09/10/2026, 23h (São Paulo)

O pacote do [PR #95](https://github.com/vitormilanez/instituto-vivance/pull/95) foi integrado à `main` no commit `1fda196940dd6fd98b110a1108a95b5890dcd908`. O run [38015255596](https://github.com/vitormilanez/instituto-vivance/actions/runs/38015255596) passou por testes, lint, typecheck e build. As etapas de migração e promoção do workflow ficaram **ignoradas por configuração ausente**, apesar do resultado verde; não representam operações executadas.

O projeto Vercel confirmado é `vtr-consulting/instituto-vivance` (`prj_ligeZuFRycRXA21u5rRzaLAORTrI`, raiz `apps/web`). O deployment automático `dpl_9oRUsriSW34mP4LqFJWvhDhEo83U` ficou `READY`, alvo `production`, com metadado Git para o mesmo SHA da `main`. Os aliases [institutovivance.app](https://institutovivance.app) e [instituto-vivance.vercel.app](https://instituto-vivance.vercel.app) foram apontados manualmente e ambos resolveram para esse ID; antes da troca, o domínio principal apontava para `dpl_CX5tbs3FCgC9Jm94goAnHoikGTmj`. Três requisições a `/login` no domínio principal deram HTTP 200; o secundário respondeu 307 para o principal.

A variável pública de Supabase na Vercel Production aponta para o projeto **sintético** `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`). A CLI confirmou 65 migrations locais/remotas pareadas antes da publicação; nenhuma nova migration ou Edge Function foi aplicada neste release, pois já estavam no dev. `SUPABASE_URL` legado na Vercel aponta a outra referência, mas a aplicação em `apps/web` usa `NEXT_PUBLIC_SUPABASE_URL`; revisar/remover a configuração legada em tarefa própria, sem alterar o destino em silêncio.

No domínio principal, houve login real da conta sintética de paciente: Hoje exibiu a próxima consulta, o plano demonstrativo publicado e os envios com estados; “Seu perfil de cuidado” abriu a etapa de alimentação com opção previamente preenchida. Após sair, o médico sintético entrou na clínica e Hoje exibiu **7 documentos aguardando revisão**, com os documentos de exame na fila. Isso é smoke test técnico e não repetição completa da jornada de Preview. O wizard inicial de conta nova, isolamento visual de outros papéis, aceite operacional/UX, contrato de exames IA2, avaliação clínica, separação de produção e Gate P continuam pendentes. **Não usar dados reais.**

**Checkout para a próxima entrega:** `/Users/vitormilanez/Desktop/Codes/vivance-release-main-20261009`, a partir da `origin/main` atual. Crie uma nova branch para o próximo slice; a branch do pacote permanece como histórico.

## Pacote integrado — 09/10/2026

**Fotografia anterior à publicação:** `/Users/vitormilanez/Desktop/Codes/vivance-package-20261009`, branch `codex/vivance-package-20261009`, [PR #95](https://github.com/vitormilanez/instituto-vivance/pull/95). Reuniu C3/PR #93, contexto longitudinal/PR #94 e IA2/PR #78 sem alterar os três PRs de origem nem o clone IA2. Antes do merge, `origin/main` estava em `ebadaab8`; prevalece o registro de publicação acima.

**Prioridade nova — onboarding paciente, 09/10:** implementação no pacote:
contexto inicial de saúde e medidas, objetivo final, conclusão animada e entrada
direta em Hoje; aviso no app leva a alimentação, fotos e exames. Rascunhos e
submissões por seção são separados, e a equipe lê somente versões enviadas.
TypeScript, lint, build local, 459 testes e CI do `ddedfc7` passaram.
O [contrato e a evidência](ONBOARDING_PACIENTE.md) descrevem o fluxo. A migration
`20261010011422_patient_profile_context.sql` foi aplicada somente ao dev sintético
confirmado, com migrations locais/remotas pareadas, RLS e grant da RPC de gravação
conferidos. O [Preview do onboarding](https://instituto-vivance-qwhf4iopw-vtr-consulting.vercel.app)
(`dpl_C5X5CJEZWJQXVGnEqRYfCNZzTo38`, código `ddedfc7`) ficou `Ready` como
`preview`, com build/TypeScript aprovados. Em login real da conta paciente de
teste, a alimentação foi salva, retomada após recarga e enviada; o aviso de Hoje
avançou para fotos, depois exames, e desapareceu ao completar as três seções.
Três PNGs identificados como sintéticos e um PDF fictício foram enviados; a
ficha médica autenticada mostrou a alimentação literal e as seções de fotos e
exames compartilhadas. O cadastro inicial do paciente já estava enviado antes
da rodada: seu novo wizard completo foi validado apenas com fixture local,
sem prova autenticada de novo cadastro. Nenhum dado clínico real ou aceite
clínico decorre desse teste.

**Ajuste encontrado na validação:** os arquivos internos do perfil apareciam
na Home paciente com estado de revisão indisponível e as fotos entravam na
contagem de exames/documentos para revisar do médico. O pacote filtra a Home
para envios avulsos compartilhados e a fila/contagem médica para exames ou
documentos compartilhados, mantendo fotos no perfil e na lista de documentos.
O CI e o novo Preview do `7569dd5` passaram; a diferença foi observada nas
sessões autenticadas, sem apagar os arquivos originais do histórico.

**Preview mais recente verificado do pacote:** [Vercel](https://instituto-vivance-jsxvpzwi9-vtr-consulting.vercel.app), deployment `dpl_9Aa3FtPpHAFhnmiPQbhsjViND15H`, alvo `preview`, código `7569dd5`; build/TypeScript e CI do mesmo SHA passaram. Em sessões autenticadas, Hoje médico passou de 11 para 7 documentos aguardando revisão, sem as três fotos sintéticas no briefing; o exame fictício continuou na fila. Hoje paciente voltou a mostrar os envios avulsos anteriores com seus estados corretos, sem os arquivos internos do perfil. A ficha médica continua mostrando as seções enviadas no Preview anterior. No [Preview IA2 anterior](https://instituto-vivance-m4cifg9re-vtr-consulting.vercel.app), deployment `dpl_4xTHa8p8DKKRrQWQ9gCYZ5RSC8Q7`, código `ea199ee`, o médico autenticado viu o paciente fictício, os documentos e os itens IA2, inclusive “revisão 1: transcrição confirmada” e o contador persistido “1 de 45 com decisão”. A tela de Processamentos atual já está no Preview do pacote; uma falha permanente ainda não foi observada ali.

**Banco e worker sintéticos:** destino confirmado `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`), com 65 migrations após aplicar também `20261010011422_patient_profile_context.sql`. A Edge Function `exam-text-worker` v2 foi implantada com autenticação própria por segredo; `pg_cron`/`pg_net` foram instalados e o job `vivance-ia2-exam-text-worker-synthetic` está ativo a cada minuto, com URL e segredo guardados no Vault. Uma chamada sem segredo recebeu 401; com segredo e fila vazia, 204. Nenhuma credencial foi gravada no Git.

**Teste integrado IA2, exclusivamente fictício:** o médico enviou `vivance-ia2-synthetic-cron-20261009.pdf` para `Paciente Sintético IA2` como arquivo interno (documento `d1c16e38-6aaf-482b-83c5-0e335fc4d8a2`). Após enfileirar, a aba foi fechada. O job `38c3bcfc-17de-4da1-b556-0d2c1f7919df` permaneceu pendente até o Cron e terminou em uma tentativa às **21:02 de 09/10, horário de São Paulo**: 3 páginas, 45 itens (44 marcadores fictícios e 1 trecho narrativo), execução `requires_review`. No Preview, a sessão médica exibiu página, trecho e link ao original; uma confirmação de transcrição fictícia ficou como revisão 1 e persistiu após recarga. A sessão autenticada de paciente foi negada no endpoint de extração. O primeiro envio fictício da rodada (`cc18f7f1-a6e6-43b9-8846-34830775f748`) registrou 3 páginas sem itens porque a rota web antiga consumiu o job antes do Cron; o commit `f21cf09` retirou esse executor concorrente, e o segundo teste comprovou o caminho agendado. Ambos permanecem no dev como registros de teste, sem revisão clínica.

**Falha controlada IA2:** no mesmo job exclusivamente fictício, uma lease já concluída foi simulada como expirada no dev. O Cron recuperou o job e concluiu a segunda tentativa às **21:15 de 09/10** (São Paulo), sem aba aberta. Permaneceram **1 execução de extração e 45 itens**; não houve duplicação. Isso comprova recuperação de lease expirada e idempotência nesse cenário, não cobre todas as falhas externas. Na pré-consulta, o link ambíguo de correção foi substituído por uma ação que permite explicar a divergência à equipe ou consultar os registros, deixando explícito que o comentário não altera o original. A edição de uma resposta na revisão agora salva e retorna à revisão.

**Pré-consulta no Preview do pacote:** o código `4e61963` foi publicado apenas em [Preview](https://instituto-vivance-kt43rdyvx-vtr-consulting.vercel.app), deployment `dpl_5XAP25dfw4pcGGpBqeFGpPeivXSE`, alvo `preview`, `Ready`; o CI passou. Na sessão autenticada da conta paciente de teste, a correção do resumo foi preenchida, salva, reapareceu na pergunta “O que mudou”, foi editada pela revisão e voltou à revisão sem refazer as outras etapas. O texto persistiu após recarga. Capturas em 390 px e desktop e conferência a 320 px não mostraram transbordamento horizontal. Ficou somente como rascunho sintético; nenhuma pré-consulta foi enviada ou aprovada.

**Percurso C2/C3 em 09/10, somente sintético:** no [Preview do pacote](https://instituto-vivance-kt43rdyvx-vtr-consulting.vercel.app), a conta paciente enviou a pré-consulta da consulta de 08/10 às 21:37 (Brasília); as respostas originais apareceram no preparo médico. O médico de teste abriu e finalizou o atendimento `3bc111f5-149e-4cf0-9850-409fd702cfca`, com registro que declara expressamente não conter avaliação, diagnóstico, prescrição nem conduta clínica. O plano demonstrativo `b0e8de2b-8772-4ea3-93be-a89f625229f2` percorreu rascunho → revisão → aprovação → publicação em ações separadas. A conta paciente viu a revisão 1 em “Orientações médicas” e confirmou apenas a leitura. Um retorno sintético foi agendado para **sexta-feira, 16/10/2026, 20:55–21:25**; Agenda médica e Home paciente mostraram o mesmo horário após recarga. Isso fecha a verificação técnica do percurso, não o aceite clínico.

**Falhas de UX corrigidas no pacote:** no Preview anterior, o fechamento da consulta dizia “Aprovado, ainda não publicado” apesar da publicação confirmada pelo banco e pelo paciente: `care_plan_publications.source_version=3` corresponde a `care_plans.version=3`, enquanto a UI comparava com `revision=1`. O PR #95 passou a comparar as versões técnicas corretas e a exigir plano aprovado para esse rótulo. A Home também deixou de atribuir ao médico uma pré-consulta gerada automaticamente para o retorno. O CI do HEAD `d91127d` passou; o [novo Preview](https://instituto-vivance-iyod72j1u-vtr-consulting.vercel.app) (`dpl_CKSnZPPubfSTCXcoD1o8WKSLbe4f`, somente Preview) completou build e TypeScript. Em sessões autenticadas, o fechamento mostrou “Publicado para a pessoa”, a Home paciente mostrou “Para sua próxima consulta” e o paciente recebeu página indisponível ao tentar as rotas internas do atendimento e da edição do plano. Isso não cobre admin, enfermagem ou outros vínculos.

**Isolamento C3 — limite verificado em 09/10:** inventário somente leitura de `auth.users` e `public.memberships` no projeto dev confirmou dois vínculos ativos na mesma clínica: Guilherme como médico e Vitor como paciente. Uma terceira identidade Auth não tem vínculo. Não existem, nesse destino, perfis vinculados de admin, enfermagem, outro paciente ou outra clínica para percorrer a UI; nenhum foi criado nesta rodada. A suíte de isolamento do PR #95 cobre permissões de documentos, revisão médica, revogação e leitura dos pedidos por outro vínculo, e o CI do HEAD `1b37f84` passou. A observação autenticada em Preview cobre apenas os dois perfis vinculados; isolamento visual entre outras identidades permanece pendente.

**IA2 — aviso interno em preparo:** a tela de Processamentos do PR #95 agora dá nome correto à tarefa “Leitura de exame” e destaca falhas encerradas na página, com orientação para conferir o original. O CI do commit `0bcd6c9` passou (testes, lint, typecheck e build). Ainda não foi observada tarefa falha no Preview. Essa indicação depende de abrir a tela; não substitui monitoramento proativo nem os testes de download, erro permanente e serviço externo.

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
| **C1 / Gate P** | Dev único temporário para testes sintéticos; 65 migrations no destino confirmado. | Produção separada, restauração, segurança e papéis antes de dados reais. |
| **C2/C3 — continuidade** | PR #95 inclui contexto longitudinal do PR #94; percurso sintético da pré-consulta ao retorno observado nos dois perfis; CI e novo Preview das correções passaram. | Aceite operacional e clínico separados; isolamento de outros papéis/vínculos. |
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
