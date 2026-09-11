# Vivance — próximos slices e passagem de contexto

Atualizado em 11/09/2026. Plano de execução proposto; não representa funcionalidades já entregues nem autorização para uso clínico real.

## 1. Onde continuar

- Diretório de implementação: `/Users/vitormilanez/Desktop/Codes/instituto-vivance-vercel`.
- Aplicação: `apps/web`. Branch atual: `codex/vercel-supabase-foundation`.
- Repositório: `https://github.com/vitormilanez/instituto-vivance.git`.
- PR de trabalho: https://github.com/vitormilanez/instituto-vivance/pull/11.
- Prévia protegida: https://instituto-vivance-testes-vtr-consulting.vercel.app.
- Endereço local usado nos testes: http://127.0.0.1:3010. Confirmar se o servidor está ativo antes de orientar o usuário.
- Base documental conferida nesta organização: commit `0ebe396`, com implementação clínica em `12908c6` e ajuste de orientação em `128aacf`. Conferir novamente Git, arquivos e ambiente ao iniciar a próxima janela.
- Não confundir com `/Users/vitormilanez/Desktop/Codes/Instituto Vivance`, que contém o protótipo original e pode conter trabalho do usuário. Não desenvolver a migração ali.

Ler primeiro este documento, `apps/web/AGENTS.md`, `docs/ATENDIMENTO_MVP.md`, `docs/AGENDA_MVP.md` e `apps/web/README.md`. Consultar `docs/PLANO_VERCEL_SUPABASE.md` para decisões de arquitetura, lembrando que suas seções iniciais são históricas, não um retrato atual de disponibilidade.

## 2. Decisões preservadas

- Piloto: Instituto Vivance, um médico, uma enfermeira e aproximadamente 50 pacientes. Expandir para outras clínicas depois de validar o uso.
- Manter uma aplicação modular, código local e Git, APIs versionadas, Vercel e Supabase. Separar regras de negócio das telas e dos fornecedores; não criar vários serviços independentes agora.
- Isolamento por clínica desde o início. Administrador operacional não ganha acesso clínico por ser administrador.
- Sem mocks no aplicativo, preenchimento artificial de indicadores ou sucessos simulados. Fixtures somente em testes isolados. Preservar contas, cadastros e registros de teste já autorizados.
- Manter os 8 atalhos do painel. Fazer ajustes básicos de clareza, acessibilidade e desempenho em cada entrega; não bloquear funcionalidades por um redesign completo.
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
| 3 | Atendimento manual, rascunho, retomada, finalização e histórico de versões | Gestão de vínculos continua pendente; ainda não liberado para atendimento real |
| 3B | Adendos imutáveis e controle de versão também no banco | Implementado, Preview protegida validada e checks verdes; falta persistência em navegador com novo registro sintético autorizado |

O documento do slice 3 registra 52 testes, lint e tipos aprovados, testes de persistência no navegador local e publicação protegida. O fluxo completo do médico não foi repetido no navegador do último deployment; essa validação online continua necessária. Os prints enviados pelo titular mostram um registro finalizado com três versões; não alterar esse registro para testar a próxima entrega.

## 4. Sequência de implementação

Preservar as etapas macro do plano anterior: **4 = cuidado e acompanhamento; 5 = documentos, comunicação e áudio; 6 = IA**. As letras abaixo dividem essas etapas em entregas menores. Implementar e validar uma por vez.

### Fase A — concluir a base clínica

| Slice | Resultado demonstrável | Aceite essencial / dependência |
| --- | --- | --- |
| **3B — Adendos e integridade** | Médico autor acrescenta uma correção identificada a um atendimento finalizado, sem modificar o original | Motivo, autoria e data obrigatórios; original e adendos preservados; sem reabertura/destruição; bloqueio a paciente, admin, outra clínica e vínculo revogado. Fortalecer o controle de versão também no caminho de escrita do banco, não somente na API. Depende do 3 |
| **3C — Equipe e vínculos de cuidado** | Responsável autorizado convida/gerencia equipe e atribui ou revoga médico/enfermagem por paciente | Matriz explícita de quem pode conceder acesso; admin opera vínculos sem ler conteúdo clínico; profissional aceita responsabilidade quando aplicável. Revogação e suspensão bloqueiam acesso imediatamente. Sem escalada de privilégio ou atribuição entre clínicas |
| **3D — Agenda e atendimento coerentes** | Agenda diferencia agendado, em atendimento, concluído, cancelado e falta, conforme transições permitidas | Concluir atendimento não deixa a consulta visualmente agendada; preserva histórico e identidade. Cancelamento/falta após início são bloqueados. Mostrar nome cadastrado do profissional, sem inventar identidade; busca/paginação clínica para superar listas limitadas |

**Próxima implementação recomendada após fechar as duas validações pendentes do 3B: 3C.** O 3B não transforma adendo em edição da versão final nem em assinatura digital certificada.

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

1. Registrar objetivo, papéis autorizados, dependências e o que fica fora. Escolhas de política clínica não são delegadas à IA.
2. Inspecionar Git e código antes de editar; preservar trabalho do usuário e dados existentes.
3. Entregar a menor jornada completa: banco/migração quando necessário, regras, API, tela e auditoria atômica das alterações.
4. Validar tipos, lint, testes e build; testar negações por papel, clínica, paciente/vínculo e sessão, inclusive chamadas diretas ao banco quando aplicáveis.
5. Demonstrar no navegador persistência após sair/voltar, estados vazios/erro/conflito e uso em celular. Não considerar API 200 como prova da interface.
6. Validar prévia protegida e distinguir o que foi testado localmente do que foi testado online. Não promover produção automaticamente.
7. Documentar evidências, limitações, mudanças de dados de teste e procedimento de recuperação. Dados clínicos e credenciais ficam fora do Git e dos logs.
8. Encerrar com resultado verificável e próximo slice recomendado. Não marcar o roadmap inteiro como concluído por entregar uma parte.

## 6. Escopo posterior e rastreabilidade

Feegow, WhatsApp, wearables, prescrição eletrônica, gravação de vídeo, data lake, Kubernetes e cobrança self-service não entram automaticamente nesta sequência. Precisam de justificativa e escopo próprios. IA clínica autônoma permanece fora da proposta.

Os slices são fatias de implementação, não substitutos das tarefas de produto. A memória de planejamento registra 22 tarefas originais mais MVP-22A; a correspondência item a item com o Asana e os documentos 2.2 **não foi revalidada nesta organização**. Antes de declarar cobertura integral do MVP, reconciliar cada tarefa/critério com estes slices, apontar faltas e manter os identificadores originais. Não inventar a correspondência.

## 7. Instrução para a próxima janela

Continuar no diretório de implementação indicado acima. Confirmar branch e alterações locais; ler as instruções aplicáveis e os documentos de evidência. O **slice 3B — Adendos e integridade** está implementado no código e no banco de desenvolvimento, com 56 testes, checks verdes, validação local da tela sem envio e Preview protegida `dpl_7rDEyw7LvpLfNEihdSoyb1C89okA` READY no alias fixo. Antes de encerrá-lo integralmente, com autorização para criar um novo registro sintético, confirmar adendo persistido após sair e voltar. Não alterar os registros finalizados preservados nas capturas. Depois, iniciar o **slice 3C — Equipe e vínculos de cuidado** sem implementar toda a lista de uma vez, apagar dados existentes, inserir mocks, comprar serviços ou promover produção. Se for necessário definir autoridade clínica ou alterar política de acesso além do descrito, pedir a decisão ao titular antes de aplicar.
