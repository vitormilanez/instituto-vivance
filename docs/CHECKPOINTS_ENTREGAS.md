# Checkpoints das próximas entregas

Atualizado em **09/10/2026**. Use este arquivo como lista curta de execução. A
[direção](DIRECAO_E_SLICES.md) define o produto e a ordem; o
[status](STATUS_ATUAL.md) guarda evidências e limites. Um item marcado aqui
significa apenas que sua evidência indicada foi conferida, não aceite clínico.

**Checkout do pacote em preparação:** `/Users/vitormilanez/Desktop/Codes/vivance-package-20261009`, branch `codex/vivance-package-20261009`. A `main` e os PRs #93/#94/#78 não contêm este pacote local.
**Ambiente de teste:** `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`),
somente dados sintéticos. **Não usar `db push`, integrar ou acionar a pipeline de
release** enquanto as migrations do [PR #78](https://github.com/vitormilanez/instituto-vivance/pull/78)
fora da `main` não forem reconciliadas com C3 e o pacote não for validado.

## Ordem de trabalho

| Ordem | Slice | Resultado observável | Estado em 09/10 |
| --- | --- | --- | --- |
| Agora | **C3 — exame solicitado** | Paciente responde ao pedido; médico revisa; paciente vê o recibo operacional. | [PR #93](https://github.com/vitormilanez/instituto-vivance/pull/93) draft, Preview parcial; aceite aberto. |
| Depois | **C2/C3 — continuidade da pessoa** | Hoje e ficha mostram contexto com origem/data; consulta e retorno preservam o paciente em foco. | [PR #94](https://github.com/vitormilanez/instituto-vivance/pull/94) draft, baseado no C3; Preview sintético parcial, sem aceite. |
| Depois | **IA2 — fila confiável** | Extração sintética prossegue sem aba aberta, com permissão e retry verificados. | Worker e ativação Cron preparados no pacote local; sem agendamento ou teste no dev. |
| Depois | **IA2 — resultados conferíveis** | Médico compara cada item ao arquivo, página e trecho e registra revisão. | Parser restrito à fixture, persistência e tela de revisão implementados localmente; contrato de laudo, Preview e aceite pendentes. |
| Paralelo, antes de IA clínica | **IA1 — governança** | Responsáveis decidem finalidade, fontes, fornecedor, dados e revisão. | [PR #64](https://github.com/vitormilanez/instituto-vivance/pull/64) draft; decisão pendente. |
| Antes de dados reais | **C1 / Gate P** | Destinos separados, restauração e segurança comprovadas. | Aberto; não confundir Preview com liberação clínica. |

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

## IA2 — retomar o piloto sem perder trabalho

- [x] Preservado o [PR #78](https://github.com/vitormilanez/instituto-vivance/pull/78)
  draft, HEAD `1e4493a`, com texto de PDF sintético por página já validado no
  piloto anterior. As três migrations IA2 estão no dev, fora da `main`.
- [x] Reunidos localmente PR #93, PR #94 e código do PR #78 em
  `codex/vivance-package-20261009`; preservadas as versões das três migrations
  IA2 já aplicadas no dev. O PR #78 remoto continua em conflito até publicação
  do pacote. A nova migration de itens recebeu versão posterior à C3:
  `20261009231639_ia2_structured_exam_items.sql`, ainda **não aplicada**.
- [x] Incorporado o complemento local do checkout IA2: worker independente da
  aba e contrato SQL de itens/revisões. Uma execução de 115 testes PGlite passou
  com a ordem final de migrations, inclusive isolamento de paciente e revisão
  idempotente; `deno check`, dois testes do parser fictício e lint focado
  passaram. Typecheck/lint completos foram interrompidos por I/O local;
  conferir o CI do SHA final antes de tirar o pacote de rascunho.
- [x] Preparados scripts guardados para ativar/desativar Cron somente no dev
  confirmado, com URL e segredo lidos do Vault, sem credencial no repositório.
  Em 09/10, `pg_cron` e `pg_net` estavam **disponíveis, mas não instalados**;
  portanto o processamento sem aba **não foi comprovado no ambiente**.
- [ ] Aplicar e validar em dev a fila autônoma, lease, falha/retry,
  idempotência e negação ao paciente autenticado. Não chamar a fila de autônoma
  apenas porque a aba do médico retoma trabalho vencido.
- [ ] Fechar contrato de **arquivo → laudo → resultado** com valor literal,
  unidade, referência do emissor, data de realização e página/trecho; decidir
  casos iniciais com o médico. O timestamp de upload permanece separado.
- [ ] Construir parser/fixture sintético delimitado e tela de comparação com o
  original; revisar e corrigir por item, preservando histórico e fonte. Medir
  cobertura, ambiguidades e erros antes de ampliar documentos.
- [x] Código local do recorte fictício: 44 marcadores numéricos e um trecho
  narrativo, com página/trecho exato, página semelhante marcada para conferência
  e formulário médico de confirmar/corrigir/descartar cada item. O parser recusa
  arquivo não marcado ou incompleto. Ainda falta validar o PDF real no dev,
  cobertura observada, persistência da interface e aceite.
- [ ] Obter aceite técnico e, separadamente, avaliação clínica. Claude, OCR e
  interpretação automática não entram por inferência deste piloto.

## Gates permanentes

- [ ] IA1: registrar decisões de finalidade, fornecedor, dados permitidos,
  retenção, revisão e privacidade antes de qualquer envio clínico a modelo.
- [ ] C1/Gate P: separar produção do projeto sintético, reconciliar migrations,
  testar backup/restauração, autorização/RLS/auditoria e jornadas por papel
  antes de dados reais. Ver [Gate P](GATE_P.md).
- [ ] IA3–IA6: iniciar somente com biblioteca aprovada/versionada, fontes
  rastreáveis, revisão humana e gates do [plano de IA](PLANO_IA_CLINICA.md).

## Publicação do pacote, uma vez ao fim

1. Concluir a revisão e os testes locais do checkout de integração; comparar o
   diff final com os PRs #93/#94/#78 e conferir que não há segredo nem artefato
   de teste indevido no commit.
2. Publicar uma branch/PR de integração e gerar **um** Preview. Confirmar
   projeto, equipe, variáveis e banco antes de associar o deployment ao dev.
3. Conferir a lista de migrations remota por versão/conteúdo. Aplicar somente
   a nova migration `20261009231639` ao projeto sintético, sem reaplicar as
   três IA2 e as três C3 existentes e sem `db push` cego.
4. Implantar o worker somente no dev, configurar segredo Edge e Vault por
   canais próprios, instalar `pg_cron`/`pg_net` e ativar o job guardado. Observar
   execução sem aba, retry, idempotência, acesso negado e original navegável;
   desativar com o script correspondente se falhar.
5. Revalidar C3 e consulta → retorno com perfis sintéticos autorizados, pedir
   aceite operacional/avaliação clínica separadamente e só então decidir merge
   e release. Gate P continua obrigatório antes de dados reais.

## Como atualizar este checklist

Marque um item somente com evidência no Git, ambiente e/ou teste adequado.
Acrescente link e data no [status](STATUS_ATUAL.md); atualize aqui apenas o
checkbox e o próximo obstáculo, sem copiar relatórios inteiros. Em cada retomada,
confira `AGENTS.md`, direção, status, HEAD dos PRs e destino do ambiente. A
próxima ação no C3 é conferir isolamento na interface por outros papéis e
vínculos e registrar aceite operacional. O [PR #94](https://github.com/vitormilanez/instituto-vivance/pull/94)
  prepara o contexto longitudinal, com Preview sintético parcial e sem percurso
  de retorno validado.
