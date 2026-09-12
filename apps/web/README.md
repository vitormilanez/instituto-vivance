# Vivance — aplicação nativa Vercel/Supabase

Primeira fatia funcional, não o MVP clínico completo. O protótipo Cloudflare continua na raiz do repositório e não é importado nem publicado por esta aplicação.

## Disponível

- Login individual com Supabase Auth e refresh de cookies pelo proxy Next.js.
- Vínculos de clínica e papéis lidos do banco, não de metadados editáveis do usuário.
- Escolha explícita de clínica; lista e cadastro demográfico de pacientes, paginados.
- Painel da clínica com 8 ações rápidas e contagem real; busca por nome, ficha cadastral individual e histórico em páginas próprias.
- Agenda real: criar, remarcar, cancelar e registrar falta em consultas/retornos; cinco estados coerentes com o Atendimento, calendário mensal, conflito de horários, versão otimista e auditoria. Ver [escopo e validação](../../docs/AGENDA_MVP.md).
- Atendimento manual: início explícito pela Agenda, rascunho, retomada, finalização, busca/paginação, versões e adendos imutáveis, com acesso por vínculo clínico ativo e escrita exclusiva do médico autor. Ver [escopo e validação](../../docs/ATENDIMENTO_MVP.md).
- Equipe de cuidado: convite pendente de médico/enfermagem, aceite explícito, suspensão/reativação e atribuição/aceite/revogação de responsabilidade por paciente. O administrador opera metadados sem abrir conteúdo clínico. Ver [escopo e validação](../../docs/EQUIPE_VINCULOS_MVP.md).
- Plano de cuidado interno versionado, aprovação médica separada da publicação, portal de orientações vigentes, ciência de leitura, substituição e retirada com histórico.
- Check-ins manuais com relato original, medida opcional e revisão interna; Evolução compõe medidas e linha do tempo somente de dados persistidos, com origem e separação entre equipe/paciente.
- Documentos privados: PDF/JPG/PNG até 5 MB, upload direto assinado, bucket não público, validação de tamanho/assinatura antes de disponibilizar, acesso por vínculo e download temporário. Uso interno e compartilhado ficam separados. Ver [escopo e limites](../../docs/DOCUMENTOS_MVP.md).
- Conversas diretas e assíncronas entre paciente e médico com vínculo de cuidado ativo, persistentes, paginadas e sem acesso administrativo ou de enfermagem. Não há anexo, notificação externa, prazo de resposta ou uso para urgência. Ver [escopo e limites](../../docs/CONVERSAS_MVP.md).
- Avisos internos persistentes para novas mensagens e orientações publicadas, exclusivos do destinatário, com preferência individual e resumo sem conteúdo clínico. Não há e-mail, WhatsApp, SMS ou push nesta etapa. Ver [escopo e limites](../../docs/NOTIFICACOES_MVP.md).
- Base privada de processamentos para tarefas futuras autorizadas: estado, tentativas, idempotência e reserva do executor, sem áudio, conteúdo clínico, fornecedor ou IA ativos. A leitura é limitada à equipe clínica com vínculo de cuidado. Ver [escopo e limites](../../docs/PROCESSAMENTOS_MVP.md).
- Relatórios manuais com fontes autorizadas, versões, revisão e aprovação médica; publicação separada com texto próprio para o paciente, substituição/retirada e PDF identificado. Fontes e notas internas não entram no portal nem no arquivo.
- Área do paciente em `/clinicas/:tenantId/meu-cuidado/hoje`, com Hoje, Meu cuidado, Conversas e Evolução. A visão principal e Consultas mostram o próximo compromisso real, seu estado e o profissional; plano, diário, evolução, documentos compartilhados, conversas diretas e relatórios publicados estão conectados. Tratamento permanece sem integração clínica. Perfil cadastral preservado.
- API versionada por módulo: `/api/v1/clinics`, `/api/v1/clinics/:tenantId/patients`, `/api/v1/clinics/:tenantId/appointments`, `/api/v1/clinics/:tenantId/encounters` (incluindo `/:encounterId/addenda`), `/api/v1/clinics/:tenantId/team`, `/api/v1/clinics/:tenantId/documents` (incluindo `/:documentId/complete` e `/:documentId/download`), `/api/v1/clinics/:tenantId/messages`, `/api/v1/clinics/:tenantId/notifications/:notificationId/read`, `/api/v1/clinics/:tenantId/notification-preferences` e `/api/v1/clinics/:tenantId/audit`.
- Auditoria de criação/alteração de clínica, vínculo e cadastro na mesma transação, sem cópia dos valores pessoais.
- Histórico somente para administrador; sem permissão da aplicação para forjar ou apagar eventos.
- Banco com RLS e verificação de sessão existente, expiração, usuário bloqueado/excluído, clínica e vínculo ativos.

Médico, enfermagem e administrador têm acesso ao **cadastro demográfico da sua clínica**. Isso não concede acesso a prontuário: Atendimento já exige vínculo de cuidado ativo com o paciente; módulos clínicos futuros devem manter essa regra. O paciente acessa `/clinicas/:tenantId/meu-perfil`, somente leitura de sua própria ficha, vinculada explicitamente por `patient_accounts`. Não tem acesso ao diretório nem à auditoria.

Dois acessos de teste (médico e paciente) foram criados por solicitação do titular no ambiente de desenvolvimento. Identidades, senhas e e-mails não são seeds nem ficam no repositório. A ficha de teste foi criada de forma persistida e vinculada ao usuário paciente. Login de ambos validado contra o Auth; RLS retorna somente a própria ficha ao paciente e nenhuma auditoria para qualquer dos dois papéis. Migração `20260911004732_patient_account_access.sql`, com chaves compostas e nenhum direito de escrita para os usuários sobre o vínculo.

Verificações do slice 3D: 61 cenários diretamente afetados de Agenda, Atendimento, navegação e isolamento aprovados, além de lint, TypeScript e build. A migração remota está aplicada; a jornada conectada foi validada em desktop e no paciente em 390 px, e os dados sintéticos descartáveis foram removidos. O advisor registra proteção contra senhas vazadas desativada e sinaliza os dois RPCs atômicos `SECURITY DEFINER`, intencionalmente expostos apenas ao papel autenticado e protegidos por validação de sessão, papel, clínica, responsável e versão. [Orientação do Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Verificações do Slice 5B: 97 testes, tipos, lint e build passaram. As migrações `20260911173050_direct_patient_messages` e `20260911174240_message_foreign_key_indexes` estão aplicadas ao Supabase de desenvolvimento. A jornada médica e a do paciente foram exercitadas no navegador com dados sintéticos, inclusive em 390 px; depois foram removidos. A Preview protegida `dpl_FKoZk34nWhsT222zMLR9pNVPUhdf` está pronta, sem merge ou promoção Production.

Verificações do Slice 5C: 100 testes, tipos, lint e build passaram. A migração `20260911234004_in_app_notifications` está aplicada ao Supabase de desenvolvimento. Médico e paciente sintéticos validaram mensagem → aviso genérico → conversa nos dois sentidos, preferência individual e supressão/retomada; a visão do paciente foi conferida em 390 px e todo registro sintético foi removido. A Preview protegida `dpl_HYMJsHRXMNtiNCA1g1ZWLgZeqC1i` está pronta em https://instituto-vivance-mnyoog4i5-vtr-consulting.vercel.app; entrada autorizada respondeu `200` com cache privado e a nova API sem sessão `401` com `private, no-store`. CI `34660001112` passou, sem merge ou promoção Production.

Verificações do Slice 5D: 101 testes, tipos, lint, build e `git diff --check` passaram; Terra também revisou a fronteira de privacidade. As migrações `20260912003803_processing_job_foundation`, `20260912003922_processing_job_created_by_index` e `20260912005616_processing_job_privacy_hardening` estão aplicadas ao Supabase de desenvolvimento. RLS, política de leitura por vínculo e permissões do executor foram conferidos no schema remoto: o navegador não escreve na tabela, a referência idempotente é UUID opaco, leases vencidos são recuperados antes da reserva e as RPCs do executor são exclusivas de `service_role`. A tela pública de entrada e o redirecionamento da rota privada sem sessão foram conferidos em desktop e 390 px; a prova autenticada da tela depende de uma sessão legítima e não criou nem reteve credencial. A Preview protegida `dpl_AXrcuRLcFZQS3toJEyNeWD5C1xdh` está pronta em https://instituto-vivance-r4ou6405z-vtr-consulting.vercel.app; entrada autorizada respondeu `200` com cache privado, a rota sem sessão voltou à entrada e as CIs `34663311366` e `34663313351` passaram. Não há executor, Cron, Edge Function, fornecedor, áudio ou IA ativos; sem merge ou promoção Production. Ver [escopo e limites](../../docs/PROCESSAMENTOS_MVP.md).

Verificações do lote convite/onboarding até relatórios: 141 testes, tipos, lint, build, PDF renderizado/lido e telas em desktop/390 px passaram. As seis migrations finais, incluindo índices para as novas relações, estão no Supabase de desenvolvimento; o advisor não mantém falta de índice introduzida por este lote. A branch `codex/onboarding-paciente`, PR #16 em rascunho e Preview protegida `dpl_7spYPFzhBxDtst8F4AQADMJcjvBh` estão disponíveis para avaliação. Entrada autorizada respondeu `200`; API sem sessão respondeu `401`, ambas sem cache. Sem merge ou Production.

## Rodar localmente

Plano e próximos módulos: [PLANO_MIGRACAO_MODULOS.md](../../docs/PLANO_MIGRACAO_MODULOS.md).

Requer Node.js 24. Na pasta `apps/web`, execute `npm ci`. Na raiz do repositório, mantenha somente as configurações locais autorizadas em `.env.development.local` (ignorado pelo Git):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Na raiz, execute `npm run web:dev -- --hostname 127.0.0.1 --port 3010`. Para compilar: `npm run web:build`. O lançador carrega as variáveis no processo filho sem repassar `--env-file` aos workers do Next.js.

Vercel: Root Directory `apps/web`, framework Next.js, Node.js 24.x. `sourceFilesOutsideRootDirectory=false`. Variáveis Supabase somente em Development/Preview. Publicação automática desabilitada nesta etapa; prévias manuais não significam liberação clínica.

**Endereço fixo da prévia de testes:** https://instituto-vivance-testes-vtr-consulting.vercel.app. A Agenda operacional foi entregue em 10/09/2026, código funcional `2fc8666` e revisão dos textos `d7907e7`. O acesso exige a proteção da Vercel e depois o login individual da Vivance. Sem liberação para atendimento real. A cada publicação manual validada, atualizar somente o alias de testes; não promover para Production.

Atendimento manual publicado em 10/09/2026, código `128aacf`, deployment Preview `dpl_3scv4m6KDATCJZRHGfM31T8iGPe4` READY, no mesmo endereço fixo. [Evidências e limites dos slices 3 e 3B](../../docs/ATENDIMENTO_MVP.md). Salvamento explícito; finalização e adendos não publicam ao paciente.

Adendos e integridade publicados em Preview em 11/09/2026, código funcional `6f14c3b`, deployment `dpl_7rDEyw7LvpLfNEihdSoyb1C89okA` READY, sem merge ou promoção Production. O fluxo persistente foi fechado depois em um novo registro sintético autorizado, sem alterar os dois registros anteriores.

Equipe e vínculos de cuidado publicados em Preview em 11/09/2026, código funcional `94b3e48`, deployment `dpl_H6gFqQf1Lvj3ACztE7KkZTVf99TK` READY, no mesmo endereço fixo e sem merge ou promoção Production. A jornada de convite, aceite, atribuição, suspensão, revogação e reatribuição foi validada com identidades sintéticas descartáveis e o banco de desenvolvimento foi restaurado aos registros anteriores.

Agenda e Atendimento coerentes implementados no código funcional `2fd4420`, com a migração `20260911055947_agenda_encounter_state_coherence` aplicada ao Supabase de desenvolvimento. A publicação Preview final é registrada na referência central e no Asana; sem merge ou promoção Production.

### Registro histórico da primeira publicação

A primeira prévia do shell foi https://instituto-vivance-l9034h1b3-vtr-consulting.vercel.app, deployment `dpl_8TAwnssREwZp6Y4DEqtQdgnmvmQD`, `READY`, Preview, código `ca6076f`, Next.js 16.3.4, build de cerca de 33 segundos. Esse endereço imutável não recebe as evoluções da Agenda; usar o endereço fixo acima.

O bloqueio de primeiro envio foi resolvido seguindo a [regra documentada da Vercel](https://vercel.com/docs/deployments/environments#first-deployment): inicialização com HTML inerte, sem aplicativo, banco, variáveis Supabase ou dados, classificada pela plataforma como Production (`dpl_C2TANKnK2JKYBdxindLHW3agt8WV`). Essa página técnica foi verificada e continua protegida. O aplicativo foi publicado depois, separadamente, como Preview. Configurações de Next.js restauradas, autoatribuição de domínios desativada e nenhum merge para `main`. Não apagar a inicialização como limpeza casual: isso pode reabrir o comportamento de primeiro envio.

Verificação online: login e logout da administradora, painel com os dois cadastros já existentes e Agenda vazia; login do paciente, área Hoje e bloqueio de URL direta do diretório da clínica. API `/api/v1/clinics` sem sessão responde `401` e `Cache-Control: private, no-store`, mesmo quando a proteção da Vercel é autenticada pela CLI. Visitante sem acesso Vercel é redirecionado ao login da plataforma. Consulta de logs de erro não retornou entradas no intervalo observado; isso não é garantia de ausência de erros futuros. Sem inclusão de cadastros, alteração de papéis ou migrações nesta publicação. O médico havia sido validado localmente; sua sessão não foi repetida no navegador online nesta rodada.

## Verificar

Dentro de `apps/web`:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Os testes executam o SQL de migração em PostgreSQL efêmero (PGlite), com fixtures restritas ao processo de teste e uma representação mínima do schema Auth. **Não conectam nem inserem dados no Supabase hospedado.** Isso prova regras do banco e validações, não substitui o teste de uma sessão real de ponta a ponta.

O workflow GitHub executa testes, lint, tipos e build sem credenciais de produção. Tipos do banco gerados pelo Supabase. O schema remoto recebeu `20260910234945_vivance_identity_directory.sql`; timestamp local alinhado com o histórico retornado pelo servidor, sem reaplicar DDL.

## Primeiro acesso

O titular confirmou seu e-mail. Convite enviado pelo painel oficial do Supabase Auth em 10/09/2026; identidade criada, clínica Instituto Vivance e vínculo `admin` ativo verificados no banco. O titular concluiu a definição de senha e confirmou o login. Fluxo de recuperação também utilizado pelo titular.

`/primeiro-acesso` recebe o convite, remove os tokens do endereço, valida a sessão com o Auth e permite definir a senha. O cliente compartilha a sessão com o servidor por cookies. Links inválidos ou expirados não habilitam o formulário. Nenhuma senha padrão é criada, e credenciais não são registradas em logs.

Para a produção, o Site URL e a lista de Redirect URLs do Supabase devem incluir `https://institutovivance.app/primeiro-acesso`. A Edge Function `invite-staff` exige o segredo `TEAM_INVITE_REDIRECT_URL` com esse mesmo valor e falha fechada se ele estiver ausente ou inválido; ela não usa Preview como retorno implícito. Os aliases de Preview permanecem apenas como evidência histórica. A configuração não equivale à validação de um novo e-mail de recuperação ponta a ponta; nenhum e-mail adicional é enviado pela publicação.

Entrada, seleção da clínica e leitura do cadastro existente foram verificadas no navegador. Nenhum cadastro público pode se promover ou criar uma clínica nesta versão.

Recuperação: o login oferece **Esqueci minha senha** em `/esqueci-minha-senha`. O envio usa a API pública do Supabase Auth, respeita seus limites e apresenta confirmação sem revelar se a conta existe. Um cliente sem persistência solicita um link de recuperação que pode ser aberto no navegador de e-mail do titular; `/primeiro-acesso` valida e importa a sessão em cookies antes de permitir a nova senha. O envio ao titular foi confirmado no Auth em 10/09/2026. Nenhuma senha é recuperada ou definida pela aplicação em nome do usuário.

## Limites desta entrega

Não implementados: notificações externas, confirmação de leitura da mensagem, anexos em conversas, execução de tarefas, áudios e IA. Documentos privados, mensagens diretas e assíncronas, avisos internos, a base privada de processamentos, agendamento, atendimento manual interno, adendos, gestão operacional de equipe/vínculos, planos/publicação, check-ins e evolução neutra estão implementados no checkout. As migrações de documentos, conversas, avisos e processamentos estão aplicadas ao Supabase de desenvolvimento; as Previews protegidas anteriores passaram, sem merge ou promoção Production. Não importar componentes antigos que usem demonstrações para preencher essas lacunas. Usar fontes reais ao migrar cada módulo, preservando o desenho visual onde for reaproveitável.

Sem homologação para atendimento real. MFA, limites contra abuso, fluxo completo de primeiro acesso, restauração de backups, política de retenção e revisão clínica/privacidade permanecem critérios de entrada em operação. A inspeção de segurança do schema não certifica todo o produto.

## Orientação para revisão do Vercel Agent

Revisar apenas esta fatia, especialmente isolamento entre clínicas, privilégios por coluna, sessão revogada, cookies/cache, operações atômicas de auditoria e separação do protótipo. Propor correções, não aplicar mudanças, promover deploys ou inserir dados automaticamente. Não habilitar IA clínica, analytics nem observabilidade paga como parte da revisão.

Referências: [SSR Supabase](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vercel Code Review](https://vercel.com/docs/agent/pr-review).
