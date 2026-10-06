# Estado atual do Vivance

Fotografia técnica verificada entre 28 e 29/09/2026. Para prioridades, leia
[Direção e slices](DIRECAO_E_SLICES.md). Este arquivo não autoriza uso clínico.

## Resumo executivo — 29/09/2026

| Frente | Status atual | Próximo marco |
| --- | --- | --- |
| **C1 · Base operacional** | Projeto único de testes autorizado; 57 migrations pareadas no histórico do projeto atual. Sem restauração testada nem produção separada. | Confirmar destino de cada ferramenta antes de escrita e manter a separação como requisito prévio a dados reais. |
| **C2 · Demonstração longitudinal** | Limpeza e carga histórica parcial executadas. Restam Guilherme e Vitor no Auth e um prontuário; Vitor tem 21 dias seguidos de check-in e 18 refeições fictícias. Quatro exames receberam títulos conferidos. A lista e um PDF original foram validados na sessão autenticada do médico. | Validar a sessão do paciente e completar consulta/retorno sem forjar conduta ou assinatura médica. |
| **C3 · Contexto e aceite operacional** | Iniciado na sessão do médico: abas e fontes verificadas; unidade de altura legada corrigida; check-ins diários agora visíveis em ordem de referência na Linha do tempo. Sem aceite operacional. | Exercitar a sessão do paciente, troca de agendamento, revisão/publicação e consulta/retorno; planejar outro ciclo para admin, enfermagem e isolamento entre pacientes. |
| **IA1 · Governança** | Contrato documental no [PR #64](https://github.com/vitormilanez/instituto-vivance/pull/64), ainda sem aprovação dos responsáveis. | Fechar finalidade, fonte, fornecedor, privacidade e revisão médica. |
| **IA2–IA6** | Planejados; não há análise clínica por IA ativa. | Iniciar apenas após os gates próprios, com material sintético nas etapas iniciais. |
| **Gate P** | Aberto. O deployment está tecnicamente `READY`, sem aceite clínico. | Separar produção, conferir migrations/backup/restauração, segurança e percursos antes de dados reais. |

O [PR #63](https://github.com/vitormilanez/instituto-vivance/pull/63) foi integrado à `main` em `a1ba2e9` e publicado tecnicamente em 29/09/2026. As correções posteriores dos [PRs #66](https://github.com/vitormilanez/instituto-vivance/pull/66) e [#67](https://github.com/vitormilanez/instituto-vivance/pull/67) também foram publicadas e verificadas no navegador.

**Decisão de 29/09/2026:** o projeto `instituto-vivance-dev` será o ambiente único temporário para testes com dados sintéticos. A separação dos ambientes fica para antes de dados reais e do fechamento do Gate P; não foi dispensada.

**Decisão final de escopo em 29/09/2026:** o usuário substituiu a proposta de
três sintéticos por **apenas Guilherme e Vitor** e dispensou manter cópia dos
registros removidos. No projeto `oxuwrdjojsmgxoljqkuk`, a limpeza excluiu
seis contas Auth, 19 prontuários e os respectivos registros dependentes; seis
arquivos não vinculados a Vitor foram removidos pela API do Storage. A leitura
após a operação confirmou duas contas ativas, dois memberships, um
patient_account, um prontuário, cinco agendamentos, um atendimento, cinco
documentos e cinco objetos no Storage. Todos os documentos têm objeto, e não
há objeto órfão. Nenhuma tabela pública com `patient_id` mantém linha de
outro paciente. Os registros técnicos de auditoria permanecem como trilha
histórica; a limpeza não constitui aceite clínico.

**Carga histórica C2 em 29/09/2026:** o script repetível
[`seed_vitor_history.sql`](../scripts/demo/seed_vitor_history.sql) acrescentou
19 check-ins retrospectivos (08–28/09, sem duplicar 23 e 24/09) e 18
refeições fictícias (19–28/09). Todos os textos novos têm marcador
`DEMONSTRAÇÃO`; as datas técnicas de criação refletem a carga, enquanto a
data de referência representa o histórico simulado. Um ensaio com
`ROLLBACK`, a execução e uma segunda execução sem novas linhas passaram.
Contagem após a carga: 21 check-ins e 18 refeições para Vitor, duas contas
Auth e um prontuário. Agendamentos, atendimento, mensagens, documentos,
medidas e Storage existentes não foram alterados pelo script. A aba Evolução
foi vista na sessão autenticada do médico; o aceite médico segue pendente.

**Documentos C2 em 29/09/2026:** a migration
`20260929234224_patient_document_display_title` acrescentou um título de
exibição opcional, sem sobrescrever `original_filename` nem ampliar permissão
de escrita. No projeto de teste `oxuwrdjojsmgxoljqkuk`, os quatro PDFs de exame
de Vitor receberam títulos conferidos contra o cabeçalho dos próprios laudos;
o quinto documento permanece com título genérico. A leitura de controle
encontrou 57 versões de migration, cinco documentos disponíveis, quatro com
título e RLS ainda ativa. A listagem compacta e a revisão em linha passaram
por prévia local com dados fictícios em desktop e celular, além de build,
typecheck, lint e testes. Após a publicação, a sessão autenticada do médico
mostrou os cinco documentos, os quatro títulos e o formulário de revisão que
abre e fecha sem gravar. A rota de download gerou redirecionamento assinado,
mas o Chrome bloqueou o domínio do Storage com `ERR_BLOCKED_BY_CLIENT`. O
PR #66 passou a entregar o arquivo pelo domínio do app após a autorização no
servidor. No deployment `dpl_EB7ddcDXVvbMj37WmWowkQmwvtAu` do merge
`dacd3d3`, um PDF original abriu no visualizador do Chrome na sessão real do
médico, sem desvio para o Storage. Os outros originais não foram abertos
nesta rodada. A sessão do
paciente e o aceite da demonstração seguem pendentes. Nenhum resultado de
exame foi interpretado.

**Primeira verificação C3 em 29/09/2026:** Visão geral, Documentos, Linha do
tempo e Evolução foram acessados na sessão real do médico, mantendo Vitor no
contexto. Evolução exibiu os check-ins retrospectivos marcados
`DEMONSTRAÇÃO` e medidas com fonte. A altura legada `1,73` foi mostrada como
`1,73 cm` no cartão e na tabela; o PR #67 corrigiu apenas a apresentação
para `173 cm`, sem alterar o valor persistido. O merge `b4e8a42` teve CI
completo aprovado e foi publicado em
`dpl_FSM8Yof4tsz5SiTYgXyQ7PfhSoaT`; a sessão do médico confirmou
`173 cm` no cartão e na tabela. A Linha do tempo inicialmente mostrou estado
vazio embora Evolução listasse check-ins diários. Os PRs #69 e #70 incluíram
esses relatos no feed de médico e paciente e os ordenaram pela data de
referência, com a data técnica do envio visível. O merge `f81929f` teve CI
completo aprovado e foi publicado no deployment
`dpl_H9iT6aFsFm5B3W2egwdbymE8PEGn`. Na sessão do médico, a sequência
28/09, 27/09, 26/09… apareceu com o marcador `DEMONSTRAÇÃO` e envio em
29/09 nos registros retrospectivos. A sessão do paciente não foi testada;
nenhum aceite operacional foi registrado.

**Inventário C2 anterior à limpeza:** havia 8 contas Auth, 20 prontuários e 87
agendamentos. Vitor já tinha 5 agendamentos, 4 exames disponíveis com objeto no
Storage, 2 check-ins diários e 5 mensagens. A solicitação anterior de três
pacientes completos **não foi concluída**. Esta fotografia foi superada pela
decisão final de manter somente Vitor e Guilherme.

## Código e publicação

- A aplicação é `apps/web`; as migrations estão em `supabase/`. O protótipo da raiz não participa do deploy.
- O código da aplicação foi verificado no merge `f81929f` do PR #70. Os checks de PR e `verify` do release passaram nos PRs #66, #67, #69 e #70, incluindo testes, lint, typecheck e build. Não houve nova migration nessas correções.
- Pela CLI, a migration foi confirmada no Supabase de testes: 57 versões pareadas, cinco documentos disponíveis, quatro titulados e RLS ativa. A Vercel gerou `dpl_DLq5cWoGxkAw69BNzMZwyGv4Qmki`, `production`, `READY`, com `gitSource.sha=a1ba2e9`; a promoção manual apontou ambos os domínios ao mesmo deployment. Três chamadas a `/login` no domínio principal deram HTTP 200 (TTFB 1,03 s, 0,36 s e 0,11 s); três no secundário deram HTTP 307 para o principal. Isso comprova publicação técnica, não aceite clínico.
- Para as correções sem migration, a Vercel gerou `dpl_EB7ddcDXVvbMj37WmWowkQmwvtAu` do merge `dacd3d3` e depois `dpl_FSM8Yof4tsz5SiTYgXyQ7PfhSoaT` do merge `b4e8a42`. A CLI confirmou `production`, `READY` e o `gitSource.sha` de cada um, promoveu após CI e verificou ambos os domínios no último deployment. O domínio principal respondeu HTTP 200 em `/login`. PDF e altura foram verificados em sessão autenticada do médico, sem constituir aceite clínico.
- O feed longitudinal foi publicado em `dpl_CjcM8zQNy39B8LaCLqEwfJF7GMHe` (merge `85034cd`) e sua ordem corrigida em `dpl_H9iT6aFsFm5B3W2egwdbymE8PEGn` (merge `f81929f`). A CLI confirmou o último deployment `production`, `READY`, `gitSource.sha=f81929f` e ambos os domínios nele após promoção. A sessão autenticada do médico confirmou a ordem; a sessão do paciente ainda não.
- A variável pública de Supabase do deployment de produção aponta para `oxuwrdjojsmgxoljqkuk`, projeto chamado `instituto-vivance-dev`. A separação produção/desenvolvimento exigida pelo Gate P **não está demonstrada**. Outra variável de servidor aponta para projeto distinto; nunca inferir o destino de migrations por nome ou `.env`.
- O histórico remoto de `oxuwrdjojsmgxoljqkuk` lista migrations até `20260929234224_patient_document_display_title`. A comparação completa com um banco de produção separado não foi feita nesta revisão.

## Consolidado na aplicação

Há identidade por clínica e papel, vínculo de cuidado, agenda, atendimento versionado, pré-consulta, onboarding, contexto em abas, evolução, check-ins, diário alimentar, documentos privados, conversas, pedidos ao paciente, receitas anteriores, teleconsulta por link externo e relatórios manuais. A fundação de tarefas de processamento existe; **não há worker de OCR/IA clínica ativo**, biblioteca médica controlada ou análise automática liberada. Os contratos e limites estão em [Funcionalidades](FUNCIONALIDADES.md).

## Pendências que governam os próximos slices

1. Usar o projeto atual para testes sintéticos controlados; identificar e separar os ambientes, conferir migrations e testar restauração antes de dados reais.
2. Fechar o [Gate P](GATE_P.md) com percursos autenticados por papel e negações entre pacientes/clínicas.
3. Concluir C2 somente com Vitor e Guilherme. A limpeza e a carga de
   autorrelatos sintéticos foram executadas e verificadas no banco; marcos de
   consulta/retorno e aceite pela interface ainda estão pendentes.
4. Continuar C3: verificar a sessão de Vitor, a troca de agendamento e a
   separação entre revisão e publicação. Com apenas duas contas, não aceitar
   admin, enfermagem ou isolamento entre pacientes.
5. Definir finalidade, governança e avaliação regulatória da IA antes de qualquer análise clínica. Ver [Plano de IA clínica](PLANO_IA_CLINICA.md).

`READY`, HTTP 200 e migrations listadas são evidências técnicas delimitadas. Não comprovam a jornada completa, nem autorizam dados de saúde reais.

## Landing Virada 90 — 30/09/2026

Publicação autorizada em `/virada90` no domínio Vivance para o Instituto
Guilherme Martins. Página pública estática, com textos, vídeo, foto e três
links de WhatsApp do material aprovado. Não altera autenticação clínica,
banco, CRM ou regras de cuidado. Publicação técnica confirmada no PR #72, merge `1803dd1`, deployment
`dpl_Gz8nJKSKPbXswJLFML47aYGsGBXc` promovido pela CLI. Ambos os domínios
resolvem para esse artefato. `/virada90` e `/login` responderam HTTP 200.
416 testes, lint, typecheck e build passaram no release `36755802273`;
migrations não necessárias e promoção automática skipped. Navegador no
domínio público confirmou vídeo de 38,3 s, FAQ, três links originais e ausência
de overflow em 390 e 1440 px. Nenhum envio ao CRM realizado.

## Jornada comercial Virada 90 — 02/10/2026

Revisão de 02/10: após apontar conteúdo incompleto, o usuário forneceu as doze telas do protocolo. A apresentação em `/virada90/conhecer` passa a dez tópicos cobrindo pilares, avaliação, plano, acompanhamento, manutenção, exames, suplementos, dúvidas e formatos. [Contrato](VIRADA90_JORNADA.md) e [cobertura das telas](virada90/CONTEUDO_E_IMAGENS.md).

Ambos os programas duram três meses. Presencial com aplicações e medições quando indicadas: 12× R$ 1.000 (total R$ 12.000). Online com acompanhamento e plano alimentar: R$ 6.500 no total em 12×. Valores apenas no último tópico; não há limite de três consultas ou promessa de parcelamento sem juros.

A única saída comercial final prepara mensagem revisável no WhatsApp. Cadastro intermediário, checkout e espaços “video” foram retirados; três imagens editoriais substituem a mídia reservada. Objetivo e formato são opcionais, sem armazenamento. Não há CRM, gravação no banco ou envio automático. Revisão local na branch `codex/virada90-guided-form`, PR #74: 416 testes, lint, typecheck e build passaram com Node 24. Navegação, imagens, valores finais e enquadramentos de 320/390/1440 px foram conferidos; [evidências e limites locais](../apps/web/.impeccable/review/virada90-complete/evidence.md).

[PR #74](https://github.com/vitormilanez/instituto-vivance/pull/74) mesclado e publicado em 02/10/2026. Commit da aplicação `5d6fe4c02fbd9bbb65d0a9b5abf4146b4c95c99d`, deployment `dpl_51T4TDH34NRadvymSWK3XbCBsm5x`, execução `gru1`. O release `37056735229` aprovou testes, lint, typecheck e build; as etapas efetivas de migration e promoção automática foram skipped. Não há mudança de banco neste lote; a promoção foi realizada pela CLI após os checks. Ambos os domínios foram conferidos no mesmo artefato. `/virada90`, `/virada90/conhecer`, CSS, JS e três imagens responderam HTTP 200 e corresponderam byte a byte ao código publicado. O navegador público confirmou os dez tópicos, valores finais, escolhas opcionais e destino de WhatsApp, sem enviar mensagem. [Evidências e limites da publicação](virada90/releases/2026-10-02/README.md).

### Medição Google — 03/10/2026

Branch `codex/virada90-google-tags`: GA4 `G-L8QMHVRV68`, Ads `AW-818747876`
e conversão WhatsApp `AW-818747876/zzjqCNb0r4wYEOSztIYD` conferidos no
container público do site do Instituto Guilherme Martins. Implementação
restrita às duas páginas de campanha no domínio principal, após consentimento,
sem respostas de saúde nos eventos. 424 testes, lint, typecheck e build aprovados
localmente. Navegador conferiu recusa, continuidade da atribuição, etapa final,
aviso em 390 px e abertura da mensagem preparada no WhatsApp sem Google.
Publicado pelo [PR #76](https://github.com/vitormilanez/instituto-vivance/pull/76),
merge `a97f94d`; release `37132467559` aprovado. Promoção automática skipped;
deployment `dpl_GG3xheoUfPTYcjjoxfCz2kHbxVxy` promovido manualmente e
conferido em ambos os domínios. Arquivos públicos corresponderam ao checkout;
o navegador mostrou SDK somente após aceite e retirou seu carregamento após
revogação. [Registro](virada90/releases/2026-10-03/README.md),
[contrato](virada90/MEDICAO_GOOGLE.md).

Pulse `/integration` foi consultado na sessão autenticada: Webhooks incluem
mensagens recebidas; widget registra origem da visita. Nenhuma configuração
foi alterada. Recebimento no Google, conversão primária da campanha e integração
de conversa efetiva no CRM não foram validados.

### Conversa recebida no Pulse — preparação em 03/10/2026

Acesso ao Pulse e ao projeto `vtr-consulting/instituto-vivance` pela CLI
Vercel conferido. O novo webhook permite selecionar Mensagem recebida; os
dois webhooks ativos de eventos de contato e o webhook inativo existente
não foram modificados. Em 05/10, o acesso de `vitor.milanezz@gmail.com` à
conta Google Ads do médico (`421-617-2711`) foi confirmado; a ação existente
`Clique no WhatsApp` é de site, principal e apresenta diagnóstico de
configuração incorreta. Não há ação de conversa recebida entre as ações
filtradas por WhatsApp. O assistente de ação off-line foi examinado sem
concluir a declaração de dados nem criar conversão.
[Contrato e requisitos](virada90/CONVERSAO_PULSE.md) registrados na branch
`codex/virada90-pulse-conversations-20261003`. Em 05/10 foi preparado um
adaptador **candidato e local** para selecionar um evento `MESSAGE_RECEIVED`
com referência de campanha, sem reter texto ou identidade; teste sintético,
typecheck e lint passaram. O formato de `content` foi inferido da API de
mensagens WTS e ainda precisa ser validado com um payload fictício da conta
Pulse. Nenhuma rota pública, importação, migration ou publicação ocorreu neste
slice. A próxima dependência é confirmar schema/autenticação e armazenamento
próprio de atribuição; o projeto clínico sintético não será usado.
Em 05/10, o projeto dedicado `virada-90-attribution` foi criado na conta
Google pessoal de Vitor (sem organização, número `1032696782997`). A
Data Manager API foi ativada com autorização do usuário, e o IAM mostra
`guilhe.martins@gmail.com` e `vitor.milanezz@gmail.com` como Proprietários.
Credenciais de servidor e importação continuam pendentes. O widget Pulse
legado `Larissa - Closer` confirma que a instância
e725c7 usa o número `(18) 99755-1234` da landing, mas a landing usa `wa.me`
direto, sem o rastreamento do widget. O Console ativou automaticamente a API
Firestore ao abrir sua lista de bancos; nenhum banco foi criado. Nenhuma
mensagem de teste foi enviada.
Em 05/10, uma mensagem neutra enviada voluntariamente pelo usuário chegou ao
Pulse na instância e725c7 às 21h45. A entrega WhatsApp → Pulse está confirmada
para esse caso; webhook e conversão Ads continuam desligados e não validados.
Na retomada do mesmo dia, o PR #79 ganhou gerador de referência opaca, seleção
de identificador de clique e construtor de pedido off-line com deduplicação por
`transactionId`, além de um contrato de processamento da primeira mensagem.
Os testes usam armazenamento e envio sintéticos; ainda não existe receptor,
persistência ou chamada ao Google. O assistente da conta Ads exigiu declaração
de coleta e compartilhamento em conformidade antes de criar a ação; ela não foi
marcada, pois o fluxo real ainda não foi validado. Nenhuma conversão recebida
foi criada ou importada. A inspeção atual não confirmou filtro de webhook por
contato, portanto ativá-lo na conta comercial pode encaminhar conversas reais.
