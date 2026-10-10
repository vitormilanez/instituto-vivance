# IA clínica controlada — plano separado

Atualizado em 28/09/2026 a partir da direção clínica apresentada por Dr. Guilherme Martins. Este documento planeja uma capacidade futura; **nenhuma análise clínica por IA está ativa**. A direção geral está em [Direção e slices](DIRECAO_E_SLICES.md).

## Estado da implementação

Consolidação documental de 08/10/2026: o [piloto IA2](IA2_EXAMES.md) já tem
fila e extração de texto validadas com PDF fictício no Preview do PR #78; segue
fora da main. Resultados estruturados, Claude/OCR e aceite clínico permanecem
pendentes. O [briefing integrado](BRIEFING_CONSULTA_2026-10-07.md) usa fallback
determinístico, com IA desligada na última conferência. Este plano descreve
capacidades futuras; não deve ser lido como inventário da main ou do Preview.

## Objetivo e limite

A IA ajuda o médico a localizar, organizar e confrontar dados de exames com fontes autorizadas. Ela não comunica diagnósticos, escolhe tratamento, prescreve, determina urgência nem publica conclusões ao paciente. O médico pode corrigir, rejeitar ou aprovar uma análise preliminar; aprovação e publicação são atos diferentes. Falta de dado ou evidência permanece visível.

## Pipeline obrigatório

`Documento original → extração sem interpretação → validação de identidade, data, unidade e referência → normalização/cálculo determinístico → busca em biblioteca aprovada → rascunho com evidências → verificação independente → revisão médica → publicação explícita, se cabível`

| Etapa | Contrato e falha segura |
| --- | --- |
| Origem | Arquivo privado e imutável, hash, paciente/clínica, página e posição do trecho; acesso por vínculo autorizado. Sem URL pública permanente. |
| Extração | Valor, unidade, intervalo do próprio laboratório, método e data em campos distintos, ligados ao texto original. OCR duvidoso vira `necessita_conferencia`. |
| Validação | Conferir paciente, duplicatas, unidade, método, intervalo e cronologia. Registrar código LOINC quando aplicável, sem usá-lo como intervalo universal. Divergência não é corrigida silenciosamente. |
| Biblioteca | Somente fontes aprovadas pela direção médica, com entidade, título, versão, ano, link/DOI, trecho/página, população, vigência, força da recomendação quando disponível, revisor e estado. Busca livre na web não participa da geração clínica. |
| Interpretação | Separar **fato**, **comparação objetiva**, **inferência**, **evidência**, **limitação** e **ponto para avaliação**. Intervalo laboratorial, critério de guideline e meta individual não são intercambiáveis. |
| Verificação | Processo independente confirma trecho, versão, aplicabilidade e suporte de cada afirmação, considerando idade, sexo, gestação, medicamentos e comorbidades quando relevantes. Afirmação sem sustentação é removida; conflito entre fontes aparece ao médico. |
| Saída | Cartão de evidência liga valor/página, afirmação, fonte/trecho, contexto, limitações e estado de revisão. Relatório identifica partes produzidas com IA, dados ausentes, versões, regra/modelo, correções e nome do médico que aprovou. |

Cálculos como IMC e função renal estimada usam funções programadas e validadas, com fórmula, variáveis, versão, população aplicável e limitações. O modelo de linguagem não calcula livremente.

## Curadoria das fontes

Prioridade editorial: diretrizes e protocolos brasileiros aplicáveis (Ministério da Saúde, Conitec, Anvisa, CFM e sociedades médicas da especialidade); se não houver fonte nacional adequada, diretrizes internacionais reconhecidas; literatura complementar indexada, revisões sistemáticas e meta-análises avaliadas por desenho, qualidade e população. PubMed é índice de pesquisa, não selo automático de qualidade. Blogs e conteúdo comercial não entram na biblioteca clínica.

Cada conceito tem população, critério, exclusões, fonte principal, trecho/página, ano/versão, força da recomendação, revisor, última revisão e estado `vigente`, `em_revisao` ou `substituida`. Cada exame tem nome, sinônimos, código LOINC quando aplicável, unidades, método e interferências relevantes. O intervalo de referência vem primeiro do próprio laudo; referência secundária aprovada só aparece quando ele faltar e fica identificada como tal. Critério diagnóstico de diretriz e meta terapêutica definida pelo médico permanecem campos distintos.

## Encaixe na arquitetura atual

**Reutilizar:** `patient_documents` e Storage privado, revisão documental humana, `processing_jobs`, papéis/vínculos/RLS e relatórios manuais com versões, aprovação e publicação. **Construir:** observações com proveniência por página, worker operacional, catálogo clínico aprovado, índice de trechos versionados, regras/cálculos, verificador independente, trilha de geração e revisão por afirmação. A existência de `processing_jobs` não comprova processamento ativo.

Dados brutos, correções humanas e derivados ficam em registros distintos. Cada referência aponta para versões imutáveis da fonte e do documento. Retirar uma diretriz impede novas análises com ela, preservando a proveniência histórica. Mudanças de modelo, prompt, regra ou fonte são versionadas e avaliadas.

## Slices e gates

1. **IA1 — finalidade e segurança:** avaliação preliminar de risco, parecer regulatório sobre finalidade, política de dados/fornecedor, proveniência e critérios de aprovação. Aceite: arquitetura revisada por médico, privacidade e engenharia; sem dados reais enviados a modelo.
2. **IA2 — extração verificável:** piloto pequeno de exames metabólicos/hormonais com arquivo e página navegáveis, unidade e intervalo do laudo. Aceite: precisão e taxa de `necessita_conferencia` medidas em conjunto de referência; leitura incerta não entra na análise.
3. **IA3 — biblioteca controlada:** poucas diretrizes aprovadas, com trecho exato, contexto e ciclo de revisão/retirada. Aceite: busca retorna somente versões vigentes e permite conferir o original.
4. **IA4 — análise fundamentada:** fatos e comparação objetiva primeiro; hipóteses condicionais apenas com evidência aplicável. Aceite: sem fonte, contexto ou unidade confiável, a afirmação clínica não aparece. Fórmulas têm testes independentes.
5. **IA5 — verificação e revisão médica:** verificador por afirmação, interface de aceitar/corrigir/rejeitar, registro do uso de IA, aprovação e publicação separadas. Aceite: paciente não lê rascunho ou hipótese sem ação médica autorizada.
6. **IA6 — validação clínica e operação:** casos anonimizados com resposta médica de referência, medição de extração, unidades, citações, omissões, falsos alarmes e recusas; monitoramento e incidente. Direção médica define limites de aprovação antes do teste.

O piloto começa com poucos exames. A proposta de 80–120 exames e diversos domínios é expansão posterior, condicionada a desempenho e curadoria.

**Sequência editorial sugerida por Guilherme:** começar por obesidade, diabetes/pré-diabetes, dislipidemia, tireoide e segurança de GLP-1; ampliar, após validação, para fígado, rim/eletrólitos, anemia e micronutrientes, metabolismo ósseo, saúde hormonal masculina e feminina, SOP, composição corporal, nutrição e exercício. Cada tema precisa de população, exclusões e fontes próprias antes de entrar na busca.

## Regras de não resposta

- `Dado precisa ser conferido no documento original.` para OCR, identidade, unidade ou referência ambígua.
- `Não foi encontrada recomendação aplicável nas fontes autorizadas.` quando a biblioteca não cobre o contexto.
- `Não há informação suficiente para concluir.` quando faltam fatores essenciais.
- `Necessária avaliação médica.` para decisão que exige julgamento profissional.

## Governança e liberação

O [Gate P](GATE_P.md) continua obrigatório antes de dados de saúde reais. IA requer ainda avaliação da finalidade pretendida e possível enquadramento como SaMD, supervisão médica, informação ao paciente quando o uso for relevante, registro e auditoria. A [Resolução CFM nº 2.454/2026](https://sistemas.cfm.org.br/normas/visualizar/resolucoes/BR/2026/2454) está vigente; a [orientação da Anvisa sobre RDC 657/2022](https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/produtos-para-a-saude/manuais/software-como-dispositivo-medico-perguntas-e-respostas) vincula o enquadramento à finalidade de uso. O parecer específico do Vivance deve anteceder promessa comercial ou habilitação clínica.

Dados de demonstração exercitam telas e permissões; não medem desempenho clínico. O piloto exige casos anonimizados e respostas previamente revisadas por médicos.
