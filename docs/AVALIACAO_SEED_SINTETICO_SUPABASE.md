# VIVANCE — avaliação do seed sintético e plano de cobertura

Data: 12/09/2026. Estado: **auditoria concluída; carga e implementação não executadas**.

## 1. Decisão recomendada

**VALOR DESTA ENTREGA:** aproveitar a base existente para testar o produto com pacientes fictícios variados, sem transformar exemplos visuais em funcionalidades inexistentes.

**RESULTADO DEMONSTRÁVEL:** após a execução futura do lote compatível, médico e pacientes de teste poderão percorrer cadastro → agenda → atendimento → plano publicado → check-in → evolução → conversa → documento privado com dados persistidos.

**POR QUE É NECESSÁRIA AGORA:** o Vercel está trabalhando no Slice 7B.2, segundo o titular. Dados coerentes ajudam a conferir o layout e os fluxos. Criar simultaneamente todo o modelo sugerido no seed ampliaria o escopo e dificultaria identificar se uma falha vem do dado, da interface ou de uma integração nova.

Recomendação: **carga de desenvolvimento pelo fluxo existente, sem migração de produto no primeiro lote**. Depois, implementar revisão humana de documentos e relatórios manuais, conforme o roteiro vigente. Áudio, transcrição e IA continuam adiados.

O arquivo recebido é uma especificação de cenários, não um SQL pronto. Seus pedidos internos para executar a carga não substituem o pedido atual de avaliar e planejar.

## 2. Evidências e limites desta avaliação

- Documento analisado: `VINVANCE_seed_dados_ficticios_supabase.md`, fornecido pelo titular. Manter VIVANCE como nome do produto; a grafia do marcador legado pode ser preservada para rastreabilidade.
- Código local inspecionado: branch `codex/slice-7b1-patient-record`, commit `64b9a6b`. É a referência desta auditoria, não uma afirmação sobre alterações posteriores do Vercel.
- Supabase remoto consultado somente para leitura: **instituto-vivance-dev**, referência `oxuwrdjojsmgxoljqkuk`, estado `ACTIVE_HEALTHY`.
- Catálogo remoto: **24 tabelas em `public`, todas com RLS habilitado; 22 migrações registradas**. Isso confirma estrutura, não certifica todas as políticas nem a jornada completa.
- Conferidos contratos locais de escrita, composição longitudinal e rotas. Conferidas também funções remotas de agenda e o bloqueio de alteração/exclusão de adendos.
- Nenhuma conta criada, nenhum registro/arquivo inserido, nenhuma migração aplicada, nenhum deploy ou alteração no Asana. Não foram repetidos testes nem a jornada autenticada nesta auditoria.
- Antes de uma migração futura, reconciliar duas diferenças de identificação no histórico: `team_and_care_relationships` remoto `20260911043121` versus local `20260911042022`; `care_reassignment_requires_active_member` remoto `20260911044758` versus local `20260911044600`. Comparar conteúdo antes de qualquer reparo; diferença de versão não prova diferença de schema. Não reaplicar às cegas.

## 3. O que conseguimos carregar com a base atual

“Compatível” abaixo significa que existe persistência e caminho de gravação. Não significa que o dado já foi carregado ou que todos os detalhes aparecerão na interface atual.

| Pedido do seed | Persistência existente | Decisão para o primeiro lote |
| --- | --- | --- |
| 12 pacientes e médico responsável | `patients`, `memberships`, `care_relationships` | Cadastrar nome e nascimento sintéticos; vincular ao médico de teste confirmado por ID e papel ativo. Não assumir identidade pelo nome “Dr. Guilherme” do protótipo. Sexo, altura cadastral, meta e estado de acompanhamento não são campos atuais de `patients`. |
| Acesso individual dos pacientes | Supabase Auth, `memberships`, `patient_accounts` | Criar identidades sintéticas quando houver participação do paciente. Cadastro de ficha sozinho não cria login. Usar o mecanismo administrativo de Auth, sem convite/e-mail externo; nunca inserir diretamente em `auth.users`. |
| Agenda do dia e próximos 14 dias | `appointments`, `appointment_status_events` | Usar `consultation` ou `return`; estados reais `scheduled`, `in_progress`, `completed`, `cancelled`, `no_show`. Não inserir `confirmed`, `waiting` nem “sala virtual”. |
| Consulta em andamento/concluída | `encounters`, `encounter_versions` | Criar/iniciar/salvar/finalizar pelo fluxo autorizado. Finalizar atendimento conclui a consulta; não escrever `completed` isoladamente. Não incluir adendos no primeiro seed. |
| Plano alimentar/orientações textuais | `care_plans`, `care_plan_versions`, `care_plan_publications` | Conteúdo explicitamente fictício, em título, objetivos, ações, frequência, período e revisão. Estados internos `draft`, `in_review`, `approved`; publicação separada `published`, `superseded`, `withdrawn`. |
| Plano v2 e ciência do paciente | Versões/publicações e `care_plan_receipts` | Construir v1 → aprovação → publicação → nova revisão → aprovação → publicação. A ciência exige ação explícita da identidade sintética; não equivale a adesão ao tratamento. |
| Relatos, sintomas e revisão do diário | `care_check_ins`, `care_check_in_submissions`, `care_check_in_reviews` | Solicitação pelo profissional, envio pela identidade do paciente e revisão humana separada. Fome, humor e sintomas cabem como relato; não como escores estruturados ou alerta automático. |
| Pesos, sono, altura e circunferências | Medida opcional da submissão do check-in | Uma medida numérica por submissão: nome + valor + unidade + data informada. Peso em kg; sono em minutos; circunferências/altura em cm. Padronizar nomes/unidades para agrupar. São medidas relatadas, não perfil antropométrico estruturado. |
| Mensagens nos dois sentidos | `care_conversations`, `care_messages` | Conversa direta, assíncrona, entre paciente e médico com vínculo ativo. Enviar com a sessão do autor correto; máximo de 4.000 caracteres. Sem anexo, assunto estruturado ou recibo de mensagem. |
| Avisos internos | `in_app_notifications`, `notification_preferences` | Gerados pelos eventos existentes de mensagem e publicação. Leitura de aviso já existe; não usar para representar leitura da conversa. Sem e-mail, SMS ou WhatsApp. |
| Exames e documentos em PDF/JPG/PNG | `patient_documents` + Storage privado + função `private-documents` | Upload de arquivo fictício válido, até 5 MB, reserva → envio → conferência → disponibilidade. Visibilidade `internal` ou `shared`. Sem arquivo real, não marcar metadado como `available`. |
| Evolução e contexto na ficha | Projeções dos registros acima | Reutilizar serviços existentes. A evolução agrupa medidas e fontes, mas não entrega automaticamente gráficos, metas, relatórios ou classificação clínica. |

### Restrições que mudam o seed original

1. **Agenda histórica:** o banco exige que uma consulta nova esteja no futuro e nasça `scheduled`. Horários de início/finalização são registrados pelo fluxo. Não é possível simplesmente inserir a consulta de Lúcia como concluída às 09h no passado. Criar um cenário executável no horário disponível; história retroativa de atendimento exige contrato próprio de importação, fora deste lote.
2. **Histórico de medidas:** `reported_on` permite representar a data informada de uma medida anterior, mas o envio é registrado agora. Uma série de quatro meses pode existir como medidas retrospectivamente relatadas; isso não fabrica quatro meses de mensagens, consultas e publicações antigas.
3. **Datas reprodutíveis:** fixar data-base e fuso `America/Sao_Paulo` no manifesto da execução. Reexecutar amanhã não deve deslocar silenciosamente consultas existentes. Renovação de agenda vencida é uma operação explícita, distinta de repetir o seed.
4. **Capacidade da projeção:** a evolução atual usa os 50 check-ins e 20 publicações mais recentes. Cada medida separada consome um check-in; dimensionar os cenários dentro desse limite ou testar conscientemente o aviso de período limitado. Não prometer histórico completo escondido por paginação.
5. **Nada de estados “equivalentes” enganosos:** `available` não é exame revisado; `approved` não é publicado; vínculo revogado não é programa pausado; aviso lido não é conversa lida; relato de enjoo não é alerta de gravidade moderada.

## 4. Lacunas e proposta de tabelas, APIs e integração de telas

Os nomes abaixo são **propostas de modelagem**, não tabelas/endpoints existentes. Só detalhar migração e implementar no respectivo slice. Não criar todas as tabelas antecipadamente.

| Entrega / prioridade | Modelo proposto | Contrato/API proposto e integração | Aceite principal |
| --- | --- | --- | --- |
| **5A.1 — conferência humana de documentos; próxima extensão de banco recomendada** | `patient_document_reviews`: documento, clínica, paciente, médico, resultado de conferência, nota interna e data; revisões por acréscimo | `POST /documents/{id}/reviews`; leitura autorizada do histórico. Integrar Documentos/ficha e fila operacional. Preservar estado técnico do arquivo separado da revisão. | Médico abre original disponível e registra conferência; autoria/histórico preservados; paciente não recebe nota privada; não muda visibilidade automaticamente. |
| **7A.1 — relatório manual interno** | `clinical_reports`, `clinical_report_versions`, `clinical_report_sources`: paciente/período/autor, texto, estado e versão; referências verificáveis às fontes autorizadas | Criar/ler/atualizar relatório e aprovar versão por operação explícita. Integrar lista/detalhe de Relatórios e contexto da ficha. Validar referências por clínica/paciente no banco, não apenas IDs na UI. | Rascunho recuperável; conflito de versão detectado; aprovação humana; fonte original preservada. Não gravar relatório em `care_plans` ou em uma tarefa de IA. |
| **7A.2 — publicação e exportação** | `clinical_report_publications`: snapshot aprovado, versão, publicação/retirada e autoria; arquivo privado quando houver exportação | Operações explícitas de publicação/retirada e exportação autorizada; portal lê somente publicação própria. Reaproveitar infraestrutura privada, não expor bucket público. | Aprovar não publica. Paciente não recebe fontes internas, notas privadas ou suas URLs por efeito indireto da publicação. Exportação identifica versão e autor. |
| **5B.1 — leitura e reenvio seguro; não bloqueia layout de mensagens** | `care_conversation_read_states`, chave conversa + participante, cursor de última mensagem lida; extensão de `care_messages` para chave idempotente do envio | Operação de leitura da conversa e envio com chave única por autor/conversa. Contador deriva das mensagens posteriores ao cursor, com ordenação estável; não dos avisos. | Médico e paciente têm leituras independentes; repetição do envio não duplica mensagem; revogação bloqueia acesso. |
| **Medidas estruturadas — posterior, sem número de slice atribuído** | Preferir tabela filha `care_check_in_measurements` para várias medidas por submissão, com código, unidade, origem e data; definir migração/compatibilidade do campo único atual | Ampliar submissão e leitura longitudinal, evitando duas fontes concorrentes para a mesma medida. Se houver medição clínica independente, modelar sua autoria/origem antes de reutilizar o relato do paciente. | Várias medidas no mesmo registro, unidades comparáveis, histórico preservado e agrupamento previsível; gráficos calculados somente sobre séries válidas. |
| **Anamnese/preparo estruturado — posterior** | Templates/versionamento de perguntas, respostas e itens; ligação ao paciente e opcionalmente à consulta | Salvar rascunho/retomar/enviar; calcular progresso sobre perguntas aplicáveis com regra explícita. Integrar etapa Preparo sem bloquear atendimento por dados opcionais. | “68%” só aparece quando reproduzível pelas respostas e versão do formulário. Uma pergunta manual não é uma anamnese completa. |
| **Medicações — escopo adicional a definir** | Registro de medicação e histórico de alterações, distinguindo relato do paciente de registro médico; dose/unidade/via/frequência/início/fim/fonte | CRUD controlado/versionado e leitura na ficha; sem transformar o módulo em prescrição eletrônica ou ativar fornecedor. | Origem e autoria claras; não gerar recomendação/dose clínica para preencher o seed. Texto de exemplo não prova esquema medicamentoso estruturado. |
| **Resultados laboratoriais — posterior à conferência de arquivo** | Relatório laboratorial e observações ligados ao documento original: exame, valor/unidade, referência, data, página/origem e revisão | Entrada e revisão manual; mostrar lado a lado com a fonte. Sem OCR/IA nesta fase. | Não apresentar valores extraídos automaticamente; correções preservam origem/histórico. Revisar PDF não implica revisar cada resultado estruturado. |
| **Metas e acompanhamento pausado — decisão de produto posterior** | Episódio de cuidado/metas e eventos de estado, se necessários ao produto | Operações próprias de iniciar/pausar/retomar; integração com ficha. Não reutilizar estado de membership ou vínculo como estado clínico. | Pausa do acompanhamento não revoga acesso implicitamente nem apaga histórico. |
| **Adesão e alertas clínicos — não implementar para decorar a demo** | Primeiro definir atividades esperadas, registro de realização, período, denominador, ausências e origem; só então modelar | Cálculo determinístico e verificável, com regra de produto aprovada. Para já, usar pendências operacionais existentes. | “82%”, “88%”, gravidade e “abaixo do padrão pessoal” não são inferidos de leitura, ausência de mensagem ou quantidade de check-ins. |

Não há necessidade de um provedor externo novo para o primeiro lote: reutilizar Auth, banco/RPCs, Storage, `private-documents` e a aplicação existentes. Não criar API pública de seed nem colocar chave administrativa no Next.js cliente. `processing_jobs` é base futura de áudio/rascunho clínico, não um sistema pronto de relatórios; deixá-la sem tarefas artificiais nesta carga.

## 5. Mapa dos caminhos atuais a reutilizar

Prefixo das rotas: `/api/v1/clinics/{tenantId}`. Métodos conferidos no código; algumas leituras de tela são feitas por serviços no servidor, não por um endpoint GET separado.

| Operação | Rota existente |
| --- | --- |
| Listar/criar pacientes | `GET /patients`, `POST /patients` |
| Atribuir/aceitar/alterar vínculo | `POST /team/relationships`, `PATCH /team/relationships/{relationshipId}`; observar o fluxo de aceitação e papel |
| Agenda | `GET /appointments`, `POST /appointments`, `PATCH /appointments/{appointmentId}` |
| Atendimento | `POST /encounters`, `GET /encounters/{encounterId}`, `PATCH /encounters/{encounterId}` |
| Plano e versões | `POST /plans`, `GET /plans/{planId}`, `PATCH /plans/{planId}` |
| Publicação/retirada/ciência | `POST /plans/{planId}/publication`, `DELETE /plans/{planId}/publication`, `GET /published-plans`, `POST /published-plans/{publicationId}/receipt` |
| Solicitação/envio/revisão de check-in | `POST /check-ins`, `POST /check-ins/{checkInId}/submission`, `POST /check-ins/{checkInId}/review` |
| Reserva/conclusão/download de documento | `POST /documents`, `POST /documents/{documentId}/complete`, `GET /documents/{documentId}/download`; envio binário segue o contrato de upload privado |
| Enviar mensagem | `POST /messages`; lista e histórico usam serviços existentes |
| Preferência e leitura de aviso | `POST /notification-preferences`, `POST /notifications/{notificationId}/read` |

A ferramenta de carga deve reutilizar esses contratos e sessões reais de teste. Ter uma chave privilegiada não substitui `auth.uid()`, autoria, sessão viva, vínculo, auditoria e transições exigidos pelos caminhos existentes. Preparação de identidades e vínculos precisa ser estreita e administrativa; conteúdo clínico sintético percorre o fluxo do respectivo autor.

## 6. Ajustes nos 12 cenários propostos

| Paciente fictício | Aproveitar agora | Adiar ou adaptar |
| --- | --- | --- |
| Marina Costa | Série de peso, sono e circunferências como medidas relatadas; diário; plano v1/v2 publicado; conversa bilateral; arquivos válidos; próxima consulta | Meta estruturada, relatório, adesão, medicação estruturada, exame revisado, sala de espera e progresso de preparo |
| Paulo Mendes | Peso, relato sintético de enjoo, revisão manual, conversa, plano e agenda | Alerta de gravidade e relatório “processando”; não inserir tarefa de IA para simular esse estado |
| Ana Ribeiro | Medidas, sono, diário, plano, conversa e agenda | Adesão de 88% e relatório pronto |
| Rafael Lima | Poucos registros, pergunta manual pendente, conversa e primeira consulta | Anamnese de 68%; manter intencionalmente incompleto, sem preencher para satisfazer uma meta genérica de volume |
| Lúcia Barbosa | Medidas e plano; atendimento concluído pelo fluxo, com horários reais da execução | Consulta concluída retroativa, preparo “revisado” sem fonte e relatório aprovado |
| Lucas Almeida | Poucos pesos, plano em rascunho, mensagens, ausência verdadeira de exames e consulta futura | Não completar os vazios que este cenário pretende testar |
| Fernanda Alves | Medidas distribuídas em check-ins e evolução existente | Painéis antropométricos de múltiplas medidas no mesmo formulário/gráficos ainda inexistentes |
| Bruno Ferreira | Histórico com lacunas de registros e mensagens recebidas | “Baixa adesão” como classificação e duas mensagens “não lidas”; avisos não lidos são um cenário diferente |
| Camila Torres | Medidas, diário, plano e acompanhamento sem pendências artificiais | Classificação clínica automática de evolução “saudável” |
| Eduardo Santos | Documento novo disponível e registros de acompanhamento | Badge específico de revisão documental antes do 5A.1 |
| Juliana Alves | Relatos e medidas de sono irregulares | Adesão intermediária e alerta calculado de sono |
| Marcelo Rocha | História sintética e ausência de consulta futura | Status de programa pausado; manter vínculo ativo se precisa acessar histórico, sem simular pausa por revogação |

### Coerência numérica e temporal

- Marina: `91,8 → 82,6 kg` representa **−9,2 kg** na série total. Os **−3,2 kg quinzenais** só podem ser usados se duas medidas comparáveis e datadas nesse período sustentarem o valor.
- Os cinco sonos listados (`6h48`, `6h31`, `5h56`, `5h41`, `5h52`) correspondem a `408`, `391`, `356`, `341`, `352` minutos. Sua média simples é **369,6 minutos, aproximadamente 6h10**, não 6h12. Outro resultado exige outra amostra/período ou regra declarada.
- Não inserir porcentagens de adesão sem fonte/cálculo. Se necessário como narrativa demonstrativa, deixar claro que é texto fictício, sem transformá-lo em indicador do sistema; preferível omitir nesta fase.
- Resolver conflitos entre mínimos gerais de volume e pacientes intencionalmente incompletos. Preservar Rafael/Lucas como casos de poucos dados; não interpolar medidas e tratá-las como observações originais.
- Datas de nascimento são sintéticas e devem corresponder às idades na data-base escolhida; não copiar dados de pessoa real com nome semelhante.

## 7. Plano executável de carga — próxima ação proposta

### Lote S0 — preparação e simulação, sem alterar o schema do produto

1. Confirmar projeto dev, clínica e médico de teste por IDs. Não reutilizar paciente por nome e não sobrescrever dados anteriores. Guardar os IDs preexistentes reaproveitados como **não pertencentes ao seed**.
2. Criar um manifesto local privado e reproduzível com marcador `vinvance_visual_seed_v1`, versão, data-base/fuso, chaves lógicas de cenário, IDs devolvidos, operações e arquivos. Não gravar senhas, tokens ou textos clínicos nos logs. A especificação atual pressupõe `seed_source`/`metadata`, mas esses campos não existem nas tabelas públicas consultadas.
3. Usar marcador de teste nas identidades de Auth somente para inventário, nunca como autorização. Os papéis/vínculos continuam nas tabelas próprias. Não adicionar `metadata` em todas as tabelas só para carregar dados.
4. Implementar comando de simulação (`dry-run`) que mostre quantidades, dependências, estados incompatíveis, identidades reutilizadas e plano de limpeza. Nenhum envio de e-mail ou notificação externa.
5. Planejar retomada com registro de operação antes da escrita e reconciliação após resposta. Nem todos os endpoints oferecem idempotência; em envio de mensagem/upload com resposta incerta, reconciliar IDs/estado antes de repetir. Não prometer “rodar duas vezes sem duplicar” só porque existe um manifesto.
6. Preparar arquivos de teste reais e claramente identificados como fictícios, com assinatura/tamanho compatíveis. Sem fixture disponível, deixar o documento pendente de carga, não criar download quebrado.

### Lote S1 — três pacientes para conferir o fluxo

Começar por **Marina, Paulo e Rafael**: rico em registros; relato aguardando revisão; preparo incompleto. Criar apenas dados compatíveis e registrar tudo no manifesto. Reservar uma ficha sintética sem dados para o teste de vazio verdadeiro. Usar contas de teste distintas para os autores e manter a massa durante o desenvolvimento, conforme decisão do titular.

Conferir persistência e autoria após recarga em sessões separadas, próxima consulta correta, plano somente após publicação, nota de revisão privada, mensagem nos dois sentidos e download privado. Combinar a data-base com o teste do Vercel: a agenda não permanece “hoje” indefinidamente.

### Lote S2 — expandir aos 12 cenários

Após validar S1, incluir os demais pacientes e agenda futura sem colisões. Executar o seed novamente e comprovar ausência de duplicação. Produzir inventário final esperado/real por entidade e lista explícita do que ficou de fora. Testes focados com Terra na execução futura, conforme preferência do titular; nenhum teste foi delegado ou executado nesta auditoria.

### Limpeza ao encerrar o desenvolvimento

- Não apagar agora; manter dados sintéticos úteis entre sessões de trabalho.
- A limpeza é uma ferramenta separada, somente de desenvolvimento, com simulação, IDs exatos do manifesto e validação de dependências. Nunca filtrar só pelo nome do paciente, domínio do e-mail ou clínica inteira compartilhada.
- Remover objetos privados pelo mecanismo de Storage e conferir arquivos órfãos; tratar registros dependentes, auditorias sintéticas e identidades somente quando pertencentes integralmente a este seed. Reutilizar médico/clínica preexistentes não autoriza apagá-los.
- Revogar sessões das contas sintéticas antes de excluir identidades; confirmar o resultado. Não presumir que apagar o usuário invalida imediatamente todo token.
- Há bloqueio remoto explícito de exclusão de adendos (`encounter_addenda_immutable`). Por isso, **excluir adendos do seed inicial** e validar a limpeza do restante em ambiente isolado antes da carga ampliada. Não desabilitar triggers/RLS nem prometer exclusão simples de qualquer registro histórico.
- Se algum conjunto exigir mecanismo especial de descarte, tratá-lo como pendência técnica delimitada antes de criá-lo; não implementar uma API pública de expurgo ou enfraquecer a proteção clínica.

## 8. Aceites de execução e divisão com o Vercel

| Verificação | Resultado esperado |
| --- | --- |
| Ambiente | Somente projeto dev confirmado; produção intacta; nenhuma credencial no repositório/relatório |
| Reexecução | Mesmas chaves lógicas não criam pacientes, mensagens, publicações ou arquivos duplicados; falhas ambíguas exigem reconciliação |
| Isolamento | Outro paciente/clínica, administrador operacional e profissional sem vínculo não acessam conteúdo clínico; enfermagem não lê conversas diretas |
| Autoria | Mensagens e check-ins do paciente pertencem à identidade sintética correta; revisão pertence ao profissional autorizado |
| Estados | Nenhum exame “revisado”, relatório, adesão, presença virtual ou mensagem “lida” sem estrutura e evento correspondentes |
| Recuperação | Falha parcial pode ser retomada sem sobrescrever originais; manifesto identifica o que existe e o que falta |
| Limpeza | Simulação lista somente recursos próprios; procedimento ensaiado antes da expansão; registros preexistentes preservados |
| Demonstração | Desktop e 390 px; contas separadas; estado vazio real; commit, ambiente, data-base e limites documentados |

**Vercel:** continuar apenas o escopo acordado do [7B.2](slices/07b2-painel-hoje-agenda-navegacao.md), consumindo as fontes existentes. Não adicionar estados/tabelas para imitar o seed. Validar o commit efetivamente disponível antes de integrar qualquer alteração.

**Trilha de dados proposta:** S0 → S1 → S2, isolada das alterações de tela. Nenhuma migração concorrente com o 7B.2 é necessária para essa trilha.

**Depois:** seguir 7B.3/7B.4 e as extensões 5A.1 → 7A.1 → 7A.2 do [documento central dos slices](PROXIMOS_SLICES_E_HANDOFF.md#85-nova-ordem-dos-slices--proposta-de-execução). Leitura das conversas, anamnese, medidas múltiplas e outros domínios ficam em incrementos próprios, não dentro do seed. Gate P continua obrigatório antes de qualquer uso com dados reais.

## 9. Referências técnicas conferidas

- Schema remoto: catálogo de tabelas, migrações e funções de agenda/adendos do projeto dev, consultados em 12/09/2026.
- [Migrações locais](../supabase/migrations/).
- [Contratos de check-in](../apps/web/modules/check-ins/validation.ts) e [serviço longitudinal](../apps/web/modules/longitudinal/service.ts).
- [Composição do painel Hoje](../apps/web/modules/workspace/today.ts).
- [Documentos](../apps/web/modules/documents/service.ts), [mensagens](../apps/web/modules/messages/service.ts) e [rotas clínicas](../apps/web/app/api/v1/clinics/).
- Limites documentados: [documentos privados](DOCUMENTOS_MVP.md), [conversas](CONVERSAS_MVP.md), [avisos](NOTIFICACOES_MVP.md).
