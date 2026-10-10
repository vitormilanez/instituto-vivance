# Direção do Vivance e próximos slices

**Decisão vigente em 10/10/2026:** cuidado longitudinal supervisionado: convite → contexto inicial → preparação → consulta → registro médico → acompanhamento → retorno. O médico interpreta e decide. Relato literal, dado extraído, cálculo, revisão, aprovação e publicação têm origem e estados separados. O [status](STATUS_ATUAL.md) distingue implementação, teste e publicação.

## Prioridade em execução — exames sintéticos verificáveis

IA2 do [PR #95](https://github.com/vitormilanez/instituto-vivance/pull/95) avançou pelos [PRs #106](https://github.com/vitormilanez/instituto-vivance/pull/106) e [#107](https://github.com/vitormilanez/instituto-vivance/pull/107), integrados e publicados tecnicamente no dev sintético. Claude Haiku 5.5, com fallback seletivo Sonnet 5.5, produz itens com página/trecho; Edge v9 e Cron processam sem aba aberta. Médico revisa por item, abre o original e vê apenas fatos revisados no briefing; paciente não lê extração interna. O #107 usa o nome do arquivo como fallback e a revisão do item da extração v2 persistiu após recarga no domínio publicado. A avaliação privada teve cobertura parcial, apesar dos offsets confirmados; não há aceite clínico.

Slice autorizado em execução: corrigir omissões da extração e permitir edição de unidade, referência e data, com histórico e versão esperada. O corpus fictício possui campos esperados por página; o fallback é aditivo e dirigido às lacunas, preservando itens já vinculados à fonte. Publicação e conferência autenticada serão registradas no [status](STATUS_ATUAL.md) e nos [checkpoints](CHECKPOINTS_ENTREGAS.md).

Próxima entrega após este slice: publicação explícita ao paciente de resultados aprovados pelo médico, com resumo enxuto e acesso ao original. Revisão de transcrição não equivale a aprovação/publicação. Ampliar o corpus de qualidade por tipo e medir estabilidade antes de IA3/interpretação; a avaliação privada não é gabarito clínico.

## Sequência e dependências

| Frente | Decisão |
| --- | --- |
| Onboarding/convites | [PRs #103/#104](STATUS_ATUAL.md) publicados tecnicamente e jornada real testada; Vitor repetirá manualmente com convite novo. Usabilidade dele permanece pendente. QR coletivo exige contrato de aprovação médica; Google Sign-In exige OAuth real. |
| C2/C3 operacional | Validar continuidade paciente → pedido/resposta → revisão → recibo → consulta/retorno, inclusive outros papéis/vínculos e persistência. Código do PR #95 não fecha aceite operacional. Não forjar assinatura/conduta médica. |
| IA1 — governança | Decidir finalidade, fornecedor, dados permitidos, privacidade, rastreabilidade e revisão antes de ampliar além do piloto sintético. [PR #64](https://github.com/vitormilanez/instituto-vivance/pull/64) é rascunho, sem aprovação inferida. |
| IA2 — extração | Rodada #106/#107 entregue; cobertura e correções por campo em execução autorizada. Depois: publicação ao paciente com aprovação explícita, em entrega separada; estabilidade de extração e aceite médico seguem próprios. |
| IA3–IA6 | Biblioteca aprovada/versionada, interpretação com evidência, verificação, validação médica e operação somente após gates do [plano de IA](PLANO_IA_CLINICA.md). |
| C1/Gate P | `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`) é destino temporário único para testes sintéticos. Separar produção e cumprir [Gate P](GATE_P.md) antes de dados reais; preservar registros de origem incerta. |

## Experiência médica

Manter menu superior, lista de pacientes, Agenda e oito ações rápidas. Em Hoje, mostrar agenda e pendências operacionais; na ficha, identificação, objetivos, medidas, histórico informado, evolução e documentos com original. Ausência de dado não é zero e ausência de registro não prova baixa adesão. Mostrar rapidamente apenas o necessário, com detalhe progressivo; cada campo exige coleta/persistência real. Preservar identidade Vivance e o briefing já entregue. Consulta, aprovação e publicação não se confundem.

## Como escolher IA

Dados estruturados e regras determinísticas cobrem idade, IMC, unidades, variações, cronologia e estados. Modelo de linguagem só organiza informação autorizada quando isso agrega valor e passa avaliação de qualidade, custo, latência, privacidade e rastreabilidade. OCR entra quando texto embutido falha. RAG exige biblioteca clínica curada e vigente; MCP não substitui contrato de dados ou revisão médica. Não habilitar dados reais ou interpretação clínica por causa de um resultado sintético.

A frente comercial Virada 90 segue separada nos [documentos próprios](virada90/). Decisões novas devem atualizar direção, status e tarefa Asana após confronto com Git e ambiente.
