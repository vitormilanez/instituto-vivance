# Exames consolidados para o médico — contrato de produto

**Estado:** direção de produto proposta pelo usuário em 03/10/2026; análise de formatos concluída; implementação e aceite pendentes. Este contrato não libera análise clínica por IA nem uso de dados reais em modelos.

## Resultado esperado

Na ficha do paciente, o médico encontra uma visão única de todos os exames recebidos: o que chegou, quando foi realizado, quais resultados foram extraídos, o que o próprio laudo assinala, quais dados exigem conferência e onde está cada evidência no original. A visão reduz a abertura sequencial de arquivos sem esconder o documento-fonte. O médico continua responsável por interpretação e conduta.

## Evidência de entrada examinada

Cinco PDFs fornecidos pelo usuário foram inspecionados **localmente**, somente para estudar formatos; nenhum arquivo, dado pessoal, resultado ou trecho clínico é incorporado ao repositório ou enviado a fornecedor. O conjunto possui 31 páginas:

| Formato observado | Implicação para o produto |
| --- | --- |
| Um PDF de três páginas reúne dois laudos de imagem; duas páginas repetem o mesmo laudo. | Um arquivo pode conter mais de um exame; páginas repetidas não devem criar resultados duplicados. |
| Três PDFs de uma página trazem procedimentos e anatomopatologia em narrativa. | Conclusões do emissor devem aparecer como trechos atribuídos ao laudo, sem virar diagnóstico elaborado pela IA. Um documento pode mencionar etapa complementar pendente. |
| Um PDF laboratorial de 25 páginas reúne múltiplos painéis e dezenas de resultados. | Cada resultado precisa de página e trecho próprios. Intervalos podem depender de idade, sexo, jejum, risco ou método; alguns dizem apenas “vide nota”. |

As datas de coleta, realização, emissão e upload são campos diferentes. Os PDFs também contêm notas metodológicas e avisos de comparabilidade que não podem desaparecer no resumo.

## Modelo de recebimento

1. Preservar cada arquivo original no Storage privado, com hash, tamanho, tipo, remetente, paciente, clínica, data de upload e versão. O processamento só começa quando o arquivo estiver disponível e o vínculo autorizado for confirmado.
2. Criar uma tarefa idempotente por versão do arquivo. Registrar estados **recebido → em processamento → extraído → requer conferência → revisado**, incluindo falha e reprocessamento visíveis; nenhuma falha deve fazer um arquivo desaparecer da contagem.
3. Segmentar o arquivo em **laudos** e o laudo em **observações**. Um PDF pode conter vários laudos; um laudo pode conter vários resultados. Detectar páginas repetidas e versões semelhantes sem apagar originais.
4. Classificar cada laudo como **laboratório quantitativo**, **imagem**, **procedimento/endoscopia**, **anatomopatologia** ou **outro/indefinido**. Classificação incerta permanece para conferência.
5. Para resultado numérico, guardar nome literal, valor literal, valor estruturado quando seguro, unidade, intervalo ou nota do laboratório, método, material, data de coleta, marcador do laboratório, página, posição/trecho e confiança. Conservar resultado percentual e absoluto como observações distintas quando ambos existirem.
6. Para laudo narrativo, guardar tipo, região/material, data, descrição, **impressão ou conclusão literalmente atribuída ao emissor**, limitações e componentes pendentes; nunca converter o texto em nova afirmação clínica.
7. Conferir identidade, data, unidade, método e coerência do intervalo antes de exibir comparação. Não selecionar automaticamente entre referências condicionais nem comparar séries com métodos incompatíveis. Correções médicas ficam versionadas separadamente da extração e do arquivo.

O índice de observações é estruturado e consultável por paciente e clínica. RAG de diretrizes e MCP são integrações futuras; não são necessários para receber e organizar estes exames.

## Aba do médico

A aba atual **Documentos** passa a oferecer uma visão de **Exames** para arquivos classificados como exame, mantendo os demais documentos e os originais acessíveis. Não adicionar outro nível de cartões dentro dos cartões do prontuário.

### Ordem da tela

1. **Cabeçalho compacto:** período selecionado, número de arquivos, número de laudos, quantidade extraída, quantidade a conferir e último recebimento. Contagens distinguem arquivo, laudo e observação.
2. **A conferir:** identidade/data divergente, texto ilegível, unidade ou referência ambígua, possível duplicação, componente pendente e processamento falho. É uma fila de qualidade de dados, sem classificação automática de urgência clínica.
3. **Resultados laboratoriais:** grupos revisados com Guilherme (por exemplo, hemograma, metabolismo glicêmico, lipídios, função renal/hepática e tireoide). Cada linha mostra exame, resultado, unidade, intervalo **do próprio laudo**, data de coleta, marcador emitido pelo laboratório, estado de conferência e link “Ver no laudo”. O grupo pode ser expandido para todos os resultados; a visão inicial mostra os que o laboratório marcou fora do intervalo e os que exigem conferência, sem esconder os demais.
4. **Laudos narrativos:** lista cronológica de imagem, procedimentos e anatomopatologia. Mostrar título compreensível, data, emissor, trecho de impressão/conclusão com rótulo “Texto do laudo”, limitações, pendências e “Ver página”. Não forçar esses laudos para uma tabela de biomarcadores.
5. **Arquivos originais:** lista compacta com nome original, tipo, páginas, data de upload e estado do processamento. Um arquivo com dois laudos mantém um original e dois itens de laudo.

Filtros de período, tipo e estado ficam acima das listas; busca por nome de exame encontra tanto o nome literal quanto sinônimos de um catálogo controlado. “Ver no laudo” abre o original na página relevante, idealmente em painel lateral, para conferência sem perder o contexto da lista. Sem posição confiável, abrir a página sem fingir destaque de trecho.

O médico pode confirmar, corrigir ou rejeitar **cada observação** e registrar nota de revisão. A extração interna não é publicada automaticamente ao paciente. Revisão do documento, aprovação de conteúdo clínico e publicação continuam ações separadas.

## Regras de apresentação

- “Acima/abaixo do intervalo” significa apenas comparação com o intervalo **explicitamente aplicável no próprio laudo**; não significa diagnóstico, risco ou prioridade de atendimento.
- Intervalo laboratorial, critério diagnóstico e meta individual nunca compartilham um mesmo campo ou cor.
- Valor ausente, ilegível, condicional ou conflitante aparece como **“Conferir no original”**. Mostrar o trecho literal e a razão da dúvida.
- Em série histórica, comparar somente resultados do mesmo conceito, com unidade e método compatíveis; mudanças de método ficam sinalizadas. Nenhuma linha é retrodatada pelo upload.
- Trechos narrativos preservam autoria: “O laudo informa…”, com página. Não resumir uma conclusão de patologia/imagem como decisão do Vivance.
- A interface não apresenta porcentagem de precisão ao médico como substituto de conferência; confiança serve para fila interna de qualidade.

## Primeiro incremento verificável

**IA2-A — ingestão e extração conferível, com material sintético:** worker assíncrono; contrato de dados; processamento por versão; segmentação de laudos; extração de resultados e trechos; proveniência por página; estados de erro; testes de permissão e idempotência. O `processing_jobs` existente é apenas fundação: o tipo de tarefa de exame, o worker e a persistência de observações ainda precisam ser construídos em migrations novas.

**IA2-B — tela consolidada do médico:** lista completa, grupos laboratoriais e narrativos, fila de conferência, original na página, correção/rejeição e trilha de revisão. Criar exemplos sintéticos que reproduzam os cinco formatos observados, sem copiar o conteúdo pessoal. Usar sessão real de médico no ambiente sintético; testar também negação de acesso por vínculo/paciente.

### Critérios de aceite

- Todos os arquivos disponíveis do paciente entram na contagem; paginação da lista atual não limita o processamento.
- Um arquivo com dois laudos e página repetida produz dois laudos e nenhuma observação duplicada.
- Um painel extenso não perde páginas silenciosamente: itens processados, incertos e falhos têm contagens reconciliáveis.
- Resultado mostrado liga arquivo, página e trecho; clique abre o original autorizado.
- Nota de referência condicional ou mudança de método impede comparação automática até conferência.
- Laudo narrativo aparece com conclusão atribuída ao emissor e pendência explícita, quando houver.
- Correção humana cria versão auditável; reprocessamento não apaga correção nem publica conteúdo.
- Médico sem vínculo e paciente não acessam observações internas de outro paciente.
- A tela funciona com arquivos não processados e com IA indisponível: mantém a lista e os originais manuais.
- A direção médica revisa a organização e mede cobertura, extração incorreta, omissão e taxa de conferência em um conjunto sintético conhecido.

## Dependências e limites

O contrato IA1 de finalidade, fornecedor, privacidade e saídas permitidas segue em revisão no PR #64. A construção técnica com dados sintéticos pode preparar o fluxo; seleção de fornecedor, envio de dados reais e uso assistencial seguem os gates aprovados. O Gate P permanece obrigatório antes de dados de saúde reais. Este incremento não inclui RAG de diretrizes, diagnóstico, prescrição, triagem, resposta automática ao paciente ou publicação automática.
