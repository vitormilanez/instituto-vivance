# VIVANCE — próximos slices e direção visual

Avaliação de 12/09/2026. Planejamento para revisão; nenhum slice implementado por este documento.

## Atualização de escopo — onboarding autorizado em 12/09/2026

O titular acrescentou **convite de paciente pelo médico ou administrador + onboarding persistente e pré-consulta de cinco perguntas** e autorizou iniciar a implementação. Este incremento passa à frente do 7B.3 para fornecer contexto real à etapa Preparo. A sequência seguinte permanece 7B.3 → 7B.4 → 7B.5 → 5A.1 → 5B.1 → 7A.1/7A.2.

- **3E — Convite e entrada do paciente:** nome + e-mail ou telefone; médico convida para si, administrador escolhe médico da clínica; convite seguro, aceite e vínculo. WhatsApp usa link para envio manual, conforme escolha do titular; o paciente informa e-mail para criar/confirmar acesso. Não há disparo automático de WhatsApp.
- **4E — Onboarding e pré-consulta inicial:** foto e medidas opcionais, cinco respostas dirigidas, etapa de exames, salvamento/retomada e opção de pular. Compartilhamento explícito e apresentação dos originais ao médico autorizado.
- Referência executável: `docs/ONBOARDING_MVP.md` no checkout `instituto-vivance-onboarding`. Estado: 3E/4E implementados e validados localmente (119 testes, tipos, lint, build); ativação remota e prova de Auth/email/Storage conectados pendentes.
- Abaixo fica preservada a avaliação original. Os incrementos 3E/4E, 7B.3–7B.5, 5A.1/5A.2, 5B.1 e 7A.1 já foram validados localmente; o próximo slice é 7A.2.

## Decisão recomendada

**Próximo slice funcional: 7A.2 — publicação e exportação autorizada do relatório.** A base interna já permite ao médico reunir fontes reais, preservar versões e aprovar explicitamente uma síntese. A evolução seguinte deve publicar somente a versão escolhida para o próprio paciente e gerar arquivo identificado, sem expor notas ou links internos.

Preservar a identidade do protótipo e melhorar a clareza dentro de cada entrega. O objetivo visual é: **o médico entende o contexto e a próxima ação; o paciente entende o que fazer hoje**.

## Base verificada e correção do roteiro

- Protótipo: checkout `Instituto Vivance`, `main`, `b68c397`; painel médico publicado inspecionado em navegador no endereço indicado no README. A equivalência exata do deployment com o commit não foi atestada.
- Aplicação conectada: `apps/web` do mesmo repositório Git, em outro checkout. O diretório `instituto-vivance-vercel` está em `64b9a6b`; o remoto `codex/slice-7b1-patient-record` já está em `6613e45`.
- A PR #14, Slice 7B.2, foi integrada nessa branch em 12/09/2026. Portanto, **7B.1 e 7B.2 não devem reaparecer como trabalho novo**. Há código para ficha conectada, foco compartilhado de Hoje/Agenda, contexto do paciente e contador de avisos.
- Código mais recente também lido em `instituto-vivance-slice-7b2`, `7b49597`. Sua diferença para `6613e45` é a correção de retorno de convite da PR #15, confirmada como merged em 12/09/2026 às 12:54 UTC; a implementação de onboarding parte desse conteúdo.
- PR #11 permanece aberta contra `main`. Merge em branch de trabalho, integração em `main` e versão publicada são estados diferentes.
- Executei 14 testes existentes de Agenda, navegação e ficha: todos passaram. Parte desses testes inspeciona contratos e composição de código; isso não substitui jornada autenticada nem teste de banco.
- A PR #14 registra 110 testes e jornada desktop/390 px, com check remoto `verify` aprovado. Esses são registros da entrega anterior, não 110 testes repetidos nesta avaliação.
- O domínio `institutovivance.app` apresentou login. Não havia sessão clínica disponível nessa inspeção; a área conectada foi avaliada pelo código e pelas evidências anteriores, sem atestar seu funcionamento autenticado atual em produção.

O roteiro `PROXIMOS_SLICES_E_HANDOFF.md` contém trechos históricos que ainda chamam 7B.1 de próximo e descrevem abas como placeholders. A seção de entrega 7B.1 e o código mais recente os superam. Este plano registra a reconciliação sem sobrescrever as alterações documentais preexistentes.

## O produto deve entregar

Uma jornada contínua: **acesso → preparo → consulta → orientação publicada → acompanhamento → próxima consulta**.

Para o paciente: entrar na própria conta, enviar contexto e documentos, conversar com o médico, entender orientações publicadas, registrar como está e consultar sua evolução. Para o médico: saber o que mudou, abrir as fontes, registrar sua avaliação, revisar/publicar orientações e retomar o acompanhamento. Para a administração: organizar contas, agenda e vínculos, sem acesso clínico automático.

O documento `ENTREGA_MVP_PACIENTE_PARA_DEV.md`, de 09/09, descreve um MVP maior, incluindo pré-consulta estruturada, voz, anexos na conversa, diário/medidas mais completos, IA e vídeo no teleatendimento. A decisão posterior priorizou o piloto manual e adiou áudio/IA. **Adiar não exclui esses itens do escopo maior nem torna o MVP completo.** Vídeo, integrações e eventuais divergências de destinatários/permissões permanecem para reconciliação específica antes de contratar ou implementar. A conversa vigente é direta paciente–médico.

## Protótipo × código conectado × evolução necessária

| Jornada | O protótipo representa | O código conectado tem | O que precisa evoluir |
| --- | --- | --- | --- |
| Acesso e equipe | Perfis e entrada em cada área | Sessão, clínica, papéis, contas, convites e vínculos | Comprovar primeiro acesso de conta nova e ativar as funções de convite de paciente no ambiente correto |
| Hoje e Agenda | Próxima consulta, contexto e pendências | Agenda persistente, cinco estados, foco compartilhado e oito atalhos; 7B.2 integrado na branch | Ajustes pontuais de clareza; validar com massa sintética coerente e não reconstruir Agenda |
| Ficha | Visão geral, linha do tempo, documentos e evolução | Quatro abas conectadas, filtro individual e vínculo; 7B.1 existente | Dar destaque ao contexto útil. A timeline atual reúne relatos/revisões/publicações; não representa ainda um prontuário completo com todas as fontes |
| Consulta | Preparo → Consulta → Plano → Fechamento | Rascunho salvo, finalização, versões, adendos e plano vinculado | Unir as etapas, permitir retomada e mostrar no fechamento o que foi salvo, finalizado e publicado |
| Plano | Revisão, comparação e orientação ao paciente | Versões, aprovação, publicação, substituição/retirada e ciência | Integrar ao fechamento e à próxima ação do paciente; leitura não é adesão |
| Pré-consulta/check-in | Questionário e contexto antes da consulta | Uma pergunta manual por solicitação, relato e medida opcional | Posteriormente: questionário versionado, rascunho recuperável, várias respostas e vínculo explícito com consulta; não é requisito para o 7B.3 manual |
| Evolução | Séries, gráficos, metas e indicadores | Agrupamento neutro de medidas por nome/unidade e timeline; janela limitada | Melhorar leitura e depois estruturar várias medidas por envio. Gráfico requer dados comparáveis; metas e adesão precisam de regras e fontes próprias |
| Documentos | Arquivo, conferência e resultados | Upload privado, validação técnica, autoria, visibilidade e download temporário | Registrar revisão humana separada do upload. Valores laboratoriais estruturados, correções e fonte por página ficam em entrega posterior |
| Conversas | Lista/detalhe, resposta e contexto | Texto direto, histórico paginado, autor/horário e avisos | Busca, retorno à ficha e continuidade móvel; depois idempotência de envio, leitura por participante e anexos/contexto compartilhável |
| Relatórios | Síntese por período, revisão e publicação | Navegação e estado de integração pendente | Criar relatório manual, fontes, versões, aprovação, publicação e exportação |
| Hoje do paciente | Próximo passo do cuidado | Próxima consulta, último atendimento, plano e atalhos | Destacar pergunta pendente/orientação nova e reduzir texto técnico e destinos ainda indisponíveis |
| Áudio e IA | Assistência, transcrição e resumos demonstrativos | Base de tarefas de processamento; sem executor/fornecedor ativo | Retomar apenas em lote posterior, com escopo, dados e custo definidos. O fluxo manual continua disponível |

## Sequência proposta

### Preparação curta — antes da próxima implementação

**Valor:** evitar retrabalho e demonstrações inconsistentes.

- A implementação local partiu de `7b49597`, que já contém a correção de primeiro acesso, em branch isolada `codex/onboarding-paciente`.
- Consolidar o status 7B.1/7B.2 na referência de continuidade quando houver autorização para editá-la.
- Reutilizar o plano de massa sintética: começar com três histórias distintas e uma ficha vazia, em desenvolvimento; não carregar dados nesta atividade de planejamento. Datas da Agenda precisam ser coerentes com a data da demonstração.
- Conferir primeiro acesso, convite e recuperação de sessão como pendência operacional. Não bloquear o layout por isso, mas não declarar onboarding concluído sem a prova.

### Lote 1 — uma jornada manual clara

| Ordem | Slice | Valor e resultado demonstrável | Persistência / limite |
| --- | --- | --- | --- |
| 1 | **7B.3 — Consulta em quatro etapas** | Médico abre o paciente certo, consulta suas fontes, registra, prepara o plano e encerra vendo o estado de cada entrega | Reutilizar atendimento, versões, planos e publicações; sem migração inicialmente. Etapa visual não finaliza nem publica automaticamente |
| 2 | **7B.4 — Conversas e continuidade móvel** | Médico encontra a conversa, responde e volta à ficha; paciente escreve e acompanha o histórico com clareza | Reutilizar conversas/avisos. Preservar texto em falha e proteger saída com texto não enviado. Não alegar idempotência ou recibo de mensagem |
| 3 | **7B.5 — Hoje do paciente orientado ao próximo passo (novo desdobramento proposto)** | Paciente identifica uma ação principal entre responder uma solicitação ou abrir orientações; próxima consulta permanece visível | Compor dados existentes. Prioridade é operacional, sem classificar urgência; dados opcionais não bloqueiam navegação. Não ampliar a regra de oito atalhos da equipe para o paciente |

### Execução local — 7B.3 concluído em 12/09/2026

O atendimento passou a organizar a tela em **Preparo, Consulta, Plano e Fechamento**. Preparo exibe somente o onboarding já enviado pela pessoa, com acesso aos documentos; Plano apresenta os planos realmente ligados ao atendimento e distingue rascunho, revisão, aprovação pendente de publicação e publicação vigente. Fechamento mantém a finalização como ação explícita: avançar entre etapas nunca salva, finaliza ou publica por conta própria. A saída de uma etapa com texto não salvo pede confirmação.

### Execução local — 7B.4 concluído em 12/09/2026

Conversas agora deixam claro o destinatário, o remetente e o retorno à ficha da pessoa ou ao Meu cuidado. O texto do compositor permanece disponível após falha de envio e a interface confirma antes de trocar de conversa, paginar, voltar ou fechar a página com uma mensagem não enviada. O envio continua direto, assíncrono e sem promessa de leitura ou reenvio idempotente.

### Execução local — 7B.5 concluído em 12/09/2026

O Hoje da pessoa passa a mostrar um único próximo passo, escolhido com dados existentes: retomar onboarding em rascunho, abrir orientações publicadas, conferir a próxima consulta ou abrir conversas. As demais áreas permanecem acessíveis abaixo, sem apresentar funcionalidades futuras como tarefas ativas e sem recomendar conduta clínica.

### Execução local — 5A.1/5A.2, 5B.1 e 7A.1 concluídos em 12/09/2026

- **Documentos:** o médico abre o original, registra conferência humana com decisão, nota interna, autoria e histórico. Enfermagem mantém o acesso permitido ao arquivo, sem metadados da revisão; paciente não recebe decisão nem nota interna. O arquivo e sua visibilidade não são alterados.
- **Conversas:** repetição do mesmo envio usa uma chave própria da operação e não duplica a mensagem. Médico e paciente mantêm cursores de leitura independentes; ler a conversa não marca automaticamente o aviso interno.
- **Relatório interno:** o médico escolhe pessoa, período, relatos e documentos já revisados, escreve a síntese e os pontos para consulta, salva rascunhos, fecha uma versão para revisão e aprova com confirmação explícita. A versão em revisão fica bloqueada para edição até voltar ao rascunho. O relatório permanece invisível ao paciente e ao administrador operacional.
- **Evidência local:** 136 testes, tipos, lint, build e conferência visual agrupada passaram. A interface foi ajustada após a prova em navegador para datas em português, campos legíveis e ações em largura adequada no celular. As migrations estão somente no checkout; este worktree não está ligado a um projeto Supabase e nada foi aplicado remotamente.

**Demonstração de saída do lote:** o médico retoma um atendimento, salva uma orientação, publica por ação explícita; o paciente encontra a orientação e responde a uma solicitação já existente; o médico localiza o relato e a conversa mantendo o mesmo paciente. Mostrar também ausência de registros e uma falha recuperável.

### Lote 2 — fechar lacunas de registro

| Ordem | Slice | Valor e resultado demonstrável | Persistência / limite |
| --- | --- | --- | --- |
| 4 | **5A.1 — Conferência humana de documentos** | Médico abre original e registra revisão com nome/data; a fila distingue arquivo recebido de arquivo revisado | Nova entidade de revisões, histórico, acesso e auditoria. Não altera o original nem sua visibilidade; sem OCR |
| 5 | **5B.1 — Reenvio seguro e leitura de conversa** | Resposta incerta pode ser reconciliada sem duplicar mensagem; cada participante tem seu estado de leitura | Chave idempotente e cursor de leitura. Separar leitura do aviso e leitura da mensagem; uma conversa com texto não perde conteúdo ao navegar |
| 6 | **7A.1 — Relatório manual interno** | Médico seleciona paciente, período e fontes, escreve, salva, revisa e aprova uma versão recuperável | Modelo próprio de relatório/fontes/versões, controle de concorrência e aprovação. Não gravar relatório como plano. Documentos revisados dependem de 5A.1; outras fontes podem ser usadas antes |
| 7 | **7A.2 — Publicação e exportação do relatório** | Paciente recebe somente a versão explicitamente publicada; arquivo identifica autoria/versão | Publicação/retirada e exportação autorizada. Texto publicado não libera notas privadas ou URLs das fontes internas |

Antes da primeira migração deste lote, comparar os históricos local/remoto de `team_and_care_relationships` e `care_reassignment_requires_active_member`, cuja divergência de identificadores foi registrada na avaliação anterior. Não reaplicar nem reparar automaticamente. O catálogo remoto não foi reinspecionado nesta análise.

### Lote posterior — completar o escopo maior

Priorizar depois: pré-consulta estruturada e retomável; medidas/diário mais completos; documentos anexados à conversa com contexto autorizado. Retomar áudio/transcrição 5E/5F e IA 6A–6D por decisão específica. Teleatendimento com vídeo, tratamento estruturado e integrações continuam com suas próprias dependências e definições. Prescrição eletrônica e classificações clínicas não surgem por reprodução visual do protótipo.

Não há estimativa de prazo ou custo fechada. Lote 1 usa majoritariamente capacidades existentes; Lote 2 envolve novos contratos de dados e mais verificação de isolamento/versionamento.

## Aceites objetivos

| Slice | Dado / Quando / Então |
| --- | --- |
| 7B.3 | **Dado** atendimento em rascunho do paciente A, **quando** o médico salva, passa pelas quatro etapas e retorna, **então** permanece no paciente A e recupera o texto salvo; etapa não finaliza atendimento nem publica plano. Saída com texto não salvo pede confirmação |
| 7B.3 | **Dado** plano aprovado ainda não publicado, **quando** abre Fechamento, **então** vê essa condição e uma ação explícita de publicar. A consulta pode terminar sem transformar campos opcionais em bloqueio |
| 7B.4 | **Dado** texto não enviado, **quando** ocorre falha ou tentativa de sair/trocar destinatário, **então** a interface preserva o texto na tela ou confirma descarte; o destinatário nunca muda silenciosamente |
| 7B.5 | **Dado** uma solicitação aberta e uma orientação publicada da própria paciente, **quando** abre Hoje, **então** encontra uma ação principal e chega ao registro certo. **Sem registros**, vê orientação curta, sem tarefa ou contador fictício |
| 5A.1 | **Dado** arquivo disponível, **quando** médico autorizado registra conferência, **então** revisão tem autoria/data/histórico, original permanece e nota interna não aparece no portal |
| 5B.1 | **Dado** envio com resposta perdida, **quando** a mesma operação é repetida, **então** há uma única mensagem. Abrir um aviso não marca a conversa inteira como lida |
| 7A.1/7A.2 | **Dado** relatório aprovado, **quando** paciente consulta antes/depois da publicação explícita, **então** só acessa a publicação própria, sem fontes internas; exportação mantém versão/autor |

Cada incremento verifica os caminhos alterados, recarga, erro/vazio/carregamento, contexto e negações por papel/vínculo quando afetados. Demonstração desktop e 390 px; teclado, foco, texto ampliado e ausência de sobreposição móvel. Reutilizar testes existentes; build e Preview no fechamento do lote acordado. A liberação para uso clínico real continua vinculada ao Gate P, separado da evolução com dados sintéticos.

## Plano visual: objetivo e acolhedor

### Manter

Azul-marinho na navegação, superfícies claras, bordas discretas, logo e identidade VIVANCE. A próxima consulta deve continuar sendo o centro do Hoje médico. Preservar as quatro abas da ficha, a Agenda existente e **exatamente oito ações rápidas no painel da equipe**. A interface já tem identidade própria; não precisa de outro redesign completo.

### Simplificar

1. **Uma ação principal por etapa.** Contexto primeiro; ação principal depois. Links secundários ficam visualmente menores. No Fechamento, distinguir “Atendimento finalizado”, “Plano aprovado” e “Orientações publicadas”.
2. **Paciente identificado o tempo todo.** Nome, data/consulta e ação de voltar permanecem consistentes. Evitar repetir o cadastro em vários cartões quando o objetivo é ler o acompanhamento.
3. **Menos competição no painel.** Consulta atual em primeiro plano; lista do dia e itens para revisão como apoio. Oito atalhos compactos abaixo, com menor peso que a tarefa atual. Não trocar o número de atalhos para resolver densidade.
4. **Hoje do paciente como orientação.** Saudação curta, próximo passo real, orientação vigente e consulta. Demais módulos ficam na navegação Hoje / Meu cuidado / Conversas / Evolução. Recursos futuros não devem parecer tarefas disponíveis.
5. **Detalhes no momento certo.** Autoria, fonte e estado junto ao registro; explicações maiores em “Ver detalhes”. Manter o aviso de comunicação assíncrona de forma compreensível e sem prometer prazo.
6. **Celular:** conversa em lista → detalhe com retorno claro; compositor e botão de envio acima da navegação inferior; etapas da consulta utilizáveis sem reduzir texto e botões. Alvos de pelo menos 44 px e rótulos além de cor são critérios de implementação, não conformidade já certificada.

### Dois grupos prioritários para o próximo lote

**P1 — Hierarquia e correspondência entre rótulo, estado e destino.** Em `today-workspace.tsx:52`, o contexto pode mostrar até cinco planos publicados antes da ação principal. Resumir com o plano mais recente e oferecer acesso aos demais. Em `today-workspace.tsx:74`, “Acompanhamento e exames” leva somente a Documentos: chamar de “Documentos e exames” e deixar relatos em acesso próprio. No protótipo ao vivo, Hoje mostrou “Pré-consulta pendente” enquanto a Agenda mostrou “Texto concluído · resumo pronto” para Marina. Usar uma fonte de estado consistente; não copiar a contradição para o piloto. Os oito atalhos da equipe continuam preservados.

**P2 — Linguagem acolhedora e próximo passo do paciente.** Reduzir “conectado”, “assíncrono” e explicações de vínculo nos momentos de cuidado; apresentar ação concreta e confirmação do resultado. O Hoje não deve exigir que o paciente descubra uma tarefa em um diretório de módulos. Uma ação principal varia conforme registros existentes; sem registros, o vazio deve orientar e permitir seguir.

### Avaliação exploratória de usabilidade

Método: duas análises independentes, A `/root/visual_review` e B `/root/visual_evidence`. Pontuação de qualidade 0–4, 4 melhor. É um diagnóstico exploratório da referência observada e do código lido, não uma nota de produção ou um teste com usuários.

| Heurística | Nota | Evidência ou limite |
| --- | --- | --- |
| Visibilidade do estado | 2 | Estados explícitos, mas inconsistência Hoje/Agenda no protótipo |
| Linguagem do usuário | 2 | Termos técnicos no fluxo de cuidado |
| Controle e liberdade | 3 | Navegação constante; cancelamento não exercitado |
| Consistência | 2 | Rótulo/destino ambíguo e variação visual da Agenda |
| Prevenção de erros | n/a | Formulários não executados |
| Reconhecimento | 3 | Paciente destacado, opções nomeadas e navegação ativa |
| Eficiência | 2 | Atalhos existem; excesso de contexto pode afastar a ação |
| Minimalismo | 2 | Boa composição, com repetição de contexto e cartões |
| Recuperação de erros | n/a | Falhas não exercitadas em navegador |
| Ajuda contextual | 2 | Explicações presentes, parte delas técnica |
| Total exploratório | 18/32 | Oito heurísticas observáveis; sem certificação de acessibilidade |

Pessoas consideradas: médico que precisa retomar uma consulta rapidamente e paciente com pouca familiaridade com o sistema. O primeiro precisa localizar o plano vigente sem comparar vários cartões; o segundo precisa compreender a ação sem interpretar conceitos de integração/permissão. A força do protótipo é colocar a pessoa antes da ferramenta. O momento de maior atrito é encontrar explicação técnica onde se espera orientação. O fechamento deve terminar com uma confirmação específica do que foi salvo ou compartilhado.

Questions skipped: dois grupos de problemas prioritários; a direção solicitada pelo usuário já é objetiva e friendly. Não é necessária nova decisão para concluir este planejamento.

### Textos propostos

| Atual / situação | Proposta |
| --- | --- |
| “Histórico conectado” | “Seu acompanhamento” |
| “Abrir check-ins” | “Responder como estou” quando existir solicitação; “Ver meus registros” no histórico |
| “Conversa direta e assíncrona” | “Converse com seu médico. A resposta pode não ser imediata.” |
| “Nenhum plano publicado disponível” | “Suas orientações aparecerão aqui quando o médico compartilhar.” |
| “Integração pendente” em área futura | “Esta função ainda não está disponível” em posição secundária |
| Erro de envio | “Não foi possível enviar. Seu texto continua aqui.” Somente se o comportamento realmente preservar o texto |
| “Adesão ao plano” baseada em quantidade de check-ins | “Registros enviados”; adesão requer atividades esperadas e comprovação própria |

No protótipo observado, “Pré-consulta pendente” se repete em vários pontos e “Adesão ao plano” é acompanhado por contagem de check-ins. Sala virtual, espera, confirmação e indicadores ilustrativos não devem migrar como dados reais sem implementação própria.

### Evidência visual e limites

A avaliação usa Impeccable com duas análises independentes: leitura visual/produto (A) e detector/evidência de navegador (B). Painel médico do protótipo observado diretamente. Não foram exercitados envio clínico, publicação, nova conta ou jornada autenticada do piloto nesta avaliação. Não há comprovação atual de acessibilidade completa ou equivalência pixel a pixel entre piloto publicado e protótipo.

O detector encontrou **10 avisos informativos no protótipo**: nove de tamanho de fonte fora da escala e um de cor. Navegação, rótulos de gráfico e categorias de mensagem em 10 px merecem revisão de legibilidade (`patient.tsx:326,937,941,1070,1075,1091`; `doctor-chrome.tsx:186,289`). O tamanho de 15 px em `doctor-chrome.tsx:185` é divergência da escala, não falha automática de acessibilidade. O verde `#8fd3c0` em `patient.tsx:898` exige conferir a intenção da área do paciente, sem troca automática de paleta.

Foram encontrados **zero avisos estáticos nos componentes do piloto**, incluindo o checkout mais recente. Isso não verifica CSS em execução, contraste, responsividade ou telas autenticadas. A análise A viu Hoje e Agenda do protótipo; B viu Hoje e ficha. Ambas encontraram somente login no piloto. A rota do paciente no protótipo redirecionou à sessão médica existente; o portal do paciente foi avaliado por código, sem nova sessão.

Registro do método: slug `app-components-doctor-dashboard-vivance-tsx`; lista de ignorados ausente; análises A/B independentes e síntese somente depois de A. A API de navegador disponível permitia avaliação somente de leitura, sem mecanismo documentado de injeção: overlay não executado e nenhum servidor iniciado. Nenhuma imagem autenticada foi salva em arquivo. Não houve alteração de viewport, inspeção móvel atual ou teste com leitor de tela. Os arquivos temporários do detector foram removidos após consolidar os resultados; abas de pesquisa não foram marcadas para permanência. Primeiro registro desta avaliação, sem série histórica comparável.

## Fontes para continuidade

- [Protótipo médico](https://lume-saude-prototipo.vitormilanez.chatgpt.site/medico).
- [PR #14 — foco de Hoje/Agenda](https://github.com/vitormilanez/instituto-vivance/pull/14); [PR #15 — retorno de convite](https://github.com/vitormilanez/instituto-vivance/pull/15); [PR #11 — base conectada](https://github.com/vitormilanez/instituto-vivance/pull/11).
- [Escopo da paciente](ENTREGA_MVP_PACIENTE_PARA_DEV.md), [Produto](../PRODUCT.md), [Sistema visual](../DESIGN.md).
- [Roteiro anterior](</Users/vitormilanez/Desktop/Codes/instituto-vivance-vercel/docs/PROXIMOS_SLICES_E_HANDOFF.md>), [Avaliação da massa sintética](</Users/vitormilanez/Desktop/Codes/instituto-vivance-vercel/docs/AVALIACAO_SEED_SINTETICO_SUPABASE.md>).
- Código conectado lido: `apps/web/components/encounter-editor.tsx`, `care-plan-editor.tsx`, `patient-area.tsx`, `messages-workspace.tsx`, `header.tsx`; `app/clinicas/[tenantId]/pacientes/[patientId]/page.tsx`; `modules/agenda/focus.ts`, `workspace/navigation.ts`, `messages/service.ts`, `documents/service.ts`, `longitudinal/service.ts` e `longitudinal/project.ts`, no checkout `instituto-vivance-slice-7b2`.

Somente este planejamento e o registro da avaliação visual foram criados. Sem alteração de aplicação, carga de dados, atualização no Asana, push, merge ou publicação.
