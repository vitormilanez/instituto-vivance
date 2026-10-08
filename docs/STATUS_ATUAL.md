# Estado atual do Vivance

Consolidado documental em **08/10/2026**, sobre a `origin/main`
`ebadaab8e5fa64d49355c459dee92707edbe5557` (PR #92). Git e situação dos PRs
foram conferidos nesta data. Os registros de publicação abaixo são evidências
anteriores, até 07/10; banco, domínios e sessões autenticadas **não foram
revalidados nesta organização**. Este documento não autoriza uso clínico.

[Direção e prioridades](DIRECAO_E_SLICES.md) ·
[Índice](README.md) · [Decisões e evidências históricas](historico/README.md)

## Avaliação de UX e dados em 08/10

A [avaliação Paciente × Médico × IA](AVALIACAO_JORNADA.md) acrescenta inspeção
do código e observação autenticada, somente leitura, de Hoje médico e ficha
sintética. Isso não revalida banco, sessão do paciente, jornada completa ou
deployment servido. Identificou lacunas de vínculo pedido/resposta, continuidade
da revisão e visibilidade para o paciente. A proposta de priorizar um slice C3
de exames antes da ampliação de IA2 aguarda validação; nenhuma correção foi
implementada e nenhum aceite foi promovido.

## Base confirmada no repositório

- Aplicação em `apps/web`: Next.js, Node 24. `app/`, `db/` e `drizzle/` na raiz
  são protótipo legado e não participam do deploy atual.
- Código de identidade por clínica/papel, vínculos, onboarding, pré-consulta,
  agenda, atendimento versionado, planos, check-ins, refeições, medidas,
  documentos privados, mensagens, pedidos e relatórios. Ver [contratos](FUNCIONALIDADES.md).
- Briefing contínuo, relatos literais com fontes, pendências, documentos,
  gráfico factual de peso, navegação persistente e ajustes de Mensagens
  integrados pelos PRs #82/#84. [Contrato e validações](BRIEFING_CONSULTA_2026-10-07.md).
- O [serviço do briefing](../apps/web/modules/ai/consultation-brief.ts) tem fallback
  determinístico e exige ativação/configuração explícita para chamar o provedor.
  A última conferência registrada encontrou a IA desligada; isso não foi
  reconsultado no ambiente em 08/10.
- Virada 90 com apresentação em cinco etapas e refinamento de leitura/conversão
  integrado pelos PRs #87/#89/#91; [contrato atual](VIRADA90_JORNADA.md).

## Entregas e limites da evidência

| Frente | Último registro disponível | Limite que permanece |
| --- | --- | --- |
| Área médica | PR #84, `5466eb2`, publicação em 07/10; 439 testes e checks registrados; navegação e Mensagens conferidas com sessão médica. | Card minimizável e grupos do briefing conferidos na prévia sintética; sem consulta futura na conferência publicada. Não fecha C3. |
| Virada 90 | PR #91, `f1a7a57`, publicação em 07/10; 441 testes e checks registrados; navegador público conferido. [Evidência](virada90/releases/2026-10-07-conversion-refinement/README.md). | Não comprova conversa recebida, venda ou conversão real no Ads. |
| Medição comercial | [Modelo de acompanhamento](virada90/MODELO_ACOMPANHAMENTO.md) e [funil](virada90/FUNIL_COMERCIAL_LEVE.md). | Clique em WhatsApp permanece distinto de mensagem recebida e das etapas do CRM. |

Os SHAs acima identificam entregas específicas, não afirmam qual deployment
está servindo o domínio agora. Contagens de testes também são daquele lote;
não representam uma execução nova.

## Slices e bloqueios

| Frente | Estado documentado | Próxima evidência necessária |
| --- | --- | --- |
| **C1 — base operacional** | Ambiente único temporário de testes sintéticos. Inventário de 29/09 registrou 57 migrations pareadas; contagem histórica, anterior ao piloto IA2. | Reconciliar migrations no destino confirmado, produção separada e backup/restauração antes de dados reais. [Registro C1](C1_BASE_OPERACIONAL_2026-09-29.md). |
| **C2 — demonstração longitudinal** | Carga de autorrelatos sintéticos e documentos conferida parcialmente no médico em 29/09. As contagens antigas não são inventário atual. | Sessão do paciente, consulta/retorno e aceite da demonstração. Preservar origem incerta; nenhuma limpeza é autorizada por este texto. |
| **C3 — contexto e operação** | Verificações parciais do médico e refinamentos publicados; sem aceite operacional registrado. | Jornada integrada paciente/médico, persistência, contexto correto e revisão/publicação. Outros papéis e isolamento exigem ciclo próprio. |
| **IA1 — governança** | [PR #64](https://github.com/vitormilanez/instituto-vivance/pull/64) aberto e em rascunho, confirmado em 08/10. | Decisão sobre finalidade, fontes, fornecedor, privacidade e revisão. |
| **IA2 — extração verificável** | [PR #78](https://github.com/vitormilanez/instituto-vivance/pull/78) aberto e em rascunho, fora da main; head `1e4493a`. O PR registra extração de texto de PDF sintético, proveniência por página e Preview. | Validar acesso de paciente, falha/retentativa, processamento independente da aba e contrato de resultados estruturados. Não há aceite clínico ou incorporação na main. |
| **IA3–IA6** | Plano futuro, sem entrega confirmada nesta revisão. | Gates e critérios do [plano de IA](PLANO_IA_CLINICA.md). |
| **Gate P** | Sem fechamento documentado. | Ambiente separado, restauração, segurança, jornadas por papel e demais [critérios](GATE_P.md). |

**Decisão preservada de 29/09:** `instituto-vivance-dev`
(`oxuwrdjojsmgxoljqkuk`) é o único projeto temporário de testes sintéticos.
A existência de um frontend publicado não o transforma em banco liberado
para dados reais. Registros cuja origem não foi estabelecida devem ser preservados.

## Trabalho paralelo e retomada

- PR #78 registra migrations aplicadas ao projeto de teste compartilhado mesmo
  com o código fora da main. Antes de uma próxima migration, comparar o histórico
  remoto com os arquivos das branches pertinentes; não usar a fotografia de 57
  versões como diagnóstico atual. Nesta organização não houve acesso ao banco.
- [PR #79](https://github.com/vitormilanez/instituto-vivance/pull/79) continua aberto
  para atribuição Pulse; o registro vigente o mantém desligado. Não tratar o
  webhook ou a importação Ads como integração operacional confirmada.
- [PR #40](https://github.com/vitormilanez/instituto-vivance/pull/40) permanece aberto
  para limpeza de cópias do iCloud. Esta organização remove os sete MDs antigos;
  reconciliar as exclusões sobrepostas antes de integrar aquele PR.
- Próxima entrega proposta após a avaliação: **C3 — fechar o ciclo de um exame
  solicitado**, conforme [achados e aceites](AVALIACAO_JORNADA.md). Repriorização
  ainda não aprovada. O [handoff IA2](IA2_EXAMES.md) permanece válido para retomar
  o piloto; C2/C3 seguem sem aceite integrado. Esta documentação não inicia
  implementação, não publica e não fecha aceites.
