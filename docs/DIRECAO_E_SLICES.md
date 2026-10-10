# Direção do Vivance e próximos slices

**Decisão vigente em 10/10/2026:** cuidado longitudinal supervisionado: convite → contexto inicial → preparação → consulta → registro médico → acompanhamento → retorno. O médico interpreta e decide. Relato literal, dado extraído, cálculo, revisão, aprovação e publicação têm origem e estados separados. O [status](STATUS_ATUAL.md) distingue implementação, teste e publicação.

## Prioridade em execução — exames sintéticos verificáveis

Continuar IA2 sobre o pacote já integrado pelo [PR #95](https://github.com/vitormilanez/instituto-vivance/pull/95). Na branch `codex/exames-claude-medico-20261010`, a extração estruturada com Claude Haiku 5.5 e fallback Sonnet 5.5 foi validada localmente e no dev sintético com arquivo, página e offsets de trecho; a cobertura do teste privado v1 foi parcial. Adapter .2/prompt .2/extractor .2 corrigem título/data narrativos sem apoio, Edge v8 está ACTIVE e o reprocessamento das três fixtures QA segue em andamento; o benchmark privado v1 não foi repetido. A rota web enfileira e o banco/Cron processam a cada minuto no piloto sintético, sem depender da aba aberta. A ficha médica agrupa resultados por documento em tabela progressiva, abre o original e mantém revisão por item como ação humana separada. O briefing da próxima consulta, limitado a fatos revisados com origem, foi conferido no navegador médico local; PR, Preview e publicação desta rodada não foram declarados.

Critério de passagem: testes sintéticos dirigidos de formato, falha, retry/idempotência, permissões e persistência; corpus fictício e, com autorização específica, um PDF privado de 25 páginas e duas imagens JPEG via API apenas, sem expô-los na aplicação. Medir campos corretos/incertos, página/trecho, latência e custo. Avaliação médica do contrato e qualidade é gate separado. [IA2_EXAMES](IA2_EXAMES.md) e [checkpoints](CHECKPOINTS_ENTREGAS.md) trazem execução e limites.

## Sequência e dependências

| Frente | Decisão |
| --- | --- |
| Onboarding/convites | [PRs #103/#104](STATUS_ATUAL.md) publicados tecnicamente e jornada real testada; Vitor repetirá manualmente com convite novo. Usabilidade dele permanece pendente. QR coletivo exige contrato de aprovação médica; Google Sign-In exige OAuth real. |
| C2/C3 operacional | Validar continuidade paciente → pedido/resposta → revisão → recibo → consulta/retorno, inclusive outros papéis/vínculos e persistência. Código do PR #95 não fecha aceite operacional. Não forjar assinatura/conduta médica. |
| IA1 — governança | Decidir finalidade, fornecedor, dados permitidos, privacidade, rastreabilidade e revisão antes de ampliar além do piloto sintético. [PR #64](https://github.com/vitormilanez/instituto-vivance/pull/64) é rascunho, sem aprovação inferida. |
| IA2 — extração | Entregar a rodada sintética atual, original navegável, revisão humana e avaliação mensurada; OCR genérico e uso clínico não estão aprovados. |
| IA3–IA6 | Biblioteca aprovada/versionada, interpretação com evidência, verificação, validação médica e operação somente após gates do [plano de IA](PLANO_IA_CLINICA.md). |
| C1/Gate P | `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`) é destino temporário único para testes sintéticos. Separar produção e cumprir [Gate P](GATE_P.md) antes de dados reais; preservar registros de origem incerta. |

## Experiência médica

Manter menu superior, lista de pacientes, Agenda e oito ações rápidas. Em Hoje, mostrar agenda e pendências operacionais; na ficha, identificação, objetivos, medidas, histórico informado, evolução e documentos com original. Ausência de dado não é zero e ausência de registro não prova baixa adesão. Mostrar rapidamente apenas o necessário, com detalhe progressivo; cada campo exige coleta/persistência real. Preservar identidade Vivance e o briefing já entregue. Consulta, aprovação e publicação não se confundem.

## Como escolher IA

Dados estruturados e regras determinísticas cobrem idade, IMC, unidades, variações, cronologia e estados. Modelo de linguagem só organiza informação autorizada quando isso agrega valor e passa avaliação de qualidade, custo, latência, privacidade e rastreabilidade. OCR entra quando texto embutido falha. RAG exige biblioteca clínica curada e vigente; MCP não substitui contrato de dados ou revisão médica. Não habilitar dados reais ou interpretação clínica por causa de um resultado sintético.

A frente comercial Virada 90 segue separada nos [documentos próprios](virada90/). Decisões novas devem atualizar direção, status e tarefa Asana após confronto com Git e ambiente.
