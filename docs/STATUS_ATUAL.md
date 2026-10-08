# Estado atual do Vivance

## Virada 90: refinamento de clareza e conversão — 07/10/2026

O usuário aprovou aplicar os cinco achados da revisão Impeccable, com o modelo
6.1: leitura mais compacta, formatos claros desde a abertura, navegação móvel
legível, alvos de toque maiores e personalização discreta. Implementado e
validado localmente (441 testes, lint, tipos e build; navegador em quatro
larguras, sem overflow) na branch `codex/virada90-conversion-refinement-20261007`.
Publicado tecnicamente pelo [PR #91](https://github.com/vitormilanez/instituto-vivance/pull/91),
merge `f1a7a575fc036aade44db4c8759bf2a834ef51ab`, com CI PR/main/release aprovados.
Deployment `dpl_CX5tbs3FCgC9Jm94goAnHoikGTmj` promovido manualmente; principal
e secundário confirmados no mesmo artefato. Seis arquivos públicos idênticos ao
merge. Navegador público validou entrada pelo hero, detalhes, etapas 1/3/5 em
390/1440px, preços finais e atalho após rolagem, sem overflow ou erro de página.
[Registro final](virada90/releases/2026-10-07-conversion-refinement/README.md).
[Parecer local anterior à publicação](../apps/web/.impeccable/review/virada90-conversion-refinement/evidence.md).
Asana `1219288382329047`. A hipótese comercial será avaliada junto ao CRM;
esta revisão não comprova contatos recebidos ou vendas.

## Virada 90: cinco etapas e comparação de formatos — 07/10/2026

Pedido aprovado: agrupar o conteúdo em cinco etapas; atalho fixo para valores; padronizar total e parcelamento; ampliar cor e animação moderada, sem falsa escassez. Cookies compactos, com aceitar e recusar acessíveis. Implementação na branch `codex/virada90-five-step-presentation-20261007`; 441 testes, lint, tipos e build aprovados localmente. Navegador local validado em 320/390/768/1440px: cinco etapas, mídia, preços apenas no final, atalho fixo, teclado/foco e preferências de cookies; nenhuma mensagem enviada. Publicado tecnicamente pelo [PR #89](https://github.com/vitormilanez/instituto-vivance/pull/89), merge `df175c5`, CI PR/main/release aprovados; deployment `dpl_dTKFioAg97ySk7ZNBnCS4YYQdzSj` promovido manualmente e confirmado nos dois domínios. Navegador público validou as cinco etapas e atalho nas quatro larguras, sem erro. [Registro do release](virada90/releases/2026-10-07-five-steps/README.md). [Contrato atualizado](VIRADA90_JORNADA.md). Asana `1219287767285117`. Sem banco, checkout, alteração de Ads ou ativação de webhook.

## Virada 90: apresentação antes do contato — 07/10/2026

Publicado tecnicamente pelo [PR #87](https://github.com/vitormilanez/instituto-vivance/pull/87),
merge `a436d3004379ec9da18ec14ff4573b7aa57c0895`:
oito entradas da landing para `/virada90/conhecer`, com acesso no menu e hero,
bloco editorial, links contextuais e cards de formato. WhatsApp permanece na
etapa final da apresentação, com seletor para quem já conhece o programa.
O evento consentido de entrada mede navegação, sem conversão Ads. 440 testes,
lint, tipos e build passaram; navegador conferido em 320/390/1440px.
[Decisão e limites](virada90/FUNIL_COMERCIAL_LEVE.md). Verificações do PR e
main aprovadas. Deployment `dpl_6sQpUfwvD6nSGCWYhau5FJ554uY4`, READY e do
mesmo SHA, promovido manualmente e confirmado nos dois domínios. Navegador
público confirmou entrada pelo hero e formato, seletor até o contato e recusa
de medição, sem enviar mensagem. [Registro do release](virada90/releases/2026-10-07-discovery/README.md).
A qualidade dos contatos exige acompanhamento do CRM.

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

### Funil comercial enxuto — 06/10/2026

Publicado tecnicamente em 06/10/2026 pelo [PR #80](https://github.com/vitormilanez/instituto-vivance/pull/80): rótulo curto da origem paga no texto editável do WhatsApp, apenas após consentimento e quando reconhecida no link. O CRM existente da closer continua sendo a fonte para conversa recebida, agendamento, comparecimento e entrada no Virada 90 presencial ou online. [Contrato operacional](virada90/FUNIL_COMERCIAL_LEVE.md) e [registro do release](virada90/releases/2026-10-06/README.md). Verificação da `main` aprovada, deployment `dpl_AgWG4tj1AQ3QeyGpiqpGpRRRXZvv` promovido manualmente e confirmado em ambos os domínios. O navegador público confirmou recusa, aceite e revogação sem enviar mensagem. Recebimento no Pulse e conversão real no Ads não foram validados. PR #79 permanece rascunho/desligado. Gate P aberto.

### Google Ads e modelo de acompanhamento — 07/10/2026

Na conta `CA - Dr. Guilherme Martins` (`421-617-2711`), a ação
**“Botão do Whatsapp”** usa a label publicada
`AW-818747876/zzjqCNb0r4wYEOSztIYD` e está ativa como **Contatos**. A ação
antiga **“Clique no WhatsApp”** usa outra label, não recebia ping desde julho
e permanece sem alteração. A última conversão da ação ativa foi registrada em
03/10 no nível da conta; isso **não comprova** conversão do Virada 90.

As campanhas `VIRADA90 | ONLINE | BRASIL | SEARCH` (`24310407311`) e
`VIRADA90 | PRESENCIAL | 100KM PRUDENTE | SEARCH` (`24316075414`) herdavam
metas padrão sem **Contatos**. Em 07/10, ambas foram configuradas com a meta
específica **Contatos**, sem alterar orçamento, anúncios ou lances (ambas
continuam em **Maximizar cliques**). A janela de 07/09 a 06/10 mostrou,
respectivamente, 66 cliques em anúncios/R$ 276,12 e 24 cliques/R$ 158,56;
as campanhas indicavam zero conversões nessa janela. Clique no anúncio,
clique no WhatsApp e mensagem recebida são eventos distintos.

O [modelo semanal de acompanhamento](virada90/MODELO_ACOMPANHAMENTO.md) está
pronto. Ele usa o CRM existente para conversa recebida, avaliação agendada,
comparecimento e entrada no programa, com origem não identificada quando
faltar evidência. No Pulse, não foi validado webhook ativo para mensagem
recebida; o PR #79 segue rascunho/desligado. Não há comprovação de
conversão real atribuída ao Virada 90 nem autorização para importar conversas
com dados reais ao banco clínico. Gate P permanece aberto.



## Briefing da consulta e peso — 07/10/2026, publicado

Na branch `codex/consultation-brief-20261007`, iniciada da `main` atualizada
(`0e28011`), a Home do médico troca as abas da próxima consulta por leitura
contínua: identidade e ação contextual, relatos com fontes, pré-consulta
mais recente aberta, comparação de originais e fatos compactos. As pendências
da pessoa selecionada ficam no briefing; a revisão dos demais inclui documentos
sem somar os mesmos arquivos duas vezes e abre a coleção correta. Agenda,
solicitações, aceite de vínculo e ações rápidas do médico são preservados.

O gráfico usa datas reais no eixo, seleção por toque/teclado, peso e data de
cada registro, variação factual em kg/percentual, tabela acessível e cadastro
como referência separada. Não determina peso ideal, gravidade ou conduta.

O serviço de IA fica no servidor, desligado por padrão. O fallback cita
literalmente relatos e calcula lacunas por regra. A IA só pode selecionar
fatos existentes com fontes válidas, mantendo a ordem do servidor; texto
reescrito ou sem fonte é descartado. Não há nova persistência nem migration.
Ativar o envio de dados clínicos ao provedor exige decisão expressa do usuário
sobre fornecedor/LGPD e os gates aplicáveis.

Validação inicial local e sintética; publicação autorizada e concluída em
07/10/2026 pelo [PR #82](https://github.com/vitormilanez/instituto-vivance/pull/82),
merge `abefcb3`. Testes, lint, typecheck e build da main passaram. Deployment
de produção `dpl_AKdqxwrBgQuVjrwAJjRMVXJ6frAR`, READY, promovido manualmente e
confirmado em ambos os domínios. A Home e suas interações foram conferidas na
sessão autenticada existente do médico; os oito atalhos da rota foram preservados.
IA permanece desligada, sem migration ou escrita no Supabase nesta publicação.
C3 permanece sem aceite operacional e Gate P aberto.
[Contrato, evidências de publicação e limites](BRIEFING_CONSULTA_2026-10-07.md).

### Refinamento solicitado — 07/10/2026, em validação local

O briefing foi reagrupado em relatos literais, respostas pendentes e documentos
para revisão; links de documentos apontam para linhas identificáveis, com data.
A próxima consulta pode ser minimizada e expandida pelo teclado ou toque,
movendo as seções seguintes no fluxo normal da página. A causa observada do
menu desaparecer na troca era o fallback global `Carregando sua clínica…`, que
substituía todo o shell; essa tela de carregamento foi removida e os links do
menu indicam navegação pendente. No compositor médico, as referências opcionais
ficam recolhidas e abrem sobre a conversa no desktop, mantendo o envio visível;
o histórico abre no último registro. Um teste autorizado enviou mensagem curta
sem dados clínicos na sessão autenticada do médico, confirmada no histórico.
Os demais comportamentos foram conferidos localmente com dados fictícios;
publicação da nova versão e aceite clínico ainda são etapas distintas.

### Publicação técnica do refinamento — 07/10/2026

PR #84 integrado à `main` no commit `5466eb2a19bb7b8b74515a4add1a27b2cc4abe6a`.
Foundation CI e `verify` do release passaram com 439 testes, lint, tipos e build.
O workflow não aplicou migrations nem Edge Functions e ignorou a promoção por
configuração protegida ausente. Não houve alteração de banco neste lote. O
deployment production `dpl_2VxpTEMTUimABXpCW3Kyy1xS9K2y`, do mesmo commit,
foi promovido manualmente; `institutovivance.app` e
`instituto-vivance.vercel.app` resolvem para esse ID. `/login` respondeu 200
no principal e 307 no alias, redirecionando ao principal.

Na sessão autenticada do médico, navegar de Teleconsulta para Mensagens e de
Mensagens para Hoje preservou o menu durante a transição; o painel publicado
mostrou referências recolhidas, último registro visível e botão de envio dentro
da área de trabalho. O teste de envio autorizado ocorreu antes desta versão e
foi confirmado no histórico depois da publicação; não houve segundo envio.
O card minimizável e os grupos do briefing foram conferidos na prévia sintética;
na sessão publicada a consulta do dia já havia passado e não havia próxima
consulta, portanto essa interação não foi revalidada no domínio.
Publicação técnica não fecha C3, Gate P nem aceite clínico.
