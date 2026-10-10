# Checkpoints das próximas entregas

Atualizado em **09/10/2026**. A [direção](DIRECAO_E_SLICES.md) define a ordem;
o [status](STATUS_ATUAL.md) guarda evidências. Checkboxes indicam verificação
técnica específica, não aceite clínico.

**Checkout oficial:** `/Users/vitormilanez/Desktop/Codes/vivance-package-20261009`,
branch `codex/vivance-package-20261009`, [PR #95](https://github.com/vitormilanez/instituto-vivance/pull/95) draft. É o pacote único de C3/PR #93, contexto/PR #94 e IA2/PR #78, ainda fora da `main`.
**Ambiente técnico:** `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`), somente dados sintéticos. Migrations reconciliadas: 64 no dev, incluindo `20261009231639`. Não executar outra migration ou release sem reconferir destino e histórico. Gate P antes de dados reais.

## Ordem de trabalho

| Ordem | Slice | Resultado observável | Estado em 09/10 |
| --- | --- | --- | --- |
| Agora | **C3 — exame solicitado** | Paciente responde ao pedido; médico revisa; paciente vê recibo operacional. | Código no PR #95; percurso parcial em Preview com PDF fictício, isolamento por outros papéis e aceite abertos. |
| Depois | **C2/C3 — continuidade da pessoa** | Hoje e ficha mostram contexto com origem/data; consulta e retorno preservam o paciente. | Código no PR #95; navegação parcial validada, consulta → retorno e aceite pendentes. |
| Avançado em paralelo no pacote | **IA2 — fila confiável** | Extração sintética prossegue sem aba aberta. | Worker Edge e Cron ativos no dev; job de fixture concluído em 1 tentativa com aba fechada. Falha/retry controlados pendentes. |
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
- [ ] Completar isolamento na interface com outros papéis, clínicas e vínculos.
  Os 114 testes automatizados de isolamento passaram; a observação autenticada
  deste ciclo cobriu apenas paciente e médico vinculados.
- [ ] Decidir se o produto precisa coletar a **data de realização do exame**.
  Hoje só há timestamp do envio; não preencher a data clínica por inferência.
- [ ] Fechar aceite operacional com o responsável e registrar evidência no
  [status](STATUS_ATUAL.md) e na [tarefa C3](https://app.asana.com/1/1192450062279073/project/1218382636610484/task/1219002740032970).

## C2/C3 — contexto longitudinal e retorno

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
- [ ] Completar cenário **paciente → consulta → registro médico → orientação
  publicada → retorno** nos perfis sintéticos. Recarregar, conferir persistência
  e manter aprovação separada de publicação.
- [ ] Validar a tarefa de localizar contexto, pendências, mudanças factuais e
  originais em Hoje/ficha, inclusive estados vazios e falhas. Registrar aceite
  operacional sem alegar aceite clínico por uma avaliação heurística.

## IA2 — fila e itens verificáveis, somente sintéticos

- [x] PR #78 preservado; código reconciliado com C3/contexto no PR #95 sem renumerar as três migrations IA2 já aplicadas.
- [x] Migration de itens `20261009231639` aplicada somente ao dev confirmado; 64 migrations locais/remotas pareadas. Worker Edge v2 publicado com segredo próprio; `pg_cron`/`pg_net` instalados, URL e segredo no Vault, job `vivance-ia2-exam-text-worker-synthetic` ativo a cada minuto. Scripts de ativação/desativação em `scripts/ops/`.
- [x] O primeiro teste revelou corrida: a rota web processou o arquivo antes do Cron e deixou 3 páginas sem itens. O commit `f21cf09` removeu o executor da rota; agora ela somente enfileira.
- [x] No [Preview integrado](https://instituto-vivance-4b1d8d9yo-vtr-consulting.vercel.app), o médico enfileirou o PDF fictício `vivance-ia2-synthetic-cron-20261009.pdf` (documento `d1c16e38-6aaf-482b-83c5-0e335fc4d8a2`) e a aba foi fechada. O job `38c3bcfc-17de-4da1-b556-0d2c1f7919df` ficou pendente e o Cron o concluiu em uma tentativa às 21:02 de 09/10 (São Paulo): 3 páginas, 45 itens, `requires_review`.
- [x] A sessão médica mostrou 44 marcadores fictícios e 1 narrativa, cada qual com página, trecho e link ao original. Uma confirmação de transcrição ficou como revisão 1 e persistiu após recarga. A conta autenticada de paciente recebeu acesso negado ao endpoint. RLS e revisão idempotente passaram nos 115 testes PGlite; CI completo do `f21cf09` passou.
- [ ] Exercitar falha transitória, lease vencido, retry, idempotência e alerta operacional em ambiente sintético; verificar o resultado do Cron após cada tentativa.
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

1. [x] Integrar os três PRs em uma branch e abrir apenas o [PR #95](https://github.com/vitormilanez/instituto-vivance/pull/95) draft. CI completo passou no `f21cf09`; verificar o novo SHA após o ajuste final de rótulos.
2. [x] Gerar Preview do pacote no projeto Vercel confirmado (`vtr-consulting/instituto-vivance`), com flags IA2 restritas ao Preview e ao documento fictício. Deployment `dpl_CJagbg5KLzPjVsQB2YL9XBBFmTPe` é Preview `Ready`; a sessão médica autenticada confirmou o fluxo. Atualizar o link se o SHA final exigir outro build.
3. [x] Comparar migrations e aplicar somente `20261009231639` ao dev sintético confirmado. Worker v2 e Cron instalados; job real da fixture concluiu sem aba e a revisão persistiu.
4. [ ] Finalizar a verificação controlada de retry e a revisão do diff/segredos; manter PR em rascunho até esse resultado e o aceite operacional C3.
5. [ ] Completar C3 e consulta → retorno com perfis sintéticos autorizados; registrar aceite operacional e avaliação clínica separadamente. Só depois decidir merge/release. Gate P continua obrigatório antes de dados reais.

## Como atualizar este checklist

Marque somente com evidência do Git, ambiente e teste adequado. Registre data,
Preview e limites no [status](STATUS_ATUAL.md); mantenha aqui a próxima ação.
Antes de retomar, confira `AGENTS.md`, direção, status, HEAD do PR #95 e o destino
do ambiente. O próximo bloqueio técnico IA2 é falha/retry sintéticos; o próximo
bloqueio de produto é o aceite operacional C3 e o percurso consulta → retorno.
