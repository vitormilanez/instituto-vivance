# Vivance — próximos slices e passagem de contexto

Atualizado em 11/09/2026. Referência central de continuidade: distingue entregas verificadas, próximo trabalho e limites do piloto. Não autoriza uso clínico real.

## 1. Onde continuar

- Diretório de implementação: `/Users/vitormilanez/Desktop/Codes/instituto-vivance-vercel`.
- Aplicação: `apps/web`. Branch atual: `codex/vercel-supabase-foundation`.
- Repositório: `https://github.com/vitormilanez/instituto-vivance.git`.
- PR de trabalho: https://github.com/vitormilanez/instituto-vivance/pull/11.
- Prévia protegida: https://instituto-vivance-testes-vtr-consulting.vercel.app.
- Endereço local usado nos testes: http://127.0.0.1:3010. Confirmar se o servidor está ativo antes de orientar o usuário.
- Base funcional conferida: commit `98942c7`, com 3B–3D e 4A–4B encerrados. O 4B acrescenta publicação explícita e leitura pelo paciente; evidências abaixo.
- Não confundir com `/Users/vitormilanez/Desktop/Codes/Instituto Vivance`, que contém o protótipo original e pode conter trabalho do usuário. Não desenvolver a migração ali.

Ler primeiro este documento, `apps/web/AGENTS.md`, `docs/ATENDIMENTO_MVP.md`, `docs/AGENDA_MVP.md` e `apps/web/README.md`. Consultar `docs/PLANO_VERCEL_SUPABASE.md` para decisões de arquitetura, lembrando que suas seções iniciais são históricas, não um retrato atual de disponibilidade.

## 2. Decisões preservadas

- Piloto: Instituto Vivance, um médico, uma enfermeira e aproximadamente 50 pacientes. Expandir para outras clínicas depois de validar o uso.
- Manter uma aplicação modular, código local e Git, APIs versionadas, Vercel e Supabase. Separar regras de negócio das telas e dos fornecedores; não criar vários serviços independentes agora.
- Isolamento por clínica desde o início. Administrador operacional não ganha acesso clínico por ser administrador.
- Sem mocks no aplicativo, preenchimento artificial de indicadores ou sucessos simulados. Fixtures somente em testes isolados. Preservar contas, cadastros e registros de teste já autorizados.
- Manter os 8 atalhos do painel. Fazer ajustes básicos de clareza, acessibilidade e desempenho em cada entrega; não bloquear funcionalidades por um redesign completo.
- Nas jornadas médica e do paciente, usar o protótipo original como referência de navegação, hierarquia, tipografia, cards, agrupamento, densidade e acabamento. Reaplicar a experiência aos dados conectados, sem copiar fixtures, criar outro design system ou refatorar telas fora do slice.
- IA auxilia, não decide condutas, diagnostica, prescreve, muda doses ou publica autonomamente.
- Aprovação médica e publicação ao paciente são ações diferentes. Registro interno finalizado não é automaticamente conteúdo do paciente.
- Não comprar serviços, trocar planos, liberar produção ou migrar infraestrutura automaticamente. Mudanças de custo e liberação clínica exigem decisão explícita.
- Não colocar senhas, tokens, dados de saúde ou capturas autenticadas em documentos versionados. Credenciais de teste compartilhadas não são aceitáveis para operação clínica real.

## 3. O que já existe

| Slice | Entrega registrada | Limite importante |
| --- | --- | --- |
| 1 | Autenticação, clínicas, papéis, diretório de pacientes e auditoria operacional | Cadastro demográfico não equivale a prontuário |
| 1B | Estrutura visual, navegação de equipe/paciente e estados vazios | Abas futuras não significam funcionalidades disponíveis |
| 2 | Agenda persistente, reagendamento, cancelamento e controle de conflitos | Melhorias operacionais listadas em 3D |
| 3 | Atendimento manual, rascunho, retomada, finalização e histórico de versões | Ainda não liberado para atendimento real |
| 3B | Adendos imutáveis e controle de versão também no banco | Fechado com persistência após sair/voltar, original preservado e Preview protegida |
| 3C | Convite e aceite de equipe; atribuição, aceite, suspensão, revogação e reatribuição de cuidado | Fechado com isolamento, bloqueio imediato e administrador sem conteúdo clínico; convite novo por e-mail ainda não exercitado ponta a ponta |
| 3D | Agenda e Atendimento com cinco estados coerentes, nome profissional preservado, busca/paginação e identidade visual reaplicada | Fechado no código, banco e navegador; não libera uso clínico real nem publica registro interno ao paciente |
| 4A | Plano interno ligado ao paciente/atendimento, rascunho, revisão médica, aprovação e nova revisão com histórico | Aprovação não publica; somente médico autor vinculado escreve/aprova; equipe clínica vinculada lê; paciente e admin não acessam |
| 4B | Publicação explícita, portal de orientações, confirmação de leitura, substituição e retirada com histórico | Somente publicação vigente da própria ficha; leitura não comprova adesão; sem notificações automáticas |

O slice 3D manteve os 66 testes da base e validou somente os 61 cenários diretamente afetados de Agenda, Atendimento, navegação e isolamento, todos aprovados após as correções concretas. Tipos, lint e build passaram. A migração remota `20260911055947_agenda_encounter_state_coherence` está aplicada; os registros anteriores foram preservados e todo dado sintético descartável desta validação foi removido.

Publicação protegida do 3D: código funcional `2fd4420`, documentação da entrega `2501d5b`, deployment `dpl_Eke15MbwD4rYQdU72YJkNBzZiCFu` `READY`, URL imutável https://instituto-vivance-gb6f0mcrg-vtr-consulting.vercel.app e alias https://instituto-vivance-testes-vtr-consulting.vercel.app. O build remoto passou com Next.js 16.3.4 e Node.js 24.x. Visitante anônimo recebeu o redirecionamento da proteção Vercel; pela CLI autenticada, a aplicação respondeu 200 com cache privado e a nova rota de busca sem sessão respondeu 401 com `private, no-store`. Nenhum erro apareceu nos logs do deployment na janela observada. Não houve merge para `main` nem promoção Production.

Asana: a tarefa `Slice 3B–3D — Base clínica e operação de atendimento` (`1218384571286751`) teve os seis BDDs e as evidências atualizados, foi marcada como concluída e movida para `Done`. A tarefa `Slice 4A–4D — Planos de cuidado e acompanhamento` (`1218384336844795`) permanece aberta em Development: 4A não encerra publicação e check-ins.

### Slice 4A — contrato e evidências

- Caminho: Atendimento → Criar plano de cuidado → Criar rascunho interno → preencher objetivos, ações, frequência, período e data de revisão → Salvar e revisar → confirmação médica → Aprovar. Retomada pela navegação Planos de cuidado. Nenhum campo recebe conteúdo clínico inventado ou recomendação automática.
- `care_plans` mantém a revisão de trabalho, com controle otimista de salvamento. `care_plan_versions` guarda snapshot imutável de cada salvamento/transição. Ao criar nova revisão, a aprovação anterior continua intacta no histórico. O 4B deverá referenciar uma versão aprovada imutável, nunca o conteúdo corrente mutável, e registrar publicação separadamente.
- Escritas permitidas somente ao médico autor com papel e vínculo ativos. Enfermeiro vinculado pode ler, não alterar/aprovar. Administrador operacional, paciente, outra clínica, profissional sem vínculo e sessão revogada não veem o conteúdo. Auditoria registra metadados, sem textos clínicos.
- Migrações de desenvolvimento aplicadas: `20260911062908_internal_care_plans` e `20260911064135_care_plan_conflicts_fail_fast`. A segunda é a única rodada de correção: conflito de versão obsoleta usa erro de integridade, não falha transitória de serialização que provocava retries e timeout no caminho real PostgREST. Nenhuma política/tabela clínica anterior foi alterada. Não há publicação implícita, exclusão de plano pela aplicação, prescrição eletrônica ou liberação Production.
- Verificação focada: quatro testes de validação/transições, histórico aprovado, conflito de versão, autoria/auditoria e isolamento passaram. Tipos, lint e build local passaram. Não houve expansão para cobertura exaustiva.
- Navegador local: criação a partir da Agenda/Atendimento, edição, salvamento, recarga, revisão, aprovação, recarga e nova revisão preservando aprovação anterior demonstrados. Escrita concorrente simulada por segundo salvamento autenticado; formulário obsoleto recebeu 409 em 205 ms, preservou texto e apresentou recuperação. Desktop 1440px e celular 390px sem overflow; revisão visual independente `ship` no estado de revisão, sem achados materiais. Portal do paciente continuou mostrando apenas agenda/contexto permitido, sem plano interno; API negou acesso ao plano com 403.
- Alertas Supabase preexistentes mantidos: RPCs deliberadamente `SECURITY DEFINER` de Agenda/Atendimento e proteção contra [senhas vazadas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) desativada. Nenhum alerta novo relativo às tabelas/funções de planos. Não mudar custo/configuração de Auth sem decisão.
- Limites: plano é interno nesta entrega; publicação, ciência, substituição/retirada e portal com orientação vigente são 4B. Lista paginada em blocos de 20; histórico em blocos de 10. Sem busca avançada ou geração de conteúdo.

Publicação 4A encerrada: implementação `b9bdac8`, correção funcional `ea313be`, deployment `dpl_6e7CBjUTX1vd61GK1FbycEvjCNE8` `READY`, URL imutável https://instituto-vivance-1tlsho7lu-vtr-consulting.vercel.app e alias protegido https://instituto-vivance-testes-vtr-consulting.vercel.app. Build remoto passou. CI obrigatório `34571098881` passou com testes, lint, tipos e build. Checagem remota: visitante anônimo 302 pela proteção; CLI autorizada recebeu 200 na entrada com cache privado e 401 na API de plano sem sessão da aplicação. Jornada autenticada validada no navegador local contra o Supabase de desenvolvimento, não simulada como jornada autenticada na Preview. A clínica descartável, duas contas sintéticas e seus registros foram removidos por IDs conferidos; nenhum registro preexistente foi removido. Não houve merge nem promoção Production.

### Slice 4B — publicação e portal encerrados

- Como testar: médico abre um plano aprovado, confirma e publica a revisão. Paciente abre Meu cuidado → Plano de cuidado e confirma “Li estas orientações”. Médico vê a ciência após atualizar. Criar novo rascunho não retira a publicação vigente; nova aprovação exige outra confirmação de publicação. Retirada exige motivo e confirmação, preservando o histórico interno.
- `care_plan_publications` copia a versão aprovada imutável; no máximo uma publicação vigente por plano. `care_plan_receipts` registra ciência explícita e idempotente, não adesão. RPCs verificam papel/vínculo vivos e serializam publicação/substituição/retirada. Auditoria atômica registra metadados, sem texto clínico. Políticas de planos internos não foram ampliadas; paciente só lê publicação vigente da própria ficha. Administrador não recebe conteúdo clínico.
- Migração de desenvolvimento aplicada: `20260911134151_care_plan_publication`. Nove testes focados passaram: aprovação/publicação separadas, vigência, conflito obsoleto, substituição, retirada, ciência, isolamento e rollback diante de falha de auditoria. Lint, tipos e build local passaram; sem expansão exaustiva. Nenhum novo alerta de segurança Supabase.
- Navegador local contra Supabase de desenvolvimento: aprovado ainda invisível, publicação, leitura persistida e visível ao médico, novo rascunho mantendo orientação anterior, substituição e retirada com histórico preservado. Desktop/celular conferidos; revisão visual independente sem bloqueios. Reutilizada a identidade do protótipo, sem novo design system. Duas contas e clínica sintéticas descartáveis removidas por IDs conferidos; registros anteriores preservados.
- Código `98942c7`; deployment `dpl_DueXZd2jCRzjALaLpKeXMXpRXoA3` READY, URL imutável https://instituto-vivance-hixtp90mo-vtr-consulting.vercel.app; alias protegido https://instituto-vivance-testes-vtr-consulting.vercel.app. Build remoto passou. CI `34606876830` passou. CLI 59.16.0 recusou autorização; a versão 59.15.1 já usada no projeto publicou normalmente, sem troca de conta/permissão.
- Checagens remotas: entrada pela proteção autorizada 200 com cache privado; visitante anônimo 302; nova API de publicações sem sessão 401 com `private, no-store`. CI `34606888353` também passou.
- Limites: jornada autenticada demonstrada localmente, não declarada como ensaio autenticado na Preview. Publicação/retirada ficam visíveis na próxima leitura/atualização do portal, sem push ou revogação de conteúdo já visto. Sem notificações automáticas, check-ins ou liberação clínica/Production. A tarefa Asana 4A–4D permanece aberta em Development: BDDs 2, 3 e 6 validados; 4C e 4D pendentes.

## 4. Sequência de implementação

Preservar as etapas macro do plano anterior: **4 = cuidado e acompanhamento; 5 = documentos, comunicação e áudio; 6 = IA**. As letras abaixo dividem essas etapas em entregas menores. Implementar e validar uma por vez.

### Fase A — concluir a base clínica

| Slice | Resultado demonstrável | Aceite essencial / dependência |
| --- | --- | --- |
| **3B — Adendos e integridade** | Médico autor acrescenta uma correção identificada a um atendimento finalizado, sem modificar o original | Motivo, autoria e data obrigatórios; original e adendos preservados; sem reabertura/destruição; bloqueio a paciente, admin, outra clínica e vínculo revogado. Fortalecer o controle de versão também no caminho de escrita do banco, não somente na API. Depende do 3 |
| **3C — Equipe e vínculos de cuidado** | Responsável autorizado convida/gerencia equipe e atribui ou revoga médico/enfermagem por paciente | Matriz explícita de quem pode conceder acesso; admin opera vínculos sem ler conteúdo clínico; profissional aceita responsabilidade quando aplicável. Revogação e suspensão bloqueiam acesso imediatamente. Sem escalada de privilégio ou atribuição entre clínicas |
| **3D — Agenda e atendimento coerentes — concluído** | Agenda diferencia agendado, em atendimento, concluído, cancelado e falta, conforme transições permitidas | Entregue: transições atômicas, bloqueios após início, nome cadastrado preservado, busca/paginação estável e telas conectadas alinhadas ao protótipo |

**Próxima implementação recomendada: 4C — Check-ins, diário e pré-consulta.** O 4B publica somente a revisão aprovada explicitamente confirmada; não publica notas internas de atendimento nem amplia o acesso clínico do administrador.

### Fase B — fechar a jornada de cuidado manual

| Slice | Resultado demonstrável | Aceite essencial / dependência |
| --- | --- | --- |
| **4A — Plano de cuidado interno** | Médico cria plano ligado ao paciente/atendimento, salva versões, revisa e aprova | Estados rascunho → revisão médica → aprovado; aprovação só por médico autorizado; versão aprovada imutável; nova mudança cria versão. Enfermagem não aprova conduta. Sem prescrição eletrônica. Depende de 3B/3C |
| **4B — Publicação e portal do paciente** | Médico publica versão aprovada e paciente vinculado a encontra em Meu cuidado | Paciente vê somente conteúdo publicado para ele, nunca notas internas/rascunhos. Registrar publicação, ciência do paciente, substituição e retirada com histórico; ciência não equivale a adesão. Versão nova exige nova aprovação. Depende de 4A |
| **4C — Check-ins, diário e pré-consulta** | Paciente envia relato/medidas e equipe vinculada registra revisão | Autoria, data e origem claras; relato não vira diagnóstico nem altera plano. Validação de campos, duplicidade e permissões; fila de pendências real. Sem promessa de atendimento imediato ou detecção automática de urgência. Depende de 3C/4B |
| **4D — Acompanhamento longitudinal** | Equipe visualiza linha do tempo, medidas e pendências; paciente acompanha seus registros e publicações | Indicadores calculados de dados persistidos, com período, unidade e origem; sem números inventados ou classificação clínica automática. Separar registros internos dos visíveis ao paciente. Depende de 4C |

### Gate P — liberação controlada do piloto

Preparar durante as fases A/B e concluir **antes de qualquer uso com dados de saúde reais**. Não esperar IA ou áudio para cuidar de segurança.

- Revisão do fluxo pelo médico responsável: registro, adendo, plano, aprovação, publicação e acompanhamento.
- Revisão técnica focada de autorização por papel/vínculo/clínica, sessão, armazenamento, logs e exportações. Concentrar aqui a participação pontual do Alfredo ou revisor sênior.
- Credenciais individuais fortes, recuperação de conta e MFA para equipe; nenhum acesso de teste compartilhado na operação real.
- Separar desenvolvimento/testes de produção, com dados e credenciais distintos. Preview nunca usa banco clínico de produção.
- Definir com responsáveis a privacidade, autorizações aplicáveis, retenção, atendimento a solicitações sobre dados e responsabilidades da clínica. Não alegar conformidade apenas por usar RLS ou uma região brasileira.
- Backup e restauração realmente ensaiados; objetivos de recuperação definidos, procedimento de incidente, rollback de aplicação e tratamento de migração de banco.
- Verificar limites, custos e recursos dos planos escolhidos antes de ativar operação; nenhuma contratação implícita neste roteiro.
- Testar jornada completa na URL publicada com médico, enfermeira e paciente; registrar commit, ambiente, evidências e limitações.
- Corrigir lentidão que prejudique tarefas, erros sem feedback, navegação por teclado e problemas de celular. Não exige redesign completo.
- Aprovação explícita do titular e responsável clínico para entrada gradual de pacientes.

**Menor piloto útil proposto:** 3B–3D + 4A–4C + Gate P. O 4D completo pode evoluir com o uso. Documentos, mensagens, áudio e IA não bloqueiam esse piloto se não forem necessários ao fluxo validado; funcionalidades indisponíveis devem permanecer claramente sinalizadas.

### Fase C — documentos e comunicação

| Slice | Resultado demonstrável | Aceite essencial / dependência |
| --- | --- | --- |
| **5A — Documentos privados** | Upload e acesso autorizado a documentos do paciente | Limite/tipo/tamanho, verificação de conteúdo e quarentena antes de disponibilizar; armazenamento privado, links temporários, isolamento de clínica/vínculo e origem registrada. Separar documento interno de compartilhado. Nunca tornar bucket público. Depende de 3C; saúde real depende do Gate P |
| **5B — Conversas** | Paciente e equipe vinculada trocam mensagens persistentes | Participantes autorizados, ordenação/paginação e estados de envio reais; sem prometer chat de emergência. Definir horário e responsável por acompanhar mensagens. Anexos somente via 5A |
| **5C — Notificações** | Lembrete e aviso de nova mensagem/publicação chegam ao destinatário correto | Preferências e canais confirmados, tentativas limitadas, idempotência, histórico de entrega/falha; não incluir informação clínica no e-mail/notificação. Implantar primeiro um canal autorizado, sem WhatsApp obrigatório. Depende dos eventos de agenda/4B/5B conforme o aviso |

### Fase D — áudio e processamento assíncrono

| Slice | Resultado demonstrável | Aceite essencial / dependência |
| --- | --- | --- |
| **5D — Base de processamento** | Tarefa percorre pendente → processando → concluída/falhou, com repetição controlada | Contexto de clínica/paciente validado no executor; idempotência, limites, timeout, retentativas e tratamento de falha definitiva. Sem payload clínico nos logs. Escolher solução compatível com volume/custo na implementação; não introduzir infraestrutura pesada por antecipação |
| **5E — Captura privada de áudio** | Profissional inicia gravação autorizada e acompanha upload recuperável | Autorização/consentimento registrado conforme fluxo definido; início/parada visíveis; limites e retenção aprovados; falha não simula gravação salva. Áudio privado ligado ao atendimento. Sem vídeo. Depende de 5A/5D e decisão específica sobre gravação |
| **5F — Transcrição revisável** | Áudio vira transcrição identificada como automática e profissional corrige antes de usar | Origem, fornecedor/modelo, custo e estado registrados; acesso clínico e tratamento de falhas; não preencher/finalizar prontuário automaticamente. Validar política de dados do fornecedor antes do envio. Depende de 5E |

### Fase E — IA assistiva com governança

| Slice | Resultado demonstrável | Aceite essencial / dependência |
| --- | --- | --- |
| **6A — Integração e políticas de IA** | Chamadas autorizadas passam por uma integração central, com teto de custo e políticas versionadas | Segredos só no servidor, escopo mínimo dos dados, versão do modelo/prompt, limites por clínica e trilha sem texto clínico nos logs. Validar região, retenção e condições do fornecedor. Sem fixar neste roteiro modelo/preço não verificado. Depende da base de acesso; usar 5D para tarefas longas |
| **6B — Resumo desde a última consulta** | Médico recebe rascunho com fatos, fontes/datas, lacunas e conflitos para revisar | Separar relato, cálculo, resumo e decisão; não inventar fonte nem preencher ausência; texto alterável/rejeitável. Nunca diagnosticar, prescrever ou decidir urgência. Depende de 4C/6A; 5F é opcional, pois pode começar com dados escritos |
| **6C — Rascunhos de evolução e orientações** | IA sugere texto e médico decide o que incorporar ao registro/plano | Comparação com fontes, revisão explícita e versionamento. Aprovar rascunho não publica ao paciente; respeitar 4A/4B e imutabilidade do atendimento. Depende de 6B; não inclui prescrição autônoma |
| **6D — Qualidade e operação da IA** | Responsáveis enxergam falhas, custos e resultados de avaliações | Casos de teste isolados para alucinação, omissão, instruções maliciosas em documentos e vazamento entre clínicas; bloqueio/desativação por módulo e procedimento de incidentes. Avaliações mínimas já são exigidas em 6A–6C; este slice consolida o painel operacional |

### Fase F — operação do produto e expansão

| Slice | Resultado demonstrável | Aceite essencial / dependência |
| --- | --- | --- |
| **7A — Relatórios e exportação** | Equipe autorizada exporta o conteúdo correto; admin vê indicadores operacionais sem conteúdo clínico | Separar exportação clínica da operacional; registrar autoria, versão, escopo e download; não exportar rascunho como documento aprovado. Arquivos temporários privados. Depende dos módulos reportados; antecipar exportação indispensável se a revisão do Gate P exigir |
| **7B — Usabilidade e desempenho consolidados** | Fluxos mais curtos e claros para médico, enfermagem e paciente, inclusive celular | Usar feedback do piloto; medir navegação/consultas, corrigir carregamento e gargalos; preservar 8 atalhos e regras de acesso. Não adiar defeitos impeditivos até este slice |
| **8A — Segunda clínica e gestão SaaS** | Nova clínica entra sem copiar código ou misturar dados | Onboarding, convites, papéis, configurações, suspensão/offboarding e acesso multi-clínica explícito. Testar isolamento também em arquivos, notificações, tarefas e IA. Base multi-tenant já é obrigatória antes; este slice valida expansão operacional |
| **8B — Custos, limites e cobrança opcional** | Consumo por clínica e limites previsíveis; cobrança somente se comercialmente necessária | Cotas, alertas e bloqueios seguros; faturamento não altera acesso clínico sem política definida. Plano comercial e provedor de pagamento dependem de decisão do titular. Não bloqueia piloto nem exige billing agora |
| **8C — Avaliação de escala/migração** | Decisão documentada a partir de medições reais e requisitos | Medir carga, latência, custos, tarefas longas, disponibilidade e exigências de dados. Se necessário, migrar módulos para desenho AWS do Alfredo com ensaio, reconciliação e rollback. Não prometer migração automática nem migrar por um número arbitrário de pacientes |

## 5. Contrato de conclusão de cada slice

1. Começar pelo estado real do código, desta referência e do Asana. Informar brevemente o resultado esperado e os critérios de aceite; escolhas de política clínica não são delegadas à IA.
2. Inspecionar Git e código antes de editar; preservar trabalho do usuário e dados existentes.
3. Entregar a menor jornada completa: banco/migração quando necessário, regras, API, tela e auditoria atômica das alterações.
4. Validar tipos, lint, testes e build; testar negações por papel, clínica, paciente/vínculo e sessão, inclusive chamadas diretas ao banco quando aplicáveis.
5. Demonstrar no navegador persistência após sair/voltar, estados vazios/erro/conflito e uso em celular. Não considerar API 200 como prova da interface.
6. Validar a Preview protegida e distinguir o que foi testado localmente do que foi testado online. Não promover produção automaticamente.
7. Dados sintéticos podem ser criados no desenvolvimento/testes quando claramente identificados; preservar registros existentes, manter os dados fora do funcionamento normal e limpar o descartável depois da prova.
8. Atualizar esta referência central, a documentação do módulo e o Asana. Manter tarefas maiores abertas enquanto houver BDD pendente; não repetir o mesmo relatório em vários arquivos.
9. Usar agentes auxiliares somente quando revisão ou teste independente trouxer ganho concreto, com um responsável pela integração e sem editar os mesmos arquivos ao mesmo tempo.
10. Pedir decisão somente para novo escopo de produto, regra clínica, acesso a dados, fornecedor que receberá dados, custo/contratação ou Production. Encerrar com resultado verificável e próximo slice recomendado.

## 6. Escopo posterior e rastreabilidade

Feegow, WhatsApp, wearables, prescrição eletrônica, gravação de vídeo, data lake, Kubernetes e cobrança self-service não entram automaticamente nesta sequência. Precisam de justificativa e escopo próprios. IA clínica autônoma permanece fora da proposta.

Os slices são fatias de implementação, não substitutos das tarefas de produto. A memória de planejamento registra 22 tarefas originais mais MVP-22A; a correspondência item a item com o Asana e os documentos 2.2 **não foi revalidada nesta organização**. Antes de declarar cobertura integral do MVP, reconciliar cada tarefa/critério com estes slices, apontar faltas e manter os identificadores originais. Não inventar a correspondência.

## 7. Instrução para a próxima janela

Continuar no diretório de implementação indicado acima. Os slices **3B — Adendos e integridade**, **3C — Equipe e vínculos de cuidado** e **3D — Agenda e atendimento coerentes** estão fechados no código, no Supabase de desenvolvimento e na Preview protegida. O 3D está no commit funcional `2fd4420`, deployment `dpl_Eke15MbwD4rYQdU72YJkNBzZiCFu`: cinco estados e transições atômicas, bloqueio de cancelamento/falta após início, snapshots do nome profissional, busca/paginação e direção visual do protótipo nas telas conectadas. Os 61 cenários diretamente afetados passaram; tipos, lint e builds local/remoto passaram. Agenda, Atendimento e área do paciente foram validados no navegador; celular em 390 px foi conferido. Dados sintéticos descartáveis foram removidos sem alterar os registros anteriores.

Próximo: **4C — Check-ins, diário e pré-consulta**; 4A e 4B estão encerrados em Preview protegida, código `98942c7`. Preservar os relatos do paciente como origem do paciente, sem diagnóstico ou alteração automática do plano. Confirmar decisões existentes sobre campos/cadência antes de inventar regras clínicas; priorizar o check-in manual mínimo completo. Reaproveitar o visual existente, validar somente riscos diretamente afetados e concluir navegador, Preview, documentação central e Asana. Não promover Production nem marcar a tarefa maior como concluída enquanto seus BDDs restantes não passarem.
