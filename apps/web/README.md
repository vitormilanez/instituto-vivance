# Vivance — aplicação nativa Vercel/Supabase

Primeira fatia funcional, não o MVP clínico completo. O protótipo Cloudflare continua na raiz do repositório e não é importado nem publicado por esta aplicação.

## Disponível

- Login individual com Supabase Auth e refresh de cookies pelo proxy Next.js.
- Vínculos de clínica e papéis lidos do banco, não de metadados editáveis do usuário.
- Escolha explícita de clínica; lista e cadastro demográfico de pacientes, paginados.
- Painel da clínica com 8 ações rápidas e contagem real; busca por nome, ficha cadastral individual e histórico em páginas próprias.
- Estrutura navegável sem mocks para agenda, atendimentos, planos, acompanhamento, documentos, mensagens, relatórios e IA. Abas navegáveis e ações de escrita futuras desativadas. Calendário com seleção de datas, sem horários fictícios.
- Área do paciente em `/clinicas/:tenantId/meu-cuidado/hoje`, com Hoje, Meu cuidado, Conversas e Evolução. Seções de orientações, tratamento, diário, consultas e documentos ainda sem integração clínica. Perfil cadastral real preservado.
- API versionada por módulo: `/api/v1/clinics`, `/api/v1/clinics/:tenantId/patients`, `/api/v1/clinics/:tenantId/audit`.
- Auditoria de criação/alteração de clínica, vínculo e cadastro na mesma transação, sem cópia dos valores pessoais.
- Histórico somente para administrador; sem permissão da aplicação para forjar ou apagar eventos.
- Banco com RLS e verificação de sessão existente, expiração, usuário bloqueado/excluído, clínica e vínculo ativos.

Médico, enfermagem e administrador têm acesso ao **cadastro demográfico da sua clínica**. Isso não concede acesso a prontuário: os próximos módulos clínicos precisam exigir vínculo de cuidado ativo com o paciente. O paciente acessa `/clinicas/:tenantId/meu-perfil`, somente leitura de sua própria ficha, vinculada explicitamente por `patient_accounts`. Não tem acesso ao diretório nem à auditoria.

Dois acessos de teste (médico e paciente) foram criados por solicitação do titular no ambiente de desenvolvimento. Identidades, senhas e e-mails não são seeds nem ficam no repositório. A ficha de teste foi criada de forma persistida e vinculada ao usuário paciente. Login de ambos validado contra o Auth; RLS retorna somente a própria ficha ao paciente e nenhuma auditoria para qualquer dos dois papéis. Migração `20260911004732_patient_account_access.sql`, com chaves compostas e nenhum direito de escrita para os usuários sobre o vínculo.

Verificações: 29 testes de regras/isolamento e navegação, lint, TypeScript e build. O advisor registrou proteção contra senhas vazadas desativada; é pendência de configuração para operação, sem alterar a senha de testes solicitada. [Orientação do Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Rodar localmente

Plano e próximos módulos: [PLANO_MIGRACAO_MODULOS.md](../../docs/PLANO_MIGRACAO_MODULOS.md).

Requer Node.js 24. Na pasta `apps/web`, execute `npm ci`. Na raiz do repositório, mantenha somente as configurações locais autorizadas em `.env.development.local` (ignorado pelo Git):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Na raiz, execute `npm run web:dev -- --hostname 127.0.0.1 --port 3010`. Para compilar: `npm run web:build`. O lançador carrega as variáveis no processo filho sem repassar `--env-file` aos workers do Next.js.

Vercel: Root Directory `apps/web`, framework Next.js, Node.js 24.x. `sourceFilesOutsideRootDirectory=false`. Variáveis Supabase somente em Development/Preview. Publicação automática desabilitada nesta etapa; prévias manuais não significam liberação clínica.

**Publicação online pendente:** no primeiro envio a CLI 59.15.1 atribuiu `target=production` mesmo com `--target preview`. Os dois envios foram removidos; nenhum deployment ficou ativo. Resolver esse comportamento de bootstrap antes de tentar novamente. A aplicação permanece disponível localmente, não em produção.

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

Neste estágio, o Site URL do projeto de desenvolvimento aponta para `http://127.0.0.1:3010/primeiro-acesso`: abrir o convite no mesmo computador com o servidor local ativo. Ao publicar a versão de testes, configurar a URL HTTPS exata e manter o retorno local autorizado enquanto houver convites locais pendentes.

Entrada, seleção da clínica e leitura do cadastro existente foram verificadas no navegador. Nenhum cadastro público pode se promover ou criar uma clínica nesta versão.

Recuperação: o login oferece **Esqueci minha senha** em `/esqueci-minha-senha`. O envio usa a API pública do Supabase Auth, respeita seus limites e apresenta confirmação sem revelar se a conta existe. Um cliente sem persistência solicita um link de recuperação que pode ser aberto no navegador de e-mail do titular; `/primeiro-acesso` valida e importa a sessão em cookies antes de permitir a nova senha. O envio ao titular foi confirmado no Auth em 10/09/2026. Nenhuma senha é recuperada ou definida pela aplicação em nome do usuário.

## Limites desta entrega

Não implementados: consultas, check-ins, prontuário, vínculos clínicos, arquivos, áudios, IA, envio de convite pela interface e gestão de equipe. A aceitação de convite, definição e recuperação da senha estão implementadas. Não importar componentes antigos que usem demonstrações para preencher essas lacunas. Usar fontes reais ao migrar cada módulo, preservando o desenho visual onde for reaproveitável.

Sem homologação para atendimento real. MFA, limites contra abuso, fluxo completo de primeiro acesso, restauração de backups, política de retenção e revisão clínica/privacidade permanecem critérios de entrada em operação. A inspeção de segurança do schema não certifica todo o produto.

## Orientação para revisão do Vercel Agent

Revisar apenas esta fatia, especialmente isolamento entre clínicas, privilégios por coluna, sessão revogada, cookies/cache, operações atômicas de auditoria e separação do protótipo. Propor correções, não aplicar mudanças, promover deploys ou inserir dados automaticamente. Não habilitar IA clínica, analytics nem observabilidade paga como parte da revisão.

Referências: [SSR Supabase](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vercel Code Review](https://vercel.com/docs/agent/pr-review).
