# Estado atual do Vivance

Fotografia técnica iniciada entre 28 e 29/09/2026, com atualização de IA2 em 04/10. Para prioridades, leia
[Direção e slices](DIRECAO_E_SLICES.md). Este arquivo não autoriza uso clínico.

## Resumo executivo — base de 29/09/2026, IA2 atualizada em 04/10

| Frente | Status atual | Próximo marco |
| --- | --- | --- |
| **C1 · Base operacional** | Projeto único de testes autorizado; 60 migrations no histórico após a fila IA2. Sem restauração testada nem produção separada. | Confirmar destino de cada ferramenta antes de escrita e manter a separação como requisito prévio a dados reais. |
| **C2 · Demonstração longitudinal** | Limpeza e carga histórica parcial executadas. Restam Guilherme e Vitor no Auth e um prontuário; Vitor tem 21 dias seguidos de check-in e 18 refeições fictícias. Quatro exames receberam títulos conferidos. A lista e um PDF original foram validados na sessão autenticada do médico. | Validar a sessão do paciente e completar consulta/retorno sem forjar conduta ou assinatura médica. |
| **C3 · Contexto e aceite operacional** | Iniciado na sessão do médico: abas e fontes verificadas; unidade de altura legada corrigida; check-ins diários agora visíveis em ordem de referência na Linha do tempo. Sem aceite operacional. | Exercitar a sessão do paciente, troca de agendamento, revisão/publicação e consulta/retorno; planejar outro ciclo para admin, enfermagem e isolamento entre pacientes. |
| **IA1 · Governança** | Contrato documental no [PR #64](https://github.com/vitormilanez/instituto-vivance/pull/64), ainda sem aprovação dos responsáveis. | Fechar finalidade, fonte, fornecedor, privacidade e revisão médica. |
| **IA2–IA6** | Duas migrations IA2 aplicadas no projeto de teste; um PDF fictício passou pelo Preview em sessão médica. Código da fila/worker em validação no PR #78; não há análise clínica por IA ativa. | Conferir o worker no Preview e acesso por sessão de paciente; Claude somente após IA1. |
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

Há identidade por clínica e papel, vínculo de cuidado, agenda, atendimento versionado, pré-consulta, onboarding, contexto em abas, evolução, check-ins, diário alimentar, documentos privados, conversas, pedidos ao paciente, receitas anteriores, teleconsulta por link externo e relatórios manuais. A fila do piloto sintético de PDF está em validação no PR #78; **não há worker de OCR/IA clínica ativo**, biblioteca médica controlada ou análise automática liberada. Os contratos e limites estão em [Funcionalidades](FUNCIONALIDADES.md).

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

## Exames consolidados — avaliação de entrada em 03/10/2026

O usuário indicou a consolidação de exames enviados como primeira função de IA a desenvolver para o médico. Cinco PDFs locais, totalizando 31 páginas, foram lidos apenas para avaliação de formato: arquivo com múltiplos laudos e página repetida, três laudos narrativos de uma página e painel laboratorial extenso. Os arquivos e seus dados pessoais não foram incorporados ao repositório nem enviados a fornecedor.

O [contrato de produto](EXAMES_CONSOLIDADOS_IA2.md) registra tela, pipeline e aceites. **Estado atual:** texto por página e migration da fila existem no projeto de teste; o código do worker está em validação no PR #78. Observações clínicas estruturadas, modelo conectado e revisão por resultado ainda não foram entregues. O IA1 do PR #64 segue em rascunho. Gate P continua aberto.

**Decisão de persistência em 03/10:** originais continuam no bucket privado e referenciados por `patient_documents`; o contrato do PR #78 separa o texto por página e as observações estruturadas. Os cinco PDFs fornecidos continuam apenas como exemplos locais de formato, sem importação para `instituto-vivance-dev`.

**Primeiro corte local em 03/10, antes do piloto:** migration nova para execuções imutáveis e texto por página, parser PDF local, rota médica autenticada, bloqueio padrão com lista explícita de IDs sintéticos e painel recolhido por página com link para o original. Testes sintéticos focados, 428 testes do app, lint, typecheck e build passaram; a migration passou em PostgreSQL 15 isolado com idempotência, falha registrada, RLS e negação ao paciente. Naquele momento a migration ainda não estava aplicada no Supabase remoto e não havia worker, OCR, Claude, laudos/observações estruturados, consolidação final nem teste autenticado do fluxo completo.

**Continuação local de IA2 em 03/10:** o PR #78 agora inclui uma visão compacta de todos os arquivos disponíveis na ficha do médico, independente da paginação de 20 itens da lista de Documentos. Ela reconcilia a última execução de extração por arquivo e mostra contagem de arquivos, exames, texto integral e itens a conferir, com acesso ao original. Ainda não há resultados laboratoriais ou laudos estruturados nessa visão. Antes da aplicação remota, a migration não aplicada recebeu uma lista privada, inicialmente vazia, de documentos sintéticos autorizados: a RPC de gravação recusa qualquer documento fora dela, mesmo se chamada diretamente. Testes locais cobriram 205 arquivos, a barreira do banco e negação ao paciente; typecheck, lint e build passaram. O projeto Supabase confirmado é `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`), ativo e compartilhado com o aplicativo publicado; as 57 migrations anteriores estão presentes, mas a migration IA2 continua **não aplicada**. Não houve upload de PDF real, chamada ao Claude, teste autenticado no ambiente nem publicação.

**PDF de referência local em 04/10:** o arquivo de três páginas fornecido pelo usuário foi lido pelo mesmo extrator do app, somente na máquina local. As páginas 1 e 2 têm texto muito semelhante, mas hashes distintos; a página 3 é diferente. O novo código sinaliza a página 2 como possível repetição da 1, conserva as três páginas e exige conferência antes de qualquer decisão de deduplicação. O contrato de migration guarda essa referência por página e a interface a mostra ao médico quando o código estiver disponível. Testes usam apenas texto sintético. Não houve importação do PDF ao repositório/Supabase, chamada ao Claude, estruturação de laudos ou aceite clínico.

**Aplicação controlada em 04/10:** a migration IA2 foi aplicada ao projeto confirmado `oxuwrdjojsmgxoljqkuk` como `20261004142437_ia2_document_text_extraction`; o arquivo local foi alinhado à versão remota. A leitura posterior confirmou RLS nas duas tabelas de extração, ausência de leitura por `anon`, ausência de execução da RPC por `anon`, lista privada vazia e zero execuções/páginas persistidas. A nova observação do advisor sobre a lista privada sem policy é intencional: a tabela não tem acesso pela Data API. Um gerador local produziu um PDF totalmente fictício de três páginas; o extrator marcou somente a segunda como possível repetição. O arquivo fica em `work/` ignorado pelo Git. O PR #78 passou no CI no commit `0b3c3d4`. O conector Vercel respondeu `403` para a equipe `vtr-consulting`, mas a sessão web autenticada criou o Preview `dpl_GtihvA1QYz3SDMovoHgnbtgnuiGB` no projeto e commit corretos; ele ficou `READY`. O Preview pede login próprio do médico. O Chrome bloqueou o envio automatizado do arquivo porque a extensão ChatGPT está sem acesso a URLs de arquivo; a instrução de habilitação foi enviada ao usuário. A lista privada segue vazia: não houve upload sintético, teste autenticado do novo fluxo, Claude ou aceite clínico. **Próximo passo:** login no Preview, upload do PDF fictício e teste do percurso por papel antes do worker.

**Piloto médico autenticado em 04/10:** a conta médica de teste entrou no Preview, cadastrou `Paciente Sintético IA2` (`3a0a9987-0bfb-4e38-9d7c-d2e4b13d5cfa`) e enviou `ia2-synthetic-exam.pdf` pela interface como exame de uso interno. O seletor nativo do macOS permitiu o envio sem alterar a permissão da extensão do Chrome. O banco confirmou o documento `4a837be3-b166-4a41-b5a2-a7205497e034` disponível, PDF de 3029 bytes e vinculado ao paciente sintético. Apenas esse ID foi incluído em `private.synthetic_exam_pilot_documents`. As duas flags do piloto foram configuradas na Vercel **somente para a branch de Preview IA2**, sem Production; o redeploy `dpl_Ax3xsr7VEXZJqs6Ri68THdAbvZcz` do commit `0b3c3d4` ficou `READY`. Pela ficha médica, a extração gerou a execução `12f0c2a9-3678-4c88-bdeb-1bbb445aee7e`, `requires_review`, três páginas persistidas, duas com texto disponível e uma para conferência por possível repetição. O texto da página 2 foi mantido, com link ao original. O SHA-256 registrado no banco (`d9d39fce73faedc187dc3c36edfb254a86944517f6e5c26d502b4d78f8dd09eb`) coincidiu com o PDF local. Após recarregar, a ficha continuou mostrando o documento na fila de conferência. Não houve Claude, envio de PDF pessoal, publicação em Production ou aceite clínico. O teste autenticado de uma sessão de paciente ainda falta; a negação por RLS foi coberta localmente e `anon` foi negado no projeto remoto. **Próximo slice:** fila/worker com repetição controlada e recuperação de falhas sobre material sintético.

**Fila do piloto em 04/10:** as migrations `20261004153431_exam_extraction_worker` e `20261004154416_exam_doctor_worker_access` foram aplicadas ao mesmo projeto de teste; o histórico remoto passou a 60 versões. A leitura de controle após a primeira encontrou um PDF fictício na lista privada, zero tarefas `exam_text_extraction` e as funções de enfileiramento/claim presentes. O primeiro CI rejeitou a chave de serviço no app web; a correção usa a sessão médica e RPCs limitadas ao próprio documento, vínculo de cuidado e lease. O PR #78 inclui enfileiramento idempotente pelo médico, worker de texto embutido com lease, resposta `202` e estado da fila na aba de Documentos. O teste local isolado passou para enfileiramento repetido, negação ao paciente, lease inválido, persistência do texto e limite de runtime. O código ainda depende de CI, publicação e verificação no Preview; o agendamento de novas tentativas depende da aba aberta, sem cron independente. Ainda não há Claude, OCR, estruturação de laudos, aceite clínico ou Gate P fechado. **Próximo slice após validação do Preview:** estruturar resultados e narrativas com origem por página, sujeito a IA1 antes de conectar fornecedor.

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
