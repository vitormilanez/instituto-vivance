# Plano de aproveitamento do protótipo Skip

## Objetivo

Aplicar ao protótipo principal as melhores ideias de produto e interface do projeto Skip, sem realizar merge direto e sem importar o backend, os dados clínicos ou as integrações simuladas do export.

A jornada-alvo do MVP-1 é:

```text
pré-consulta por texto
-> fonte original preservada
-> organização assistida em rascunho
-> revisão médica
-> plano aprovado
-> publicação para a paciente
```

Nesta branch, os três primeiros lotes implementam e validam uma fatia completa dessa jornada:

```text
pré-consulta por texto
-> fonte original preservada
-> organização assistida opcional em rascunho
-> revisão médica
-> rascunho de plano versionado
-> aprovação médica
-> publicação explícita para a paciente
```

O plano continua demonstrativo, em sessão e sem integração com prontuário. Aprovação e publicação não representam prescrição, decisão autônoma de IA nem transferência ao Feegow.

Na branch `codex/skip-lote2-workspace-medico`, o segundo incremento acrescenta:

```text
fonte original preservada
-> rascunho médico editável
-> rejeição com motivo
-> nova versão de revisão
-> aprovação apenas para uso na consulta
```

Essa aprovação não publica conteúdo para a paciente e não representa sincronização com prontuário.

## Princípios

- O projeto atual permanece como base.
- O Skip é uma referência de UX e decomposição de páginas.
- Toda informação permanece fictícia durante a fase de protótipo.
- Rascunho de IA e decisão médica são estados diferentes.
- A paciente vê apenas conteúdo aprovado e publicado.
- O fluxo manual continua funcionando quando a IA não é autorizada ou está indisponível.
- Feegow permanece como prontuário oficial proposto; confirmação manual não significa sincronização.

## Matriz de aproveitamento

| Elemento do Skip | Decisão | Momento |
| --- | --- | --- |
| Camadas `relato`, `fato`, `síntese IA` e `decisão médica` | Adaptar | MVP-1 |
| Pré-consulta textual em etapas | Adaptar com consentimento e campos vazios | MVP-1 |
| Dossiê longitudinal | Aplicar em versão mínima | MVP-1 |
| Workspace de consulta | Aplicar sem vídeo nativo | MVP-1 |
| Confirmação antes de publicar o plano | Aplicar com versão e autoria | MVP-1 |
| Plano da paciente com ação, frequência e justificativa | Adaptar | MVP-1 |
| Navegação modular médico/paciente | Aplicar gradualmente | MVP-1 |
| Página Hoje | Aplicado com plano e registros da sessão | MVP-2 |
| Check-ins e atenção operacional | Aplicado sem triagem ou urgência automática | MVP-2 |
| Diário, evolução e mensagens | Aplicado em fatias demonstrativas longitudinais | MVP-2 |
| Relatório assistido | Manter como demonstração até validar fontes e revisão | P1 |
| PocketBase, migrations, seed e agente do Skip | Não reutilizar | Excluído |
| Teleconsulta, receitas e evidências fictícias | Não reutilizar | Fora do MVP |

## Lotes de implementação

### Lote 1 — Fundação e primeira fatia vertical — implementado nesta branch

- Padronizar a marca como Instituto Vivans.
- Criar componentes de proveniência clínica.
- Substituir a pré-consulta por voz simulada por texto guiado.
- Começar com campos vazios e validação acessível.
- Registrar ciência para compartilhamento com a equipe.
- Tornar a assistência de IA opcional.
- Preservar relato original e rascunho em camadas separadas.
- Compartilhar a submissão entre as visões paciente e médico.
- Persistir somente na sessão do navegador, com dados fictícios.

### Lote 2 — Dossiê e workspace médico — implementado nesta branch

Implementado neste incremento:

- extrair o workspace de revisão da pré-consulta para um componente próprio;
- exibir fonte original e rascunho em superfícies separadas;
- permitir edição e salvamento do rascunho durante a sessão;
- exigir motivo para rejeição sem alterar o relato original;
- criar uma nova versão depois de aprovação ou rejeição;
- registrar versão, estado, horário e responsável pela revisão;
- permitir aprovação somente para uso no preparo da consulta;
- manter uma preparação manual quando a assistência de IA não for autorizada;
- refletir o estado da revisão no painel médico.
- substituir o seletor interno por navegação real de médico e paciente;
- criar URLs endereçáveis para agenda, dossiê, pré-consulta e consulta;
- usar identificadores sintéticos opacos de paciente e atendimento nas URLs;
- isolar rascunhos, submissões, versões e revisões por paciente e consulta;
- manter o provider no layout raiz e migrar com segurança a sessão demonstrativa `v1` para `v2`;
- rejeitar IDs inexistentes ou combinações incompatíveis com uma página segura, sem reaproveitar dados de outra pessoa.
- manter a conversa demonstrativa vinculada ao paciente selecionado;
- preservar ações demonstrativas do médico e da paciente ao navegar entre páginas durante a mesma sessão;
- encerrar pré-consulta e consulta sem criar uma entrada de histórico que reabra o fluxo já fechado.
- criar eventos longitudinais tipados e isolados por paciente e atendimento;
- exibir relato, dado registrado, preparo/síntese e revisão médica em camadas separadas;
- mostrar em cada evento data, autoria, origem, ID sintético, versão, estado e limite de uso;
- projetar submissões e revisões da sessão no dossiê sem sobrescrever versões anteriores;
- manter o preparo aprovado como síntese revisada para a consulta, sem promovê-lo a decisão clínica ou plano publicado;
- derivar contagens das fontes e eventos do paciente selecionado;
- substituir nomes de paciente nos caminhos dos documentos demonstrativos por IDs opacos.

Ainda pendente no Lote 2:

- dividir outras áreas extensas de `doctor.tsx` e `patient.tsx`;
- definir persistência durável e identidade autenticada, fora do estado demonstrativo.

### Lote 3 — Plano aprovado e publicado — implementado nesta branch

- Criar rascunho de plano a partir do preparo aprovado quando disponível, das notas demonstrativas da consulta ou de uma estrutura manual.
- Exigir aprovação explícita do médico antes da publicação.
- Congelar a versão aprovada e impedir edição posterior.
- Publicar somente a versão aprovada mais recente para a paciente.
- Criar nova versão em vez de sobrescrever a anterior; a publicação mais recente preserva e marca a anterior como substituída.
- Projetar rascunho, aprovação, publicação, autoria, data, origem e versão no dossiê longitudinal.
- Manter a transferência manual ao Feegow explicitamente fora deste protótipo.

### Lote 4 — Hardening do MVP-1 — primeira fatia implementada nesta branch

Implementado neste incremento:

- registrar de forma append-only, na sessão demonstrativa, as transições relevantes de pré-consulta, revisão e plano;
- registrar a versão de ciência da pré-consulta e a decisão de autorizar ou não a organização assistida, sem copiar o relato clínico para o evento;
- vincular cada evento ao paciente, atendimento, item de origem e versão;
- recuperar de forma derivada o histórico de transições de sessões anteriores do protótipo quando ainda não houver registros de auditoria;
- exibir a trilha separadamente no dossiê médico, com autoria, hora, referência opaca e limites explícitos;
- manter a auditoria transitória em `sessionStorage`, sem apresentá-la como log de prontuário, autenticação, evidência legal ou sincronização externa.

Ainda pendente neste lote:

- Implementar autenticação, vínculos e papéis.
- Implementar auditoria durável, consentimentos revogáveis, direitos LGPD e retenção com validação jurídica e de segurança.
- Criar testes de autorização, identidade, recusa de IA e troca de versão.
- Validar teclado, foco, responsividade, contraste e redução de movimento.
- Remover afirmações de integrações que ainda não existam.

### Lote 5 — MVP-2 — primeira fatia implementada nesta branch

Implementado neste incremento:

- alimentar a página Hoje com a versão publicada do plano e as confirmações feitas pela paciente na sessão;
- registrar check-in guiado com energia, qualidade do sono e indicação de sintoma novo, sem texto clínico livre;
- manter a confirmação opcional de cada ação publicada como registro autorrelatado, vinculado à versão e à ação do plano;
- projetar check-ins e confirmações no dossiê médico com fonte, autoria, versão, estado e limite de uso;
- mostrar o check-in mais recente como contexto operacional para a próxima conversa, sem chamá-lo de alerta clínico, triagem ou urgência;
- acrescentar à auditoria apenas o envio do check-in, sem repetir seu conteúdo.
- permitir que o médico registre a leitura humana da fonte do check-in, sem converter leitura em decisão clínica;
- configurar uma cadência demonstrativa vinculada à versão publicada mais recente do plano;
- deixar explícito que a cadência vale apenas na sessão e não cria alerta, retenção durável ou monitoramento contínuo;
- representar a ausência de novo registro como estado operacional, com contato exclusivamente manual e sem classificar risco ou urgência;
- compartilhar o contexto guiado do diário com notas de 1 a 5, mantendo foto, autorrelato e limites da análise separados;
- mostrar na evolução os fatos criados na sessão separados dos gráficos históricos fictícios;
- projetar leitura, cadência, contato e diário no dossiê e na auditoria com origem, versão e autoria.

Ainda pendente neste lote:

- validar calendário, frequência e retenção de check-ins com médico, pacientes, privacidade e jurídico;
- transformar regras operacionais em critérios aprovados pelo médico, explicáveis e testados;
- projetar notificações reais, escalonamento humano e tratamento de ausências para além da simulação manual, sem monitoramento de urgência;
- validar a jornada com pacientes e médico antes de ampliar indicadores, métricas ou integrações.

### Lote 6 — Clareza e continuidade do produto — iniciado e funcional nesta branch

- reduzir a navegação principal da paciente para `Hoje`, `Meu cuidado`, `Conversas` e `Evolução`;
- reunir plano, diário e consultas em um hub amigável, preservando as URLs antigas como links internos compatíveis;
- manter o item `Meu cuidado` ativo quando a paciente abre um de seus detalhes;
- criar no painel médico um resumo curto que responde o que merece ação, qual é a evidência e qual deve ser o próximo passo humano;
- ordenar esse resumo por regras determinísticas da sessão: fonte não lida, conversa sem resposta, ausência operacional e ciclo organizado;
- vincular cada nova mensagem a plano, check-in, diário ou outro assunto;
- compartilhar mensagens da sessão entre paciente e médico com autoria, versão e retenção explícita;
- projetar mensagens no histórico longitudinal, mantendo somente metadados na trilha de auditoria;
- preservar a conversa por paciente e atendimento, sem reutilizar mensagens de outro contexto.

Ainda pendente neste lote:

- validar os quatro destinos principais com pacientes em teste moderado;
- definir leitura, entrega, anexos, disponibilidade da equipe e política de retenção antes de integrar um canal real;
- substituir a regra demonstrativa de prioridade por configuração aprovada, testada e observável;
- decompor `patient.tsx` e `doctor.tsx` em módulos menores antes de ampliar novas superfícies.

## Critérios de aceite do primeiro ciclo

- A pré-consulta começa sem respostas clínicas preenchidas.
- A paciente consegue continuar sem assistência de IA.
- Erros aparecem junto ao campo e são anunciados ao leitor de tela.
- A paciente revisa todas as respostas antes do envio.
- A visão médica recebe exatamente o texto enviado.
- A síntese assistida aparece como simulação de rascunho.
- Trocar entre paciente e médico não apaga a submissão.
- Recarregar a página mantém a submissão durante a sessão de demonstração.
- Nenhum conteúdo interno ou rascunho é apresentado como decisão aprovada.
- Build, lint e validação visual passam.

## Critérios de aceite do incremento do Lote 2

- A revisão só pode começar quando existe uma pré-consulta enviada.
- A fonte original permanece visível e não pode ser sobrescrita pela revisão.
- O médico pode editar o preparo sem transformar o texto em decisão clínica automática.
- Rejeitar o rascunho exige um motivo e preserva a versão rejeitada no histórico.
- Uma nova revisão cria outra versão em vez de sobrescrever a versão encerrada.
- A aprovação identifica responsável e horário.
- A interface afirma claramente que aprovar o preparo não publica um plano.
- O fluxo manual funciona quando a IA não foi autorizada.
- O estado aprovado e o histórico permanecem após recarregar durante a sessão.
- O modal funciona por teclado, isola o conteúdo de fundo e não cria rolagem horizontal em 375 px.
- A navegação principal altera a URL e funciona com recarga, voltar e avançar.
- A pré-consulta da Marina não aparece no preparo de outro paciente.
- Uma consulta incompatível com o paciente da URL retorna uma página segura, sem fallback silencioso.
- As URLs usam somente IDs sintéticos opacos e não incluem nomes ou respostas clínicas.
- O dossiê sem conteúdo demonstrativo mostra um estado vazio seguro em vez de dados de outro paciente.
- Mensagens abertas pelo dossiê mantêm o paciente selecionado.
- Ações demonstrativas concluídas permanecem ao navegar entre páginas na mesma sessão.
- Fechar ou enviar uma pré-consulta não faz o botão Voltar reabrir o fluxo encerrado.
- Cada evento longitudinal informa camada, data, autoria, origem, ID sintético, versão e estado.
- Filtros sem resultado mostram um estado vazio seguro e permitem voltar a todos os eventos.
- Uma nova pré-consulta aparece no dossiê da mesma sessão sem alterar o relato original.
- Preparos manuais e assistidos permanecem distinguíveis; aprovação vale apenas para uso na consulta.
- As contagens do dossiê são calculadas somente a partir dos eventos do paciente da rota.
- Em 375 px, a linha do tempo permanece em uma coluna e não cria rolagem horizontal na página.

## Critérios de aceite do incremento do Lote 3

- O médico cria um rascunho de plano a partir de uma fonte identificada, sem converter preparo ou sugestão de IA em decisão automática.
- A aprovação só ocorre por uma ação explícita do médico e congela a versão aprovada.
- A paciente não vê rascunhos nem versões apenas aprovadas.
- A publicação só ocorre por uma ação separada e torna visível somente a versão aprovada mais recente.
- Publicar uma nova versão preserva a publicada anterior como histórico substituído, sem sobrescrever seu conteúdo.
- Cada plano aparece no dossiê com origem, ID, versão, autoria, revisão, estado e limite de uso.
- Ações autorrelatadas da paciente ficam vinculadas à versão publicada, sem reaproveitar conclusões de uma versão anterior.
- Planos de um paciente não aparecem em outro contexto de paciente ou consulta.
- Nenhuma ação de aprovação ou publicação envia conteúdo a prontuário, prescrição ou integração externa.
- Build, lint, verificação de tipos e jornada visual de rascunho -> aprovação -> publicação passam.

## Critérios de aceite da primeira fatia do Lote 4

- O dossiê mostra uma trilha de auditoria separada do conteúdo clínico, sem repetir relatos da paciente ou texto de plano.
- Toda pré-consulta enviada registra a versão de ciência e se a organização assistida foi autorizada.
- Abrir, aprovar ou rejeitar um preparo, bem como criar, aprovar ou publicar um plano, acrescenta um evento com autoria, horário, referência e versão.
- A trilha é filtrada por paciente e atendimento e não reutiliza eventos de outro contexto.
- Sessões anteriores do protótipo recebem eventos derivados apenas de metadados já existentes, sem inventar conteúdo clínico novo.
- A interface afirma claramente que o registro é transitório e não equivale a autenticação, prontuário, prova legal ou integração externa.
- Build, lint, verificação de tipos e jornada visual passam.

## Critérios de aceite da primeira fatia do Lote 5

- O check-in da paciente é salvo apenas no contexto sintético de paciente e atendimento da sessão.
- O check-in registra somente escolhas guiadas e não solicita texto clínico livre.
- A paciente só confirma ações da versão publicada mais recente do plano.
- Retirar uma confirmação preserva o histórico do registro anterior e atualiza o estado visível da ação.
- O dossiê médico recebe o autorrelato e as confirmações com autoria, fonte, versão e limites explícitos.
- Marcar um sintoma novo pede leitura da fonte pelo médico, sem classificar risco, urgência, diagnóstico ou conduta.
- A auditoria mostra o envio do check-in sem expor seus valores ou conteúdo clínico.
- Registrar leitura preserva a fonte original e não afirma diagnóstico ou conduta.
- A cadência fica vinculada a uma versão publicada do plano e não cria notificação real.
- A ausência de check-in permite somente registrar um contato humano demonstrativo.
- O diário registra respostas guiadas com ciência de compartilhamento e limites explícitos da foto.
- A evolução distingue claramente os registros reais da sessão dos gráficos históricos fictícios.
- Build, lint, verificação de tipos e jornada paciente -> médico passam.

## Critérios de aceite do Lote 6

- A navegação principal da paciente apresenta apenas quatro destinos e permanece legível em mobile.
- Plano, diário e consultas continuam acessíveis pelo hub `Meu cuidado` e por suas URLs antigas.
- O resumo médico mostra ação, evidência e próximo passo sem usar linguagem de risco, urgência ou decisão clínica automática.
- Uma mensagem enviada pela paciente aparece para o médico no mesmo paciente, atendimento e contexto selecionado.
- Uma resposta do médico aparece para a paciente sem perder o vínculo com plano, check-in, diário ou outro assunto.
- O dossiê mostra o conteúdo da conversa como fonte longitudinal; a auditoria registra somente seus metadados.
- Abrir outro paciente não expõe mensagens da conversa anterior.
- Verificação de tipos, lint, build e jornada paciente -> médico -> paciente passam.

## Itens explicitamente excluídos

- `pocketbase/` do Skip.
- Usuários, senhas e dados de seed.
- Agente com permissões de escrita clínica.
- Script externo `goskip.dev/skip.js`.
- Conteúdo de `mockData.ts`.
- Sugestões de IA na área da paciente.
- Mensagens sem vínculo por paciente.
- Prescrições, ICP-Brasil e downloads simulados.
- Teleconsulta e compartilhamento de tela apresentados como integrações reais.
- Evidências PubMed, Cochrane ou Conitec sem fonte real verificável.
