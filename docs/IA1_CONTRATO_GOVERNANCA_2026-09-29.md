# IA1 — contrato de finalidade, governança e segurança

**Status:** rascunho para decisão, 29/09/2026. Este documento não autoriza implementação, uso de dados reais, uso clínico, promessa comercial nem publicação ao paciente.

## Como ler os estados

- **Requisito vigente:** limite já estabelecido pela direção atual do Vivance ou pelo Gate P.
- **Proposta IA1:** contrato sugerido abaixo; só vira requisito aprovado após aceite explícito dos responsáveis indicados.
- **Decisão aberta:** ponto que precisa de parecer ou escolha antes de qualquer piloto clínico.

## 1. Finalidade pretendida

### Requisitos vigentes

O Vivance organiza o cuidado longitudinal e preserva relato, documento e medida originais. O médico decide interpretação e conduta. Nenhuma análise clínica por IA está ativa. IA1 é trabalho documental e de governança: **não gera conclusões clínicas**. Dados reais de saúde dependem do fechamento explícito do Gate P.

### Proposta IA1

A finalidade futura e limitada da IA é preparar material conferível para o médico: extrair dados de documentos, organizar fatos, executar somente cálculos determinísticos validados, comparar dados com referências claramente identificadas e montar um rascunho citado para revisão. A IA atua como apoio à revisão profissional, nunca como autora da decisão clínica.

**Usuário pretendido:** médico autorizado e vinculado ao paciente. Equipe assistencial só acessa o que seu papel e vínculo permitirem. O paciente recebe apenas conteúdo aprovado por médico e publicado em ação separada.

**Contexto inicial:** piloto restrito, com poucos exames e dados sintéticos ou casos anonimizados previamente revisados. A população, exclusões e fontes de cada tema precisam ser aprovadas antes de incluí-lo.

## 2. Saídas permitidas e proibidas

### Saídas permitidas propostas para fases posteriores

Durante IA1, nenhuma destas saídas será produzida no produto. O contrato permite avaliá-las somente após os gates correspondentes:

1. `transcricao_extraida`: valor, unidade, intervalo do laboratório, método e data, ligados ao arquivo, página e posição; incerteza vira `necessita_conferencia`.
2. `comparacao_objetiva`: comparação explícita com o intervalo do próprio laudo ou com critério de uma fonte aprovada, mantendo esses dois referenciais separados.
3. `calculo_deterministico`: resultado de função programada e validada, com fórmula, entradas, versão, população aplicável e limitações.
4. `cartao_de_evidencia`: fato ou afirmação de rascunho, trecho exato da fonte, versão, população, aplicabilidade, limitações e estado de revisão.
5. `ponto_para_avaliacao_medica`: pergunta ou hipótese condicional, identificada como tal, sustentada por evidência aplicável e visível somente ao profissional.
6. `rascunho_medico_citado`: composição das saídas anteriores para revisão; nunca equivale a diagnóstico, conduta, aprovação ou publicação.
7. `recusa_segura`: uma das mensagens controladas abaixo, sem completar lacunas:
   - `Dado precisa ser conferido no documento original.`
   - `Não foi encontrada recomendação aplicável nas fontes autorizadas.`
   - `Não há informação suficiente para concluir.`
   - `Necessária avaliação médica.`

Cada saída deve declarar se é **fato**, **comparação objetiva**, **inferência**, **evidência**, **limitação** ou **ponto para avaliação**.

### Saídas proibidas — requisito vigente

A IA não pode:

- diagnosticar, confirmar ou excluir diagnóstico, inclusive por probabilidade ou classificação apresentada como conclusão;
- escolher tratamento, prescrever, ajustar medicamento, dose ou meta individual;
- determinar urgência, triagem, risco clínico ou conduta;
- responder diretamente ao paciente com interpretação clínica ou publicar automaticamente;
- inventar, completar, normalizar silenciosamente ou ocultar dado, unidade, identidade, data, método ou referência ausente/divergente;
- tratar intervalo do laboratório, critério diagnóstico, meta terapêutica e código LOINC como equivalentes;
- calcular livremente por modelo de linguagem;
- usar busca livre na web, blog, conteúdo comercial ou fonte ainda não aprovada para sustentar saída clínica;
- misturar dados entre pacientes, clínicas, documentos ou versões;
- substituir o original ou apagar correção, rejeição, conflito entre fontes e histórico de revisão;
- apresentar desempenho clínico, conformidade regulatória ou segurança como comprovados antes das validações e pareceres correspondentes.

## 3. Proveniência e política de fontes

### Requisitos vigentes

- O arquivo original permanece privado e imutável, sem URL pública permanente e com acesso por vínculo autorizado.
- Dados brutos, correções humanas e derivados ficam separados.
- Cada saída precisa voltar ao documento e ao trecho que a originou.
- O intervalo do próprio laudo tem precedência como referência laboratorial; critério de guideline e meta individual ficam em campos distintos.
- Busca livre na web não participa da geração clínica.

### Proposta IA1

Cada observação deve registrar, no mínimo: paciente e clínica; identificador e hash do documento; versão; página e posição; trecho literal; autor ou processo de extração; data; nível de confiança; estado de conferência; correções humanas; e ligação para todo derivado.

Cada fonte clínica deve registrar: entidade, título, versão/ano, URL ou DOI, trecho e página, população, exclusões, vigência, força da recomendação quando disponível, revisor, data da revisão e estado `vigente`, `em_revisao` ou `substituida`. A retirada bloqueia novos usos e preserva o histórico.

A biblioteca começa por fontes brasileiras aplicáveis aprovadas pela direção médica; fonte internacional reconhecida só entra quando não houver fonte nacional adequada e após avaliação de população e contexto. PubMed pode localizar estudos, mas não aprova qualidade. Sociedade médica, diretriz, revisão sistemática ou artigo só entram após curadoria explícita.

Modelo, fornecedor, prompt, regra, cálculo, biblioteca e política de recusa são versionados. Uma saída reproduzível aponta para as versões efetivamente usadas.

## 4. Revisão médica e gate de publicação

### Requisitos vigentes

Aprovação médica e publicação são atos separados. Rascunho ou hipótese não fica visível ao paciente sem ação médica autorizada. Gate P, publicação técnica e aceite clínico são marcos diferentes.

### Proposta IA1

Fluxo controlado: `extraido → conferido → rascunho_ia → verificado → revisao_medica → aprovado_medico → publicado`. `necessita_conferencia`, `rejeitado`, `retirado` e `nova_versao` interrompem ou reiniciam o fluxo sem sobrescrever o histórico.

Para chegar a `publicado`, todos os itens abaixo devem estar presentes:

1. original e proveniência navegáveis;
2. identidade, data, unidade, método e referência conferidos;
3. cada afirmação sustentada por fonte vigente e aplicável;
4. verificação independente concluída;
5. limitações, conflitos e dados ausentes visíveis;
6. aprovação explícita do médico identificado, com data e versão;
7. ação de publicação distinta, autorizada e auditada.

Qualquer alteração de dado, fonte, regra, modelo ou texto após aprovação cria nova versão e exige nova revisão. IA não pode reaproveitar a aprovação anterior.

**Gate de liberação clínica proposto:** Gate P fechado + IA1 aprovado + IA2–IA5 aceitos + IA6 concluído com limites de desempenho definidos pela direção médica + parecer regulatório aplicável + decisão formal de liberar. Falha ou ausência de qualquer item mantém o fallback manual.

## 5. Decisões abertas

| Decisão | Evidência exigida | Dono da decisão |
| --- | --- | --- |
| Redação final da finalidade pretendida, usuários, população, exclusões e alegações | especificação assinada e exemplos de uso permitido/proibido | Direção médica (Guilherme) + Produto |
| Se a finalidade enquadra o Vivance como SaMD e qual classe/regime se aplica | parecer regulatório específico antes de promessa comercial ou habilitação clínica | Assessoria regulatória, com Jurídico e Direção médica |
| Base legal, transparência ao titular e eventual consentimento para cada tratamento | registro de tratamento e avaliação LGPD; política e textos aprovados | Controlador/gestão + Privacidade/DPO + Jurídico |
| Necessidade e escopo de RIPD/DPIA | avaliação documentada de risco e mitigação | Privacidade/DPO + Segurança |
| Fornecedor/modelo permitido | avaliação técnica, clínica, segurança, privacidade e contrato | Gestão/Compras + Engenharia/Segurança + Privacidade + Direção médica |
| Dados autorizados para envio | matriz de campos, finalidade, minimização e ambiente; dados reais continuam proibidos até Gate P e decisão específica | Privacidade/DPO + Direção médica + Segurança |
| Região de processamento, transferências, suboperadores e acesso do fornecedor | lista contratual e fluxo de dados verificado | Privacidade/DPO + Jurídico + Segurança |
| Retenção, exclusão, logs e uso para treinamento | prazos, método de exclusão, cláusula de não treinamento sem autorização e auditoria | Privacidade/DPO + Segurança + Jurídico |
| Resposta a incidente, suspensão e retirada de versão | runbook, responsáveis, comunicação e teste de mesa | Segurança + Operações + Direção médica + Privacidade/DPO |
| Fontes iniciais, populações, revisão e retirada | catálogo inicial assinado, ciclo de revisão e responsáveis substitutos | Direção médica (Guilherme) |
| Métricas e limites para IA2–IA6 | conjunto de referência, limiares, falsos alarmes, omissões, recusas e regra de parada | Direção médica + Engenharia/Produto |

O parecer regulatório deve considerar a finalidade pretendida e as funções efetivas. A Resolução CFM nº 2.454/2026 disciplina o uso responsável de IA na medicina. A RDC Anvisa nº 657/2022 e a orientação oficial sobre SaMD tornam a indicação/finalidade de uso central para o enquadramento. Estas referências não constituem parecer sobre o Vivance:

- CFM: <https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2026/2454_2026.pdf>
- Anvisa: <https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/produtos-para-a-saude/manuais/software-como-dispositivo-medico-perguntas-e-respostas>

## 6. Critérios de aceite de IA1

IA1 está aceito somente quando houver evidência documental de que:

- finalidade, usuários, população, exclusões, saídas permitidas e proibições receberam aprovação explícita da Direção médica, Produto, Engenharia e Privacidade;
- assessoria regulatória registrou o enquadramento ou a justificativa formal para não enquadramento, com condições para reavaliação;
- fornecedor, modelo, suboperadores, regiões, transferências, retenção, exclusão, logs, treinamento e resposta a incidente foram decididos e contratualmente verificáveis;
- o fluxo de dados e a matriz de acesso demonstram minimização, isolamento por paciente/clínica, RLS/Storage privado, auditoria sem texto clínico desnecessário e revogação;
- o esquema de proveniência permite navegar de cada campo e afirmação ao original, página/posição, fonte e versões usadas;
- a biblioteca inicial tem fonte, trecho, população, vigência, revisor e processo de retirada aprovados;
- casos de teste cobrem todas as saídas permitidas, proibições, recusas, ambiguidade, conflito de fonte, paciente errado e tentativa de publicação sem aprovação;
- revisão médica e publicação permanecem ações separadas, auditadas e negadas para rascunho, hipótese ou item sem evidência;
- não houve envio de dado real a modelo; os testes de IA1 usam somente material sintético;
- riscos residuais, responsáveis, prazo de revisão e decisão `liberar` ou `não liberar o próximo slice` foram registrados.

Enquanto qualquer decisão aberta impedir avaliação segura, o resultado de IA1 é **não liberar IA2 com dados reais nem habilitar saída clínica**.

## 7. Registro de aprovação

| Papel | Responsável nominal | Decisão | Data/versão |
| --- | --- | --- | --- |
| Direção médica | Guilherme | pendente | — |
| Produto | a definir | pendente | — |
| Engenharia/Segurança | a definir | pendente | — |
| Privacidade/DPO | a definir | pendente | — |
| Jurídico/Regulatório | a definir | pendente | — |
| Gestão/Operações | a definir | pendente | — |

Sem o registro acima, todo conteúdo marcado como **Proposta IA1** continua sendo rascunho.
