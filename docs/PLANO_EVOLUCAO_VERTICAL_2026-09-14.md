# VIVANCE — próximos caminhos de evolução

> **Status de execução — 14/09/2026:** a sequência V1–V4 deste plano foi implementada
> nas branches e PRs #18–#21, validada por CI e publicada somente em Supabase DEV
> e Vercel Preview. Produção, dados reais, áudio e IA permanecem fora desta execução.
>

Planejamento de 14/09/2026. Propõe quatro slices verticais e um marco de entrada em operação. Não autoriza implementação, migração, publicação, contratação ou uso de dados reais. Para a próxima sequência, esta proposta substitui as listas antigas somente após aprovação do titular.

## Diagnóstico breve

| Situação | Capacidade e limite da evidência |
| --- | --- |
| **Implementado e validado no escopo registrado** | Agenda, atendimento manual com versões/adendos, equipe/vínculos, planos com aprovação e publicação separadas, check-ins manuais, evolução neutra, documentos privados, conversas e avisos internos. Há registros de testes e jornadas sintéticas em desenvolvimento/Preview. Ficha, Hoje, consulta em quatro etapas, refinamentos móveis, revisão documental, leitura/idempotência de mensagens e relatórios manuais/publicação/PDF também têm fechamento local registrado. Isso não comprova todo o conjunto autenticado em Production. [F1–F4] |
| **Presente no código, ainda sem validação conectada suficiente** | Convite de paciente e onboarding: UI, serviços, migrations e duas Edge Functions existem. A evidência detalhada registra UI com API simulada, upload múltiplo não concluído e ativação remota pendente. A leitura do plugin Supabase nesta conversa, em 14/09, encontrou somente `invite-staff` e `private-documents` ativas; não demonstrou `invite-patient` e `claim-patient-invitation`. Não foi repetida essa consulta neste planejamento. [F3, F5] |
| **Parcialmente implementado** | Preparação: onboarding inicial com cinco perguntas e check-in de uma pergunta existem; falta preparação recorrente por consulta. Evolução: há medidas de check-ins e linha do tempo, mas com janelas limitadas, sem série integrada das medidas iniciais. Comunicação: texto, leitura e reenvio seguro existem; referência compartilhada a documento/orientação na mensagem ainda não. Processamentos: há contratos de fila, sem executor ou processamento de produto ativo. [F6–F9] |
| **Apenas planejado ou demonstrativo** | Tratamento estruturado, programas/metas, confirmação de consulta pelo paciente, prescrições, exames estruturados, integrações externas, vídeo, áudio/transcrição e IA. A aba Tratamento tem estado de indisponibilidade; o protótipo não prova implementação dessas capacidades na aplicação atual. Áudio e IA permanecem adiados por decisão explícita. [F2, F10] |
| **Pendente de confirmação** | Ambiente de dados usado pela publicação atual; configuração de Auth/retornos/envio de e-mail; prova autenticada do onboarding; Gate P e aprovação clínica. O conector Vercel consultado anteriormente estava na equipe pessoal, diferente de VTR CONSULTING. Não inferir prontidão operacional da página pública ou de um build aprovado. [F1, F3, F11] |

**Validação reaproveitada:** 141 testes, lint, tipos, build e evidências visuais/PDF registrados na consolidação. A comparação `8b1c71a..0b6dbf5` em `apps/web` e `supabase` altera somente `apps/web/vercel.json`; não justifica repetir a suíte nesta etapa. A inspeção atual foi de código, referências e documentação, sem execução da aplicação ou leitura de prontuários.

## Base conferida e divergências

- Pasta oficial: `/Users/vitormilanez/Developer/instituto-vivance`.
- Branch ativa: `codex/reconcile-macs-2026-09-14`; HEAD: `0b6dbf50ef9f5d0c4ecc72a0bbc4a63d26bec394`. `git ls-remote` confirmou `main` e a branch remota nesse mesmo SHA. `8b1c71a` é a consolidação anterior preservada.
- A [PR #17](https://github.com/vitormilanez/instituto-vivance/pull/17) está **closed**, não merged. Ela foi encerrada porque o conteúdo já estava em `main`. O campo `draft: true` e o head histórico `154f99d` da PR fechada não significam trabalho pendente ou branch atual atrasada.
- **Evidência de publicação:** o status do GitHub consultado agora para `0b6dbf5` retornou `Vercel: success`, vinculado ao [deployment 6zZ3oDgxBFsWPY3wv6BHUv5ZPRnm](https://vercel.com/vtr-consulting/instituto-vivance/6zZ3oDgxBFsWPY3wv6BHUv5ZPRnm). A conversa registra HTTP 200 nos dois domínios após esse deployment. Não houve nova inspeção de aliases, variáveis, logs ou sessão clínica nesta etapa; sucesso técnico não é prova de funcionamento integral.
- O arquivamento deixou **238 remoções locais não staged** de materiais históricos. Elas são anteriores a este plano, estão preservadas no arquivo externo e não representam exclusão de código. Este documento é a única adição desta etapa.

| Divergência | Tratamento neste plano |
| --- | --- |
| Handoff cita `853eaea`, PR #16 aberta e, em seções antigas, manda iniciar 7B.1; seções novas registram o lote concluído. | Usar Git atual para a base e o fechamento mais recente para escopo entregue. Não recriar 7B.1–7B.5, 5A.1/5A.2, 5B.1 ou 7A.1/7A.2. |
| README diz leitura de mensagens ausente, mas contratos, serviço e migration já têm cursor por participante. | Leitura e idempotência são existentes; apenas o contexto compartilhado é proposta nova. [F7] |
| Onboarding é chamado de concluído, mas sua evidência detalhada não demonstra Auth/Storage/e-mail reais. | Primeiro slice fecha a jornada conectada existente; não reimplementa suas telas. |
| Documento de onboarding menciona novas submissões preservadas; SQL tem `unique (tenant_id, patient_id)` na submissão e bloqueia edição após envio; o serviço usa `maybeSingle()`. | Tratar o onboarding atual como envio inicial único. Preparação recorrente terá contrato próprio, sem reabrir ou sobrescrever o original. [F5] |
| README afirma deploy automático desabilitado; configurações e histórico mostram habilitação. O workflow de `push` cobre apenas `codex/vercel-supabase-foundation`. | Não supor CI completo em cada push para `main`. Prever revisão da política de integração no marco operacional; não mudar CI ou deploy nesta etapa. [F11] |
| PRODUCT e documentos da raiz misturam aspirações de IA e protótipo Cloudflare com o app atual. | Preservar intenção e identidade; usar `apps/web` e migrations para afirmar disponibilidade. |

## Sequência recomendada

**V1 — Entrada e primeiro cuidado conectados → V2 — Preparação de cada retorno → V3 — Evolução por período com fontes → V4 — Conversa ligada ao cuidado compartilhado.**

Após V1, executar um marco de integração da jornada manual existente. Se o objetivo for entrada de pacientes reais, concluir o **Gate P antes dessa entrada**, sem esperar V2–V4. Se o objetivo continuar sendo evolução com dados sintéticos, seguir a sequência proposta enquanto se resolvem as decisões operacionais do Gate P. Os identificadores V1–V4 são desta proposta, não tarefas já criadas no Asana.

## V1 — Entrada e primeiro cuidado conectados

**Objetivo e beneficiados:** médico convida e recebe contexto real de uma conta de teste; paciente acessa, retoma e compartilha sua preparação com segurança. É o fechamento operacional de 3E/4E, não um novo onboarding.

**Valor, prioridade e demonstração:** remove a lacuna que impede aproveitar as entregas já prontas. Demonstrar convite → identidade confirmada → aceite → dados opcionais e dois exames → envio → leitura médica → orientação publicada → leitura pelo paciente, com persistência após novo login.

**Jornada:** médico cria convite por e-mail ou link de WhatsApp enviado manualmente; paciente confirma o e-mail e aceita o vínculo, preenche ou pula etapas, retorna ao rascunho e compartilha; médico abre a versão enviada na ficha e usa o fluxo existente de consulta/plano. Para convite administrativo, preservar o aceite de responsabilidade pelo médico.

**Incluído / excluído:** ativação das funções existentes no ambiente de teste aprovado; confirmação de retornos de Auth e envio; retomada, foto/exames privados e falhas recuperáveis; correções estritamente necessárias à jornada. Exclui redesenho, questionário novo, envio automático de WhatsApp, nova regra de vínculo, fornecedor adicional e liberação clínica automática.

**Dependências e impactos:** Vercel da equipe correta, projeto Supabase/ambiente explicitamente identificados, configuração segura de e-mail e redirects; comparar migrations necessárias antes de aplicá-las e verificar as duas funções de convite. Reutilizar UI, RPCs e Storage. Uma migration só se um defeito concreto de contrato exigir. Se a configuração remota já tiver sido corrigida, validar e omitir a alteração.

**Riscos:** associação à pessoa errada, reuso de token, exposição do rascunho, acesso após revogação, arquivo parcialmente enviado e falso sucesso de e-mail. Não confundir aceitação da requisição pelo provedor com recebimento comprovado. Não incluir tokens ou conteúdo clínico nas evidências.

**Conclusão verificável:** ambos os canais de convite percorrem a identidade confirmada; conta existente não duplica paciente; expirado/revogado/outra identidade não cria vínculo; novo login recupera rascunho; dois arquivos válidos persistem e falha posterior mantém os anteriores; médico vê apenas envio consentido; administrador, outra clínica e vínculo revogado não veem dados clínicos; orientação chega só após publicação explícita. Registrar SHA, ambiente, caminhos exercitados e limitações. Aplicar o fechamento comum abaixo.

**Modelo:** **Sol, medium**, porque cruza autenticação, permissões, funções privilegiadas, arquivos e ambiente remoto. Não delegar apenas para trocar o modelo; manter um executor e contexto restrito ao fluxo. Fontes: [F3–F5].

## V2 — Preparação de cada retorno

**Objetivo e beneficiados:** médico solicita uma atualização antes de um retorno específico; paciente relata o que mudou sem repetir seu onboarding.

**Valor, prioridade e demonstração:** transforma a entrada inicial em continuidade entre consultas. Demonstrar dois retornos do mesmo paciente com preparações independentes, rascunho retomável, envio e consulta médica dos originais corretos.

**Jornada:** na Agenda/ficha, médico solicita preparação para consulta futura; paciente encontra a solicitação em Hoje, responde um roteiro curto aprovado, pode pular perguntas, retoma e confirma o envio; médico abre essa preparação em Preparo e registra revisão interna, preservando o relato original. O paciente vê somente a confirmação de revisão; orientações continuam usando a publicação já existente.

**Incluído / excluído:** roteiro fixo versionado, associado à consulta e paciente; estado solicitado/rascunho/enviado/revisado/cancelado; no máximo um envio final por solicitação, com nova solicitação se necessário; aviso interno genérico. Reagendamento mantém a associação ao mesmo compromisso; cancelamento fecha a solicitação e preserva o histórico. Exclui construtor de formulários, escalas diagnósticas, recorrência automática, anexos novos, IA e alteração da máquina de estados da Agenda.

**Dependências e impactos:** V1; aprovação do roteiro pelo responsável clínico. Persistência própria para solicitação/respostas/revisão e vínculo à consulta; avaliar extensão dos check-ins somente se conservar semântica e originais, sem reaproveitar a submissão única do onboarding. Integrar Hoje, Agenda e Preparo; avisos exigem ampliar explicitamente a lista de eventos permitidos. Migração aditiva com políticas, auditoria e versão concorrente.

**Riscos:** vincular resposta à consulta errada, mudar perguntas depois de respondidas, expor rascunho, impedir consulta por pergunta opcional ou interpretar não resposta como risco. Cancelamento e envio concorrentes precisam de regra atômica; o cancelado preserva o que já foi enviado e recusa novos envios.

**Conclusão verificável:** dois retornos mantêm respostas distintas; roteiro enviado conserva sua versão; perguntas puladas não ganham resposta fictícia; rascunho só do paciente; envio repetido não duplica; alterações concorrentes são explícitas; cancelamento/reagendamento não transfere conteúdo silenciosamente; médico autorizado registra revisão sem mudar o original; negações por clínica/vínculo/papel passam. Fluxo funciona no celular e na consulta desktop.

**Modelo:** **Sol, medium**, por novos contratos de persistência, estados concorrentes, autoria e acesso. Fontes: [F5, F6, F10].

## V3 — Evolução por período com fontes

**Objetivo e beneficiados:** médico e paciente consultam a evolução disponível em um período escolhido, com datas, unidades e origem legíveis.

**Valor, prioridade e demonstração:** evita que o acompanhamento fique restrito aos registros mais recentes. Demonstrar medidas iniciais compartilhadas e de check-ins ao longo de três meses, filtro de período e acesso à fonte autorizada em ambas as áreas.

**Jornada:** paciente envia medidas pelos fluxos existentes; médico abre Evolução na ficha, escolhe período e série, lê tabela/gráfico e abre a fonte; paciente faz o mesmo com seus dados compartilhados. Novas orientações continuam sendo escritas e publicadas pelo médico no módulo já entregue.

**Incluído / excluído:** projeção integrada das medidas do onboarding submetido e dos check-ins; período com paginação/cursor consistente; tabela acessível e gráfico simples por unidade; links de origem. Persistência permanece nos registros originais; período pode ser mantido em URL sem valores clínicos. Exclui diário espontâneo novo, metas, classificação de tendência/risco, conversão automática de unidades, correção destrutiva e wearables.

**Dependências e impactos:** fontes existentes autorizadas; associação explícita e conservadora de peso/altura/cintura às unidades, sem tentar reconciliar nomes livres ambíguos. Alterar consultas e composição em Evolução; novas tabelas não são previstas. Validar consultas com paginação antes de decidir índices. V2 não é dependência técnica: pode ser antecipado se a leitura longitudinal for a maior dificuldade no piloto.

**Riscos:** misturar unidades, apresentar janela parcial como histórico completo, duplicar pontos ou revelar nota interna através de uma fonte. Usar data relatada e data de envio com nomes distintos; ausência de dados não vira zero nem julgamento clínico.

**Conclusão verificável:** período vazio e período com várias páginas são honestos; limites atuais de 50 check-ins/20 publicações não ocultam resultados sem indicação; cada ponto tem fonte/data/unidade; unidades incompatíveis ficam separadas; médico e paciente veem conjuntos autorizados, nunca nota privada; revogação bloqueia a origem; gráfico tem tabela equivalente e funciona com teclado/celular. Reutilizar e ampliar testes de projeção existentes apenas para esses casos.

**Modelo:** **Terra, medium**, porque o recorte é composição e consulta sobre persistência existente, sem regras clínicas novas. Se surgir necessidade de alterar RLS/contratos, delimitar essa mudança e usar Sol para ela, sem ampliar o slice por conveniência. Fontes: [F6, F8].

## V4 — Conversa ligada ao cuidado compartilhado

**Objetivo e beneficiados:** paciente e médico conversam sobre um documento ou orientação identificável, sem copiar informações entre módulos.

**Valor, prioridade e demonstração:** reduz a dúvida sobre “qual exame?” ou “qual orientação?”. Demonstrar o paciente enviando uma pergunta sobre documento já disponível, o médico abrindo a fonte e respondendo com referência à orientação publicada.

**Jornada:** em Documentos/Orientações, usuário escolhe “Conversar sobre este item”, confirma o interlocutor e escreve; mensagem mostra título seguro e referência; destinatário abre a fonte após nova autorização. Histórico e contexto permanecem ligados à mesma dupla paciente–médico.

**Incluído / excluído:** referências somente a documentos compartilhados disponíveis e à publicação vigente de plano; seletor/ação contextual; persistência da referência na mensagem; aviso interno genérico existente, leitura e reenvio seguro reutilizados. Exclui upload novo no compositor, relatório como nova categoria, documento interno, rascunho de plano, mensagens para enfermagem/equipe, notificações externas, áudio e IA.

**Dependências e impactos:** V1 e documentos/planos/conversas existentes. Extensão aditiva do contrato e RPC de mensagem, validação de acesso por remetente e destinatário, idempotência incluindo referência e texto; não persistir URL assinada. Referências são revalidadas na abertura. Não ampliar a audiência do arquivo ao anexar um link.

**Riscos:** ID forjado, troca de destinatário durante a composição, vazamento de título após revogação e referência a versão retirada. Item indisponível passa a ter marcador neutro; não retornar silenciosamente a outra versão. A mensagem original não é editada automaticamente por mudança na fonte.

**Conclusão verificável:** os dois sentidos abrem apenas fontes autorizadas; plano interno/documento privado são recusados no servidor; acesso perdido bloqueia conteúdo e metadados sensíveis; publicação substituída não muda o alvo; repetição após perda de resposta gera uma mensagem; falha preserva texto e referência; trocar destinatário exige resolver o rascunho; aviso e leitura da conversa continuam distintos. Verificar isolamento e revogação também por API direta.

**Modelo:** **Sol, medium**, porque a referência conecta duas fronteiras de autorização e modifica idempotência/persistência. Fontes: [F4, F7, F9].

## Marco de integração e Gate P

Não é uma fila de microtarefas técnicas nem novo produto a reconstruir. É o critério de liberação do cuidado manual entregue: médico e paciente percorrem entrada → preparo → consulta → orientação publicada → relato/mensagem → revisão/retorno, no ambiente escolhido, com identidades e dados de teste autorizados.

Após V1, executar uma regressão mais ampla dessa jornada usando as provas já existentes, com ênfase nas integrações ainda não exercitadas. Antes de pacientes reais, fechar separação de dados entre teste/produção, acesso e recuperação/MFA da equipe, revisão de autorização/Storage/exportações, política de privacidade/retenção, suporte e limites do canal, restauração de backup e rollback compatível com migrations; obter aceite do titular e responsável clínico. São exigências já registradas, não conformidade presumida por este documento. [F1]

A inspeção Supabase anterior encontrou avisos sobre senhas vazadas e funções privilegiadas. RLS sem política pode ser negação intencional e RPC privilegiada pode ter controles próprios: revisar o contrato antes de corrigir alertas; não abrir políticas apenas para silenciar o advisor. Provar operação com dados sintéticos não autoriza criar banco, contratar serviço ou alterar produção automaticamente.

## Validação proporcional em todos os slices

- **Durante a implementação:** ler o contrato existente, verificar os caminhos alterados e executar testes direcionados por mudança material. Não repetir a suíte completa após texto, espaçamento ou pequena correção.
- **No momento da mudança crítica:** testar permissões por papel/clínica/vínculo, revogação, idempotência e concorrência quando afetados. Migration exige revisão do delta, teste em banco efêmero/ambiente autorizado, negações e estratégia de recuperação; não deixar esses checks para o fim da UI. PGlite não substitui Auth e Storage hospedados.
- **No fechamento de cada slice:** lint, tipos, testes relevantes, build e jornada entregue autenticada quando aplicável; uma rodada agrupada desktop/celular, com teclado e falha/retomada/vazio. Registrar SHA e ambiente. Repetir somente o que for afetado por correção posterior.
- **Nos marcos:** regressão mais ampla após V1, após V2+V3 e após V4 se executados. Aproveitar fixtures e testes de isolamento, documentos, mensagens, relatórios e navegação. Evitar novos testes que apenas reproduzam detalhes de implementação.
- **Identidade e escopo:** manter azul-marinho, superfícies claras, marca e componentes atuais; oito ações rápidas da equipe, Agenda e separação aprovação/publicação. Não trocar stack, design system ou refatorar o legado. Corrigir somente obstáculos demonstrados na jornada do slice.

## Decisões, primeiro passo e branches

**Executar V1 primeiro:** há bastante produto pronto, mas a chegada de uma pessoa convidada ao primeiro cuidado ainda depende de prova conectada e possivelmente ativação de funções. É a forma mais curta de transformar o investimento existente em uma jornada demonstrável. V2–V4 são propostas novas, priorizadas depois desse fechamento; não considerar suas descrições autorização de execução.

**Atenção do titular:** aprovar esta sequência; indicar se o próximo marco visa demonstração sintética ou piloto real; confirmar o ambiente de validação e acesso à equipe correta da Vercel. Para V2, responsável clínico aprova perguntas e regra de cancelamento. Antes do piloto real, decidir política de dados, operação/suporte e recuperação junto aos responsáveis. Nenhum fornecedor novo é necessário para os recortes propostos; entrega de e-mail permanece dependência a confirmar.

**Caminhos posteriores, sem iniciar:** diário espontâneo/múltiplas medidas, acompanhamento estruturado do plano, confirmação de consulta e canais externos só após observar necessidades do piloto e definir seus contratos. Tratamento/prescrição e integrações não devem ser inferidos dos cards do protótipo. Áudio/transcrição e IA continuam fora da sequência, até decisão específica.

**PR #17:** manter encerrada como referência histórica. Não reabrir nem fazer merge em sua antiga base `codex/onboarding-paciente`. Recomendar novos branches `codex/<slice>` a partir de `origin/main` atualizado — referência confirmada neste plano: `0b6dbf5`. A `main` local ainda está antiga; não usá-la sem atualização posterior verificada.

Antes de implementar, tratar a organização local separadamente: as 238 remoções e este plano não devem entrar por acidente na PR de produto. Um novo worktree pelo Git a partir de `origin/main` permite isolar o slice, mantendo a pasta oficial e seu `.git` como base; os artefatos arquivados podem reaparecer nesse checkout porque ainda existem no remoto. Decidir sua incorporação em uma alteração documental própria, sem desfazer o arquivo nem usar `git add -A` indiscriminadamente. Criar worktree/branch, commits ou PRs é recomendação futura, não ação desta etapa.

## Fontes e referências de apoio

Links locais são relativos à pasta `docs`; código consultado no HEAD indicado. As evidências históricas são atribuídas aos ambientes e escopos descritos, não reexecutadas.

- **F1:** [Handoff vigente](PROXIMOS_SLICES_E_HANDOFF.md), seções de fechamento local, limites e Gate P; [continuidade Git](CONTINUIDADE_GIT_2026-09-14.md). Contêm também trechos históricos divergentes identificados acima.
- **F2:** [README da aplicação](../apps/web/README.md), [PRODUCT](../PRODUCT.md), [DESIGN](../DESIGN.md), [plano anterior de slices](PLANO_PROXIMOS_SLICES_2026-09-12.md) e [migração histórica](PLANO_MIGRACAO_MODULOS.md).
- **F3:** [Onboarding: escopo, evidências e limites](ONBOARDING_MVP.md); inspeção autenticada do plugin Supabase nesta conversa em 14/09/2026 (projeto `instituto-vivance-dev`, `oxuwrdjojsmgxoljqkuk`), sem inferência sobre outro projeto de produção.
- **F4:** [Documentos](DOCUMENTOS_MVP.md), [Conversas](CONVERSAS_MVP.md), [Avisos internos](NOTIFICACOES_MVP.md), [Atendimento](ATENDIMENTO_MVP.md) e [Agenda](AGENDA_MVP.md).
- **F5:** [serviço de onboarding](../apps/web/modules/onboarding/service.ts), [UI](../apps/web/components/onboarding-workspace.tsx), [schema e regras](../supabase/migrations/20260912175851_patient_invitations_and_onboarding.sql), [convite](../supabase/functions/invite-patient/index.ts) e [reivindicação](../supabase/functions/claim-patient-invitation/index.ts).
- **F6:** [contrato de check-ins](../apps/web/modules/check-ins/validation.ts), [Evolução: consultas](../apps/web/modules/longitudinal/service.ts), [projeção de medidas](../apps/web/modules/longitudinal/project.ts).
- **F7:** [mensagens: serviço](../apps/web/modules/messages/service.ts), [contrato](../apps/web/modules/messages/validation.ts), [idempotência e leitura](../supabase/migrations/20260912175857_direct_message_idempotency_and_reads.sql).
- **F8:** [Evolução: interface](../apps/web/components/longitudinal-workspace.tsx), [testes de projeção](../apps/web/tests/longitudinal.test.ts), [testes de isolamento](../apps/web/tests/isolation.test.ts).
- **F9:** [documentos: serviço](../apps/web/modules/documents/service.ts), [publicação de planos](../apps/web/modules/care-plans/publication-service.ts), [relatórios](../apps/web/modules/reports/service.ts), [publicação/exportação](../apps/web/modules/reports/publication-service.ts) e [base de processamento](PROCESSAMENTOS_MVP.md).
- **F10:** [portal atual](../apps/web/components/patient-area.tsx), [próximo passo do paciente](../apps/web/modules/workspace/patient-next-step.ts), [consulta em etapas](../apps/web/components/encounter-editor.tsx).
- **F11:** [workflow GitHub](../.github/workflows/web-foundation.yml), [configuração Vercel](../apps/web/vercel.json), [commit-base](https://github.com/vitormilanez/instituto-vivance/commit/0b6dbf50ef9f5d0c4ecc72a0bbc4a63d26bec394), PR #17 e status de deployment consultados nesta etapa.

Documento produzido no modelo principal GPT-6, sem delegação ou troca de modelo. Terra/Sol acima são recomendações para implementação futura. Não houve implementação, teste de aplicação, alteração remota ou início de slice.

