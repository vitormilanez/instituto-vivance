# Estado atual do Vivance

## Limpeza e lista de convites — 11/10/2026, 17h

**Publicado e conferido:** [PR129](https://github.com/vitormilanez/instituto-vivance/pull/129)
integrado em `56b4ded`; deployment `dpl_DFyCXvM2WSPTGRPxBCvG3Jn87nPu`
production/READY do mesmo SHA recebeu os domínios automaticamente. CI536testes
e release verify passaram; migrate/promote automáticos skipped, migration
aplicada via CLI antes do merge. Sessão médica real no domínio confirmou
“Excluir da lista” → PATCH200 → lista vazia, paciente QA mantido. Fixture e
seus audits removidos depois, sem envio de mensagens. Desktop1440/mobile390
sem overflow/alvos44px; logs de erro limitados a10min zerados. Nenhuma Edge/SMTP
nova; operação e limites no documento da raiz abaixo.

Pedido explícito de manter só médico e QA executado no dev confirmado.
Restam `guilhe.martins@gmail.com` e `paciente.teste@vivance.example`, um paciente
QA com seus nove arquivos/exames e dois memberships. Quatro Auth/três
pacientes/seis convites/quatro objetos removidos definitivamente, sessões
revogadas. Zero referências aos alvos em 100 tabelas e 173 FKs sem órfãos;
hashes de registros mantidos iguais. [Registro na raiz](../OPERACAO_LIMPEZA_E_CONVITES.md).
Links anteriores inválidos; usuário fará novos convites, não recriar contas.

Opção médica “Excluir da lista” implementada com confirmação: cancela um
pendente antes de ocultar; aceitos/cancelados ficam ocultos sem apagar paciente
ou conta. Arquivamento auditável com sessão viva/tenant/papel/autor. Revisão
independente aprovada; 536 testes, tipos, lint/build passaram no Node 24.21.0.
Migration `20261011202934` aplicada e pareada; publicação conferida no bloco acima.
Gate P/aceite clínico não alterados; exclusão não abrange logs/e-mails externos.

## Publicação automática do site — 11/10/2026

Pedido explícito do usuário atendido na configuração Vercel do projeto
confirmado `prj_ligeZuFRycRXA21u5rRzaLAORTrI`, equipe `vtr-consulting`:
`autoAssignCustomDomains` mudou de false para true; branch de produção `main`.
O site passa a publicar builds bem-sucedidos da main automaticamente. Banco,
Edge Functions e Auth/SMTP permanecem operações separadas; os secrets de CI
ausentes não bloqueiam o deploy nativo do site, mas ainda impedem o pipeline
completo de backend. Verificação do próximo merge documental e domínio é
registrada no PR desta decisão; sem código, migration ou dados alterados.

## Credenciais centralizadas e publicação reconferida — 11/10/2026

Credenciais locais disponíveis reunidas em `.env.vivance.local`, modo `0600`,
ignorado pelo Git. Quatro caminhos anteriores agora são atalhos para o mesmo
arquivo; valores preservados. Supabase, Resend, Anthropic, segredo do Cron e
contas QA estão disponíveis; faltam cópias locais de senha do banco e tokens
Supabase/Vercel para CI. GitHub não tem secrets/variables configurados no repo
ou environment production, portanto automação completa de backend via CI
continua pendente; publicação nativa do site foi ativada posteriormente.
[Inventário sem valores na raiz](../CREDENCIAIS.md).

Reconferidos: domínio oficial no deployment `dpl_7k8WpipTjZuJKRYrhjkNn7u3xCfx`
/ código `18a6a188`, `/login` e `/convite` HTTP200, três Edge de convite ACTIVE,
config SMTP/template sem diferenças. WhatsApp manual usa link e requer envio
pela equipe; o HTML médico aparece no e-mail de ativação após confirmar o
endereço. Não há integração de envio automático WhatsApp nesta entrega.

## Convite Auth por e-mail — 11/10/2026, 16h55 (São Paulo)

Resend Free conectado ao Auth do `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`).
O subdomínio `auth.institutovivance.app` está verificado no Resend: DKIM e
os dois CNAMEs de envio publicados na zona Vercel e marcados `Verified`.
SMTP próprio e assunto/corpo do template **Invite user** foram aplicados pela
CLI Supabase com configuração isolada; leitura posterior mostrou zero diferenças.
Remetente: `Vivance <convites@auth.institutovivance.app>`. Nenhuma chave entrou
no Git ou nesta documentação. Supabase continua no Free, sem compra de Pro.

Um único convite de teste para alias sintético do Gmail do responsável foi
aceito pelo Auth, marcado **Delivered** pelo Resend e encontrado no Gmail às
16h54. HTML em português exibiu Dr. Guilherme Martins, CRM-SP 182364 e CTA.
**Caiu inicialmente em Spam**: Gmail indicou semelhança com mensagens já
classificadas como spam, apesar de mostrar `mailed-by` e `signed-by` do
subdomínio e TLS. O responsável foi marcado como “não é spam” apenas nessa
caixa; isso não garante a caixa de entrada de terceiros. A identidade Auth
sintética não confirmada criada para o teste foi apagada por ID guardado e sua
ausência confirmada; o link recebido não deve ser usado. Não houve ativação
ou aceite de convite de paciente neste teste. Monitorar entregabilidade antes
de considerar esse fluxo aceito com destinatários reais.

[Configuração e próximos cuidados na raiz](../OPERACAO_SUPABASE_EMAIL.md).

## Publicação técnica vigente — 11/10/2026, tarde

Fotografia anterior, superada pelo bloco acima: CLI confirmou acesso/vínculo ao projeto;
comparação explícita de SMTP desabilitado e campos vazios retornou zero diferenças.
SMTP próprio não configurado; nenhuma variável de provedor nos dois arquivos
locais consultados. Nenhuma alteração remota nesta auditoria. Índice sem segredos
na raiz: [OPERACAO_SUPABASE_EMAIL](../OPERACAO_SUPABASE_EMAIL.md).

PRs #121 (check-in/alimentação) e #122 (ativação/convites) integrados à main
`18a6a1881870d8ea60b0a4caa982c4ac39bb4a48`. 534 testes passaram localmente;
CI do #122 `38167067903` e release `38167223687` aprovados em testes, lint,
tipos e build. Etapas automáticas de banco/Edge/promoção **skipped** por
configuração: publicação manual conferida, não inferida do verde.

Supabase CLI 2.117.0 publicou somente `invite-patient` v10 (JWT true),
`claim-patient-invitation` v9 (JWT false, token opaco validado) e `invite-staff`
v9 (JWT true), ACTIVE em `oxuwrdjojsmgxoljqkuk`. Sem migration nova; última
remota `20261011002635`. Nenhuma função de exames foi alterada.

Vercel CLI confirmou conta/equipe/projeto e promoveu deployment Git nativo
`dpl_7k8WpipTjZuJKRYrhjkNn7u3xCfx`, [URL técnica](https://instituto-vivance-4z1p46fd1-vtr-consulting.vercel.app),
READY/production do mesmo SHA. `targets.production` e os dois domínios
resolveram para esse ID. Principal: três HTTP 200, TTFB 0,256–0,799 s;
secundário 307 para principal. Anterior para reversão:
`dpl_4ckHiqrEM1NdXqaf6cUFTigvHt2X`, código `e05cb4c`.

Reprodução real browser → API → Edge → índice no domínio principal, com
dois convites exclusivamente sintéticos `.test`, retornou 409 e apresentou
“Use o convite enviado por e-mail”; banco confirmou token/claim intactos.
Mobile 390 px sem overflow. As duas fixtures foram **revogadas**, tokens
desativados; nenhum e-mail/WhatsApp enviado e nenhum destinatário real alterado.
Paciente QA entrou pela interface, abriu alimentação com as cinco escolhas
e manteve sessão após recarga; sem novos registros nesta publicação. O percurso
de persistência paciente → médico é evidência do Preview #121, não repetido aqui.

**Pendente naquela rodada, resolvido tecnicamente às 16h55:** CLI recusou template com HTTP 400 no free tier/provedor
padrão; SMTP próprio foi configurado depois e o HTML está ativo. O e-mail de Alfredo permanece pendente de
ativação; seu WhatsApp já estava revogado antes desta rodada. Usar o e-mail mais
recente ou solicitar recuperação/reenvio, não insistir no link cancelado.

PRs antigos #94/#78/#40 foram auditados e não integrados: conteúdo substituído
ou housekeeping desatualizado. #79/Pulse e #64/governança permanecem drafts com
pré-requisitos próprios; não são capacidades entregues. Nenhum PR foi fechado
automaticamente. Gate P e aceite clínico permanecem separados.

Os registros abaixo são históricos; a publicação vigente é a deste bloco.

## Convites — cadastro não ativado e reset específico (11/10/2026)

Rodada de 11/10 à tarde: logs confirmaram colisão `23505` entre convite por
WhatsApp e e-mail já pendente. Claim agora retorna 409 com orientação explícita
de usar o e-mail, spam, recuperação ou reenvio pela clínica, sem consumir token;
410 orienta sobre link cancelado. O link reportado já estava revogado na leitura
remota; seu convite por e-mail permanece pendente, sem confirmação/login. Não
alteradas essas identidades/convites. 30 testes correlatos passaram.

CLI Supabase 2.117.0 autenticada confirmou o destino. `config diff` isolado
mostrou só assunto/corpo declarados para escrita. `config push` foi recusado
com HTTP 400: template customizado indisponível no free tier com o provedor
padrão; requer SMTP próprio ou plano diferente. Nenhuma configuração Auth foi
aplicada nessa tentativa, sem contratação/mudança de plano. Template segue
preparado, mas não ativo. Usuário autorizou publicação das entregas pendentes.

A pedido do usuário, removidos no dev sintético confirmado
`oxuwrdjojsmgxoljqkuk` a conta antiga de `vtrconsultingbr@gmail.com` e o
convite pendente criado em 11/10 às 09h47 (São Paulo). A conta de 03/10 não
tinha confirmação, login, sessão, membership, vínculo de paciente, onboarding
ou documento. Transação com guards de identidade/estado; leitura posterior
confirmou zero contas e zero convites pendentes para esse endereço. Exclusão
definitiva; nenhum novo cadastro/convite foi criado pelo agente. O reset de
10/10 abrangia outros dois e-mails de Vitor, não este terceiro endereço.

Correção preparada na branch `codex/convite-ativacao-pendente-20261011`:
`invite-patient` e claim por WhatsApp só dispensam e-mail quando
`email_confirmed_at` existe. Identidade não confirmada recebe novo pedido de
Invite via Auth, preservando o usuário; UI médica informa **Cadastro pendente
de ativação**, pedido de novo e-mail e uso do link mais recente. Conta ativa
continua aceitando em Minhas clínicas sem novo e-mail. Resposta pública do
claim permanece genérica; falhas de envio revogam convite direto ou devolvem
o link WhatsApp para retry. Lookup incompleto falha sem envio.

Pedido adicional de 11/10: substituir o convite Auth padrão em inglês por
HTML institucional em português, com foto e CRM-SP 182364 fornecido do
Dr. Guilherme Martins, contexto de acompanhamento e CTA de ativação. Template
e [guia de aplicação](../supabase/templates/README.md) preparados; prévia local
desktop/mobile e fallback institucional sem médico conferidos. Metadados de
apresentação usam o médico verificado do convite e não concedem acesso.
`invite-staff` marca o envio como equipe para evitar atribuição médica indevida.
O painel Supabase solicitou login: template hospedado e recebimento em clientes
de e-mail não foram verificados. Remetente institucional exige SMTP separado;
HTML sozinho não substitui o remetente Supabase Auth. Não enviado novo e-mail.
Go `html/template` real validou Guilherme, equipe, ausência de metadados e outro
médico. Os reenvios atualizam apenas os campos de apresentação antes do Invite,
preservam metadados anteriores e interrompem o envio se essa atualização falhar.
16 testes focados (incluindo autoria antiga/forjada e falha de atualização) e
Deno check das três funções passaram; evidências locais em `output/email-invite/`.

530 testes passaram em Node 24.21.0 antes da inclusão do template; typecheck, lint completo (zero erros,
um aviso anterior) e build Webpack passaram. Deno check das duas funções e
revisão independente com GPT-5.6 Sol medium aprovados para o fluxo inicial. Publicação de frontend/Edge Functions, template e recebimento de e-mail real
continuam pendentes; não há migration neste lote. O usuário repetirá o
convite novo com o endereço limpo. Tarefa C2 `1219002465981599`.

**Atualizado em 11/10/2026 (São Paulo) — check-in/alimentação em PR/Preview; UX médica #119 publicada anteriormente.** Checkout Git principal: `/Users/vitormilanez/Desktop/Codes/vivance`. Aplicação publicada anteriormente: `e05cb4cafa20c3a5b43899fdfae1b7bf4310a17c`; deployment `dpl_4ckHiqrEM1NdXqaf6cUFTigvHt2X`. Aceite médico e [Gate P](GATE_P.md) permanecem separados da publicação técnica. Confira o estado vivo antes de reutilizar estes identificadores.

## Widgets e fluidez — implementação local de 11/10

Protótipo aprovado: oito ações rápidas médicas em widgets independentes de
tamanhos variados, Agenda em destaque e próximo passo compacto. Autorizado
estender refinamentos a Pacientes, Agenda e Mensagens. Destinos, papéis,
formulários e regras clínicas preservados; sem banco/Edge/IA novos.

Pacientes ganhou lista responsiva com estados identificados e filtros sem
reiniciar a rolagem. Agenda conserva posição ao trocar a data; abrir edição
usa foco sem salto e rolagem mínima. Mensagens da equipe usa rolagem interna;
menu móvel fecha ao navegar e indicadores de carregamento não deslocam itens.
Movimento reduzido respeitado nos novos widgets e na abertura da Agenda.

Build, tipos e 528 testes passaram. A suíte foi executada numa cópia isolada
dos arquivos versionados mais os novos arquivos deste lote: três migrations
locais preexistentes com sufixo ` 2.sql` causavam aplicação duplicada no checkout
original e foram preservadas. Lint: zero erros e um aviso anterior.
Conferência local reutilizou sessão médica autenticada, sem novo login e sem
enviar convites, consultas ou mensagens: oito destinos, filtros de pacientes,
mudança de data e abertura/fechamento da Agenda, menu móvel e layouts em
1440/900/320 px (conforme superfície). Revisão independente sem regressão
concreta encontrada. [QA e capturas](../design-qa.md).

Alterações ainda locais, sem novo PR, Preview ou publicação. Aceite final de
usabilidade permanece separado; histórico publicado abaixo não inclui este lote.

## Check-in e alimentação — 11/10

Branch `codex/checkin-alimentacao-intuitivos-20261011`, código `5249e56`.
Quatro perguntas diretas, recado opcional, resumo editável, mascotes originais e
dados adicionais recolhidos. Aplicação habilitada conserva etapa explícita.
Alimentação na landing, formulário rápido e Diário: cinco escolhas, foto/texto
ou ambos, horário editável e envio único. Escalas 1–5, histórico, fonte,
armazenamento privado, outbox e permissões preservados. Revisão independente
GPT-6 Astra encontrou dois P2 anteriores, corrigidos e conferidos.

526 testes, tipos e build passaram; lint zero erros e um aviso anterior.
Landing/check-in/refeição em 1440/900/390/320 px sem overflow. Paciente entrou
pela interface, enviou check-in, refeição textual e refeição somente foto,
releu após recarga; repetição idempotente conservou o registro. Falha 503
simulada preservou respostas. Guilherme entrou pela interface e abriu os
originais e a foto privada, sem revisão clínica. Projeto sintético confirmado
`oxuwrdjojsmgxoljqkuk`; sem SQL/Edge/extração novos.
[PR #121](https://github.com/vitormilanez/instituto-vivance/pull/121),
[Preview](https://instituto-vivance-lm6t8xa62-vtr-consulting.vercel.app)
`dpl_7MXE7ShG2QRd5NvCoV9hhiQpzVK1`, READY/preview, código `5249e56`.
Conta/equipe/projeto conferidos; logins reais paciente/médico e recarga passaram
no Preview, assim como visual em quatro larguras e leitura médica dos originais.
Asana C3 atualizado, aberto; publicação e aceite de usabilidade ainda separados.
[Registro e capturas](UX_CHECKIN_ALIMENTACAO_2026-10-11.md).

## Publicação técnica da UX médica — #119 (10/10)

O [PR #119](https://github.com/vitormilanez/instituto-vivance/pull/119) foi
integrado à `main` no SHA `e05cb4cafa20c3a5b43899fdfae1b7bf4310a17c`.
O [release 38105844754](https://github.com/vitormilanez/instituto-vivance/actions/runs/38105844754)
aprovou `verify`. As etapas automáticas de migração, Edge Functions e promoção
foram ignoradas por falta de configuração; este PR não alterou `supabase/`.
Não houve migration, alteração de Edge Function ou reprocessamento neste lote.

Vercel: conta `vtrconsulting`, equipe `vtr-consulting`, projeto
`instituto-vivance` / `prj_ligeZuFRycRXA21u5rRzaLAORTrI`. O deployment
[`dpl_4ckHiqrEM1NdXqaf6cUFTigvHt2X`](https://instituto-vivance-ihi2psj0e-vtr-consulting.vercel.app)
está `READY`, alvo `production`, build do SHA integrado. A promoção manual pela
CLI atualizou `targets.production`. Tanto [institutovivance.app](https://institutovivance.app)
quanto [instituto-vivance.vercel.app](https://instituto-vivance.vercel.app)
resolveram para o mesmo ID. No principal, `/login` deu três HTTP 200, TTFB
0,102–0,155 s e `x-vercel-id` em `gru1`. O secundário deu HTTP 307 para o
principal. Artefato anterior para reversão: `dpl_692H3GxaZpMVK7tCczcnBD9FT31N`,
SHA `2454345626b56d259a71aa59c34d23a688e13850`.

No domínio principal, Guilherme entrou pela interface e manteve sessão após
recarga. Home, ficha, extração e original responderam HTTP 200. O link direto
da Glicose abriu valor 92 mg/dL e cinco revisões. Filtros com todos os itens
expandidos mostraram 142 resultados: quatro fora, 30 dentro e 108 sem
comparação. O valor 99 ficou só no formulário em edição, preservado ao trocar
filtros; após recarga o valor salvo seguiu 92. Documentos → Evolução → voltar
conservou a seção na URL. A conta paciente de QA chegou a Meu cuidado, manteve
sessão após recarga e recebeu 404 na ficha médica e 403 na extração. Esses
testes usaram apenas contas e dados sintéticos; nenhuma revisão foi enviada.
O ambiente publicado aponta ao projeto temporário `instituto-vivance-dev`
(`oxuwrdjojsmgxoljqkuk`). Aceite de usabilidade e clínico continuam pendentes.

## Padronização da experiência médica — implementação e Preview anteriores (10/10)

Na branch `codex/padronizacao-experiencia-medica-20261010`, componentes
compartilhados de cabeçalho e seleção organizam contexto → retângulos →
conteúdo em superfícies médicas. Hoje apresenta Resumo, Exames e documentos,
Evolução e Solicitações, sem “Preparar”. Exames separam quatro filtros de
comparação com a referência do laudo de quatro estados de revisão; acima/abaixo
têm refinamento, e o formulário de revisão fica abaixo da linha factual. Cor
de comparação e estado de revisão não se confundem. Ficha, pacientes, convites,
revisão de envios, Agenda, teleconsulta, atendimento, receitas e módulos adotam
o mesmo seletor sem mudar contratos, permissões ou gravações clínicas. O filtro
de cadastros médicos é explicitamente **nesta página**. A direção desta rodada
usa Product Design sem Impeccable.

Refinamento do Resumo local: o bloco azul contínuo deu lugar a cards
neutros/brancos. Objetivo e pendências ocupam um terço, relatos dois terços no
desktop; fatos ficam em grid e o celular usa uma coluna. Rótulos derivam da
fonte, com hierarquia 18 px (card), 14 px (rótulo), 16 px (conteúdo), 13 px
(fonte) e espaços de 16/20/24 px.

Enquadramento refinado: largura máxima do Hoje de 1440 px, identidade/contexto
e ações compactos; rótulos e contagens na mesma linha dos seletores, mantendo
etapas numeradas. Altura mínima da faixa 56/60 px, conforme contagem; alvos
≥44 px. Na composição sintética 1330×625, primeiro card em 262 px do topo do
briefing; em 390/320 px, 482/528 px, sem overflow. No celular, o controle de
expansão ocupa 44 px e o contexto usa a largura disponível. Revisão independente
das capturas sem impedimento; os relatos ainda exigem rolagem no celular.

Na etapa de Preview, o [PR #119](https://github.com/vitormilanez/instituto-vivance/pull/119)
estava em draft. 525 testes, typecheck, lint e build final
passaram; lint teve zero erros e um aviso anterior. O
[CI 38105274475](https://github.com/vitormilanez/instituto-vivance/actions/runs/38105274475)
passou no SHA `5445083c4205a3e7b7ef6061399620b61ab4237c`.
Browser local em Hoje, exames, Agenda, convites, documentos e mensagens a
1440/900/390/320 px sem overflow; controles de exames e Agenda com altura de
pelo menos 44 px. Teclado Home/End e edição preservada ao alternar aba,
resultado e filtro foram conferidos. Resposta de API **simulada** testou 99
no limite máximo: verde, fonte 108 e histórico preservados, sem mutação remota.

[Preview](https://instituto-vivance-pq76f1h6n-vtr-consulting.vercel.app)
`dpl_5jWLNZWFSXczYnfadtbUoGha9jkV`, READY após build, solicitado explicitamente
com `--target preview` no SHA `5445083c4205a3e7b7ef6061399620b61ab4237c`.
Conta `vtrconsulting`, equipe `vtr-consulting`, projeto `instituto-vivance` /
`prj_ligeZuFRycRXA21u5rRzaLAORTrI` conferidos; `/login` HTTP 200 usando proteção
Vercel existente. Commits posteriores alteram somente documentação.
Paciente sintético fez login real pela interface local e no novo Preview,
manteve sessão após recarga, recebeu 404 na ficha médica e 403 na extração.
Guilherme fez login real localmente e neste Preview, mantendo sessão após
recarga: ficha, API de extração
e original HTTP 200, Glicose 92 mg/dL, histórico de cinco revisões, link direto,
URL Evolução/voltar Documentos e correção em edição preservados. Filtros com
todos os documentos/itens expandidos mostraram 4 fora, 30 dentro e 108 sem
comparação, total 142. Nenhuma correção foi enviada nessa etapa. A integração
e publicação técnica atuais estão registradas acima; não há aceite médico
desta UX. Banco/Edge abaixo pertencem à entrega anterior #117 e ao registro
#118. Detalhes em [evidências](UX_MEDICA_PADRAO_2026-10-10.md).

## IA2 — retomada operacional e referências (#117, 10/10)

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

O [PR #117](https://github.com/vitormilanez/instituto-vivance/pull/117)
foi integrado no SHA acima. CI do PR `38099060369`, verificação da main
`38099138337` e release `38099138340` passaram com 525 testes,
lint/typecheck/build; `deno check` local passou. Persiste um aviso anterior de
lint no onboarding. Etapas automáticas de banco, Edge e aliases ficaram skipped
por configuração; a publicação manual pela CLI foi confirmada.

No dev sintético `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`), a migration
`20261011002635` foi aplicada (70 no total). Quatro achados do advisor foram
conferidos, sem achados novos; a revogação de EXECUTE dos writers legados sem
token ao service_role foi confirmada. Edge `exam-text-worker` v14 ACTIVE, hash
`59373719ea1302d7982dfeaa197be58db84ca9a32f6d0b828b71f3abdfd1300c`,
adapter `.7` e prompt `.4`. Conta `vtrconsulting`, equipe `vtr-consulting` e
projeto Vercel `instituto-vivance`/`prj_ligeZuFRycRXA21u5rRzaLAORTrI`
foram conferidos. Deployment Git `dpl_692H3GxaZpMVK7tCczcnBD9FT31N`
([URL técnica](https://instituto-vivance-9obmzhxtf-vtr-consulting.vercel.app))
está READY/production no SHA integrado. Ambos os aliases apontam ao mesmo ID:
principal, três HTTP 200 (TTFB 0,278–1,272 s); secundário, três HTTP 307
(0,068–0,206 s), região `gru1`. Rollback conhecido:
`dpl_f6HaN9AF3ogADrmgMZG1tFRkovYC` (#115).

Visual local em 1440/390/320 px: sem overflow, alvos de pelo menos 44 px,
filtros com dois resultados fora e dois dentro da faixa, e retomada simulada.
Revisão independente sem impeditivos. O login médico real no domínio publicado
foi conferido pela interface via Playwright CLI, sem simular autenticação.

**Recuperação técnica concluída:** a sessão médica autenticada acionou **Retomar
organização** no domínio publicado para o PDF reportado, documento
`89d96ca4-f5e9-427e-acd4-1a0116b4f749`, job
`fd1100d4-7000-4254-b1ee-6436d9256f92`, run
`08779990-c35f-41b9-ae80-12493d5b5ba7`. Antes da retomada, o texto estava
salvo em 25/25 páginas e a run não tinha checkpoints nem itens. A ação deixou
o mesmo job `pending`, `attempt_count=0`, `available_at=11/10/2026 00:41:34 UTC`;
a auditoria registrou o médico `5fa1330b-a7d3-4843-8e4a-57ef3533062e` como
autor. O claim ocorreu às 00:42 UTC de 11/10 e o job terminou `completed`,
`attempt_count=1`, `completed_at=2026-10-11T00:43:31.835663Z`. Mesmo job/run/hash
do original, texto 25/25 preservado e 13 checkpoints (cinco iniciais, oito
auditorias). Foram persistidos 65 itens em 24 páginas, 50 com unidade, 47 com
referência e 60 com data `2026-08-13`; nenhum offset inválido. As `quality_notes`
apontam possíveis itens ausentes nas páginas 3, 5, 7, 8, 13, 16 e 17; a auditoria
é limitada a quatro páginas por execução. Essas contagens não comprovam
completude clínica. Após recarga, a UI publicada mostrou **Exames sangue .pdf**,
data de exame 13/08/2026, 65 resultados/65 para conferir, sem estado de falha.
A ficha totalizava 142 resultados/141 pendentes; os filtros globais mostravam
quatro acima, zero abaixo e 30 dentro da faixa. O filtro **Fora da referência**
mostrou quatro itens desse PDF em âmbar com seta, texto, fundo e valor destacado.
A fonte de **Eritrócitos** abriu na página 1 com valor, unidade, referência e
data 13/08/2026, além do formulário de conferência; não houve gravação médica.
O botão **Retomar organização** desapareceu e não havia estado ou alerta de erro.
Evidência visual publicada em
`output/playwright/20261011-exams-resume/published-outside-reference.png`.
Essa amostra confirma o caminho de fonte na UI, mas não a completude dos 65 itens.
Não houve revisão/aprovação médica nem publicação ao paciente.
Tarefa Asana `1219002739975041` atualizada com esta entrega e mantida aberta
para qualidade, aprovação/publicação ao paciente e IA3.

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

Publicação histórica #115: Edge `exam-text-worker` v13 ACTIVE, hash
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
essa é a evidência histórica do #115, anterior ao início da retomada pelo #117.
A recuperação técnica foi concluída no #117. Uma fonte foi aberta na UI
publicada; completude, gabarito e qualidade clínica permanecem pendentes.
Publicação ao paciente continua separada.

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
