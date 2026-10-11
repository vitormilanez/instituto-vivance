# Direção do Vivance e próximos slices

**Decisão vigente em 10/10/2026:** cuidado longitudinal supervisionado: convite → contexto inicial → preparação → consulta → registro médico → acompanhamento → retorno. O médico interpreta e decide. Relato literal, dado extraído, cálculo, revisão, aprovação e publicação têm origem e estados separados. O [status](STATUS_ATUAL.md) distingue implementação, teste e publicação.

## Prioridade atual — robustez da ingestão (10/10)

Pedido vigente: exames extensos no formato PDF/foto devem preservar o texto por
página antes da extração. [PR #114](https://github.com/vitormilanez/instituto-vivance/pull/114)
publicado tecnicamente: formatação literal de PDF, validação de payload e
checkpoints por lote para evitar pagar novamente pelos concluídos. A verificação
remota revelou referências descartadas e duplicatas; o [PR #115](https://github.com/vitormilanez/instituto-vivance/pull/115)
corrigiu esses achados e também foi publicado. Haiku 5.5 inicial + Sonnet 5.5
seletivo; sem interpretação clínica. Próximo slice: continuar entre leases e
recuperar jobs que esgotaram tentativas, reaproveitando texto/lotes. O PDF
anteriormente reportado ainda aguarda recuperação. Isso precede a publicação
ao paciente. Estado de publicação e evidência em [STATUS_ATUAL](STATUS_ATUAL.md);
contrato, limites e política econômica em [IA2_EXAMES](IA2_EXAMES.md).

## IA2 sintética publicada — próxima entrega separada

Os [PRs #106/#107](https://github.com/vitormilanez/instituto-vivance/pull/107) estabeleceram extração sintética com fonte e revisão por item; o [#109](https://github.com/vitormilanez/instituto-vivance/pull/109) integrou correções de unidade, referência e data. O [#110](https://github.com/vitormilanez/instituto-vivance/pull/110) integrou a deduplicação e foi publicado tecnicamente na aplicação `91970c0`, Edge v11 e deployment `dpl_DH5etxpExwKTLPDU5d6qj6LttkwU`, anteriores ao refinamento de UX #112. Consulte o [status](STATUS_ATUAL.md) para o frontend vigente. A migration `20261010220240` era a última nessa rodada histórica (68 no dev); o #114 aplicou `20261010234104` (69 no dev). A interface médica autenticada confirmou cinco medidas na run atual, histórico preservado e Glicose v5 após recarga. O isolamento do paciente foi testado em rodada anterior, sem novo teste no #110; não há aceite clínico.

A deduplicação .4 resolveu no piloto a representação de número/unidade juntos ou separados: a run .3 tinha dez itens de cinco resultados, enquanto a run .4 trouxe cinco itens em primeira tentativa do Cron. CI e release #110 passaram 504 testes; a verificação autenticada no domínio principal confirmou 25 resultados, 24 pendentes. A avaliação privada offline final fundamentou 81 itens com zero offsets inválidos, sem comprovar completude clínica. O HEAD documental pode diferir do SHA da aplicação por commits somente de documentação.

Após a retomada operacional: publicação explícita ao paciente de resultados aprovados pelo médico, com resumo enxuto e acesso ao original. Revisão de transcrição não equivale a aprovação/publicação. Ampliar o corpus de qualidade por tipo e medir estabilidade antes de IA3/interpretação; a avaliação privada não é gabarito clínico.

## Sequência e dependências

| Frente | Decisão |
| --- | --- |
| Onboarding/convites | [PRs #103/#104](STATUS_ATUAL.md) publicados tecnicamente e jornada real testada; Vitor repetirá manualmente com convite novo. Usabilidade dele permanece pendente. QR coletivo exige contrato de aprovação médica; Google Sign-In exige OAuth real. |
| C2/C3 operacional | Validar continuidade paciente → pedido/resposta → revisão → recibo → consulta/retorno, inclusive outros papéis/vínculos e persistência. Código do PR #95 não fecha aceite operacional. Não forjar assinatura/conduta médica. |
| IA1 — governança | Decidir finalidade, fornecedor, dados permitidos, privacidade, rastreabilidade e revisão antes de ampliar além do piloto sintético. [PR #64](https://github.com/vitormilanez/instituto-vivance/pull/64) é rascunho, sem aprovação inferida. |
| IA2 — extração | #114/#115 publicados tecnicamente no dev sintético: texto/páginas primeiro, checkpoints e correção literal. Próximo slice: continuação e retomada de jobs esgotados; depois publicação explícita ao paciente de fatos aprovados pelo médico. Estabilidade geral e aceite médico seguem pendentes. |
| IA3–IA6 | Biblioteca aprovada/versionada, interpretação com evidência, verificação, validação médica e operação somente após gates do [plano de IA](PLANO_IA_CLINICA.md). |
| C1/Gate P | `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`) é destino temporário único para testes sintéticos. Separar produção e cumprir [Gate P](GATE_P.md) antes de dados reais; preservar registros de origem incerta. |

## Experiência médica

**Prioridade solicitada em 10/10, entregue pelo #112:** briefing da Home com
objetivo destacado, exames/revisão consolidados, originais recolhidos e peso
único compacto. Publicado tecnicamente em `7e3b849`, com revisão GPT-6 Sol Ultra
e sessão médica sintética conferida. Esse refinamento precedeu a próxima entrega
de publicação ao paciente; os gates e a ausência de interpretação clínica
permanecem. Aceite de usabilidade do médico pendente, tarefa Asana
`1219378497566919`; evidências nos [checkpoints](CHECKPOINTS_ENTREGAS.md).

Manter menu superior, lista de pacientes, Agenda e oito ações rápidas. Em Hoje, mostrar agenda e pendências operacionais; na ficha, identificação, objetivos, medidas, histórico informado, evolução e documentos com original. Ausência de dado não é zero e ausência de registro não prova baixa adesão. Mostrar rapidamente apenas o necessário, com detalhe progressivo; cada campo exige coleta/persistência real. Preservar identidade Vivance e o briefing já entregue. Consulta, aprovação e publicação não se confundem.

## Como escolher IA

Dados estruturados e regras determinísticas cobrem idade, IMC, unidades, variações, cronologia e estados. Modelo de linguagem só organiza informação autorizada quando isso agrega valor e passa avaliação de qualidade, custo, latência, privacidade e rastreabilidade. OCR entra quando texto embutido falha. RAG exige biblioteca clínica curada e vigente; MCP não substitui contrato de dados ou revisão médica. Não habilitar dados reais ou interpretação clínica por causa de um resultado sintético.

A frente comercial Virada 90 segue separada nos [documentos próprios](virada90/). Decisões novas devem atualizar direção, status e tarefa Asana após confronto com Git e ambiente.
