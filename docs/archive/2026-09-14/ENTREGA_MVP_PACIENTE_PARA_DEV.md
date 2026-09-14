# Entrega do MVP — jornada da paciente

Documento para planejamento e execução pelo Dev · Instituto VIVANCE · 9 de setembro de 2026

**Revisão do board com Astra — 09/09/2026:** o acompanhamento operacional vigente está na [MVP - WIKI do Asana](https://app.asana.com/1/1218183514643284/project/1218186424803872/task/1218336965197938). Os 22 tickets receberam escopo, exclusões e 89 cenários BDD (Dado/Quando/Então), pendentes de execução. D1–D7 passaram a ter cards próprios; a preparação antecipada de ambiente foi separada em MVP-22A, que habilita MVP-21 antes do encerramento de MVP-22. MVP-19 foi antecipada para fornecer a consulta real exigida em MVP-06. O texto original da wiki foi preservado integralmente como referência histórica.

**Entrega e autonomia técnica:** o resultado esperado é o aplicativo funcional ponta a ponta, com contas novas, dados persistentes e serviços reais, não apenas telas navegáveis. O Dev pode escolher uma solução tecnicamente superior às referências abaixo, documentando justificativa, impacto e testes que preservem os comportamentos e aceites. Decisões internas dentro dos limites autorizados não exigem aprovação individual de produto. Mudanças de funcionalidade obrigatória, regra clínica, consentimento/retenção/acesso a dados, contratação ou custo fora do combinado exigem alinhamento prévio com o instituto. Voz, IA assistiva, PDF e vídeo reais não podem ser substituídos por simulação para concluir o MVP.

## Objetivo da entrega

Entregar a jornada funcional da paciente: acessar sua conta, preparar a consulta, compartilhar informações, conversar com o médico, acompanhar o plano publicado e registrar sua evolução. Cada ação precisa persistir no backend e aparecer no fluxo correspondente do médico, inclusive após novo login ou em outro dispositivo.

Este documento transforma a lista fornecida pelo produto em 22 tarefas, com ordem de execução, dependências e critérios de aceite. O escopo inclui a área médica e a administração mínima necessárias para completar essa jornada. As etapas abaixo são incrementos de desenvolvimento; o MVP completo exige todas as funcionalidades solicitadas, inclusive voz, PDF na conversa e vídeo quando houver teleatendimento.

## Base analisada e limites

- Fonte de requisitos: “Lista do MVP funcional da paciente”, fornecida pelo produto nesta solicitação.
- Código analisado: branch `main`, commit `b68c3974614f4da6d902c6109aa6a6203a04b0cc`.
- Protótipo indicado pelo README: [VIVANCE](https://lume-saude-prototipo.vitormilanez.chatgpt.site).
- A análise foi feita nas rotas, componentes, serviços, modelos de dados e testes existentes. Não foram executados testes ou alterado o aplicativo nesta atividade de planejamento.
- A navegação visual foi bloqueada porque o navegador não conseguiu verificar a política de segurança do ambiente. Não há screenshots novos nem validação de que a publicação corresponde ao commit local. A homologação visual e ponta a ponta está prevista na tarefa MVP-21.
- O README está parcialmente desatualizado: o código já implementa persistência para check-ins, planos, confirmações e envios, além de upload em armazenamento privado. Esses recursos são bases para reaproveitamento, não funcionalidades homologadas como prontas para produção.

## Diagnóstico que orienta o backlog

| Jornada | Evidência no código atual | Consequência para a entrega |
|---|---|---|
| Paciente recém-cadastrada | As rotas escolhem `RegisteredCare` para vínculos diferentes do vínculo demonstrativo de Marina | A paciente nova não recebe a mesma jornada completa do protótipo; unificar as experiências é uma dependência inicial |
| Acesso | Existem usuários, sessões em D1, cookie HttpOnly, logout e bloqueio administrativo | Completar ativação, recuperação e controles de produção; remover criação automática de contas demo do caminho produtivo |
| Pré-consulta | Perguntas, consentimento demonstrativo, revisão e envio usam o estado de demonstração em sessão | Implementar rascunhos, envios e revisão médica persistentes |
| Check-ins e planos | Comandos passam por `/api/care-cycles`, com revisão e controle de concorrência | Reaproveitar o serviço; completar voz, campos, privacidade e acesso por pacientes novos |
| Compartilhar | Upload real de PDF, imagem e áudio; revisão antes de confirmar; retorno médico publicado | Completar rascunhos duráveis, estados pedidos, rastreio documental e integração com conversa |
| Documentos privados | R2, metadados em D1, validação de bytes e download autenticado | Existe proteção de acesso, mas a rota é estável: faltam URL temporária e eventos de acesso documental |
| Conversas | Texto persistente e recibos; participantes modelados como paciente e médico responsável | Incluir PDF, equipe autorizada, histórico paginado e leitura com semântica confiável |
| Evolução e refeições | Medidas usam estado em sessão e mensagem de texto; refeição pode enviar apenas nome de arquivo | Criar registros estruturados e arquivos reais, com histórico utilizável pelo médico |
| Consultas e vídeo | Dados demonstrativos e simulação de teleconsulta | Criar consultas reais e integrar um provedor de vídeo |
| IA | Há modelos, controles e versões; o check-in monta resumo no cliente e voz é simulada | Implementar processamento real quando autorizado, preservar fontes e manter o fluxo manual |

Um ponto merece correção antes de usar dados reais: `patientCycleView` filtra planos e alguns campos internos, mas mantém o restante do ciclo por espalhamento. O objeto de check-in contém `aiSummary`, e os exames também precisam de uma projeção específica. O Dev deve construir respostas da API com campos explicitamente permitidos para a paciente. Esconder um campo na tela não impede que ele chegue ao navegador.

## Organização da execução

P0 significa fundação ou bloqueio de segurança/consistência a resolver antes das funcionalidades dependentes. P1 significa funcionalidade obrigatória do MVP que vem depois das fundações. P1 não significa opcional. As dependências indicam o que precisa estar disponível para concluir e homologar a tarefa; contratos e componentes podem ser preparados antes.

| Ordem | Incremento demonstrável | Tarefas | Condição de saída |
|---|---|---|---|
| 1 | Conta nova com jornada própria e permissões corretas | 01–05; início de 22A | Paciente e médico novos acessam seus fluxos; outro usuário não acessa os dados; consentimentos e eventos ficam registrados |
| 1A | Consulta real como contexto da pré-consulta | 19, após fundações e D6 | Consulta própria persistida e identificável; pré-consulta não depende de ID demonstrativo |
| 2 | Envio de informação e resposta médica | 09–12 | Paciente envia texto/PDF, médico confere e responde, paciente recupera a conversa e o documento em outro dispositivo |
| 3 | Pré-consulta completa | 06–08 | Texto e voz reais, rascunho recuperável, original preservado, processamento acompanhado e revisão médica privada |
| 4 | Plano e acompanhamento diário | 13–15; início de 16 | Médico publica plano; paciente lê, registra ações e check-in; esses dados alimentam Hoje |
| 5 | Evolução e diário | 17–18 | Medidas e refeições aparecem no histórico da paciente e do médico |
| 6 | Teleatendimento e Home completa | 20; conclusão de 16 | Consulta real já disponível, sala autorizada e seis ações rápidas conectadas aos módulos já entregues |
| 7 | Homologação e entrada em produção | conclusão de 22A → 21 → 22 | Ambiente real disponível antes do aceite integrado; cenários completos e operação documentada antes da liberação |

O trabalho de infraestrutura de MVP-22 começa na primeira etapa; sua aprovação final ocorre depois de MVP-21. A Home é integrada progressivamente e só recebe aceite completo quando medidas e consultas estiverem disponíveis. Não há prazo fechado: capacidade da equipe, provedor de voz/IA/vídeo e ambiente produtivo precisam entrar na estimativa do Dev. Solicitar estimativa por tarefa e por incremento, considerando implementação, testes e correções.

## Tarefas prontas para repassar

### MVP-01 — Disponibilizar a jornada completa para contas novas

**Prioridade:** P0 · **Responsável sugerido:** full-stack · **Dependências:** nenhuma.

**Entrega:** usar as rotas e componentes da jornada Hoje, Meu cuidado, Conversas, Evolução e Pré-consulta para qualquer paciente autorizada. Adaptar também as telas de revisão, consulta e publicação do médico para seus pacientes reais. Substituir ramificações por identidade demonstrativa e consultas inferidas de IDs por contexto carregado do backend. Preservar a navegação e os padrões de interface do protótipo.

**Aceite:** cadastrar paciente e médico novos; vinculá-los; abrir cada rota e obter a seção correta, inicialmente vazia. Nenhum dado de Marina ou consulta fictícia aparece. Paciente sem vínculo vê estado de espera. Trocar o paciente na URL não concede acesso. Médico consegue iniciar o fluxo de cuidado para a conta nova.

**Reaproveitar:** rotas de paciente/médico, `registered-care.tsx`, `patient-mvp.tsx`, `care-directory.ts` e `demo-routes.ts`.

### MVP-02 — Completar acesso, ativação e recuperação de conta

**Prioridade:** P0 · **Responsável sugerido:** backend + frontend · **Dependências:** nenhuma.

**Entrega:** concluir o cadastro/ativação de paciente a partir da administração, definição segura da senha e recuperação de acesso. Reutilizar sessão persistente e revogação. Impedir contas demonstrativas e credenciais compartilhadas em produção; proteger tentativas de autenticação e expiração de tokens. A forma de entrega do convite deve ser definida na decisão D1.

**Aceite:** ativação válida funciona uma vez; token expirado/reutilizado falha; login/logout e recuperação funcionam; bloqueio ou redefinição revoga sessões anteriores. Usuário sem sessão não acessa APIs nem páginas privadas. Uma inicialização produtiva não cria contas demo durante login ou leitura de conversas.

**Reaproveitar:** `auth.ts`, APIs de autenticação, administração e tabelas `users`/`sessions`.

### MVP-03 — Implementar equipe autorizada e regras de vínculo

**Prioridade:** P0 · **Responsável sugerido:** backend + administração · **Dependências:** 02.

**Entrega:** modelar membros autorizados por acompanhamento e suas capacidades. Médico responsável revisa, aprova e publica conteúdo clínico. Equipe autorizada acessa somente os acompanhamentos e ações concedidos; autoria individual aparece nas mensagens. Administrador não recebe acesso clínico automático. Definir consulta a histórico e documentos após encerramento/transferência do vínculo.

**Aceite:** membro autorizado vê a conversa; membro não autorizado e admin não veem conteúdo clínico; revogação impede novos acessos. Transferência não compartilha automaticamente registros antigos. A paciente não perde silenciosamente acesso à sua versão anterior do plano; qualquer regra para histórico encerrado é explícita e homologada.

**Reaproveitar:** `care_relationships`, `admin.ts`, `careAccess` e autorização de conversas/arquivos.

### MVP-04 — Registrar termos, privacidade e consentimentos versionados

**Prioridade:** P0 · **Responsável sugerido:** full-stack; conteúdo fornecido pelo instituto · **Dependências:** 02.

**Entrega:** tela inicial e gestão dos consentimentos com documento/versão, finalidade, aceite ou recusa, autoria e data. Separar ciência dos termos, gravação de voz, transcrição e assistência de IA. Aplicar também a autorização necessária para fotos/refeições. Conferir permissão no servidor antes do processamento.

**Aceite:** recuperar a decisão após novo login; consultar o texto aceito; não iniciar gravação/transcrição sem autorização específica. Recusar IA mantém pré-consulta e check-in por texto e revisão manual disponíveis. Mudança de escolha afeta novos processamentos e registra evento. Não usar o checkbox demonstrativo pré-selecionado como prova de consentimento produtivo.

**Reaproveitar:** controles de consentimento na pré-consulta e governança existente. Os textos e a retenção são decisões do instituto, não valores inventados pelo Dev.

### MVP-05 — Consolidar persistência, projeções por perfil e auditoria

**Prioridade:** P0 · **Responsável sugerido:** backend · **Dependências:** 02; autorização de equipe concluída em 03.

**Entrega:** definir contratos de dados para as novas entidades e eventos duráveis com ID do ator, ação, entidade, versão e horário do servidor. Preservar originais e correções como versões, com controle de concorrência e reenvio idempotente. Retornar à paciente apenas campos autorizados; remover resumos de IA, notas internas e hipóteses não publicadas de todos os payloads. Tratar encerramento do vínculo e mudança de sessão sem reaproveitar cache de outro usuário.

**Aceite:** duas sessões editando não sobrescrevem silenciosamente a última versão; repetir envio não duplica registros. Inspecionar o JSON da paciente e confirmar ausência de rascunhos/`aiSummary` privado. Eventos permitem reconstruir quem fez a alteração. Limpar armazenamento do navegador e entrar novamente recupera os registros salvos. Logs operacionais não copiam senhas, tokens ou conteúdo clínico completo.

**Reaproveitar:** `care-cycles`, revisões, `care_cycle_mutations`, eventos administrativos e `shared-care-context.tsx`. A trilha de mutações existente não substitui eventos de abertura de documentos.

### MVP-06 — Persistir pré-consulta com salvamento progressivo

**Prioridade:** P1 · **Responsável sugerido:** full-stack · **Dependências:** 01, 04, 05, 19; voz em 07.

**Entrega:** perguntas curtas, salvamento progressivo no backend, retomada, revisão final e envio explícito. Persistir questionário/versão, respostas originais, vínculo, consulta, autoria e recibo. Disponibilizar o original no preparo da consulta do médico e o histórico enviado para a paciente. A confirmação do envio deve ser independente de concluir processamento de IA.

**Aceite:** responder parte, sair e continuar em outro dispositivo; corrigir antes de confirmar; falha de rede mantém o texto e informa o que ainda não foi salvo. Após envio, médico vê o mesmo original. Novo envio gera versão e não sobrescreve a anterior. Paciente consulta recibo e estado de processamento, sem visualizar rascunho médico.

**Reaproveitar:** fluxo em `patient.tsx` e workspace de revisão da pré-consulta; migrar ações atualmente ligadas ao estado de demonstração.

### MVP-07 — Implementar gravação e transcrição reais

**Prioridade:** P1 · **Responsável sugerido:** full-stack + integração · **Dependências:** 04, 05, 09.

**Entrega:** componente de áudio reutilizável em pré-consulta e check-in: pedir microfone, gravar, parar, ouvir, descartar/regravar e anexar o arquivo real. Transcrever no backend com o provedor escolhido. Preservar áudio, transcrição inicial e texto corrigido pela paciente como fontes relacionadas, sem substituir o original.

**Aceite:** gravar em navegador móvel e desktop homologados; negar microfone e continuar por texto; respeitar limite de duração/tamanho; informar processamento, erro e nova tentativa. A transcrição reflete o áudio enviado. Médico autorizado ouve o original. Arquivo e transcrição se recuperam depois de novo login. Gravações descartadas obedecem à política de limpeza e retenção.

**Reaproveitar:** upload de áudio em `care-files.ts`. Substituir temporizador, transcrição fixa e referências `audio-demo-*` do check-in.

### MVP-08 — Entregar IA copiloto com fontes e alternativa manual

**Prioridade:** P1 · **Responsável sugerido:** backend + área médica · **Dependências:** 04, 05, 06; entrada por voz após 07.

**Entrega:** processamento autorizado no servidor, com estados aguardando, processando, concluído, falhou ou não autorizado. Produzir apenas rascunho privado com referências às respostas/fontes originais. Permitir revisão, correção e rejeição pelo médico. Guardar versão do processamento e do resultado; publicar conteúdo para a paciente por uma ação médica separada.

**Aceite:** cada afirmação selecionada no resumo aponta para uma fonte existente; dado ausente não é preenchido como fato. Falha ou recusa da IA mantém o original e o fluxo manual utilizáveis. Paciente vê o estado, nunca o rascunho. Aprovar o preparo não publica plano. Nenhuma automação diagnostica, prescreve, ajusta tratamento ou classifica urgência.

**Reaproveitar:** governança e versões de síntese existentes, substituindo referências a fontes demonstrativas e resumos calculados no cliente.

### MVP-09 — Completar infraestrutura de anexos privados

**Prioridade:** P0 · **Responsável sugerido:** backend · **Dependências:** 03, 05.

**Entrega:** reutilizar upload em R2 e metadados em D1, com validação de conteúdo, tipo e tamanho. Vincular arquivo a envio, mensagem, pré-consulta ou registro. Disponibilizar autorização para abertura com URL temporária de curta duração; revalidar sessão/vínculo no acesso e manter bucket sem URL pública. Registrar solicitação/acesso ao documento e tratar arquivos abandonados antes da confirmação.

**Aceite:** PDF válido abre para os participantes; arquivo disfarçado, vazio ou acima do limite é recusado. Link expirado ou usado por outra conta não abre. Nome, tipo, tamanho, autoria, data e contexto ficam preservados. O médico não acessa anexo em rascunho. Registrar download/acesso não equivale a afirmar que a pessoa leu o conteúdo.

**Reaproveitar:** limite atual de 8 MB por arquivo como proposta inicial a confirmar; `care-files.ts`, `/api/care-files` e `/api/care-files/[id]`. O proxy autenticado existente é uma base segura, mas ainda não cumpre literalmente o requisito de URL temporária.

### MVP-10 — Completar “Compartilhar com a equipe”

**Prioridade:** P1 · **Responsável sugerido:** full-stack · **Dependências:** 01, 05, 09.

**Entrega:** texto, áudio anexado, foto ou documento; título e contexto; rascunho persistente; revisão, correção e cancelamento antes de confirmar. Implementar histórico com estados rascunho, enviado, recebido, respondido e arquivado, sem perder o original. Associar retorno publicado ao envio e ao contexto da conversa quando aplicável.

**Aceite:** salvar rascunho e retomá-lo; voltar da revisão e trocar o arquivo; cancelar sem compartilhar com o médico. Confirmar uma vez gera um único envio. Histórico mostra estado e data corretos em outra sessão. Arquivar preserva conteúdo e trilha; retorno aparece somente depois de publicação médica.

**Reaproveitar:** `CareSubmissionComposer`, `CareSubmissionInbox` e `submitInformation`. Hoje o rascunho está em memória e os estados do servidor são `received`, `reviewed`, `published`.

### MVP-11 — Completar recebimento e retorno na área médica

**Prioridade:** P1 · **Responsável sugerido:** full-stack · **Dependências:** 01, 03, 05, 10.

**Entrega:** caixa de entrada por paciente e tipo de envio, com pendências operacionais, original, anexos e revisão privada. Registrar recebimento, abertura humana, revisão e publicação separadamente. Permitir que o médico publique resposta vinculada à informação recebida. Integrar pré-consulta, check-in, medidas e diário conforme os módulos forem entregues.

**Aceite:** médico novo encontra o envio da paciente nova, abre o arquivo correto, salva rascunho privado e publica o retorno. Paciente só vê a publicação. Equipe respeita suas permissões. Outra edição não sobrescreve o rascunho aberto; o profissional consegue recuperar seu texto e conferir a revisão mais recente.

**Reaproveitar:** `CareSubmissionInbox`, workspaces de pré-consulta/check-in e publicação existentes.

### MVP-12 — Completar conversa direta com PDF e recibos

**Prioridade:** P1 · **Responsável sugerido:** full-stack · **Dependências:** 03, 05, 09; retorno contextual em 11.

**Entrega:** conversa com médico responsável e equipe autorizada, texto, PDF anexado antes do envio e respostas no mesmo histórico. Relacionar mensagem e documento por IDs, preservando metadados. Implementar estados enviando, enviado/recebido, falha e lido quando houver evidência. Paginar o histórico e registrar leitura por participante.

**Aceite:** paciente seleciona PDF, remove/troca antes de enviar e confirma; médico recebe o mesmo documento e responde na conversa. Mais de 100 mensagens continuam acessíveis. Abrir a Home ou fazer atualização em segundo plano não marca mensagens/documentos não exibidos como lidos. Reenviar após falha não duplica a mensagem. Participante revogado não acessa histórico nem anexos.

**Reaproveitar:** `/api/messages`, `messages.ts`, `use-persistent-conversation.ts` e tabelas de recibos. Hoje o GET marca recibos como lidos e a consulta retorna os primeiros 100 itens; não há associação de PDF ao modelo de mensagem.

### MVP-13 — Completar publicação e versionamento do plano

**Prioridade:** P1 · **Responsável sugerido:** full-stack · **Dependências:** 01, 03, 05.

**Entrega:** objetivo, ações, frequência, período de vigência e data de revisão. Médico cria rascunho, revisa/aprova e publica explicitamente. Paciente consulta plano atual e versões substituídas, identificadas com data, autor e estado. Tratamento/orientações exibidos em Meu cuidado devem derivar de conteúdo médico publicado.

**Aceite:** rascunho ou versão aprovada não aparecem para a paciente. Publicar v2 substitui v1 como atual e mantém v1 consultável. Durante edição de v2, v1 continua visível. Campos de período e revisão persistem. Cadastro novo consegue receber seu primeiro plano e não herda orientação fictícia.

**Reaproveitar:** `carePlans`, comandos de publicação e `patient-care-plan.tsx`. Os modelos atuais têm objetivo/ações/cadência, mas precisam explicitar período e data de revisão.

### MVP-14 — Persistir leitura de orientação e realização de ações

**Prioridade:** P1 · **Responsável sugerido:** full-stack · **Dependências:** 05, 13.

**Entrega:** confirmação de leitura vinculada à orientação e versão; confirmação de ação realizada vinculada à ação, versão e ocorrência/data. Permitir corrigir um registro com histórico. Diferenciar leitura, realização autorrelatada e resultado clínico.

**Aceite:** marcar ação de hoje não conclui automaticamente todas as próximas ocorrências. Novo login recupera marcações. Médico vê autoria e data. A publicação de nova orientação exige seu próprio recibo; leitura de v1 não marca v2 como lida. Falha no backend não exibe sucesso definitivo.

**Reaproveitar:** `actionConfirmations`. Substituir `medicationRead` em sessão e confirmação enviada apenas como mensagem demonstrativa por registro próprio.

### MVP-15 — Completar check-in periódico e próxima data

**Prioridade:** P1 · **Responsável sugerido:** full-stack · **Dependências:** 01, 05, 07, 13; revisão em 11.

**Entrega:** cadência configurada pelo profissional, próximo check-in calculado a partir dos dados reais, resposta por texto ou voz, revisão antes do envio e recibo. Exibir original e histórico. Médico consulta e registra leitura humana; falta de registro permanece uma pendência operacional.

**Aceite:** alterar cadência atualiza a próxima data; paciente responde e médico vê o original; reenvio não duplica. Falha de áudio permite texto. Envio e leitura médica são estados distintos. Datas funcionam na virada do dia e no fuso definido. Não gerar classificação automática de risco por silêncio ou sintoma informado.

**Reaproveitar:** `submitCheckIn`, `reviewCheckIn`, `followUpConfigurations` e diálogo de check-in.

### MVP-16 — Alimentar Hoje e as seis ações rápidas pelo backend

**Prioridade:** P1 · **Responsável sugerido:** frontend + backend · **Dependências:** 01, 12–15, 17, 19.

**Entrega:** pendências do dia, plano publicado, próximo check-in/retorno e novas orientações a partir de dados reais. Conectar os atalhos: abrir orientação, enviar mensagem, consultar tratamento/plano, ver evolução, atualizar medidas e consultar/responder próximo retorno. Trabalhar os estados inicial, vazio, carregando, erro e atualizado.

**Aceite:** os seis atalhos abrem o destino correto para paciente nova. Marcar ação, publicar orientação ou alterar consulta atualiza os indicadores. Não há datas, contadores ou metas fictícias. Ausência de registro não aparece como alerta clínico. O erro informa como tentar novamente sem apagar dados já apresentados como salvos.

**Reaproveitar:** `patient-mvp.tsx`, `patient-quick-actions.tsx`, navegação Hoje/Meu cuidado/Conversas/Evolução.

### MVP-17 — Persistir medidas e apresentar evolução

**Prioridade:** P1 · **Responsável sugerido:** full-stack · **Dependências:** 01, 05.

**Entrega:** profissional configura medidas disponíveis e unidades; paciente registra valor, unidade, data e origem autorrelatada. Histórico, correção versionada e evolução acessíveis por ambos. Validação evita valores malformados sem emitir julgamento clínico. Usar linguagem neutra e alternativa textual para gráficos.

**Aceite:** registrar peso e outra medida configurada; recuperar em outro dispositivo; médico vê os mesmos valores, datas e origem. Corrigir não apaga o original. Diferenciar ausência de valor de zero. Não misturar kg/lb ou cm/m nem duplicar registros ao tentar novamente. Visualização não atribui mérito ou culpa à variação.

**Reaproveitar:** tela de evolução e formulário de medidas; substituir `session.measures` e mensagens soltas por registros estruturados.

### MVP-18 — Entregar diário de refeições com foto real

**Prioridade:** P1 · **Responsável sugerido:** full-stack · **Dependências:** 01, 04, 05, 09.

**Entrega:** descrição, data/horário, foto opcional quando autorizada e campos subjetivos de fome, saciedade ou contexto. Persistir diário estruturado, anexos e histórico; disponibilizar no acompanhamento médico. Adequar a chamada “Analisar refeição” para descrever o que a entrega efetivamente faz: registrar e compartilhar.

**Aceite:** criar refeição por texto e com foto; reabrir a imagem real depois do login; médico vê o mesmo registro. Negar foto mantém alternativa textual. Nome do arquivo sozinho não conta como upload. Não usar foto demonstrativa, valor calórico ou estimativa de nutrientes como dado real.

**Reaproveitar:** interface de refeição e campos subjetivos; substituir `attachmentName`, imagens fixas e diário em sessão.

### MVP-19 — Persistir consultas, contexto e resposta ao retorno

**Prioridade:** P1 · **Responsável sugerido:** full-stack · **Dependências:** 01, 03, 05.

**Entrega:** cadastro/atualização da consulta por profissional autorizado, com paciente, responsável, contexto, data/hora, fuso, modalidade e estado. Paciente consulta próximo retorno, confirma ou solicita outra opção; médico vê a resposta. Associar pré-consulta e registros à consulta real, sem depender de `enc-demo-*` ou de uma única consulta fixa por paciente.

**Aceite:** nova paciente tem consulta própria; alteração/cancelamento aparece em ambos os perfis; confirmação sobrevive ao login. Solicitar outra opção não altera automaticamente o agendamento. Histórico preserva o contexto de consultas anteriores. Paciente não agenda ou abre consulta de outra pessoa trocando um ID.

**Reaproveitar:** rotas de consultas e visualização de retorno. Integração com agenda externa não é pressuposta neste MVP.

### MVP-20 — Integrar sala real de vídeo à consulta

**Prioridade:** P1 · **Responsável sugerido:** integração + frontend · **Dependências:** 02, 03, 19; provedor definido em D3.

**Entrega:** criar/associar sala real, autorizar participantes e oferecer entrada a partir da consulta configurada para teleatendimento. Tokens de acesso expiram; tratar permissão de câmera/microfone, indisponibilidade e reconexão. Mostrar contexto da consulta antes de entrar. Registrar acesso e encerramento como eventos operacionais.

**Aceite:** paciente e médico autorizados entram em dois dispositivos e se ouvem/veem. Pessoa não vinculada não entra. Consulta presencial não oferece sala falsa. Token vencido, permissão negada e falha do provedor têm recuperação clara. Gravação de consulta e transcrição de teleatendimento não estão incluídas nesta tarefa.

**Reaproveitar:** pontos de entrada da consulta e workspace atual; substituir sala simulada. A tecnologia escolhida deve atender ao aceite de sala integrada, não apenas abrir uma tela demonstrativa.

### MVP-21 — Homologar a jornada completa e corrigir regressões

**Prioridade:** P0 para liberar produção · **Responsável sugerido:** QA + Dev; validação funcional do instituto · **Dependências:** 01–20 e ambiente real de MVP-22A. Preparação de testes e validação por incremento podem começar antes.

**Entrega:** executar o roteiro de aceite deste documento com contas novas, perfis separados e dois dispositivos/navegadores. Cobrir sucesso, falta de dados, rede lenta/offline, sessão vencida, acesso negado e edição concorrente. Validar interface móvel e desktop, teclado, foco dos diálogos, rótulos, anúncio de erros, ampliação e leitura textual de gráficos.

**Aceite:** registrar evidências por tarefa, corrigir falhas bloqueadoras e repetir apenas cenários afetados. Nenhum fluxo obrigatório depende de mock ou estado exclusivo do navegador. Aviso de que o canal não substitui urgência aparece nas entradas relevantes, inclusive nas telas de contas novas. Rascunhos não vazam por interface, API ou arquivo. Não declarar acessibilidade completa apenas por aparência.

**Reaproveitar:** testes de cuidado, administração, governança e concorrência já existentes; complementar com testes de integração/UI e validação dos serviços reais. Testes com substitutos de D1/R2 não homologam a infraestrutura produtiva.

### MVP-22 — Preparar ambiente, operação e pacote de entrega

**Desdobramento operacional no Asana:** [MVP-22A — Disponibilizar ambiente para homologação integrada](https://app.asana.com/1/1218183514643284/project/1218186424803872/task/1218337910679006) concentra a preparação antecipada: recursos reais, migrações, serviços aprovados, observabilidade e recuperação necessárias aos testes. Depende de 02/05 e das decisões aplicáveis D2/D3/D5/D7 para o aceite integrado; inventário e preparação independentes começam antes. A sequência de aprovação é **22A → 21 → 22**, sem dependência circular entre homologação e pacote final.

**Prioridade:** P0 para liberar produção · **Responsável sugerido:** Dev/infra · **Dependências:** configuração começa com 02/05; saída final depende de 21.

**Entrega:** ambientes separados, migrações, banco e bucket privados, segredos dos provedores, backup/restauração, observabilidade de erros sem conteúdo clínico e rotina de limpeza/retenção aprovada. Documentar instalação, publicação, recuperação, suporte, permissões e limites. Atualizar README e remover dependência de dados/contas demo no ambiente produtivo.

**Aceite:** restauração testada, migração validada com dados existentes, configuração real conferida e nenhuma credencial em código/documentação de entrega. Paciente e médico concluem o roteiro no ambiente de homologação antes da liberação. Entregar versão/commit, evidências, instruções e pendências conhecidas com responsável. O banco com ID placeholder e o nome do bucket no código não comprovam provisionamento.

## Contratos de estado para evitar interpretações diferentes

| Objeto | Estados e regra |
|---|---|
| Pré-consulta | Rascunho → enviado. Processamento em campo separado: não autorizado, aguardando, processando, concluído ou falhou. Falha da IA não desfaz o envio |
| Compartilhamento | Rascunho → enviado → recebido → respondido; arquivado preserva o histórico. “Recebido” significa persistido e disponível à equipe; visualização humana é outro evento |
| Plano/orientação | Rascunho → aprovado → publicado → substituído. Aprovação e publicação são ações médicas explícitas; rascunho novo não retira a versão publicada anterior |
| Mensagem | Enviando → enviada/recebida; falha permite nova tentativa sem duplicar. Lida só quando o conteúdo for efetivamente apresentado ao destinatário |
| Documento | Preparado/privado → vinculado a envio confirmado. Envio, disponibilização, acesso e resposta têm eventos próprios; resposta referencia mensagem/retorno publicado |
| Ação do plano | Registro por versão + ação + ocorrência/data, com autoria. Desfazer/corrigir cria histórico e não apaga evidência anterior |

Esses são contratos propostos para implementação. Nos envios síncronos, “enviado” e “recebido” podem ocorrer quase juntos; a interface não precisa inventar uma espera. Para conteúdo clínico escrito diretamente pelo médico na conversa, “Enviar” precisa ser uma ação explícita de publicação. Rascunhos de equipe/IA que contenham orientação clínica exigem revisão/aprovação do responsável antes da publicação.

## Cobertura da lista original

| Requisitos fornecidos | Tarefas que os entregam |
|---|---|
| Criar/ativar conta, entrar/sair, sessão revogável e jornada própria | 01, 02, 03, 05 |
| Termos, privacidade e consentimentos | 04 |
| Pré-consulta curta, texto/voz, salvamento, revisão, envio, original e processamento | 06, 07, 08 |
| Hoje, plano atual, próximo check-in, pendências e confirmação de envio ao médico | 13, 15, 16 |
| Compartilhar texto/áudio/foto/documento com título, contexto e conteúdo | 09, 10 |
| Revisar, corrigir/cancelar antes da confirmação e consultar histórico/retornos/estados | 10, 11 |
| PDF privado, autorização, URL temporária e metadados vinculados à conversa | 03, 05, 09, 12 |
| Plano publicado, objetivo/ação/frequência/período/revisão e versão anterior | 13 |
| Realização sincronizada e confirmação de leitura | 14 |
| Medidas configuradas, valor/unidade/data/origem e evolução neutra | 17 |
| Refeição, horário, foto real autorizada, fome/saciedade/contexto e histórico | 18 |
| Conversa com responsável/equipe, texto, PDF, recibos e resposta publicada | 03, 11, 12 |
| Consulta, data/contexto e vídeo integrado quando configurado | 19, 20 |
| Seis ações rápidas da Home | 16 e seus módulos de destino |
| Não mostrar rascunhos/hipóteses; revisão/aprovação/publicação médica | 03, 05, 08, 11, 13, 21 |
| Preservar relato original; auditoria de envio, recebimento, acesso e resposta | 05–12 |
| Orientação de urgência; alternativa manual com IA indisponível ou recusada | 04, 06–08, 15, 21 |
| Recuperar após login/outro dispositivo; autoria/versão/autorização | 05 e critério transversal de todas as tarefas |

## Roteiro de homologação para aprovar a entrega

1. **Conta e vínculo:** criar paciente e médico sem dados demo, ativar acesso e registrar termos/consentimentos. Entrar como outro paciente, outro médico e admin e confirmar restrição dos dados.
2. **Pré-consulta:** começar por texto, sair, retomar em outro dispositivo, gravar trecho real com consentimento, revisar e enviar. Médico encontra original; paciente encontra recibo e estado do processamento.
3. **Revisão assistida e manual:** gerar rascunho autorizado com fontes, revisar sem publicar e conferir ausência no payload da paciente. Repetir com IA recusada/indisponível e concluir manualmente.
4. **Compartilhar:** criar rascunho com PDF, corrigir título e anexo, cancelar uma tentativa e confirmar outra. Médico só acessa a tentativa confirmada, publica retorno e paciente consulta histórico.
5. **Conversa:** enviar texto/PDF, responder como médico e participante autorizado. Conferir autoria, recibos, paginação, URL vencida e bloqueio do arquivo para terceiro.
6. **Plano:** publicar v1, confirmar leitura e ação da data, iniciar v2 privada e verificar v1 ainda atual; publicar v2 e consultar v1 como substituída.
7. **Check-in e Hoje:** configurar cadência, conferir próxima data e pendências operacionais, responder por texto/voz e conferir recibo, original e leitura médica. Exercitar os seis atalhos da Home.
8. **Evolução:** registrar e corrigir medidas, criar refeição com foto e campos subjetivos, relogar e conferir os mesmos registros na área médica.
9. **Consulta e vídeo:** marcar consulta real, confirmar/solicitar alternativa, configurar teleatendimento e conectar dois dispositivos autorizados. Testar token expirado, terceiro e permissão negada.
10. **Falhas e operação:** interromper rede durante salvamento/upload, repetir envio, expirar sessão e simular edição concorrente. Conferir ausência de duplicação/perda silenciosa; validar backup/restauração e evidências de auditoria.

Cada cenário deve ser marcado como aprovado ou reprovado com versão testada, resultado observado e evidência. Neste planejamento, todos permanecem **pendentes de execução**.

## Decisões para fechar antes da implementação dependente

| ID | Decisão | Proposta de partida | Quem resolve | Bloqueia |
|---|---|---|---|---|
| D1 | Entrada de pacientes e recuperação | Cadastro pelo instituto + ativação individual; definir canal de convite/recuperação | Produto + Dev | 02 |
| D2 | Gravação/transcrição/IA | Selecionar provedor, limites de duração/tamanho, custo e tratamento dos dados; fluxo manual sempre disponível | Instituto + Dev | 07, 08 |
| D3 | Vídeo | Selecionar provedor que suporte sala real com participantes autorizados; sem gravação nesta entrega | Instituto + Dev | 20 |
| D4 | Membros da equipe e históricos encerrados | Permissões por acompanhamento; publicação clínica do médico; regra explícita de acesso ao passado | Instituto | 03, 09, 12, 13 |
| D5 | Termos, consentimentos e retenção | Instituto fornece textos/versões e prazos por tipo de dado, incluindo rascunhos e áudios | Instituto | 04, 07, 09, 22 |
| D6 | Medidas, frequência e consultas | Configuração pelo profissional; definir campos, unidades, fuso e permissões de agendamento | Médico + produto | 13, 15, 17, 19 |
| D7 | Ambiente, volume e capacidade | Informar responsáveis, quantidade prevista de pacientes/arquivos e capacidade da equipe para estimar | Produto + Dev | 22 e cronograma |

As decisões não impedem iniciar o inventário, os contratos e a unificação da jornada. Contratação de serviços e definição clínica são responsabilidades explícitas, sem pressupor que já foram aprovadas.

## Fora desta entrega

Diagnóstico, prescrição e alterações automáticas de medicamentos ou plano alimentar; cálculo clínico baseado exclusivamente em foto; chatbot clínico autônomo; monitoramento clínico contínuo e triagem automática de urgência; integrações com WhatsApp, relógios ou prontuário. Integrações desse tipo só entram em escopo posterior com contrato, consentimento e auditoria definidos. Os elementos correspondentes presentes no protótipo não ampliam este backlog.

Também não se presume gravação/transcrição da consulta em vídeo, prescrição eletrônica, agenda externa ou redesenho geral da interface. Visualizar uma orientação de tratamento publicada pelo médico faz parte do MVP; automatizar conduta não faz.

## Referências de código para o Dev

Os caminhos abaixo são relativos à raiz do repositório e servem para localizar o trabalho no commit analisado.

| Área | Arquivos principais |
|---|---|
| Jornadas diferentes para demo e cadastro novo | `app/paciente/[patientId]/page.tsx`, `app/paciente/[patientId]/[section]/page.tsx`, `app/components/registered-care.tsx`, rotas sob `app/medico/pacientes/[patientId]` |
| Estado local e compartilhado | `app/components/care-demo-context.tsx`, `care-demo-store.ts`, `shared-care-context.tsx`, `use-session-demo-state.ts` |
| Login e escopo | `app/lib/auth.ts`, `app/lib/admin.ts`, `app/lib/care-directory.ts`, `app/components/demo-routes.ts` |
| Contratos e mutações de cuidado | `app/lib/care-cycle-contract.ts`, `app/lib/care-cycle.ts`, `app/components/care-demo-types.ts` |
| Upload e download privado | `app/lib/care-files.ts`, `app/api/care-files/route.ts`, `app/api/care-files/[id]/route.ts` |
| Compartilhamento/revisão | `app/components/care-submission-composer.tsx`, `app/components/care-submission-inbox.tsx` |
| Conversas | `app/lib/messages.ts`, `app/components/use-persistent-conversation.ts`, `app/api/messages/route.ts` |
| Pré-consulta, check-in, Home e evolução | `app/components/patient.tsx`, `patient-mvp.tsx`, `patient-mvp-sections.tsx`, `patient-quick-actions.tsx` |
| Planos | `app/components/patient-care-plan.tsx`, `doctor-care-plan-workspace.tsx`, `care-demo-actions.ts` |
| IA e governança | `app/lib/clinical-synthesis.ts`, `app/lib/clinical-policy.ts`, componentes de preparo/revisão médica |
| Banco e infraestrutura | `db/schema.ts`, `db/index.ts`, `drizzle/`, `wrangler.jsonc` |
| Testes existentes | `tests/care-cycle.test.ts`, `tests/care-workflow.test.ts`, `tests/admin.test.ts`, testes de política/síntese clínica |

## Texto de encaminhamento ao Dev

> Precisamos transformar a jornada atual do protótipo VIVANCE no MVP funcional descrito neste backlog. A entrega deve funcionar para pacientes e médicos recém-cadastrados, com dados persistentes, autorização e autoria, e permitir que cada ação da paciente seja visualizada pelo médico no fluxo correspondente. Reaproveite as bases de autenticação, D1, upload privado, mensagens e planos/check-ins já implementadas. Siga os incrementos e critérios de aceite das 22 tarefas. Antes de fechar o prazo, apresente estimativa por incremento, dependências de fornecedores e decisões pendentes. A aprovação final será feita com contas novas e dois dispositivos, incluindo texto/voz, PDF na conversa, plano versionado, medidas/refeições e consulta com vídeo quando configurada.
