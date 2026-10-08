# Retomada do desenvolvimento — brief e método

Orientações fornecidas pelo usuário, organizadas em **08/10/2026** a partir do
texto “Vamos retomar o desenvolvimento do VINVANCE”. O nome do projeto é
Vivance. Este brief orienta a preparação da próxima proposta; **não autoriza
iniciar implementação antes da validação da direção e do plano**.

## Investigar antes de propor

1. Localizar o checkout Git real e ler [AGENTS](../AGENTS.md),
   [direção](DIRECAO_E_SLICES.md), [status](STATUS_ATUAL.md) e decisões recentes.
2. Conferir branch, alterações locais, main e PRs; distinguir o que está integrado,
   em piloto, publicado ou apenas planejado. Asana acompanha execução, não prova entrega.
3. Percorrer no código onboarding, paciente, médico e comunicação: dados coletados,
   persistência, permissões, integrações e dashboards. Inspecionar o ambiente quando
   a afirmação depender dele; uma captura não comprova a jornada.
4. Identificar o que pode ser reutilizado e a lacuna concreta de valor. Evitar
   microtarefas, refatorações sem necessidade e repetição de diagnósticos já registrados.

## Foco da proposta

**Hoje** deve esclarecer o trabalho do médico naquele momento. **Pacientes** deve
permitir entender rapidamente quem é a pessoa, o que busca, contexto de saúde
declarado, evolução disponível, pendências e documentos. Usar somente dados
realmente coletados, com hierarquia e acesso progressivo ao histórico/original.
Os [critérios de produto](DIRECAO_E_SLICES.md) e o
[briefing entregue](BRIEFING_CONSULTA_2026-10-07.md) são o ponto de partida.

Para IA, avaliar estruturação de respostas abertas, organização/extração documental,
resumos factuais, mudanças entre check-ins, visão longitudinal e localização de
fontes. Primeiro distinguir o que consultas, regras e processamento convencional
resolvem. Comparar custo, latência, privacidade, rastreabilidade e qualidade;
preservar fonte, cálculos identificados e revisão humana. O
[plano de IA](PLANO_IA_CLINICA.md) continua sendo o contrato de gates.

Usar skills quando reduzirem trabalho ou melhorarem o resultado. Considerar
Impeccable para a análise/proposta visual, preservando [Produto](../PRODUCT.md)
e [Design](../DESIGN.md). Não criar design system novo. Se uma skill ausente for
necessária, explicar sua finalidade e solicitar instalação antes de depender dela.
A organização documental de 08/10 não constitui auditoria visual ou aceite de redesign.

## Entrega antes de implementar

Uma proposta curta deve conter:

1. Diagnóstico do estado atual com referências ao repositório e limites de validação.
2. Problemas e oportunidades concretos, distinguindo hipótese de fato observado.
3. Evolução proposta para Hoje e Pacientes, preservando partes úteis existentes.
4. Estratégia de IA para dados/documentos e alternativas sem LLM.
5. Sequência priorizada de vertical slices integrando médico e paciente.
6. Método de desenvolvimento e testes proporcional ao risco.
7. Primeiro slice recomendado, com motivo e dependências.

Registrar a proposta nos documentos vigentes ou em um único contrato específico
quando necessário; não criar outra cópia do roadmap. Implementar só após validar
essa proposta, respeitando autorizações já dadas no mesmo escopo.

## Contrato mínimo de cada vertical slice

| Campo | Conteúdo esperado |
| --- | --- |
| Valor | Resultado perceptível para paciente e/ou médico. |
| Escopo | Jornada completa e limites; o que já existe e será reutilizado. |
| Dependências e riscos | Dados, permissões, integrações, decisões pendentes e reversão. |
| Conclusão objetiva | Comportamento observável, estado persistido e origem da informação. |
| Validação | Casos relevantes, ambiente, perfis, evidência e limites do aceite. |

Trabalhar um slice delimitado por vez. C2/C3 e IA1–IA6 mantêm seus códigos,
dependências e critérios; este método não renumera o trabalho existente.

## Desenvolvimento e testes proporcionais

| Mudança | Durante o desenvolvimento | No fechamento |
| --- | --- | --- |
| Documentação | Conferir referências, coerência de estados, histórico preservado e diff. | Links locais e `git diff --check`; não rodar aplicação ou E2E só por MD. |
| Texto/layout sem regra nova | Verificar a superfície alterada, teclado e larguras relevantes. | Uma rodada visual agrupada; ampliar se houver impacto em navegação/fluxo. |
| Regra, cálculo ou contrato | Testes dirigidos, incluindo limites, dados ausentes e erros. | Integração dos caminhos afetados; tipo/lint/build conforme o lote. |
| Permissão, persistência ou dado clínico | Testes de negação, clínica/vínculo, idempotência, versionamento e preservação do original conforme a mudança. | Fluxo integrado nos perfis relevantes, recarga/persistência e falhas; E2E quando o risco exigir. |
| Slice completo ou mudança crítica | Verificações direcionadas enquanto houver edição. | Suíte adequada, integração e E2E dos fluxos afetados; cumprir checks obrigatórios do CI/release. |

Não repetir suíte completa depois de cada pequena alteração. Repetir uma
verificação quando mudanças, falhas ou risco ainda aberto justificarem. Não
reduzir proteção dos dados para economizar tokens. Para publicar, cumprir o
[guia operacional](GUIA_OPERACIONAL_CODEX.md) e os checks existentes.

## Registrar o resultado

Atualizar [status](STATUS_ATUAL.md) com evidência curta e seus limites, e
[direção](DIRECAO_E_SLICES.md) quando houver decisão. Reconciliar a tarefa
correspondente no Asana após decisão nova. Guardar detalhes de validação/release
no registro específico e apenas vinculá-los nos resumos. Separar desenvolvimento,
teste sintético, publicação técnica e aceite clínico; o [Gate P](GATE_P.md)
continua obrigatório antes de dados reais.
