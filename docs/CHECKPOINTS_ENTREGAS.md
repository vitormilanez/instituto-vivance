# Checkpoints das entregas

**Rodada atual: IA2 sintética, 10/10/2026.** Cada caixa exige sua própria evidência; código local, banco/Edge, Preview, integração, publicação e aceite não se substituem. Registrar IDs e links confirmados no [status](STATUS_ATUAL.md), sem antecipar resultado.

## Base já entregue

- [x] [PR #95](https://github.com/vitormilanez/instituto-vivance/pull/95) integrou C3, contexto, onboarding e piloto IA2 na main em 09/10; CI passou e publicação técnica foi conferida manualmente. Operações automáticas de banco/promoção foram ignoradas.
- [x] [PRs #103/#104](STATUS_ATUAL.md) corrigiram convite, identidade, retomada e ficha; foram integrados/publicados tecnicamente. Fluxo real de Vitor e leitura médica conferidos no domínio principal.
- [x] Reset de Vitor às 17h38 de 10/10 confirmado em Auth, banco e Storage; médico e QA preservados. Links anteriores inválidos para o próximo teste.
- [ ] Vitor percorrer manualmente um **convite novo** para `vitor.milanezz@gmail.com` e dar aceite de usabilidade. Não recriar ou preencher a conta antes dele.

## IA2 — cobertura e correções por campo (em andamento)

- [x] Implementar correções parciais de unidade, referência e data; campos omitidos preservam correções anteriores e campos nulos removem informação. Extração original e revisões permanecem imutáveis.
- [x] Proteção contra revisão concorrente com versão esperada, reenvio idempotente, validação de calendário e limites dos campos. API/RPC testadas localmente.
- [x] Formulário preenchido com dados efetivos, nota opcional recolhida e histórico de revisões; tabela e briefing usam correções persistidas.
- [x] Corpus fictício por campo/página: execução real 19/19 após um fallback Sonnet; variabilidade registrada. Revalidação privada offline: 82 itens fundamentados ante 76, sem offsets inválidos. Omissões silenciosas previstas, associações entre linhas e fallback aditivo têm casos dirigidos. Isso não é completude clínica.
- [ ] Checks do pacote, migração compatível com a versão no ar, worker atualizado, integração e publicação no domínio.
- [ ] Conferir edição pela interface médica, recarga, histórico, briefing e isolamento no ambiente sintético publicado.

## IA2 — rodada #106/#107

- [x] Implementar extração estruturada com Haiku 5.5 e fallback seletivo Sonnet 5.5, página/trecho, fila e Cron de um minuto restritos ao dev sintético; revisão por item e acesso ao original separados. Migrations `20261010210749`/`20261010212152` aplicadas (67 no total), Edge v9 ACTIVE e Cron job 1 mantido. A chave Claude permanece segredo da Edge.
- [x] Conta QA permanente com login real, onboarding sintético enviado e consentimento de compartilhamento confirmado no banco; IDs em [CONTA_TESTE](CONTA_TESTE.md), senha apenas no arquivo local ignorado `0600`.
- [x] Três fixtures sintéticas passaram pela interface autenticada. Reprocessamento v2 pelo Cron: três jobs concluídos na primeira tentativa, 25 itens em quatro páginas e três metadados; histórico v1 preservado. Médico confirmou revisão v1 de um item; paciente recebeu 403 na extração.
- [x] Tabela progressiva, original e briefing conferidos com médico autenticado. No #106 publicado, só “Glicose 92” apareceu como fato revisado, com data e link de origem; 24 itens ficaram pendentes. PDF original retornou 200 e hash idêntico. Capturas em `output/playwright/20261010-exams/`.
- [x] [PR #106](https://github.com/vitormilanez/instituto-vivance/pull/106) integrado (`d2f1dd2`); CI do PR `38088315846` e release main `38088441125` passaram 488 testes. Deployment `dpl_J1kcUtEfxcfCZkWXzutaL11W4niR` promovido, SHA/READY/aliases e smoke autenticado conferidos. Operações automáticas de banco/promoção foram skipped; execução manual acima foi verificada.
- [x] [PR #107](https://github.com/vitormilanez/instituto-vivance/pull/107) integrado em `718e599`, CI do PR `38088708513` passou 488 testes; Edge v9 ACTIVE. Corrige fallback do rótulo para nome do arquivo.
- [x] Deployment web #107 `dpl_FZ4aX2gzUJGfimWAm1kyKs63FTcw` READY/production no SHA `718e599`; release `38088840558` passou verify com 488 testes, etapas automáticas de migration/promoção skipped e execução manual confirmada. Aliases apontam ao novo deployment; médico autenticado viu 25 itens, 24 pendentes, nome dos arquivos 01/02 e revisão do item da extração v2 persistente após recarga; link profundo à fonte abriu corretamente, 390 px sem overflow.
- [ ] Preview autenticado: **não executado** nesta rodada. Registrar como marco distinto; a verificação pós-publicação do #106 não é Preview.

## Avaliação e próximos gates

- [x] PDF privado de 25 páginas e duas JPEG processados via API apenas, sem expor os arquivos no app. Avaliação v1: 76 offsets Unicode exatos, 15 propostas descartadas, cobertura parcial. Revalidação **offline** após ajuste .2 confirmou os mesmos 76 offsets, identidade/emissor nulos em 3/3 casos aplicáveis com título do banco como fallback, e 53/53 datas com fonte/calendário válidos. Não houve nova chamada API, medição de completude clínica nem custo em USD.
- [x] Criar corpus fictício com campos esperados por página e resolver o recorte de omissões desta entrega. Página 21 privada foi identificada como continuação de referência/metodologia; nenhum dado real foi importado.
- [ ] Ampliar corpus por tipo de laudo e medir estabilidade entre execuções; obter gabarito e aceite médico, sem inferir completude dos 19 campos fictícios.
- [ ] Validar separadamente o caminho de publicação de resultados ao paciente com aprovação médica explícita. Revisão de extração não publica conteúdo.
- [ ] Aceite operacional do médico, contrato de laudo e qualidade; aceite clínico e dados reais dependem de IA1, produção separada e [Gate P](GATE_P.md).

## Limites contínuos

C2/C3 ainda precisam de cenário com outros papéis/vínculos, data de realização do exame se decidida pelo produto, e aceite operacional. IA1 exige finalidade, fornecedor, política de dados e revisão; IA3–IA6 exigem biblioteca aprovada e validação clínica. O domínio público usa temporariamente o dev sintético. Dados reais aguardam produção separada, restauração verificada e Gate P. Quando uma decisão mudar, atualizar este checklist, [direção](DIRECAO_E_SLICES.md), [status](STATUS_ATUAL.md) e tarefa Asana após confronto com Git/ambiente.
