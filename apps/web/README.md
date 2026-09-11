# Vivance — aplicação nativa Vercel/Supabase

Primeira fatia funcional, não o MVP clínico completo. O protótipo Cloudflare continua na raiz do repositório e não é importado nem publicado por esta aplicação.

## Disponível

- Login individual com Supabase Auth e refresh de cookies pelo proxy Next.js.
- Vínculos de clínica e papéis lidos do banco, não de metadados editáveis do usuário.
- Escolha explícita de clínica; lista e cadastro demográfico de pacientes, paginados.
- Painel da clínica com 8 ações rápidas e contagem real; busca por nome, ficha cadastral individual e histórico em páginas próprias.
- Agenda real: criar, remarcar e cancelar consultas/retornos; calendário mensal, conflito de horários, versão otimista e auditoria. Ver [escopo e validação](../../docs/AGENDA_MVP.md).
- Atendimento manual: início explícito pela agenda, rascunho, retomada, finalização e versões, com acesso por vínculo clínico ativo e escrita exclusiva do médico autor. Ver [escopo e validação](../../docs/ATENDIMENTO_MVP.md).
- Estrutura navegável sem mocks para planos, acompanhamento, documentos, mensagens, relatórios e IA; ações futuras desativadas.
- Área do paciente em `/clinicas/:tenantId/meu-cuidado/hoje`, com Hoje, Meu cuidado, Conversas e Evolução. Consultas já lê os próprios horários reais; orientações, tratamento, diário e documentos ainda sem integração clínica. Perfil cadastral preservado.
- API versionada por módulo: `/api/v1/clinics`, `/api/v1/clinics/:tenantId/patients`, `/api/v1/clinics/:tenantId/appointments`, `/api/v1/clinics/:tenantId/encounters`, `/api/v1/clinics/:tenantId/audit`.
- Auditoria de criação/alteração de clínica, vínculo e cadastro na mesma transação, sem cópia dos valores pessoais.
- Histórico somente para administrador; sem permissão da aplicação para forjar ou apagar eventos.
- Banco com RLS e verificação de sessão existente, expiração, usuário bloqueado/excluído, clínica e vínculo ativos.

Médico, enfermagem e administrador têm acesso ao **cadastro demográfico da sua clínica**. Isso não concede acesso a prontuário: Atendimento já exige vínculo de cuidado ativo com o paciente; módulos clínicos futuros devem manter essa regra. O paciente acessa `/clinicas/:tenantId/meu-perfil`, somente leitura de sua própria ficha, vinculada explicitamente por `patient_accounts`. Não tem acesso ao diretório nem à auditoria.

Dois acessos de teste (médico e paciente) foram criados por solicitação do titular no ambiente de desenvolvimento. Identidades, senhas e e-mails não são seeds nem ficam no repositório. A ficha de teste foi criada de forma persistida e vinculada ao usuário paciente. Login de ambos validado contra o Auth; RLS retorna somente a própria ficha ao paciente e nenhuma auditoria para qualquer dos dois papéis. Migração `20260911004732_patient_account_access.sql`, com chaves compostas e nenhum direito de escrita para os usuários sobre o vínculo.

Verificações do slice 3: 52 testes de regras/isolamento e navegação, lint e TypeScript. Evidências de publicação no documento do slice. O advisor registrou proteção contra senhas vazadas desativada; é pendência de configuração para operação, sem alterar a senha de testes solicitada. [Orientação do Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

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

O Site URL do Supabase aponta para `https://instituto-vivance-testes-vtr-consulting.vercel.app/primeiro-acesso`. Esse retorno exato foi adicionado à lista autorizada, preservando o localhost e os retornos HTTPS anteriores. Configuração conferida após recarregar o painel, sem curingas. Usar o alias fixo ao divulgar a versão; os URLs imutáveis são evidência histórica. Configuração não equivale à validação de um novo e-mail de recuperação ponta a ponta; nenhum e-mail adicional foi enviado nesta publicação.

Entrada, seleção da clínica e leitura do cadastro existente foram verificadas no navegador. Nenhum cadastro público pode se promover ou criar uma clínica nesta versão.

Recuperação: o login oferece **Esqueci minha senha** em `/esqueci-minha-senha`. O envio usa a API pública do Supabase Auth, respeita seus limites e apresenta confirmação sem revelar se a conta existe. Um cliente sem persistência solicita um link de recuperação que pode ser aberto no navegador de e-mail do titular; `/primeiro-acesso` valida e importa a sessão em cookies antes de permitir a nova senha. O envio ao titular foi confirmado no Auth em 10/09/2026. Nenhuma senha é recuperada ou definida pela aplicação em nome do usuário.

## Limites desta entrega

Não implementados: registro clínico do atendimento, check-ins, prontuário, vínculos clínicos, arquivos, áudios, IA, envio de convite pela interface e gestão de equipe. Agendamento, aceitação de convite, definição e recuperação da senha estão implementados. Não importar componentes antigos que usem demonstrações para preencher essas lacunas. Usar fontes reais ao migrar cada módulo, preservando o desenho visual onde for reaproveitável.

Sem homologação para atendimento real. MFA, limites contra abuso, fluxo completo de primeiro acesso, restauração de backups, política de retenção e revisão clínica/privacidade permanecem critérios de entrada em operação. A inspeção de segurança do schema não certifica todo o produto.

## Orientação para revisão do Vercel Agent

Revisar apenas esta fatia, especialmente isolamento entre clínicas, privilégios por coluna, sessão revogada, cookies/cache, operações atômicas de auditoria e separação do protótipo. Propor correções, não aplicar mudanças, promover deploys ou inserir dados automaticamente. Não habilitar IA clínica, analytics nem observabilidade paga como parte da revisão.

Referências: [SSR Supabase](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vercel Code Review](https://vercel.com/docs/agent/pr-review).
