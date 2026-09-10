# Vivance — aplicação nativa Vercel/Supabase

Primeira fatia funcional, não o MVP clínico completo. O protótipo Cloudflare continua na raiz do repositório e não é importado nem publicado por esta aplicação.

## Disponível

- Login individual com Supabase Auth e refresh de cookies pelo proxy Next.js.
- Vínculos de clínica e papéis lidos do banco, não de metadados editáveis do usuário.
- Escolha explícita de clínica; lista e cadastro demográfico de pacientes, paginados.
- API versionada por módulo: `/api/v1/clinics`, `/api/v1/clinics/:tenantId/patients`, `/api/v1/clinics/:tenantId/audit`.
- Auditoria de criação/alteração de clínica, vínculo e cadastro na mesma transação, sem cópia dos valores pessoais.
- Histórico somente para administrador; sem permissão da aplicação para forjar ou apagar eventos.
- Banco com RLS e verificação de sessão existente, expiração, usuário bloqueado/excluído, clínica e vínculo ativos.

Médico, enfermagem e administrador têm acesso ao **cadastro demográfico da sua clínica**. Isso não concede acesso a prontuário: os próximos módulos clínicos precisam exigir vínculo de cuidado ativo com o paciente. O papel paciente ainda não tem área funcional neste app.

## Rodar localmente

Requer Node.js 24. Na pasta `apps/web`, execute `npm ci`. Na raiz do repositório, mantenha somente as configurações locais autorizadas em `.env.development.local` (ignorado pelo Git):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Na raiz, execute `npm run web:dev -- --hostname 127.0.0.1 --port 3010`. Para compilar: `npm run web:build`. O lançador carrega as variáveis no processo filho sem repassar `--env-file` aos workers do Next.js.

Vercel: Root Directory `apps/web`, framework Next.js, Node.js 24.x. `sourceFilesOutsideRootDirectory=false`. Variáveis Supabase somente em Development/Preview. Publicação automática desabilitada nesta etapa; prévias manuais não significam liberação clínica.

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

## Primeiro acesso — ainda pendente

1. Titular informa o e-mail do primeiro administrador.
2. Criar/convidar a identidade pelo Supabase Auth de forma segura, sem senhas no Git/chat e sem conta padrão. Não inserir diretamente uma senha na tabela Auth.
3. Em operação administrativa autorizada, criar a clínica Vivance e o vínculo `admin` para o ID confirmado. Nenhum cadastro público pode se promover ou criar uma clínica nesta versão.
4. Validar entrada, seleção da clínica, sessão, logout e bloqueio do acesso com uma conta real. Convites, definição/recuperação de senha e gestão de usuários na interface ainda precisam ser concluídos antes da operação.

## Limites desta entrega

Não implementados: consultas, check-ins, prontuário, vínculos clínicos, arquivos, áudios, IA, convite/recuperação de senha na interface e gestão de equipe. Não importar componentes antigos que usem demonstrações para preencher essas lacunas. Usar fontes reais ao migrar cada módulo, preservando o desenho visual onde for reaproveitável.

Sem homologação para atendimento real. MFA, limites contra abuso, fluxo completo de primeiro acesso, restauração de backups, política de retenção e revisão clínica/privacidade permanecem critérios de entrada em operação. A inspeção de segurança do schema não certifica todo o produto.

## Orientação para revisão do Vercel Agent

Revisar apenas esta fatia, especialmente isolamento entre clínicas, privilégios por coluna, sessão revogada, cookies/cache, operações atômicas de auditoria e separação do protótipo. Propor correções, não aplicar mudanças, promover deploys ou inserir dados automaticamente. Não habilitar IA clínica, analytics nem observabilidade paga como parte da revisão.

Referências: [SSR Supabase](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vercel Code Review](https://vercel.com/docs/agent/pr-review).
