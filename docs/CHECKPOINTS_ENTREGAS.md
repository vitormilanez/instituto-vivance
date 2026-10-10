# Checkpoints das próximas entregas

## Correções de entrada e medidas — 10/10/2026

- [x] Sessão médica → login com e-mail do paciente → aceite → onboarding real.
- [x] Login de paciente retoma cadastro em rascunho; enviado segue para Hoje.
- [x] Altura em metros, vírgula decimal, conversão correta e data das medidas.
- [x] Edição pela revisão e bloqueio de medida inválida ao avançar/voltar/sair.
- [x] Cadastro → conclusão → alimentação → fotos → exames → dados na equipe.
- [x] Impeccable: desktop/mobile, estados de recuperação e e-mails longos.
- [x] 468 testes, typecheck, lint sem erros e build; Edge Function v6 no dev.
- [x] PR #100 integrado (`0ae37fe`), deployment `dpl_1R4WspV51ZdTJ8cyyyamZqquQyeF` promovido; login real de Vitor retomou o cadastro a 390 px.
- [ ] Entrega de e-mail de acesso novo: validar recebimento real.

Vitor continua com cadastro em rascunho. A conta QA sintética separada foi usada
para percorrer o fluxo, sem enviar mensagens de WhatsApp nem e-mail externo.


**Convites, 10/10 — revisão do modelo Claude publicada:**
- [x] Menu desktop e Menu mobile: “Adicionar novo paciente”.
- [x] Convite integrado ao topo da área de pacientes, sem cards empilhados.
- [x] Convites recentes: filtros com contagens reais (todos, aguardando aceite,
  aceitos, encerrados), canal, estado e data/hora do envio em São Paulo.
- [x] Cadastro sem app na lateral; formulário principal aceita nome + contato.
- [x] Sintaxe TSX e sete testes focados passaram.
- [x] Verificação visual local autenticada desktop/mobile, lint, typecheck e build.
- [x] 460 testes passaram; CI dos PRs #97/#98 aprovado.
- [x] Publicar o pacote: `95bc995`, deployment `dpl_CJTnT79AX7pq7EALs7oPqiTNmTMh`.
  Ambos os domínios conferidos; principal HTTP 200, secundário 307.
- [x] Domínio: login médico, novo menu, formulário e filtros de convite conferidos.
- [x] Convite novo + aceite + onboarding/perfil completos com conta QA existente no Auth.
- [ ] Conta sem Auth: comprovar recebimento real do e-mail e criação de senha.
- [ ] QR da recepção: implementar entrada coletiva e aprovação antes de expor.
- [ ] Google OAuth: configurar e validar antes de mostrar botão.
Os links antigos de 10/10 foram apagados no reset; usar convite novo.

**Reset em 10/10:** os três pacientes e dados dependentes do dev sintético foram
removidos a pedido do usuário; os 18 arquivos também saíram do Storage.
As marcações abaixo registram verificações históricas, não dados ainda
presentes. O convite para `vitor.milanezz@gmail.com` aparece cancelado em 10/10, 09h24; a conta
Auth foi preservada. Atualização de 10/10, 09h: Vitor aceitou outro convite e possui
onboarding `draft/profile`; o login agora retoma esse rascunho. Sua conclusão
pelo próprio usuário é o próximo aceite de usabilidade.

Atualizado em **09/10/2026, 23h (São Paulo)**. A [direção](DIRECAO_E_SLICES.md) define a ordem;
o [status](STATUS_ATUAL.md) guarda evidências. Checkboxes indicam verificação
técnica específica, não aceite clínico.

**Checkout para continuar:** `/Users/vitormilanez/Desktop/Codes/vivance-release-main-20261009`, partindo da `origin/main`. O [PR #95](https://github.com/vitormilanez/instituto-vivance/pull/95) foi integrado como `1fda196` e publicado tecnicamente em [institutovivance.app](https://institutovivance.app); reúne C3/PR #93, contexto/PR #94, IA2/PR #78 e onboarding. O [status](STATUS_ATUAL.md) traz SHA, deployment, banco e limites de verificação.
**Ambiente técnico:** `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`), somente dados sintéticos. Migrations reconciliadas: 65 no dev, incluindo `20261010011422`. Não executar outra migration ou release sem reconferir destino e histórico. Gate P antes de dados reais.

## Prioridade atual — onboarding progressivo

Escopo e fluxo: [ONBOARDING_PACIENTE](ONBOARDING_PACIENTE.md).

- [x] Contexto inicial: nascimento/medidas, medicamentos/alergias, condições,
  cirurgias, família, objetivo e conferência; rascunho retoma a etapa exata.
- [x] Conclusão positiva com animação breve e CTA direto para Hoje.
- [x] Aviso dentro do app: alimentação → fotos → exames, com estado persistido.
- [x] Perfil alimentar, guia de três fotos e exames anteriores, com seção
  explícita “não tenho exames agora”; acesso posterior em Meu cuidado.
- [x] Snapshots compartilhados para a equipe; teste PGlite de versão, isolamento,
  rascunhos e fotos privadas antes do compartilhamento.
- [x] Percurso inicial visual local com fixture; edição volta à revisão.
- [x] Aplicar somente a migration do perfil no dev sintético, após comparar
  histórico. CI do `ddedfc7` passou e o Preview `dpl_C5X5CJEZWJQXVGnEqRYfCNZzTo38`
  ficou `Ready` com alvo `preview`.
- [x] Em contas autenticadas de teste, alimentação salva/retomada após recarga,
  três imagens sintéticas e PDF fictício enviados, aviso de Hoje avançou e sumiu;
  ficha médica exibiu as seções compartilhadas. O wizard inicial segue
  comprovado apenas em fixture local porque esta conta já tinha cadastro enviado.
- [x] No Preview `dpl_9Aa3FtPpHAFhnmiPQbhsjViND15H` (`7569dd5`), CI verde,
  Hoje médico mostrou 7 documentos aguardando revisão em vez de 11, sem as
  três fotos sintéticas; o PDF fictício continuou visível. Hoje paciente voltou
  a mostrar somente os envios avulsos e seus estados de revisão adequados.
- [x] Publicação técnica do pacote na `main` (`1fda196`): CI passou; Vercel
  `dpl_9oRUsriSW34mP4LqFJWvhDhEo83U` `READY` nos dois domínios. Login
  sintético de paciente e médico no domínio principal confirmou Hoje, perfil de
  cuidado e fila médica com 7 documentos. Nenhuma migration nova foi necessária.
- [x] Conta nova sintética autenticada em 390 px: convite vinculado à clínica,
  rascunho de medidas retomado após sair, saúde/objetivo, revisão/editável,
  envio, animação e entrada em Hoje com alimentação em destaque. Evidência e
  limites em [ONBOARDING_PACIENTE](ONBOARDING_PACIENTE.md).
- [x] Corrigir na branch `codex/onboarding-novo-paciente-20261009` os achados
  desse percurso: mensagem de validação sem ação falsa de salvar, texto final
  sem preposição dependente da clínica e lembrete genérico de medidas sem
  duplicar o retrato inicial. [PR #97](https://github.com/vitormilanez/instituto-vivance/pull/97)
  draft: testes focados, typecheck, CI e build do Preview passaram.
- [x] No [Preview do PR #97](https://instituto-vivance-i2p4jke7w-vtr-consulting.vercel.app),
  sessão autenticada a 390 px mostrou a conclusão corrigida, CTA para Hoje,
  alimentação em destaque e ausência do lembrete genérico de medidas.
- [ ] Repetir visualmente a validação de objetivo vazio no Preview; obter
  aceite de usabilidade no celular e retomar C3/IA2 pendentes abaixo.

## Ordem de trabalho

| Ordem | Slice | Resultado observável | Estado em 09/10 |
| --- | --- | --- | --- |
| Agora | **C3 — exame solicitado** | Paciente responde ao pedido; médico revisa; paciente vê recibo operacional. | Código publicado via PR #95; percurso parcial em Preview com PDF fictício, isolamento por outros papéis e aceite abertos. |
| Depois | **C2/C3 — continuidade da pessoa** | Hoje e ficha mostram contexto com origem/data; consulta e retorno preservam o paciente. | Percurso sintético paciente → pré-consulta → registro → plano publicado → retorno conferido; correção do estado de publicação validada no novo Preview e CI do PR #95 aprovado. Aceite clínico e operacional pendentes. |
| Avançado em paralelo no pacote | **IA2 — fila confiável** | Extração sintética prossegue sem aba aberta. | Worker Edge e Cron ativos no dev; job de fixture concluído sem aba, recuperado após lease expirada simulada e concluído na 2ª tentativa, sem duplicar a execução ou os 45 itens. |
| Avançado em paralelo no pacote | **IA2 — itens conferíveis** | Médico compara cada item ao arquivo, página e trecho e registra revisão. | 45 itens fictícios em Preview; uma revisão por item persistiu; contrato de laudo e avaliação clínica pendentes. |
| Antes de IA clínica | **IA1 — governança** | Finalidade, fontes, fornecedor, dados e revisão decididos. | [PR #64](https://github.com/vitormilanez/instituto-vivance/pull/64) draft; decisão pendente. |
| Antes de dados reais | **C1 / Gate P** | Destinos separados, restauração e segurança comprovadas. | Aberto; Preview não libera uso clínico. |

## C3 — fechar o exame solicitado (próxima ação)

- [x] Vínculo explícito pedido → documento; um envio avulso não conclui o pedido.
  Código no PR #93 e testes de isolamento.
- [x] Paciente sintético autenticado enviou um arquivo; pedido `completed` aponta
  ao documento. Home e comprovante persistiram após recarga no
  [Preview C3](https://instituto-vivance-dkb5hxd6m-vtr-consulting.vercel.app).
- [x] O envio mostra **quinta-feira, 08/10/2026, 15:29:57** no comprovante e
  **qui. · 08/10/2026, 15:29** na lista. O título diz “Exame enviado em…”, sem
  tratar a data do envio como data de realização.
- [x] O médico vinculado volta a ver o exame em “Para revisar”; política RLS
  `20261008184620` aplicada no dev, 114 testes de isolamento e CI do PR #93
  aprovados. Abrir o item não equivale a registrar revisão.
- [ ] Confirmar que `IMG_4022.PNG` é inteiramente fictício **antes de abrir o
  original ou revisar**. Sua origem segue incerta e o registro foi preservado
  sem revisão. O teste prosseguiu com outro PDF comprovadamente fictício.
- [x] No Preview, o paciente enviou avulsamente
  `vivance-c3-exame-ficticio.pdf` (`5acc7676-7950-457e-b08c-b5b228d8d1de`)
  em **quinta-feira, 08/10/2026, 16:54:16**. O original abriu no perfil médico
  com a marca “EXAME FICTICIO - TESTE C3”. O envio avulso não respondeu a um
  pedido; o comprovante persistiu após recarga.
- [x] O médico registrou revisão explícita `needs_follow_up` às 16:55, com nota
  interna identificada como teste sintético. Após troca de perfil e recarga, o
  paciente viu apenas “Revisão registrada pela equipe”; a nota, decisão interna
  e qualquer orientação clínica não apareceram.
- [x] O documento permaneceu na fila de recebidos, e a Home médica mostrou
  **1 acompanhamento em aberto** após a revisão. O histórico e o estado
  “Precisa de acompanhamento” persistiram na ficha após recarga.
- [x] Um novo pedido sintético (`775b1512-1dba-46c6-8dca-916db544550b`)
  foi respondido com o PDF explicitamente fictício
  `vivance-c3-exame-ficticio.pdf` (documento
  `6b8ed9b5-08a1-474e-80ad-07361ac2b053`). O paciente viu o recibo
  persistido com **quinta-feira, 08/10/2026, 17:17:22** e “Resposta ao pedido
  de 08/10/2026”; o pedido deixou de aparecer como pendente. Na sessão médica,
  o mesmo arquivo apareceu em “Para revisar” e passou a “Já aberto · revisão
  não registrada”. Isso comprova pedido → resposta → fila, sem revisão clínica.
- [x] Na sessão autenticada do paciente, as rotas internas do atendimento e da
  edição do plano médico retornaram página indisponível no novo Preview; o plano
  publicado continuou visível pelo percurso próprio do paciente. A suíte de
  isolamento do PR #95 e o CI passaram. Isso verifica esse par de perfis, não
  outros vínculos.
- [ ] Completar isolamento **na interface** com admin, enfermagem, outro
  paciente, outra clínica e vínculo revogado. Inventário read-only de
  `instituto-vivance-dev` em 09/10: só Guilherme/médico e Vitor/paciente têm
  vínculos ativos na mesma clínica; há uma identidade Auth adicional sem
  vínculo. Sem contas/vínculos apropriados, não há evidência de UI para os
  demais cenários. Os testes automatizados cobrem negações e revogação, mas não
  substituem a observação autenticada por papel.
- [ ] Decidir se o produto precisa coletar a **data de realização do exame**.
  Hoje só há timestamp do envio; não preencher a data clínica por inferência.
- [ ] Fechar aceite operacional com o responsável e registrar evidência no
  [status](STATUS_ATUAL.md) e na [tarefa C3](https://app.asana.com/1/1192450062279073/project/1218382636610484/task/1219002740032970).

## C2/C3 — contexto longitudinal e retorno

- [x] Pré-consulta no [Preview do pacote](https://instituto-vivance-kt43rdyvx-vtr-consulting.vercel.app): correção do resumo salva como observação no rascunho, sem alterar o registro original; edição na revisão retorna à revisão. Conta paciente autenticada confirmou persistência após recarga; 320 px, 390 px e desktop sem overflow. Em 09/10, o formulário foi preenchido e enviado com texto explicitamente sintético para a consulta de 08/10.
- [x] Revisada a proposta local em
  `/Users/vitormilanez/Desktop/Codes/vivance-c3-contexto`: objetivo e prioridade
  declarados, fonte/data, link que abre o registro original e contexto da
  consulta. A branch foi reconciliada com o PR #93 e publicada
  no [PR #94](https://github.com/vitormilanez/instituto-vivance/pull/94) draft.
  Dezesseis testes focados e o CI passaram; lint/typecheck locais não concluíram
  por I/O do checkout iCloud. O build do
  [Preview C2/C3](https://instituto-vivance-do5x19hv4-vtr-consulting.vercel.app)
  completou TypeScript. Na sessão médica autenticada, sem objetivo registrado
  para o paciente observado, o componente novo não inventou conteúdo; a ficha
  mostrou a próxima consulta. O fluxo consulta → retorno e o aceite pendem.
- [x] A ficha de Vitor levou à consulta de 08/10 na Agenda do mesmo paciente.
  O agendamento de 06/10 continua com resultado pendente e não há atendimento
  finalizado. Sem esse registro, “Onde continuar” agora informa a lacuna em vez
  de levar a uma lista geral de atendimentos de outras pessoas; a mudança foi
  conferida em sessão médica autenticada no Preview atualizado.
- [ ] Confirmar coleta e precedência de objetivo, dificuldades, medidas e
  lacunas; ausência de dado não vira zero, interpretação ou risco automático.
- [x] Percurso **paciente → pré-consulta → consulta → registro médico → orientação
  publicada → retorno** conferido com as contas sintéticas no Preview do pacote.
  A pré-consulta enviada apareceu no preparo do médico; atendimento
  `3bc111f5-149e-4cf0-9850-409fd702cfca` foi finalizado com registro
  exclusivamente demonstrativo. O plano `b0e8de2b-8772-4ea3-93be-a89f625229f2`
  passou por revisão, aprovação e publicação separadas; o paciente viu a
  revisão 1 e confirmou apenas leitura. O retorno de 16/10 às 20:55 apareceu
  na Agenda médica e na Home do paciente após recarga. Isso valida o percurso
  técnico, não avaliação nem aceite clínico.
- [x] No [novo Preview do pacote](https://instituto-vivance-iyod72j1u-vtr-consulting.vercel.app),
  o fechamento do atendimento mostrou “Publicado para a pessoa” quando
  `source_version` coincidiu com `care_plans.version`. O Preview anterior
  comparava com `revision` e exibia “Aprovado, ainda não publicado” apesar da
  publicação real. A Home paciente mostrou “Para sua próxima consulta” no
  convite automático, sem atribuir o pedido ao médico. CI do HEAD `d91127d`
  e build/TypeScript do Preview passaram. A conta paciente recebeu página
  indisponível nas rotas internas do atendimento e da edição do plano.
- [ ] Validar a tarefa de localizar contexto, pendências, mudanças factuais e
  originais em Hoje/ficha, inclusive estados vazios e falhas. Registrar aceite
  operacional sem alegar aceite clínico por uma avaliação heurística.

## IA2 — fila e itens verificáveis, somente sintéticos

- [x] PR #78 preservado; código reconciliado com C3/contexto no PR #95 sem renumerar as três migrations IA2 já aplicadas.
- [x] Migration de itens `20261009231639` aplicada somente ao dev confirmado; 64 migrations locais/remotas pareadas. Worker Edge v2 publicado com segredo próprio; `pg_cron`/`pg_net` instalados, URL e segredo no Vault, job `vivance-ia2-exam-text-worker-synthetic` ativo a cada minuto. Scripts de ativação/desativação em `scripts/ops/`.
- [x] O primeiro teste revelou corrida: a rota web processou o arquivo antes do Cron e deixou 3 páginas sem itens. O commit `f21cf09` removeu o executor da rota; agora ela somente enfileira.
- [x] No [Preview integrado](https://instituto-vivance-m4cifg9re-vtr-consulting.vercel.app), o médico enfileirou o PDF fictício `vivance-ia2-synthetic-cron-20261009.pdf` (documento `d1c16e38-6aaf-482b-83c5-0e335fc4d8a2`) e a aba foi fechada. O job `38c3bcfc-17de-4da1-b556-0d2c1f7919df` ficou pendente e o Cron o concluiu em uma tentativa às 21:02 de 09/10 (São Paulo): 3 páginas, 45 itens, `requires_review`.
- [x] A sessão médica mostrou 44 marcadores fictícios e 1 narrativa, cada qual com página, trecho e link ao original. Uma confirmação de transcrição ficou como revisão 1 e persistiu após recarga. A conta autenticada de paciente recebeu acesso negado ao endpoint. RLS e revisão idempotente passaram nos 115 testes PGlite; CI completo do `f21cf09` passou.
- [x] Lease vencida simulada no job fictício; Cron recuperou e concluiu a 2ª tentativa às 21:15 de 09/10 (São Paulo). Persistiram 1 execução e 45 itens, sem duplicação.
- [x] No PR #95, a tela interna de Processamentos identifica a tarefa de exame
  como “Leitura de exame”, destaca tarefas encerradas com falha na página e
  encaminha a equipe ao original. CI do commit `0bcd6c9` passou (testes, lint,
  typecheck e build). Ainda não houve tarefa falha observada no Preview. O aviso
  depende de a equipe abrir a tela e não é notificação proativa.
- [ ] Exercitar outras falhas transitórias e definir monitoramento/alerta
  operacional proativo. O teste de lease não cobre falha de download, serviço
  externo ou erro permanente; a indicação visual acima não fecha este item.
- [ ] Definir com o médico **arquivo → laudo → resultado**: valor literal, unidade, referência do emissor, data de realização, página/trecho, ambiguidades e narrativas. Timestamp de envio permanece separado.
- [ ] Avaliar cobertura/erros e limites antes de ampliar o parser para qualquer outro documento. A fixture atual não interpreta exames reais; Claude/OCR dependem de IA1.
- [ ] Obter aceite técnico e avaliação clínica separadamente. Nenhum item é publicado ao paciente automaticamente.

## Gates permanentes

- [ ] IA1: registrar decisões de finalidade, fornecedor, dados permitidos,
  retenção, revisão e privacidade antes de qualquer envio clínico a modelo.
- [ ] C1/Gate P: separar produção do projeto sintético, reconciliar migrations,
  testar backup/restauração, autorização/RLS/auditoria e jornadas por papel
  antes de dados reais. Ver [Gate P](GATE_P.md).
- [ ] IA3–IA6: iniciar somente com biblioteca aprovada/versionada, fontes
  rastreáveis, revisão humana e gates do [plano de IA](PLANO_IA_CLINICA.md).

## Fechamento do pacote, uma vez ao fim

1. [x] Integrar os três PRs em uma branch e abrir apenas o [PR #95](https://github.com/vitormilanez/instituto-vivance/pull/95) draft. CI completo do `ea199ee` passou após o ajuste de rótulos.
2. [x] Gerar Preview do pacote no projeto Vercel confirmado (`vtr-consulting/instituto-vivance`), com flags IA2 restritas ao Preview e ao documento fictício. Deployment `dpl_4xTHa8p8DKKRrQWQ9gCYZ5RSC8Q7` é Preview `Ready`; a sessão médica autenticada confirmou no Preview final `ea199ee` os 45 itens, a revisão persistida e o rótulo em português.
3. [x] Comparar migrations e aplicar somente `20261009231639` ao dev sintético confirmado. Worker v2 e Cron instalados; job real da fixture concluiu sem aba e a revisão persistiu.
4. [x] Verificação controlada de lease expirada/retry no dev sintético. Revisar diff/segredos no fechamento do pacote; manter PR em rascunho até o aceite operacional C3.
5. [ ] Fechar isolamento visual C3 com outros papéis/vínculos e aceite operacional; novo Preview das correções e consulta → retorno já passaram no percurso sintético. Registrar avaliação clínica separadamente. Só depois decidir merge/release. Gate P continua obrigatório antes de dados reais.

## Como atualizar este checklist

Marque somente com evidência do Git, ambiente e teste adequado. Registre data,
Preview e limites no [status](STATUS_ATUAL.md); mantenha aqui a próxima ação.
Antes de retomar, confira `AGENTS.md`, direção, status, HEAD do PR #95 e o destino
do ambiente. A próxima verificação de produto é o wizard inicial em uma conta de teste
adequada e o aceite de usabilidade. C3 ainda depende de isolamento visual por
outros papéis e aceite operacional; IA2 depende de contrato de laudo, cobertura
e outras falhas. Avaliação clínica e Gate P continuam separados.
