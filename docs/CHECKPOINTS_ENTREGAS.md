# Checkpoints das entregas

**Rodada atual: IA2 sintética, 10/10/2026.** Cada caixa exige sua própria evidência; código local, banco/Edge, Preview, integração, publicação e aceite não se substituem. Registrar IDs e links confirmados no [status](STATUS_ATUAL.md), sem antecipar resultado.

## Base já entregue

- [x] [PR #95](https://github.com/vitormilanez/instituto-vivance/pull/95) integrou C3, contexto, onboarding e piloto IA2 na main em 09/10; CI passou e publicação técnica foi conferida manualmente. Operações automáticas de banco/promoção foram ignoradas.
- [x] [PRs #103/#104](STATUS_ATUAL.md) corrigiram convite, identidade, retomada e ficha; foram integrados/publicados tecnicamente. Fluxo real de Vitor e leitura médica conferidos no domínio principal.
- [x] Reset de Vitor às 17h38 de 10/10 confirmado em Auth, banco e Storage; médico e QA preservados. Links anteriores inválidos para o próximo teste.
- [ ] Vitor percorrer manualmente um **convite novo** para `vitor.milanezz@gmail.com` e dar aceite de usabilidade. Não recriar ou preencher a conta antes dele.

## IA2 — implementação e teste local

- [x] Implementar campos estruturados, metadados, página/trecho e modelo usado: Haiku 5.5 primário, Sonnet 5.5 fallback seletivo. Teste privado validou offsets de trecho de 76 itens; **cobertura parcial**, sem alegar correção de todos os metadados ou completude clínica. Adapter .2/prompt .2/extractor .2 corrigem título/data narrativos sem apoio; Edge v8 ACTIVE, com reprocessamento das três fixtures QA ainda em andamento.
- [x] Confirmar fila/Cron de um minuto no dev sintético: três jobs de fixture concluídos sem aba aberta e dois retries automáticos após correção de metadados. Permanecem testes de outras falhas terminais e limites de execução.
- [x] Confirmar revisão humana pelo médico na interface local: item fictício “Glicose” confirmado, revisão v1 persistida; leitura da extração pelo paciente negada com 403. Corrigir/rejeitar e outros papéis seguem como testes separados.
- [x] Conferir localmente a ficha médica agrupada em tabela progressiva e o briefing da próxima consulta limitado a fatos **revisados**. Na consulta sintética das 19h30, navegador médico mostrou só “Glicose” confirmada e 23 pendentes; o link selecionou o item e a fonte. Revisão visual em 1440/390 px ajustou notas recolhidas, seis linhas iniciais e rolagem à fonte no celular. **Preview ainda não validado.**
- [x] Passar 487 testes, typecheck e build antes do ajuste .2; lint sem erros (um aviso preexistente de variável não usada). Após o ajuste .2, seis testes focados e typecheck passaram; suíte completa/CI ainda pendente. O custo monetário depende de preço verificado; registrar tokens, latência e limites antes de alegar custo em USD.

## Dev sintético e avaliação autorizada

- [x] Confirmar projeto/ref `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`): migrations `20261010210749`/`20261010212152` aplicadas (67 no total), Edge `exam-text-worker` v8 ACTIVE após v7, Cron job 1 `vivance-ia2-exam-text-worker-synthetic` `* * * * *` intacto. Preservar registros de origem incerta e conferir desativação antes de nova mudança.
- [x] Criar [conta QA permanente](CONTA_TESTE.md) `paciente.teste@vivance.example`, com Auth/paciente/vínculo confirmados e login real local. Credenciais somente no arquivo ignorado `apps/web/.env.test-accounts.local` com permissão `0600`; submissão de onboarding v3 registrada sem confundir RPC com consentimento.
- [x] Usar, pela autorização específica, PDF privado de 25 páginas e duas imagens JPEG **via API apenas**, fora da aplicação; arquivos permaneceram em `/tmp`. Fixtures sintéticas separadas estão versionadas em `apps/web/tests/fixtures/exams/`.
- [x] Medir correspondência de offsets de trecho Unicode e latência/tokens: PDF 61/73 após fallback seletivo, JPEGs 9/9 e 6/9; total 76 offsets validados e 15 propostas descartadas. **Isso não atesta título/data narrativos, completude clínica ou preço em USD.** Esses números são do benchmark privado v1, não repetido após a correção .2; detalhes no [status](STATUS_ATUAL.md).
- [ ] Percorrer Preview autenticado como médico e paciente: upload/enfileiramento/andamento, tabela/original/revisão/recarga, briefing revisado e negação ao paciente. Registrar deployment e identidades sintéticas usadas.

## Integração, publicação e aceites

- [ ] Abrir PR da branch, conferir diff, CI e revisão. Registrar URL, SHA e runs; resolver falhas antes de integrar à main.
- [ ] Publicar tecnicamente apenas depois de confirmar Vercel equipe/projeto, banco/Edge/Cron e checks. Registrar deployment promovido, domínio e percurso autenticado pós-publicação. `READY` isolado não confirma jornada.
- [ ] Aceite operacional do médico para o fluxo e contrato de laudo; avaliar qualidade da extração separadamente. Aceite clínico exige protocolo próprio, IA1 e [Gate P](GATE_P.md); não é consequência de teste sintético ou publicação.

## Limites contínuos

C2/C3 ainda precisam de cenário com outros papéis/vínculos, data de realização do exame se decidida pelo produto, e aceite operacional. IA1 exige finalidade, fornecedor, política de dados e revisão; IA3–IA6 exigem biblioteca aprovada e validação clínica. O domínio público usa temporariamente o dev sintético. Dados reais aguardam produção separada, restauração verificada e Gate P. Quando uma decisão mudar, atualizar este checklist, [direção](DIRECAO_E_SLICES.md), [status](STATUS_ATUAL.md) e tarefa Asana após confronto com Git/ambiente.
