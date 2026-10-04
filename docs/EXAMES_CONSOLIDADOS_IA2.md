# Exames consolidados para o médico — contrato de produto

**Estado:** direção de produto proposta pelo usuário em 03/10/2026; análise de formatos concluída; migration IA2 aplicada no projeto de teste em 04/10; código do primeiro corte em revisão no PR #78; aceite pendente. Este contrato não libera análise clínica por IA nem uso de dados reais em modelos.

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

## Persistência do original, texto e custo de IA

| Camada | Onde fica | Situação |
| --- | --- | --- |
| Arquivo original (PDF ou imagem) | Bucket privado `vivance-documents` no Supabase Storage, referenciado por `patient_documents.storage_path`. | O fluxo de documentos já existe. O binário não precisa ser duplicado como BLOB no PostgreSQL. |
| Metadados e vínculo | `patient_documents`: clínica, paciente, remetente, nome, MIME, tamanho, categoria, visibilidade e estado. | Já existe; hash do conteúdo, versão e reconciliação por página exigem evolução versionada do schema. |
| Texto extraído | Nova persistência privada, por documento, versão, página e execução de extração, com texto, método, estado e proveniência. | Implementada localmente no PR #78; migration remota pendente. Não substituir o PDF original nem expor texto bruto em listagens públicas ou logs. |
| Laudos e observações | Novas entidades vinculadas à página e ao trecho do texto, com valores literais, unidades e notas do emissor. | A construir; toda interpretação e correção humana ficam em versões próprias e auditáveis. |

O recebimento confirma a gravação do original antes de criar a tarefa de extração. O worker extrai o texto localmente quando o PDF permite; aplica OCR apenas às páginas sem texto legível; usa Claude apenas na etapa delimitada de estruturação, com contexto mínimo necessário e saída verificável. Páginas incertas podem exigir leitura visual ou revisão humana. Registrar versão do extrator, versão do prompt/modelo, consumo de tokens e falhas por execução, sem registrar conteúdo clínico em telemetria. Identificar o arquivo por hash para evitar cobrança e observações duplicadas no reprocessamento; mudança de versão gera nova execução sem apagar original ou revisão médica.

Abrir a aba do médico lê dados persistidos e **não chama o modelo**. O texto serve à busca e à conferência de cobertura; só as observações validadas entram na visão clínica. Definir retenção e acesso ao texto no IA1, com as mesmas restrições de paciente, clínica e papel dos originais. Nenhum dos cinco PDFs pessoais usados na avaliação foi importado para o ambiente temporário `instituto-vivance-dev`; importação de dados reais depende do Gate P e da decisão de fornecedor/privacidade do IA1.

## Modelo de recebimento

1. Preservar cada arquivo original no Storage privado, com hash, tamanho, tipo, remetente, paciente, clínica, data de upload e versão. O processamento só começa quando o arquivo estiver disponível e o vínculo autorizado for confirmado.
2. Criar uma tarefa idempotente por versão do arquivo. Registrar estados **recebido → em processamento → extraído → requer conferência → revisado**, incluindo falha e reprocessamento visíveis; nenhuma falha deve fazer um arquivo desaparecer da contagem.
3. Segmentar o arquivo em **laudos** e o laudo em **observações**. Um PDF pode conter vários laudos; um laudo pode conter vários resultados. Detectar páginas repetidas e versões semelhantes sem apagar originais.
4. Classificar cada laudo como **laboratório quantitativo**, **imagem**, **procedimento/endoscopia**, **anatomopatologia** ou **outro/indefinido**. Classificação incerta permanece para conferência.
5. Para resultado numérico, guardar nome literal, valor literal, valor estruturado quando seguro, unidade, intervalo ou nota do laboratório, método, material, data de coleta, marcador do laboratório, página, posição/trecho e confiança. Conservar resultado percentual e absoluto como observações distintas quando ambos existirem.
6. Para laudo narrativo, guardar tipo, região/material, data, descrição, **impressão ou conclusão literalmente atribuída ao emissor**, limitações e componentes pendentes; nunca converter o texto em nova afirmação clínica.
7. Conferir identidade, data, unidade, método e coerência do intervalo antes de exibir comparação. Não selecionar automaticamente entre referências condicionais nem comparar séries com métodos incompatíveis. Correções médicas ficam versionadas separadamente da extração e do arquivo.

O índice de observações é estruturado e consultável por paciente e clínica. RAG de diretrizes e MCP são integrações futuras; não são necessários para receber e organizar estes exames.

## Experiência de envio pelo paciente

Manter o envio múltiplo já existente, com nome original, tipo, tamanho, estado e erro por arquivo. O paciente não precisa conhecer o nome de cada analito nem separar um PDF de muitos painéis: envia o arquivo uma vez e recebe confirmação individual de recebimento. Nome do exame e data de realização podem ser sugeridos a partir do laudo, mas dados incertos não são gravados como fatos sem conferência. Não exigir que o paciente escolha um grupo clínico.

O documento conserva a categoria escolhida no envio, mas o processamento examina o conteúdo elegível: um exame marcado equivocadamente como “documento clínico” deve aparecer para classificação/conferência, sem omissão silenciosa. Arquivo sem página, ilegível, repetido ou potencialmente de outro paciente mantém um estado explícito para a equipe; não é descartado automaticamente. O paciente vê o recebimento e o estado técnico do arquivo, sem receber interpretação gerada pela IA.

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

**IA2-A — ingestão e extração conferível, com material sintético:** worker assíncrono; contrato de dados; processamento por versão; segmentação de laudos; extração de resultados e trechos; proveniência por página; estados de erro; testes de permissão e idempotência. A fila de extração e a persistência do texto por página já têm migrations; segmentação, observações estruturadas e revisão por resultado ainda não existem.

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

## Primeiro corte implementado para revisão — 03/10/2026

O PR #78 agora inclui uma migration **ainda não aplicada ao projeto remoto** para execuções imutáveis por documento/hash/versão e texto por página, com RLS de equipe vinculada, gravação atômica por RPC médica e falha de leitura persistida. O parser local de PDF preserva número da página, marca página sem texto para conferência e não envia dados a modelo. Uma rota autenticada permite ao médico acionar a extração e consultar o texto; na ficha, páginas aparecem recolhidas e ligadas ao original. A rota de escrita só habilita IDs sintéticos explicitamente listados em `VIVANCE_SYNTHETIC_EXAM_DOCUMENT_IDS`, com `VIVANCE_EXAM_TEXT_PILOT=synthetic`, em desenvolvimento local ou Preview; a execução em produção fica bloqueada.

Na continuação local, a própria RPC passou a exigir uma segunda autorização: o documento sintético deve constar na tabela privada `synthetic_exam_pilot_documents`, inicialmente vazia e sem escrita pela Data API. Assim, a restrição não depende apenas da rota Next.js. A ficha médica também recebeu um inventário que percorre todos os arquivos disponíveis, mostra os estados de extração e uma fila recolhida dos arquivos a conferir, inclusive documentos classificados fora de `exam`. Esse inventário não é ainda a tela final de resultados e laudos. A migration ainda não foi aplicada no projeto remoto e nenhum documento foi incluído na lista privada.

No slice de 04/10, o PDF de três páginas fornecido pelo usuário serviu como referência **local** para o problema de repetição. As duas primeiras páginas não têm o mesmo hash, apesar de terem texto quase idêntico; a única diferença observada foi um dígito. O extrator agora marca a segunda página como `requires_review` com `possible_duplicate_of_page = 1`, preservando ambos os textos e o original. Essa heurística é apenas um sinal de qualidade: o dígito pode representar um valor clínico, portanto ela não remove páginas nem suprime laudos/observações. Os testes versionados usam conteúdo inteiramente sintético; o PDF pessoal permanece fora do repositório e do banco.

Este corte é **manual e síncrono**. O worker da fila, OCR, segmentação em laudos, observações estruturadas, Claude, consolidação dos resultados e revisão por observação ainda faltam. O hash é registrado na execução de extração; calcular e guardar o hash já no recebimento do arquivo é trabalho posterior. Os cinco PDFs reais do usuário não são usados em testes.

### Preparação do piloto sintético — 04/10/2026

A migration `20261004142437_ia2_document_text_extraction.sql` foi aplicada ao projeto confirmado `oxuwrdjojsmgxoljqkuk`, compartilhado com o app publicado. A lista privada `synthetic_exam_pilot_documents` segue vazia e as tabelas de extração não têm registros. O código novo continua apenas no PR de rascunho.

O comando `cd apps/web && node scripts/build-synthetic-exam-fixture.mjs` cria `work/ia2-synthetic-exam.pdf` na raiz do checkout; `work/` é ignorado pelo Git. O PDF tem três páginas, todas marcadas como demonstração fictícia. O extrator local retornou páginas 1 e 3 como extraídas e página 2 como possível repetição da 1, sem descartá-la. A geração não usa os PDFs pessoais fornecidos pelo usuário.

**Próximo passo operacional:** o Preview da branch foi criado no projeto certo (`dpl_GtihvA1QYz3SDMovoHgnbtgnuiGB`, commit `0b3c3d4`) e ficou `READY`. Entrar nele com a conta médica, enviar o PDF sintético pelo fluxo normal, registrar exclusivamente o novo documento na lista privada e configurar `VIVANCE_EXAM_TEXT_PILOT=synthetic` e `VIVANCE_SYNTHETIC_EXAM_DOCUMENT_IDS` somente no Preview. Depois conferir extração, original, persistência e negações com sessões reais de médico e paciente. O Preview exige login próprio, e o Chrome bloqueou o upload automatizado até a extensão ChatGPT receber permissão de acesso a URLs de arquivo. Nenhuma extração, publicação em produção ou aceitação foi inferida do estado `READY`.

### Resultado do piloto médico sintético — 04/10/2026

No Preview da branch, a conta médica de teste cadastrou `Paciente Sintético IA2` e enviou o PDF fictício pelo formulário de Documentos, como `Exame` de uso interno. A seleção do arquivo ocorreu no diálogo nativo do macOS; nenhuma permissão da extensão Chrome foi alterada. O documento `4a837be3-b166-4a41-b5a2-a7205497e034` foi confirmado no banco como disponível, PDF de 3029 bytes, e tornou-se o **único** item da lista privada `synthetic_exam_pilot_documents`. As flags `VIVANCE_EXAM_TEXT_PILOT=synthetic` e `VIVANCE_SYNTHETIC_EXAM_DOCUMENT_IDS` foram restritas à branch de Preview `codex/exames-consolidados-contrato-20261003`; Production não recebeu essas variáveis. O novo deployment `dpl_Ax3xsr7VEXZJqs6Ri68THdAbvZcz`, do commit `0b3c3d4`, ficou `READY`.

Na ficha médica, a extração manual retornou três páginas: duas com texto disponível e a página 2 sinalizada como possível repetição da página 1. Seu texto foi preservado com acesso à página correspondente no original. Uma execução `requires_review` e três páginas estão persistidas; o hash do arquivo no banco coincide com o PDF local. Após recarregar a ficha, o exame permaneceu na fila de conferência. Isso confirma o percurso médico sintético e a persistência, sem equivaler a interpretação de exames ou aceite clínico. Falta teste autenticado em sessão de paciente; o bloqueio por RLS foi verificado localmente e o acesso `anon` negado no projeto remoto. O próximo slice é a fila/worker com idempotência e falha recuperável, seguida de estruturação de laudos/observações apenas após IA1. Os PDFs pessoais fornecidos não foram enviados ao projeto nem a fornecedor.

### Fila do piloto — continuação de 04/10/2026

As migrations `20261004153431_exam_extraction_worker` e `20261004154416_exam_doctor_worker_access` estão aplicadas somente no projeto de teste. O enfileiramento é explícito, restrito ao médico com vínculo de cuidado e ao PDF fictício autorizado; o worker usa a sessão médica, lease curto e tentativas limitadas. A chave privilegiada não entra no app web. O POST da interface passa a retornar `202` com o ID da tarefa, e a aba exibe estado e atualiza o resultado enquanto estiver aberta. A execução inicial ocorre após a resposta HTTP; a leitura da aba retoma tentativas vencidas. Sem aba aberta, não há um agendador para novas tentativas. Essa limitação operacional e a validação do Preview precisam ser fechadas antes de chamar a fila de autônoma. Nenhum documento pessoal, Claude ou OCR entrou nessa etapa.

O Preview `dpl_6sSuxXjivv2c6e4sFpTvFgWeuqDY`, do commit de código `127e046`, confirmou a fila em sessão médica com um segundo PDF inteiramente fictício (`7fd0479f-16ac-4870-b5ad-e6d57824271d`). O documento foi enviado pelo fluxo privado existente e incluído nominalmente nas duas allowlists do piloto, limitadas ao Preview e ao banco de teste. A interface passou de “sem texto” ao resultado de três páginas; a tarefa `94b67673-8d81-4e56-915d-f6264de80fbc` terminou `completed` na primeira tentativa e a execução vinculada `b0212fcc-0db5-48ed-ab22-c1e141253b29` ficou `requires_review`. As páginas 1 e 3 têm texto; a página 2 foi preservada como possível repetição da 1 e possui link para `#page=2` no original. A persistência e a apresentação foram conferidas no banco e na interface. Ainda faltam exercício de falha/retentativa no ambiente, teste autenticado com paciente e revisão clínica do desenho. O próximo slice técnico é um contrato de observações estruturadas e revisão médica por resultado, mantendo texto e proveniência por página; o fornecedor de IA depende do IA1.
