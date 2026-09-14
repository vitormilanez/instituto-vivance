# Vivance — próximos slices e passagem de contexto

Atualizado em 11/09/2026. Referência central de continuidade: distingue entregas verificadas, próximo trabalho e limites do piloto. Não autoriza uso clínico real.

## Continuidade entre computadores — 14/09/2026

A conciliação do Git está registrada em [CONTINUIDADE_GIT_2026-09-14.md](CONTINUIDADE_GIT_2026-09-14.md). O branch `codex/reconcile-macs-2026-09-14` reúne a base de onboarding, os três commits locais de refinamento de interface até `c99d097` e o histórico remoto de 7B.2/autenticação. Usar esse branch para continuar a revisão; `main` permanece como base histórica do protótipo.

Foi recuperada também a [avaliação do seed sintético](AVALIACAO_SEED_SINTETICO_SUPABASE.md), escrita sobre `64b9a6b` em 12/09. Ela é evidência histórica de planejamento; suas lacunas de revisão documental e relatórios devem ser confrontadas com as implementações posteriores descritas abaixo. Nenhuma carga de dados está autorizada por esta conciliação.

## Atualização de execução — 12/09/2026

A prioridade abaixo de 11/09 é histórica. A base já incorpora 7B.1/7B.2 e a correção de primeiro acesso (PR #15 merged). Por solicitação do titular, **3E/4E — convite de paciente e onboarding** precede agora 7B.3. Ver [escopo, decisões e validação](ONBOARDING_MVP.md) e [plano visual e sequência](PLANO_PROXIMOS_SLICES_2026-09-12.md).

Implementação no checkout `instituto-vivance-onboarding`, branch `codex/onboarding-paciente`, base `7b49597`. Médico e administrador convidam; WhatsApp usa link manual e o paciente informa e-mail ao abrir. O onboarding opcional tem foto, medidas, cinco perguntas, exames e revisão consentida; o médico vê a versão enviada na ficha. A área normal permanece utilizável. Oito ações rápidas e Agenda existentes preservadas.

Estado: código integrado, migrations aplicadas no Supabase de desenvolvimento e Preview protegida pronta, sem Production. Os **7B.3–7B.5**, **5A.1/5A.2**, **5B.1** e **7A.1/7A.2** foram validados. Documentos têm revisão humana separada; Conversas reconciliam reenvio e leitura por participante; Relatórios cobrem rascunho, revisão, aprovação, publicação, substituição/retirada e PDF privado auditado. O próximo passo é a avaliação de jornada/UI com Impeccable e a prova autenticada com dados sintéticos. IA e áudio continuam adiados.

### Fechamento local — 5A.1/5A.2, 5B.1 e 7A.1

- Documentos: decisão e nota interna ficam em histórico próprio, somente para o médico autor com vínculo ativo; paciente e administração operacional não recebem a revisão.
- Conversas: a chave de repetição via cabeçalho preserva uma única mensagem, e cada participante avança apenas o próprio cursor de leitura. Aviso interno e leitura da conversa permanecem eventos diferentes.
- Relatórios: modelo próprio de relatório, fontes e versões; seleção manual de relatos e documentos revisados; controle de versão; envio para revisão; retorno ao rascunho; aprovação explícita e interna. Sem publicação, exportação, IA ou interpretação automática.
- Verificação: 136 testes, tipos, lint, build e rodada visual agrupada passaram. Datas e ações foram refinadas para leitura amigável em desktop e celular. As migrations não foram comparadas nem aplicadas remotamente porque o checkout atual não possui vínculo Supabase.

### Fechamento local — 7A.2

- Relatórios: o conteúdo público é uma cópia confirmada própria, separada do relatório interno. Paciente acessa somente a publicação vigente; médico autor pode substituir, retirar, reabrir uma versão interna e exportar o histórico autorizado.
- PDF: autoria, período e versão identificados; resposta privada, sem cache, com registro de acesso. Nenhuma fonte, nota privada ou ponto reservado para consulta é incluído.
- Verificação: 141 testes, tipos, lint, build, PDF renderizado/lido e telas conferidas em desktop e 390 px. Seis migrations foram aplicadas no Supabase de desenvolvimento, a branch foi publicada e a Preview protegida `dpl_7spYPFzhBxDtst8F4AQADMJcjvBh` ficou READY. PR #16 aberta como rascunho; sem merge ou Production.

## 1. Onde continuar

### Prioridade vigente — fluxos e layout, sem áudio e IA (11/09/2026)

Por decisão do titular, **5E/5F (áudio/transcrição) e 6A–6D (IA) ficam adiados**. A base 5D é preservada, sem ativar executor ou fornecedor. Antecipar o trabalho de usabilidade do 7B e os relatórios manuais do 7A, reaproveitando os módulos e o banco existentes.

**Próximo slice recomendado: 7B.1 — ficha do paciente conectada**, com Visão geral → Linha do tempo → Documentos → Evolução mantendo o mesmo paciente. A evolução já existe no módulo Acompanhamento, mas ainda não está conectada à aba correspondente da ficha. O [relatório de cobertura e nova sequência](#8-relatório-de-cobertura--fluxos-layout-e-banco) detalha referências, evidências, lacunas e aceites. As novas subdivisões são propostas de execução, não entregas concluídas.

Esta atualização é documental: não implementa telas, não altera banco, não publica Preview/Production e não modifica o Asana. Gate P permanece obrigatório antes de dados de saúde reais, mas não impede evolução de layout/fluxos com dados sintéticos.

### Modelo de execução vigente — lotes locais (11/09/2026)

Por decisão do titular, não publicar nem fazer push a cada slice. Implementar uma entrega delimitada, rodar testes dos caminhos/riscos alterados, conferir navegador e fazer commit local. Atualizar esta referência e o estado correspondente no Asana quando a atualização externa estiver no escopo autorizado. Estados distintos: em implementação → validado localmente → publicado em Preview. Executar checks completos, build e publicação protegida no fechamento do lote combinado; o lote visual + 4C + 4D já foi encerrado. O workflow `web-foundation.yml` dispara em push e pull_request; commits locais evitam execuções remotas intermediárias. Não mudar configuração/custo da Vercel nem promover Production.

Reutilizar ambiente e sessões; não expandir testes sem falha ou risco introduzido. Uma rodada visual agrupada e no máximo uma correção por achados concretos. Sem relatórios duplicados nem agentes por rotina. Isolamento, autoria, persistência e publicação explícita permanecem obrigatórios quando afetados. Esta decisão substitui a exigência anterior de Preview/build completo por slice neste documento.

### Incremento visual — publicado no lote 4C/4D

Painel Hoje reorganizado conforme as capturas do protótipo: consulta/atendimento em destaque, contexto do paciente, plano publicado, pendências operacionais de rascunhos e lista cronológica do dia. Oito atalhos preservados. Agenda móvel prioriza linha do tempo, com próximo atendimento destacado; navegação inferior com acesso aos demais módulos em Mais. Ficha reúne atalhos para último registro finalizado e planos publicados disponíveis ao vínculo. Não existem contadores fictícios nem promessas de IA, vídeo ou funções indisponíveis.

Composição somente de leitura sob as políticas existentes, com limites nas consultas e sem carregar textos clínicos no painel. Nenhuma migração, alteração de permissão ou nova regra clínica. O diretório cadastral mais amplo continua sendo uma decisão separada; não foi restringido por esta alteração visual. Validação local: oito testes existentes de Agenda/navegação, tipos e lint aprovados; navegador demonstrou preparação → confirmação de responsabilidade → atendimento → retomada pelo painel, plano publicado acessível pelo contexto e oito atalhos. O build e a Preview foram executados uma única vez no fechamento do lote 4C/4D.

Quatro testes existentes de publicação/isolamento também passaram, sem ampliar a suíte. Capturas desktop 1600px/celular 390px e revisão visual independente sem correções materiais adicionais. Os dados sintéticos descartáveis foram removidos após a prova. A composição segue o protótipo com conteúdo disponível, sem prometer reprodução de funções ainda não implementadas.

### Slice 4C — check-in manual publicado no lote

- Como testar: profissional com vínculo ativo abre Acompanhamento, solicita uma pergunta manual e pode informar vencimento. O paciente abre Meu cuidado → Diário, envia o relato e, opcionalmente, uma medida livre com nome, valor e unidade, após confirmação explícita. O painel Hoje passa a mostrar a pendência; a equipe abre o relato e registra a revisão humana. O paciente vê o estado revisado, mas nunca a nota interna.
- `care_check_ins` registra solicitação e estado; `care_check_in_submissions` preserva relato original, autoria, data informada, origem e medida opcional; `care_check_in_reviews` guarda revisão interna imutável. O plano não é lido nem alterado por esse fluxo. Não há cadência automática, diagnóstico, classificação de urgência ou promessa de atendimento imediato.
- Escritas passam por funções controladas com papel, sessão, conta do paciente e vínculo de cuidado vivos. Administrador operacional, profissional sem vínculo, outra clínica, paciente de outra ficha e vínculo/conta revogados não acessam o conteúdo. Reenvio idêntico é idempotente; tentativa de sobrescrever o relato original é negada. Auditoria é atômica e não copia o texto clínico.
- Migrações de desenvolvimento aplicadas: `20260911142344_manual_check_ins`, `20260911143655_check_in_foreign_key_indexes` e `20260911143744_check_in_read_policy_performance`. Os índices e a política de leitura unificada resolveram os avisos de desempenho introduzidos pelo slice. Permanecem somente avisos anteriores e índices novos ainda sem histórico de uso.
- Verificação focada: um teste de contrato de entrada e três testes de banco passaram, cobrindo fluxo, isolamento/revogação, duplicidade e rollback por falha de auditoria. Tipos, lint e `git diff --check` passaram. Navegador local demonstrou médico → solicitação → paciente → relato/medida → painel Hoje → revisão → paciente, com persistência entre sessões, nota interna invisível ao paciente e zero erros atuais no console. Desktop 1680px e celular 556px conferidos. Revisão visual independente: `SHIP`, sem achado P0/P1.
- Versão funcional `32f8ae7`, incluída no deployment único do lote visual + 4C + 4D. O paciente `QA 4C · Paciente sintético`, conta, vínculo, check-in, submissão, revisão e auditorias foram removidos por IDs exatos depois da prova do 4D. Permaneceram três pacientes e três memberships anteriores.
- Limites: uma solicitação manual aceita uma pergunta por vez e medida genérica opcional; pré-consulta aqui é o mesmo mecanismo manual, sem questionário clínico configurável. A fila inclui histórico revisado e paginação de 20 itens. O contato da clínica ainda não é configurável. Sem notificações, fotos, áudio ou uso com dados reais.

### Slice 4D — acompanhamento longitudinal encerrado

- Como testar: equipe clínica abre Acompanhamento → Evolução e escolhe um paciente com vínculo ativo. Medidas informadas no check-in aparecem agrupadas por nome e unidade, com quantidade, período e origem; a linha do tempo reúne relatos e publicações reais. O paciente abre Meu cuidado → Evolução e vê somente a própria medida, relatos e orientações publicadas.
- A projeção é somente leitura sobre check-ins, submissões, revisões internas e publicações já persistidas. Não cria tabela nem amplia RLS. Paciente selecionado precisa permanecer no vínculo ativo; identificador inválido ou revogado volta para uma seleção segura sem erro 500. A nota da revisão interna não é enviada à composição do paciente.
- Medidas são agrupadas apenas por nome e unidade normalizados. A tela não calcula tendência, meta, avaliação clínica, urgência ou número ausente. Datas de publicação representam a publicação original; substituição/retirada continuam no histórico próprio do plano.
- Verificação proporcional: um teste focal de agrupamento neutro, tipos, lint e `git diff --check` passaram. Navegador local validou equipe e paciente, origem/data/unidade, seleção inválida e ausência da nota interna no portal; zero erros atuais no console. Revisão independente `SHIP`, sem P0/P1, depois de corrigir recuperação do parâmetro inválido e semântica da data de publicação.
- Versão funcional `4ca290f`. Build local passou; CI `34613703895` executou testes, lint, tipos e build com sucesso. Deployment `dpl_F9h6ELcAP3p6MKKVPvdWJ5pUPXwj` `READY`, URL imutável https://instituto-vivance-msjahv56t-vtr-consulting.vercel.app e alias protegido https://instituto-vivance-testes-vtr-consulting.vercel.app. Pela proteção autenticada, a entrada respondeu 200 com cache privado; a API sem sessão respondeu 401 com `private, no-store`; nenhum erro foi encontrado nos logs observados.
- Na Preview, a sessão sintética do paciente percorreu Hoje → Evolução e exibiu medida/linha do tempo persistidas antes da limpeza. A sessão médica foi exercitada localmente, não repetida online. Sem merge para `main`, promoção Production ou mudança de plano/custo.
- Limites: sem gráficos, metas, alertas, notificações, fotos, áudio ou IA. A tela usa os 50 check-ins e 20 publicações mais recentes e avisa quando o período é limitado; busca/paginação maior fica para volume real. O Gate P continua obrigatório antes de dados de saúde reais.

### Slice 5A — documentos privados validado em desenvolvimento e Preview

- Equipe clínica com vínculo ativo envia PDF, JPG ou PNG de até 5 MB para seus pacientes; paciente vinculado envia somente documento compartilhado. O administrador operacional não vê arquivo nem metadado clínico.
- O objeto nasce `reserved` em bucket privado, com caminho aleatório sem identificador de clínica/paciente. Somente depois de tamanho real e assinatura binária declarada conferidos ele se torna `available`; arquivo incompatível fica `rejected` e não é mostrado.
- A interface está em Documentos para equipe e Meu cuidado → Meus documentos para paciente. Há separação explícita entre uso interno e compartilhado, URLs temporárias para download e respostas sem cache.
- A Edge Function `private-documents` revalida JWT e vínculo atual antes de usar a chave privilegiada hospedada. As RPCs de reserva/conclusão são exclusivas do `service_role`; navegador e aplicação Next.js não recebem chave privilegiada.
- A suíte local cobre reserva, isolamento de documento interno, compartilhamento do paciente, revogação de vínculo/conta, bloqueio de chamada direta ao banco, falha de auditoria e registro sem conteúdo. Validações de entrada e a checagem estática da Edge Function também passaram.
- Estado remoto: a migração `20260911162631_private_patient_documents` está aplicada ao Supabase de desenvolvimento e a Edge Function `private-documents` está ativa com JWT obrigatório. Médico/paciente sintéticos validaram compartilhado, interno, assinatura inválida e revogação; usuários, clínica, ficha, vínculo, documentos, auditorias e objetos foram removidos por IDs conferidos. A Preview protegida `dpl_A7UsHTpUrAVrqcVaBUGmGVGuTF5L` está `READY` em https://instituto-vivance-a6nsv5mfd-vtr-consulting.vercel.app; visitante recebeu proteção Vercel, a entrada autorizada respondeu 200 e a API sem sessão respondeu 401 com cache privado. As duas telas de Documentos foram verificadas em navegador desktop, e a visão do paciente também em 390 px, sem erro atual de console. PR #11 segue em rascunho; CI `34623091144` e `34623085422` passaram. Não houve merge ou alteração de Production.
- Limites: a assinatura inicial e o tamanho não equivalem a antivírus, OCR ou inspeção completa. Não há retenção/limpeza automática, exclusão, substituição, conversas com anexos ou uso com dados reais. Ver [escopo e limites](DOCUMENTOS_MVP.md).

### Slice 5B — conversas diretas e assíncronas validado em desenvolvimento e Preview

- A decisão de produto é conversa direta entre paciente e médico com vínculo de cuidado ativo. Não há destinatário de equipe, administrador ou enfermagem; cada paciente–médico mantém uma conversa separada.
- A mensagem é persistente, paginada, somente de acréscimo e limitada a 4.000 caracteres. O envio passa por RPC estreita; tabelas não concedem escrita direta ao navegador. Auditoria registra o evento e os campos, nunca o conteúdo.
- A interface está em Mensagens para médico e Meu cuidado → Conversas para paciente. Ela declara explicitamente o uso assíncrono, não emergencial e sem anexos; não presume cobertura, triagem ou prazo de resposta.
- Verificação: 97 testes, tipos, lint, build e `git diff --check` passaram. Médico/paciente sintéticos autenticados trocaram mensagens nos dois sentidos contra o Supabase de desenvolvimento; isolamento, revogação, sessão, papéis bloqueados e rollback de auditoria foram cobertos. Navegador local conferiu médico e paciente, inclusive a tela do paciente em 390 px.
- Estado remoto: migrações `20260911173050_direct_patient_messages` e `20260911174240_message_foreign_key_indexes` aplicadas ao desenvolvimento. Preview protegida `dpl_FKoZk34nWhsT222zMLR9pNVPUhdf` pronta em https://instituto-vivance-48gxuveol-vtr-consulting.vercel.app; visitante recebe a proteção Vercel e a API sem sessão responde `401` com cache privado. Dados sintéticos e sessões foram removidos por IDs conferidos. Sem merge ou promoção Production. Ver [escopo e limites](CONVERSAS_MVP.md).

### Slice 5C — avisos internos validado em desenvolvimento e Preview

- O canal decidido para esta primeira entrega é somente interno à Vivance. Não há e-mail, WhatsApp, SMS, push de dispositivo, novo fornecedor ou custo; um aviso não contém conteúdo clínico nem cria cobertura, plantão ou prazo de resposta.
- Mensagem direta nova e publicação de orientação aprovada são os dois eventos permitidos. O destinatário vê apenas “Nova mensagem” ou “Novas orientações”, abre a área já autorizada e pode pausar ou retomar avisos futuros na própria conta.
- `in_app_notifications` guarda somente tipo, chave idempotente, caminho interno, criação e leitura; `notification_preferences` guarda somente a preferência interna. RLS limita ambas ao destinatário com sessão, clínica e membership ativos; tabelas não concedem escrita direta. A criação, leitura e preferência são auditadas sem copiar conteúdo.
- A migração `20260911234004_in_app_notifications` foi aplicada no Supabase de desenvolvimento. RLS e as políticas de leitura foram conferidas no schema; o advisor não mostrou alerta novo causado por este slice. Os avisos pré-existentes de senha vazada, RPCs anteriores e desempenho não foram alterados.
- Verificação: 100 testes, tipos, lint, build e `git diff --check` passaram. Médico/paciente sintéticos autenticados percorreram mensagem → aviso genérico → leitura → conversa nos dois sentidos; a preferência pausou o aviso seguinte e foi retomada, e o paciente foi conferido em 390 px. Clínica, identidades, sessões, mensagens, avisos, preferências e auditorias sintéticas foram removidos com contagem final zero. A Preview protegida `dpl_HYMJsHRXMNtiNCA1g1ZWLgZeqC1i` está `READY` em https://instituto-vivance-mnyoog4i5-vtr-consulting.vercel.app; visitante recebe a proteção Vercel, a entrada autorizada respondeu `200` com cache privado e a API sem sessão respondeu `401` com `private, no-store`. CI `34660001112` passou. Não houve merge ou promoção Production. Ver [escopo e limites](NOTIFICACOES_MVP.md).

### Slice 5D — base privada de processamento validada no desenvolvimento e Preview

- `processing_jobs` é a fila durável para futuras tarefas autorizadas, com estados pendente → processando → concluído/falhou, uma reserva de cinco minutos, no máximo cinco tentativas e repetição controlada. A referência idempotente é um UUID opaco, único por clínica, e não pode ser reutilizada para outro paciente ou tipo de tarefa.
- A tabela guarda somente contexto autorizado, estado, horários, tentativas e código genérico de falha. A restrição do banco impede texto livre na referência idempotente; não armazena áudio, texto clínico, prompt, resposta de fornecedor, segredo ou erro bruto. A auditoria não copia a referência de origem.
- Médico e enfermagem só leem tarefas dos pacientes com vínculo de cuidado ativo; paciente, administrador operacional, clínica diferente e vínculo revogado ficam excluídos. Não existe escrita direta pelo navegador. O produtor genérico permanece privado e as quatro operações do futuro executor são exclusivas de `service_role`.
- As migrações de desenvolvimento `20260912003803_processing_job_foundation`, `20260912003922_processing_job_created_by_index` e `20260912005616_processing_job_privacy_hardening` estão aplicadas. RLS, política e permissões foram verificadas no schema remoto: `authenticated` lê apenas sob vínculo, não insere/atualiza, e `anon`/`authenticated` não chamam o executor. O advisor não indicou alerta de segurança novo causado pelo slice; avisos anteriores permanecem fora dele.
- Verificação local: 101 testes, tipos, lint, build e `git diff --check` passam. A suíte cobre referência opaca, idempotência, bloqueios de papel/clínica/vínculo, escrita direta negada, reserva, token inválido, retentativa, timeout, recuperação automática antes da reserva, falha permanente e auditoria. Terra revisou de forma independente a correção da referência opaca e da recuperação automática. A entrada e o redirecionamento sem sessão foram conferidos em desktop e 390 px, sem estouro horizontal; a visualização autenticada depende de sessão legítima e não usou credencial criada para a prova. Não houve dado sintético persistido.
- A Preview protegida `dpl_AXrcuRLcFZQS3toJEyNeWD5C1xdh` está `READY` em https://instituto-vivance-r4ou6405z-vtr-consulting.vercel.app. A entrada autorizada respondeu `200` com cache privado e a rota sem sessão carregou o redirecionamento Next para a entrada; logs de erro não retornaram eventos no intervalo observado. CI `34663311366` e `34663313351` passaram. Não houve merge ou promoção Production.
- Limites: não há worker, Vercel Cron, Edge Function, áudio, upload, IA, fornecedor, custo ou processamento real ativo. O próximo slice que conectar uma fonte deverá receber decisão explícita de consentimento, retenção, fornecedor, custo e revisão humana. Ver [escopo e limites](PROCESSAMENTOS_MVP.md).

- Diretório de implementação: `/Users/vitormilanez/Desktop/Codes/instituto-vivance-vercel`.
- Aplicação: `apps/web`. Branch atual: `codex/vercel-supabase-foundation`.
- Repositório: `https://github.com/vitormilanez/instituto-vivance.git`.
- PR de trabalho: https://github.com/vitormilanez/instituto-vivance/pull/11.
- Prévia protegida: https://instituto-vivance-testes-vtr-consulting.vercel.app.
- Endereço local usado nos testes: http://127.0.0.1:3010. Confirmar se o servidor está ativo antes de orientar o usuário.
- Base do lote 4C/4D: commit `4ca290f`. Entrega funcional posterior registrada: `d7b15c2`, Slice 5D, Preview `dpl_AXrcuRLcFZQS3toJEyNeWD5C1xdh`. Checkout consultado neste relatório: `7c63773` (documentação). A disponibilidade da Preview não foi revalidada nesta auditoria documental.
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
| 4C | Check-in manual solicitado pela equipe, relato/medida opcional do paciente e revisão interna | Uma pergunta por solicitação; sem diagnóstico, urgência automática, cadência ou mudança de plano |
| 4D | Evolução de equipe e paciente com medidas e linha do tempo derivadas de registros persistidos | Sem tendência/meta clínica; período limitado e Gate P obrigatório antes de dados reais |
| 5A | Documentos privados com upload direto assinado, validação antes da disponibilidade e download temporário | Aplicado e validado no Supabase de desenvolvimento e na Preview protegida; dados sintéticos removidos, sem autorizar Production ou dados reais |
| 5B | Conversas diretas paciente–médico, histórico persistido e paginado | Sem contexto estruturado, confirmação de leitura da mensagem, anexo ou garantia de reenvio idempotente |
| 5C | Avisos internos de mensagem/publicação e preferência individual | Leitura do aviso não significa leitura da mensagem nem adesão ao plano |
| 5D | Base privada de processamento, reserva e retentativas | Estrutura preservada; nenhum processamento de áudio/IA ativo; expansões adiadas |

O slice 3D manteve os 66 testes da base e validou somente os 61 cenários diretamente afetados de Agenda, Atendimento, navegação e isolamento, todos aprovados após as correções concretas. Tipos, lint e build passaram. A migração remota `20260911055947_agenda_encounter_state_coherence` está aplicada; os registros anteriores foram preservados e todo dado sintético descartável desta validação foi removido.

Publicação protegida do 3D: código funcional `2fd4420`, documentação da entrega `2501d5b`, deployment `dpl_Eke15MbwD4rYQdU72YJkNBzZiCFu` `READY`, URL imutável https://instituto-vivance-gb6f0mcrg-vtr-consulting.vercel.app e alias https://instituto-vivance-testes-vtr-consulting.vercel.app. O build remoto passou com Next.js 16.3.4 e Node.js 24.x. Visitante anônimo recebeu o redirecionamento da proteção Vercel; pela CLI autenticada, a aplicação respondeu 200 com cache privado e a nova rota de busca sem sessão respondeu 401 com `private, no-store`. Nenhum erro apareceu nos logs do deployment na janela observada. Não houve merge para `main` nem promoção Production.

Asana: as tarefas `Slice 3B–3D — Base clínica e operação de atendimento` (`1218384571286751`) e `Slice 4A–4D — Planos de cuidado e acompanhamento` (`1218384336844795`) estão concluídas em `Done`, com BDDs e evidências preservados. O próximo marco é o Gate P, não uma liberação automática para dados reais.

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
- Limites no fechamento do 4B: jornada autenticada demonstrada localmente, não declarada como ensaio autenticado naquela Preview. Publicação/retirada ficam visíveis na próxima leitura/atualização do portal, sem push ou revogação de conteúdo já visto. Check-ins e evolução foram entregues posteriormente no lote 4C/4D; notificações e liberação clínica/Production continuam fora.

## 4. Sequência de implementação

Preservar as etapas macro do plano anterior: **4 = cuidado e acompanhamento; 5 = documentos, comunicação e áudio; 6 = IA**. As letras abaixo dividem essas etapas em entregas menores. Implementar e validar uma por vez. **A ordem vigente está na seção 8.5: 7B antecipado → complemento manual de documentos → 7A manual.** As fases abaixo preservam o histórico e as dependências, não impõem começar áudio/IA antes de layout e relatórios.

### Fase A — concluir a base clínica

| Slice | Resultado demonstrável | Aceite essencial / dependência |
| --- | --- | --- |
| **3B — Adendos e integridade** | Médico autor acrescenta uma correção identificada a um atendimento finalizado, sem modificar o original | Motivo, autoria e data obrigatórios; original e adendos preservados; sem reabertura/destruição; bloqueio a paciente, admin, outra clínica e vínculo revogado. Fortalecer o controle de versão também no caminho de escrita do banco, não somente na API. Depende do 3 |
| **3C — Equipe e vínculos de cuidado** | Responsável autorizado convida/gerencia equipe e atribui ou revoga médico/enfermagem por paciente | Matriz explícita de quem pode conceder acesso; admin opera vínculos sem ler conteúdo clínico; profissional aceita responsabilidade quando aplicável. Revogação e suspensão bloqueiam acesso imediatamente. Sem escalada de privilégio ou atribuição entre clínicas |
| **3D — Agenda e atendimento coerentes — concluído** | Agenda diferencia agendado, em atendimento, concluído, cancelado e falta, conforme transições permitidas | Entregue: transições atômicas, bloqueios após início, nome cadastrado preservado, busca/paginação estável e telas conectadas alinhadas ao protótipo |

**Gate de liberação: Gate P — piloto controlado.** Revisar a jornada manual, privacidade, operação, credenciais e recuperação antes de qualquer dado de saúde real. O próximo trabalho de produto é 7B.1; não iniciar integração custosa nem Production por consequência automática.

### Fase B — fechar a jornada de cuidado manual

| Slice | Resultado demonstrável | Aceite essencial / dependência |
| --- | --- | --- |
| **4A — Plano de cuidado interno** | Médico cria plano ligado ao paciente/atendimento, salva versões, revisa e aprova | Estados rascunho → revisão médica → aprovado; aprovação só por médico autorizado; versão aprovada imutável; nova mudança cria versão. Enfermagem não aprova conduta. Sem prescrição eletrônica. Depende de 3B/3C |
| **4B — Publicação e portal do paciente** | Médico publica versão aprovada e paciente vinculado a encontra em Meu cuidado | Paciente vê somente conteúdo publicado para ele, nunca notas internas/rascunhos. Registrar publicação, ciência do paciente, substituição e retirada com histórico; ciência não equivale a adesão. Versão nova exige nova aprovação. Depende de 4A |
| **4C — Check-ins, diário e pré-consulta — concluído** | Paciente envia relato/medidas e equipe vinculada registra revisão | Entregue: autoria/data/origem, conteúdo original, revisão interna, fila real, isolamento, idempotência e auditoria; sem diagnóstico, urgência ou alteração automática do plano |
| **4D — Acompanhamento longitudinal — concluído** | Equipe visualiza linha do tempo e medidas; paciente acompanha seus registros e publicações | Entregue com período, unidade, data e origem sobre dados persistidos; sem números inventados, tendência ou classificação clínica automática; revisão interna separada do paciente |

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

**Menor piloto útil proposto:** 3B–3D + 4A–4D + Gate P. A jornada funcional está implementada; o Gate P ainda precisa ser concluído. Documentos, mensagens, áudio e IA não bloqueiam esse piloto se não forem necessários ao fluxo validado; funcionalidades indisponíveis devem permanecer claramente sinalizadas.

### Fase C — documentos e comunicação

| Slice | Resultado demonstrável | Aceite essencial / dependência |
| --- | --- | --- |
| **5A — Documentos privados — validado em desenvolvimento e Preview** | Upload e acesso autorizado a documentos do paciente | PDF/JPG/PNG até 5 MB, estado reservado antes de disponibilizar, conferência de tamanho/assinatura, bucket privado, links temporários de 60 segundos, isolamento de clínica/vínculo e origem registrada. Separação interno/compartilhado. A revogação bloqueia novas URLs, mas não uma URL já entregue até expirar. Jornada sintética, Preview protegida e limpeza confirmadas; saúde real depende do Gate P |
| **5B — Conversas diretas e assíncronas — validado em desenvolvimento e Preview** | Paciente e médico com vínculo ativo trocam mensagens persistentes | Uma conversa por dupla, escrita somente por RPC, histórico paginado, auditoria sem conteúdo e revogação imediata de acesso. Sem equipe, anexo, notificação externa, cobertura, triagem, prazo de resposta ou chat de emergência. Jornada sintética, Preview protegida e limpeza confirmadas; saúde real depende do Gate P |
| **5C — Avisos internos — validado em desenvolvimento e Preview** | Aviso genérico de nova mensagem ou orientação publicada chega somente ao destinatário correto | Preferência interna individual, idempotência e histórico de leitura; sem conteúdo clínico, e-mail, WhatsApp, SMS, push, fornecedor ou custo. Jornada sintética, Preview protegida e limpeza confirmadas; saúde real depende do Gate P |
| **5D — Base de processamento — validada no desenvolvimento e Preview** | Tarefa autorizada tem estado, referência opaca, reserva, retentativa e falha controlada | RLS por vínculo, leitura clínica e executor exclusivo de servidor; sem payload clínico na fila, worker, fornecedor, áudio ou IA. Preview protegida e CI confirmadas; saúde real depende do Gate P |

### Fase D — áudio e processamento assíncrono — expansões adiadas

5D permanece entregue como base. **Não iniciar 5E/5F na sequência atual**, por decisão de priorizar fluxos e layout. Retomar somente mediante nova decisão do titular.

| Slice | Resultado demonstrável | Aceite essencial / dependência |
| --- | --- | --- |
| **5D — Base de processamento — validada no desenvolvimento e Preview** | Tarefa percorre pendente → processando → concluída/falhou, com repetição controlada | Contexto de clínica/paciente validado no executor; referência opaca, limites, timeout, retentativas e tratamento de falha definitiva. Sem payload clínico nos logs. Não há worker, fornecedor ou custo ativo |
| **5E — Captura privada de áudio** | Profissional inicia gravação autorizada e acompanha upload recuperável | Autorização/consentimento registrado conforme fluxo definido; início/parada visíveis; limites e retenção aprovados; falha não simula gravação salva. Áudio privado ligado ao atendimento. Sem vídeo. Depende de 5A/5D e decisão específica sobre gravação |
| **5F — Transcrição revisável** | Áudio vira transcrição identificada como automática e profissional corrige antes de usar | Origem, fornecedor/modelo, custo e estado registrados; acesso clínico e tratamento de falhas; não preencher/finalizar prontuário automaticamente. Validar política de dados do fornecedor antes do envio. Depende de 5E |

### Fase E — IA assistiva com governança — adiada

**6A–6D fora do lote atual.** Não ativar geração de resumos/relatórios, OCR assistido, transcrição, sugestões ou análise automática para reproduzir as capturas. O relatório manual 7A não depende de IA.

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

Continuar no diretório de implementação indicado acima. Os slices **3B–3D** e **4A–4D**, junto do realinhamento visual do protótipo, estão fechados no código, no Supabase de desenvolvimento e na Preview protegida. O lote final está no commit `4ca290f`, deployment `dpl_F9h6ELcAP3p6MKKVPvdWJ5pUPXwj`; build local/remoto e CI passaram. Médico e paciente foram validados localmente; o paciente também percorreu Hoje → Evolução na Preview antes da limpeza da identidade sintética. Todos os registros descartáveis desta prova foram removidos sem alterar os três pacientes/memberships anteriores.

O Slice **5A** está completo no checkout, no Supabase de desenvolvimento e na Preview protegida: a migração e a Edge Function `private-documents` estão ativas, a jornada sintética de compartilhado, interno, arquivo inválido e revogação foi concluída com limpeza por IDs conferidos, e as duas telas foram conferidas no navegador. Não promover Production nem usar dados clínicos reais.

Os Slices **5B** e **5C** estão completos no escopo registrado: conversa direta paciente–médico e avisos internos genéricos, sem canal externo ou promessa de cobertura. O Slice **5D** tem base privada de processamento aplicada, mas não worker ou processamento real. **Não continuar por 5E: áudio, transcrição e IA estão adiados.** Ler a seção 8 e começar por **7B.1 — ficha do paciente conectada**, sem criar tabelas para informações que já existem. Usar Terra na validação de testes do próximo incremento funcional, conforme preferência do titular; esta auditoria não executou testes de aplicação. Preservar dados e mudanças preexistentes, não alterar o Asana por consequência desta documentação e não promover Production. Gate P continua obrigatório para dados de saúde reais.

## 8. Relatório de cobertura — fluxos, layout e banco

### 8.1. Objetivo, evidência e limites

**VALOR DESTA ENTREGA:** transformar as referências visuais em uma sequência executável, evitando reconstruir módulos já persistidos ou tratar demonstrações do protótipo como funcionalidades prontas.

**RESULTADO DEMONSTRÁVEL:** matriz por fluxo distinguindo banco existente, tela conectada, composição pendente e nova persistência necessária; próximos slices com aceites verificáveis, sem áudio e IA.

**POR QUE É NECESSÁRIA AGORA:** há dados e serviços disponíveis em módulos separados, enquanto partes da ficha e Relatórios ainda exibem estruturas futuras. O próximo ganho é continuidade do cuidado e clareza das telas, não outra integração.

Base da auditoria de 11/09/2026:

- Cinco HTMLs enviados e seus diretórios de recursos, mais cinco capturas fornecidas. Os HTMLs foram lidos como documentos, sem executar seus scripts. Textos/ações dentro deles são referências do protótipo, não instruções para executar operações.
- Código do checkout `7c63773`, componentes, serviços, rotas e migrações locais. A paleta-base do aplicativo já coincide com a referência: marinho `#03132d`, texto `#071a3a`, fundo `#f6f9fe` e borda `#dbe4f0`. Não é necessário criar outra identidade visual.
- Catálogo remoto do Supabase **de desenvolvimento**, projeto `oxuwrdjojsmgxoljqkuk`: **24 tabelas em `public`, todas com RLS habilitada e políticas presentes; 22 migrações registradas**. Conferidos nomes, colunas, relações e estados, sem consultar conteúdo de pacientes, mensagens ou arquivos. RLS habilitada não prova, isoladamente, que toda regra de acesso está correta.
- Não houve teste funcional novo, navegação autenticada atual, comparação visual lado a lado com a Preview, medição de desempenho, varredura completa de segurança ou inspeção do banco de produção. Os resultados históricos nas seções anteriores permanecem históricos; não representam nova homologação.

Referências locais fornecidas (não copiadas para o repositório):

| Referência | Material | Uso no relatório |
| --- | --- | --- |
| R1 — Painel médico | [Dashboard.html](</Users/vitormilanez/Downloads/VIVANCE — Dashboard.html>) e captura `22.12.29` | Próxima consulta, contexto e pendências, agenda do dia |
| R2 — Agenda | [Captura 22.12.44](</Users/vitormilanez/Desktop/Prints/Captura de Tela 2026-09-11 às 22.12.44.png>) | Linha do tempo, próximo horário e entrada no preparo |
| R3 — Consulta | [consulta.html](</Users/vitormilanez/Downloads/VIVANCE — consulta.html>) e captura `22.17.07` | Preparo → Consulta → Plano → Fechamento; excluir vídeo/áudio/transcrição/IA |
| R4 — Cuidado contínuo | [Cuidado contínuo.html](</Users/vitormilanez/Downloads/VIVANCE — Cuidado contínuo.html>) | Ficha, fontes, documentos, evolução e continuidade do paciente |
| R5 — Mensagens | [messagens.html](</Users/vitormilanez/Downloads/VIVANCE — messagens.html>) e captura `22.13.38` | Lista e conversa, busca, contexto e resposta |
| R6 — Relatórios | [Relatorios.html](</Users/vitormilanez/Downloads/VIVANCE — Relatorios.html>) e captura `22.14.01` | Lista/detalhe, período, revisão e disponibilização manual |

Os cinco HTMLs são exportações do protótipo `lume-saude-prototipo...chatgpt.site`, com conteúdo demonstrativo. Em R4, a própria tela declara persistência no navegador para simular conexão. R3 contém também a carteira de pacientes ao fundo do modal. Logo, CRM, programas, contadores, percentuais, valores laboratoriais e estados dessas referências **não comprovam registros equivalentes no Supabase**. Os arquivos locais continuam necessários para reproduzir a comparação; estes links não são portáveis para outra máquina.

### 8.2. Cobertura do banco por capacidade

“Coberto” significa estrutura e consumo identificados, não cobertura integral do protótipo nem liberação clínica. A matriz abrange as 24 tabelas públicas encontradas.

| Capacidade | Estrutura existente | Cobertura efetiva / o que falta |
| --- | --- | --- |
| Clínica, contas e vínculo | `tenants`, `memberships`, `patients`, `patient_accounts`, `care_relationships`, `audit_events` | Clínica/papel, cadastro básico, autoria, vínculo e auditoria existem. Não há campos próprios para CRM/UF, foto profissional, programa clínico, dia de programa, metas estruturadas ou configuração de contato/cobertura. Nome profissional existe em `memberships.display_name`; não inventar CRM para completar o card |
| Agenda | `appointments`, `appointment_status_events` | Horário inicial/final, paciente/médico, tipo consulta/retorno, nome profissional preservado, versão e cinco estados. “Próxima” pode ser calculada. “Confirmada/a confirmar”, sala de espera, presença online e tempo de espera não têm registro próprio |
| Consulta manual | `encounters`, `encounter_versions`, `encounter_addenda` | Motivo, evolução, rascunho, finalização, versões e adendos. A consulta liga paciente, médico e agendamento. O fluxo em quatro passos ainda não é uma experiência integrada. Não existe entidade específica de preparo com checklist/percentual concluído |
| Plano e publicação | `care_plans`, `care_plan_versions`, `care_plan_publications`, `care_plan_receipts` | Objetivos, ações, frequência, período e revisão; aprovação, publicação, substituição/retirada e ciência. Campos do plano são texto, não tarefas com execução/adesão mensurável. Ciência é leitura, nunca comprovação de uso |
| Check-in e evolução | `care_check_ins`, `care_check_in_submissions`, `care_check_in_reviews` | Solicitação manual de uma pergunta, relato e uma medida opcional com nome/valor/unidade/data; revisão privada. Linha do tempo e séries já derivadas desses registros. Faltam questionários versionados, várias respostas estruturadas por envio, rascunho de anamnese e vínculo explícito da solicitação a uma consulta/plano |
| Documentos | `patient_documents` e integração com armazenamento privado no código | Original, remetente, categoria exame/documento, visibilidade e estado técnico de upload. `available` significa arquivo disponível, **não exame revisado**. Faltam revisão médica do documento, versões de correção, substituição, laboratório/data de coleta e valores estruturados com página/origem |
| Conversas | `care_conversations`, `care_messages` | Uma conversa por dupla paciente–médico, texto, remetente, horário e última atividade. Faltam contexto plano/check-in/documento, cursor de leitura por participante e chave de reenvio idempotente. Sem edição/exclusão/anexos. A RPC atual recebe paciente, médico e texto; bloquear o botão durante envio não evita duplicação após timeout/reenvio |
| Avisos | `in_app_notifications`, `notification_preferences` | Aviso genérico, destinatário, evento idempotente, destino, data/leitura e preferência. Pode alimentar sino/contador de **avisos**. Não pode alimentar “conversas não lidas” como se fosse confirmação de leitura de mensagem; também não é fila de urgência |
| Relatórios | Nenhuma entidade específica encontrada | Existem fontes (consulta, planos, check-ins, documentos), mas não relatório manual persistido, seleção de fontes/período, revisão/versionamento, publicação ao paciente ou exportação rastreável. `/relatorios` continua uma tela de integração pendente |
| Processamento | `processing_jobs` | Base técnica existente, com tipos `audio_transcription`/`clinical_draft`. Não contém resultados de IA, gravações ou transcrições; não ativar só para preencher o estado “processando” do protótipo |

**Reconciliação técnica concluída em 12/09:** os arquivos locais de `team_and_care_relationships` e `care_reassignment_requires_active_member` agora usam os identificadores já registrados no histórico remoto (`20260911043121` e `20260911044758`). Nenhuma dessas duas migrations foi reaplicada. As novas migrations do lote também foram alinhadas aos identificadores retornados pelo Supabase após aplicação.

### 8.3. Jornada e diagnóstico de fluxo/layout

1. **Hoje → Agenda — parcial, com boa base.** A hierarquia de próxima consulta, contexto e dia já existe, assim como a linha do tempo da agenda. Falta integrar os atalhos ao paciente selecionado, contexto de check-ins/documentos e avisos reais no cabeçalho. Preservar o calendário existente; não construir outra agenda. A chamada “Pré-consulta e IA ainda não conectadas” mistura preparo manual possível com integração adiada: separar esses conceitos na próxima edição.
2. **Paciente → Cuidado contínuo — principal lacuna de integração.** A ficha tem as quatro abas da referência, mas Linha do tempo e Evolução são placeholders; Documentos abre o módulo geral. A visão longitudinal funcional está em Acompanhamento → Evolução. Conectar serviços existentes à ficha com filtro autorizado de paciente e retorno previsível. Não basta colocar dados de todos os pacientes atrás de um título individual.
3. **Preparo → Consulta → Plano → Fechamento — persistência existente, experiência fragmentada.** Agenda abre confirmação de responsabilidade e cria/retoma atendimento; editor salva/finaliza, oferece plano vinculado e protege mudanças não salvas. Falta a navegação orientada em etapas e uma visão final do que foi salvo, finalizado, aprovado e publicado. O fechamento deve refletir estados reais independentes, sem finalizar consulta ou publicar plano por avançar uma aba.
4. **Mensagem → leitura → resposta — núcleo coberto, acabamento/contexto parcial.** Já há lista ordenada pela última atividade, histórico de 20 mensagens por página, balões por autor e envio manual. A referência acrescenta busca, prévia da última mensagem e assunto vinculado. Busca/lista/prévia podem começar usando dados autorizados existentes; contexto persistido e leitura por participante exigem extensão. Manter assíncrono e direto, sem equipe intermediária, plantão, digitação online ou resposta automática.
5. **Arquivo → conferência médica → histórico — upload coberto, revisão não coberta.** Reutilizar o arquivo privado, mostrar autoria/data/visibilidade e abrir o original. Planejar revisão humana separada do estado técnico do upload. A tela de campos laboratoriais, correções e fonte por página de R4 não está implementada; adiar OCR/IA e não confundir conferência manual do arquivo com revisão de valores estruturados.
6. **Período → relatório → revisão → publicação — fluxo novo.** Reaproveitar lista/detalhe de R6, mas criar um relatório escrito pelo médico a partir de fontes escolhidas, sem “rascunho assistido por IA”. Separar salvar, revisar/aprovar e publicar; usar números somente quando houver dados comparáveis e cálculo definido. O exemplo de “82% de adesão” não pode ser inferido de leitura ou quantidade de check-ins.

**Manter das referências:** sidebar marinho, cabeçalho claro, contraste de cards, paciente sempre identificado, hierarquia de ação principal, contexto antes da ação, lista/detalhe para mensagens e relatórios. A identidade existente já permite essa aproximação.

**Adaptar, não copiar literalmente:**

- Preservar **8 atalhos** no painel; os cards de contexto do paciente são outro grupo. Priorizar navegação clínica diária e reduzir a proeminência de Central da IA/Processamentos enquanto adiados, sem apagar módulos/dados nem deixar ações falsas.
- Nome do profissional vem do cadastro; CRM/foto somente após existir origem própria. Zero registros é um estado vazio, não motivo para carregar exemplos. Contadores limitados/paginados devem dizer “nesta lista/período” ou indicar limite, não fingir total absoluto.
- Estados “em dia”, “sono para revisar”, anéis de risco, progresso de programa, receita vencendo, pedido de exame e prescrição da referência não entram como regras implícitas. Sem estrutura/decisão correspondente, mostrar informação disponível ou retirar a chamada.
- Na consulta, priorizar conteúdo manual. A experiência em etapas pode usar página dedicada e, quando adequado, painel/modal; não copiar uma sala virtual sem serviço real. Áudio, câmera, transcrição e sugestões de IA ficam fora.
- Para celular: lista → detalhe com retorno, compositor visível sem sobreposição do menu, abas utilizáveis e cards em coluna. Para teclado: ordem/foco visíveis, rótulos, status além de cor, retorno de foco ao fechar diálogo e confirmação antes de perder texto. As capturas desktop não comprovam acessibilidade; esses são aceites para a implementação, não falhas de contraste já medidas.

### 8.4. O que pode avançar sem migração e o que precisa de nova persistência

| Tipo | Trabalho | Limite para não ampliar escopo por acidente |
| --- | --- | --- |
| **Reutilizar banco; conectar telas/consultas** | Ficha individual, abas, filtro de documentos por paciente, linha do tempo de fontes existentes, dados da próxima consulta, navegação em quatro etapas e retorno ao contexto | Revalidar papel/vínculo em toda leitura. A timeline do paciente nunca recebe nota interna; mensagens diretas não entram em uma timeline visível à enfermagem. Não criar `patient_summary` apenas para duplicar tabelas existentes |
| **Reutilizar banco; acabamento e leitura** | Sidebar/cabeçalho, contador de avisos, busca simples entre conversas autorizadas, prévia da última mensagem, loading/vazio/erro e responsividade | Evitar carregar todo histórico para montar prévias; consulta limitada e sem conteúdo clínico em logs. Não chamar avisos de mensagens lidas |
| **Extensão proposta: revisão de documentos** | Registrar quem revisou qual documento, quando, resultado/nota privada, histórico imutável e eventual nova revisão | Novo estado humano separado de `reserved/available/rejected`; não alterar visibilidade automaticamente nem substituir o original |
| **Extensão proposta: relatórios manuais** | Relatório com paciente/período/autor, fontes autorizadas, versões, aprovação, publicação/retirada e exportação | Modelagem específica a definir no 7A; reutilizar o padrão de segurança/versionamento dos planos, não gravar relatórios como se fossem planos ou tarefas de IA. Publicar o texto aprovado não libera suas fontes internas: portal/exportação do paciente não recebem notas privadas, links ou metadados dessas fontes |
| **Extensão opcional: mensagens** | Contexto estruturado, cursor de leitura por participante e identificador de envio para idempotência | Referência só pode apontar conteúdo que ambos podem acessar; nunca plano interno, revisão privada ou documento interno. Idempotência de aviso não garante idempotência da mensagem |
| **Extensão opcional: pré-consulta/medidas** | Formulário/anamnese versionado, respostas estruturadas, rascunho recuperável, origem/técnica de medidas, relações com consulta/plano | Não necessário para a primeira ficha conectada. Uma pergunta manual não equivale a anamnese; nenhum percentual arbitrário ou bloqueio do atendimento por dado opcional |
| **Escopo adicional, não priorizado** | CRM/UF verificável, programas/metas, confirmação de consulta, exames estruturados/cálculos, prescrição/pedidos | Exige contrato de dados e decisão de produto apropriada. Não criar campos, fórmulas clínicas ou integrações apenas porque aparecem na imagem |

### 8.5. Nova ordem dos slices — proposta de execução

Os números existentes são preservados. Sufixos `.1`, `.2` etc. detalham tarefas atuais, sem declarar novas tarefas criadas no Asana. Cada linha é um incremento a implementar e validar, não autorização para executar todo o lote neste relatório.

| Ordem | Slice | Resultado demonstrável | Banco / dependência |
| --- | --- | --- | --- |
| **1** | **7B.1 — Ficha conectada e contexto preservado** | Abrir paciente e alternar Visão geral, Linha do tempo, Documentos e Evolução sem perder o paciente; voltar de um registro para a origem | Reutiliza 3/4/5A; sem migração prevista. Filtrar no serviço, além da URL; origens clínicas limitadas ao vínculo |
| **2** | **7B.2 — Painel Hoje, Agenda e navegação** | Próxima consulta leva ao preparo certo; contexto, pendências e avisos reais; mesmo padrão visual e oito atalhos | Reutiliza 2/3D/4C/5C e contexto do 7B.1; sem estados novos de agenda ou indicadores clínicos |
| **3** | **7B.3 — Consulta manual em quatro etapas** | Preparo → Consulta → Plano → Fechamento, retomável pelos registros já salvos | Reutiliza atendimento/plano/publicação; etapas visuais não criam gravação, consentimento automático ou publicação implícita |
| **4** | **7B.4 — Conversas e continuidade no celular** | Buscar destinatário autorizado, abrir conversa, responder e voltar ao paciente; lista/detalhe e compositor claros | Reutiliza 5B/5C, sem migração na primeira entrega; prévia limitada e honesta, sem recibo de mensagem nem contexto inventado |
| **5** | **5A.1 — Conferência humana de documentos** | Médico abre original e registra revisão identificada; fila distingue recebido e revisado | Nova persistência/RPC/políticas de revisão e auditoria. Não inclui OCR, extração ou alteração do arquivo original |
| **6** | **7A.1 — Relatório manual interno** | Médico escolhe paciente/período/fontes, escreve síntese e pontos para consulta, salva, revisa e aprova versão | Nova persistência/versionamento/fontes; 7B.1 fornece contexto. Não depende de IA; fontes documentais revisadas dependem de 5A.1, demais fontes podem ser usadas antes |
| **7** | **7A.2 — Publicação e exportação do relatório** | Médico publica versão aprovada; paciente abre somente a própria publicação; exportação autorizada registra versão/escopo | Depende de 7A.1; definir publicação/retirada, RLS, arquivo privado/temporário e auditoria do acesso. Exportação operacional separada da clínica |
| Depois, se necessário | **5B.1 — Contexto e leitura das conversas** | Mensagem aponta fonte compartilhada e cada participante tem estado de leitura coerente; reenvio seguro | Nova persistência e contrato de envio; não exigir esta extensão para concluir o layout de Mensagens |

Áudio/transcrição **5E/5F**, IA **6A–6D**, expansão **8A–8C** e questionários/medidas estruturadas não bloqueiam o lote manual. Gate P pode avançar em paralelo como preparação operacional, mantendo bloqueio apenas para entrada real de pacientes. Não há estimativa de prazo/custo fechada nesta auditoria.

### 8.6. Aceites de fluxo para o próximo lote

| Slice | Dado / Quando / Então |
| --- | --- |
| 7B.1 | **Dado** médico vinculado a dois pacientes com registros sintéticos distintos, **quando** alterna as quatro abas da ficha e abre/volta de uma fonte, **então** o mesmo paciente permanece selecionado, apenas suas fontes autorizadas aparecem e os registros salvos reaparecem após recarga |
| 7B.1 — negação/vazio | **Dado** paciente sem registros ou vínculo revogado, **quando** a ficha/aba é aberta diretamente por URL, **então** há vazio verdadeiro ou acesso negado conforme o caso, nunca dados do primeiro paciente da lista como substituição silenciosa |
| 7B.2 | **Dado** agenda com consulta agendada e atendimento em andamento, **quando** Hoje e Agenda são abertos, **então** os estados e a ação de retomada correspondem aos mesmos registros; oito atalhos permanecem e nenhum badge inventa confirmação/presença/risco |
| 7B.3 | **Dado** atendimento em rascunho e plano ainda não publicado, **quando** o médico salva, muda de etapa e retoma, **então** conteúdo salvo e versões permanecem; alteração não salva exige confirmação de saída e nenhuma navegação publica ou finaliza automaticamente |
| 7B.4 | **Dado** conversa entre paciente e médico vinculados, **quando** há envio, falha ou troca de tela em desktop/celular, **então** autor/horário/estado são claros, falha não apaga o texto, paciente selecionado não muda silenciosamente e aviso lido não vira recibo da mensagem |
| 5A.1 | **Dado** arquivo disponível e não revisado, **quando** médico autorizado registra conferência, **então** autor/data/versão da revisão ficam preservados, original não muda e a nota interna não aparece ao paciente |
| 7A.1/7A.2 | **Dado** relatório manual aprovado, **quando** o paciente acessa antes e depois da publicação explícita, **então** só encontra a versão publicada para ele; exportação identifica versão e autoria e nega outra clínica/paciente/admin operacional |

Em cada incremento funcional: testes focados com **Terra**, persistência e negações conforme o risco, navegador desktop e 390 px, estados vazio/erro/carregamento e teclado. Na composição de ficha, validar também enfermagem vinculada sem acesso às mensagens diretas e administrador sem conteúdo clínico. Reutilizar a suíte; não executar uma bateria de IA/áudio adiada. Build/Preview no fechamento do lote conforme seção 1; evidência autenticada publicada fica separada da local. Testes e aceites desta seção são **planejados**, não executados nesta atualização.

### 8.7. Estado do Slice 7B.1 — implementação local validada

Implementado no checkout em 11/09/2026, sem migração ou deploy. A validação autenticada ocorreu no projeto Supabase de desenvolvimento, somente com dados sintéticos rastreáveis:

- A ficha individual mantém o paciente da URL nas quatro abas. Linha do tempo e Evolução reutilizam o serviço longitudinal, sem seletor que permita trocar para outro paciente; Documentos consulta apenas o `patient_id` da ficha e preserva paginação/retorno.
- As leituras clínicas exigem médico ou enfermagem e vínculo ativo no serviço; a política RLS de documentos mantém a verificação independente de `has_care_access`. Administrador operacional recebe bloqueio de conteúdo clínico.
- Incluído teste de regressão da composição e do filtro individual. A suíte local passou em **103/103**, lint, `git diff --check`, typecheck e build de produção. Terra repetiu e confirmou os testes, lint e revisão dos limites de vínculo/RLS.
- O app local agora referencia, sem copiar valores, `.env.local` e `.env.development.local` da raiz. Após reiniciar com `npm run dev`, as variáveis públicas do Supabase foram carregadas e o login funcionou normalmente.
- No navegador, desktop e **390 px**: médico abriu as quatro abas da paciente sintética e os vazios verdadeiros; enfermagem vinculada abriu os documentos; administrador recebeu “Acesso clínico restrito”; após revogação temporária, a URL direta do médico retornou “Página indisponível”. O vínculo foi restaurado. Não houve erros de navegador.
- Inventário para limpeza ao encerrar desenvolvimento: os três usuários cujo `raw_user_meta_data.test_marker` é `slice-7b1`, a paciente **Paciente QA Slice 7B.1** e seus dois vínculos de cuidado. Não foram criados documentos, mensagens, planos, check-ins, arquivos nem dados reais. Remover primeiro vínculos/paciente e depois usuários/identidades, confirmando que não restou sessão ativa.

Próximo fechamento seguro: registrar a alteração no controle de versão e validar a mesma jornada na Preview protegida antes de concluir a tarefa. Gate P continua necessário antes de dados de saúde reais.

### 8.8. Pontos de código para continuidade

| Assunto | Evidência local inspecionada |
| --- | --- |
| Ficha e abas desconectadas | [Página do paciente](../apps/web/app/clinicas/[tenantId]/pacientes/[patientId]/page.tsx) |
| Painel/contexto limitado a último atendimento e publicações | [Composição de dados](../apps/web/modules/workspace/today.ts), [cards e pendências](../apps/web/components/today-workspace.tsx) |
| Sidebar/cabeçalho/paleta | [Navegação](../apps/web/components/clinic-shell.tsx), [cabeçalho](../apps/web/components/header.tsx), [estilos](../apps/web/app/globals.css) |
| Agenda e registro manual | [Agenda](../apps/web/components/agenda.tsx), [editor de atendimento](../apps/web/components/encounter-editor.tsx), [editor de plano](../apps/web/components/care-plan-editor.tsx) |
| Evolução disponível para reaproveitar | [Serviço longitudinal](../apps/web/modules/longitudinal/service.ts), [tela longitudinal](../apps/web/components/longitudinal-workspace.tsx) |
| Documentos e falta de filtro individual na entrada atual | [Serviço de documentos](../apps/web/modules/documents/service.ts), [migração 5A](../supabase/migrations/20260911162631_private_patient_documents.sql) |
| Conversas, paginação e contrato de envio | [Serviço](../apps/web/modules/messages/service.ts), [interface](../apps/web/components/messages-workspace.tsx), [migração 5B](../supabase/migrations/20260911173050_direct_patient_messages.sql) |
| Relatórios ainda futuros | [Rota genérica](../apps/web/app/clinicas/[tenantId]/[module]/page.tsx), [definição de módulos](../apps/web/modules/workspace/navigation.ts) |

**Conclusão:** a base manual está bastante adiantada, mas a cobertura visual do protótipo não é integral. Primeiro conectar e polir o que já persiste; depois acrescentar revisão humana de documentos e relatório manual. Não atribuir um percentual global de prontidão: uma aba visual, uma tabela e uma jornada demonstrada são evidências diferentes.
