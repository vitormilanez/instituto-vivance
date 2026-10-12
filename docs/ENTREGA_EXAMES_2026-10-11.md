# Exames: controle de recebimento, conferência e resumo médico

Execução autorizada em 11/10/2026 (São Paulo), sobre main `2f93b70`.
Implementação por GPT-6.1 Sol; revisões críticas por GPT-6 Astra Medium.
O usuário confirmou contas/documentos de teste e pediu usar os quatro PDFs
já enviados. Contrato: [fluxo de exames](FLUXO_EXAMES_E_ANALISE_LONGITUDINAL.md).

## Comportamento implementado

- Cota transacional de 15 arquivos distintos por paciente/clínica/ciclo;
  contador, reservas expirantes, pedido do paciente e liberação médica auditada.
- SHA verificado pelo servidor; reenvios mantêm recibo/autoria próprios e
  apontam ao original canônico, sem outra vaga ou job. Cota cheia permite
  verificação limitada de duplicata; conteúdo novo é recusado na conclusão.
- Médico habilita lote de até 15 arquivos existentes e declara dados sintéticos.
  Novos uploads elegíveis entram na fila autônoma já existente. Só o projeto
  temporário sintético pode ser habilitado por essa operação.
- Fotos de refeição/perfil têm intenção e validação próprias, fora da cota.
  Anexar exame a uma refeição não recupera crédito; originais não são apagados.
- Resultados com referência, data de coleta, histórico estritamente compatível
  e ação de fonte/revisão junto à linha. Datas de recebimento usam São Paulo.
- Conferência documental versionada após revisão de todos os itens, com
  justificativa de notas/páginas incertas ou exclusão. Correções tornam a
  conferência desatualizada; exclusões persistem até nova decisão explícita.
- Resumo sob clique médico, com snapshot/lease/versões, cache de resultado,
  limites de tamanho/tempo, verificação e reconstrução dos fatos por fonte.
  Até 30 fatos selecionados; comparação é cálculo validado, sem inferência livre.
- Modelo, prompt e verificador integram a identidade do cache. Rejeição médica
  conserva o snapshot/histórico e bloqueia nova geração com as mesmas fontes;
  somente falha técnica admite retry sem alterar fontes.
- Possibilidades selecionam trechos de fontes médicas autorizadas, com
  aplicabilidade estruturada. Cadastro, autorização e retirada da biblioteca
  estão disponíveis; nenhuma diretriz foi aprovada automaticamente.
- Revisão/aprovação/publicação do resumo são ações distintas; paciente acessa
  somente fatos publicados. Dados internos e hipóteses permanecem inacessíveis.

## Evidência de desenvolvimento e revisão

555 testes passaram em Node 24.21.0; tipos e build passaram. Lint: zero erros,
um aviso anterior em onboarding (`id` não utilizado). Deno check das duas Edge
Functions passou. Suíte ampliada somente pelos contratos alterados: concorrência
15/16, duplicatas inclusive autores diferentes, fotos/cota, papéis/vínculos,
cache/lease/stale, fontes clínicas e conferência/páginas excluídas.

Astra encontrou e foram corrigidos: consumo devolvido por associação a refeição;
limites numéricos ambíguos selecionando referência errada; categoria
`clinical_document` omitida do manifesto; página excluída voltando após correção
de outra página. Revisão final sem blocker restante nessas correções.

## Ambiente e QA integrado

Destino confirmado: `instituto-vivance-dev`, ref `oxuwrdjojsmgxoljqkuk`,
organização `laamvjzeoppcwvvvrnlf`, `ACTIVE_HEALTHY`. Vercel:
`vtr-consulting/instituto-vivance`, projeto `prj_ligeZuFRycRXA21u5rRzaLAORTrI`,
Root Directory `apps/web`, Node 24. CLI confirmou o acesso após conector 403.

Migrations aplicadas: `20261012010143`, `20261012010144`, `20261012010545` e
`20261012012245` e `20261012014429`. A migration `20261012012128` foi capturada vazia pelo CLI
enquanto o arquivo novo era preparado em paralelo: preservada com zero bytes
no histórico e contrato entregue na versão posterior, sem reescrever aplicada.
`private-documents` v10 ACTIVE/JWT true; `exam-summary-worker` v4 ACTIVE,
JWT de gateway desativado com autenticação médica e sessão/vínculo explícitos
validados no banco. `exam-text-worker` existente preservado.

Conta paciente indicada pelo usuário e médico informado fizeram autenticação
de QA. A sessão médica habilitou os quatro originais pela interface local.
Os jobs concluíram: PDF de 25 páginas, 66 itens/13 checkpoints; demais PDFs de
uma página, 21/20/10 itens, três checkpoints cada. Total: **117 resultados**,
28 páginas lidas, hashes e originais preservados. Contagens não são gabarito clínico.

Teste HTTP integrado exercitou recebimento de bytes idênticos por nome diferente,
recibo próprio e cota mantida em quatro. Repetições criaram recibos explícitos,
mas a visão do cuidado e o resumo contam só quatro originais. Verificação
independente de offsets/trechos dos 117 itens passou. Foram registradas revisões
**de QA**, com nota explícita de ausência de aceite clínico, e concluídas as
quatro conferências documentais. Nenhuma fonte clínica foi ativada.

Uma geração real produziu rascunho com 30 fatos; repetição retornou o mesmo ID
em cache, sem outra chamada ao provedor. Cobertura completa, zero pendentes.
Sem comparação quando faltam método/contexto compatíveis. Zero possibilidades,
pois a biblioteca ainda depende de curadoria médica. Paciente recebeu 403 nos
endpoints de resumo interno/biblioteca. Script reutilizável:
`apps/web/scripts/verify-exam-flow.mjs`, com variáveis do cofre ignorado;
sem credenciais ou laudos no Git. Sessões do script são encerradas só localmente.

Pela interface local: médico aprovou e publicou os fatos com nota de QA;
paciente entrou com seu acesso, abriu os fatos publicados, viu a capacidade
4/15 e os recibos de reenvio sem consumo extra. Sessão e publicação persistiram
após recarga. Nenhum desses cliques representa aceite clínico real.

## Publicação e verificação final

O [PR #134](https://github.com/vitormilanez/instituto-vivance/pull/134)
integrou o código `32f4db8` na main `14c732ba9ba33b82f1b7f4ee425aa9c102005e0d`.
[CI 38193717961](https://github.com/vitormilanez/instituto-vivance/actions/runs/38193717961)
e [release 38193861593](https://github.com/vitormilanez/instituto-vivance/actions/runs/38193861593)
aprovaram verify. Banco/Edge/promoção do release foram **skipped** por configuração;
backend foi aplicado/conferido manualmente antes da integração. O deploy nativo
do Git `dpl_ETgPVm4QZiEmkBvcexfAf32jUvus`,
[`instituto-vivance-mcy6e7g9c-vtr-consulting.vercel.app`](https://instituto-vivance-mcy6e7g9c-vtr-consulting.vercel.app),
ficou READY/production no SHA integrado; API confirmou projeto, main,
`targets.production` e aliases dos dois domínios nesse ID. Principal: três HTTP200,
TTFB 0,102–0,350 s/gru1. Secundário: três HTTP307 para o principal.

Login **real pela interface** no domínio: médico abriu os 117 itens/4 originais,
resumo atual, fontes locais e conferência documental. A primeira tentativa de
gerar a versão do novo contrato retornou 503 e registrou falha recuperável;
causa específica não foi capturada no worker original. Foi acrescentado
diagnóstico por estágio/status/código/lista fechada, sem dados ou tokens;
Astra revisou esse diff. Uma nova tentativa manual concluiu **28 fatos**;
repetição recuperou cache, sem outra geração. Aprovação/publicação de QA e
recarga médica passaram. O paciente autenticou, abriu essa versão factual,
viu cota 4/15, recibos idênticos sem outra vaga e manteve sessão após recarga.
API integrada no domínio negou resumo interno/biblioteca ao paciente (403).
Nenhuma extração repetida ou original removido. Biblioteca continua vazia.

Resumo médico foi conferido em 1440/320 px sem overflow horizontal; documentos
e leitura pelo paciente foram conferidos no desktop.
Foi ajustado espaçamento dos botões estreitos e horário das publicações para
diferenciar versões do mesmo dia. Evidências locais não versionadas:
`output/exames-20261011/resumo-medico-desktop.jpg`, `resumo-medico-mobile.jpg`
e `fonte-exame-desktop.jpg`. Esses testes não auditam todo o produto e não são
aceite clínico. O complemento de observabilidade/legibilidade segue em registro
de integração, sem outra migration ou chamada de extração.

Artefato anterior confirmado pelo CLI:
`dpl_Ar7MvGp1czFYCZkUXJpU4exeJpFV`,
`https://instituto-vivance-duko2knv9-vtr-consulting.vercel.app` (#133).

## Limites de aceite

Fase técnica e mecânica de QA são independentes de aceite médico real. A
biblioteca começa vazia: sem fonte autorizada e contexto confiável, não há
possibilidade clínica. Neste lote, o modelo seleciona fatos/trechos; não produz
diagnósticos ou hipóteses livres. Direção médica ainda deve curar fontes e medir
qualidade clínica, omissões e utilidade antes de ampliar finalidade/dados.
Gate P e separação de produção permanecem pendentes para dados reais.

Advisor: novas tabelas internas sem policies têm acesso direto revogado;
RPCs autenticadas `SECURITY DEFINER` são intencionais, com sessão/papel/vínculo
explícitos e testes de negação. Alertas do advisor foram revisados, não tratados
como prova de exposição. [Referência do advisor](https://supabase.com/docs/guides/database/database-linter).
Vulnerabilidades de dependências já existentes no lockfile não foram alteradas
por esta entrega; não houve upgrade automático fora do escopo.
