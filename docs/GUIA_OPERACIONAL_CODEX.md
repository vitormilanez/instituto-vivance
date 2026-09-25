# Guia operacional do Vivance para próximas tarefas

Este é o ponto de partida para publicar mudanças e para localizar as áreas do
produto. **Releia o estado real a cada execução:** commits, deployments, aliases,
migrations e permissões mudam. Os identificadores e resultados de uma publicação
anterior servem como histórico, não como alvo para a próxima.

## Onde trabalhar

- Repositório: `vitormilanez/instituto-vivance`. Descubra a raiz do checkout com
  `git rev-parse --show-toplevel`; não dependa de um caminho local fixo.
- Aplicação publicada: `apps/web/` (Next.js, Node 24). A Vercel já tem **Root
  Directory = `apps/web`**; execute a CLI Vercel **da raiz do repositório**.
- `app/`, `db/` e `drizzle/` na raiz são um protótipo legado. A pasta
  `Desktop/Codes/Instituto Vivance` pode conter apenas uma cópia visual sem Git;
  não a use para preparar o deploy.
- Banco, RLS, Storage, RPCs e Edge Functions: `supabase/`. Nunca coloque senhas,
  tokens, `.env*` ou respostas clínicas em commits, comandos impressos ou logs.
- Projeto Vercel: `vtr-consulting/instituto-vivance`; leia o vínculo local em
  `.vercel/project.json` e confira com `vercel project inspect` antes de operar.
  Domínio principal: `institutovivance.app`; `instituto-vivance.vercel.app`
  redireciona para ele.

## Publicar e promover para institutovivance.app

### 1. Definir exatamente o que será publicado

1. Confirme que há pedido ou autorização vigente para publicar. Uma aprovação
   anterior continua valendo dentro do mesmo escopo; não peça a mesma permissão
   de novo. Mudanças de banco, dados reais ou regras clínicas fora do escopo
   exigem autorização própria.
2. Confira `git status --short`, `git fetch origin main`, o commit de
   `origin/main`, o PR e os checks. Preserve alterações locais de outras pessoas.
   Publique somente um commit integrado à `main`, nunca uma branch de trabalho.
3. Execute os testes proporcionais à mudança em `apps/web` com Node 24:
   `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`. Confira também
   `git diff --check`. O workflow `web-foundation.yml` faz a verificação em CI.
4. Classifique o lote: só código, migration, Edge Function, ou combinação.
   Identifique dependências de schema e mantenha o banco compatível com o código
   que ainda está no ar durante a transição.

### 2. Verificar o workflow de release, sem confiar apenas no verde

O arquivo `.github/workflows/release.yml` define `verify → migrate → promote`
para mudanças em `apps/web`, `supabase` ou no próprio workflow. Confira o run
do **mesmo SHA** com `gh run list --workflow release.yml` e `gh run view <RUN_ID>
--json jobs`. Verifique as etapas internas, não só a conclusão do job:

- `migrate` pode terminar verde com `Aplicar migrações` e `Publicar Edge
  Functions` **skipped** quando faltam as configurações protegidas.
- `promote` pode terminar verde com `Promover o deployment` e `Confirmar que o
  domínio passou a servir este commit` **skipped** pelo mesmo motivo.
- Uma PR verde, um run verde ou um deployment `READY` não provam que o domínio
  passou a apontar para o novo código.
- Mudança apenas em `docs/` não dispara automaticamente esse workflow. Não
  faça deploy da aplicação apenas para publicar documentação.

Se as etapas realmente executaram, ainda confirme deployment e domínio pelos
passos 4 e 5. Se foram ignoradas ou não existe deployment do mesmo commit,
siga o caminho manual autorizado.

### 3. Banco e Edge Functions, quando o lote exigir

Antes de qualquer operação remota, identifique o projeto Supabase de destino e
compare a referência do projeto conectado com o ambiente esperado. Não deduza
o destino pelo nome de um arquivo `.env.local`: já houve variáveis locais
apontando para projetos diferentes. Compare a lista de migrations local e a
lista do ambiente vinculado; registre quais versões faltam. Só então aplique
as migrations autorizadas e confira a lista novamente. Use a CLI e a versão
indicadas pelo workflow para esse lote; descubra opções com `--help`.

Na operação manual, após carregar as credenciais pelo cofre autorizado e
confirmar o valor de `SUPABASE_PROJECT_ID` **sem exibir segredos**, a sequência
equivalente à pipeline é:

```bash
npx --yes supabase@2.117.0 link --project-ref "$SUPABASE_PROJECT_ID"
npx --yes supabase@2.117.0 migration list --linked
# Revise a diferença e a autorização antes da próxima linha.
npx --yes supabase@2.117.0 db push --linked
npx --yes supabase@2.117.0 migration list --linked
```

Se uma migration já foi aplicada, corrija por **nova migration versionada**;
nunca reescreva uma aplicada. Não use uma falha de schema como motivo para
aplicar SQL em um projeto cuja identidade não foi confirmada. Publique Edge
Functions alteradas depois de alinhar o schema. Registre explicitamente
`aplicado`, `não necessário`, `pendente` ou `não verificado` para o banco.

### 4. Deploy Vercel do commit integrado

Primeiro inspecione o projeto e procure um deployment de produção `READY` do
mesmo commit. Se o workflow já promoveu esse artefato, não crie outro. Se for
preciso fazer deploy manual, use um checkout limpo no SHA de `origin/main` e
rode **da raiz do repositório**:

```bash
git fetch origin main
git status --short
git switch --detach origin/main # somente em checkout limpo; preserve trabalho local
git rev-parse HEAD
npx --yes vercel@59.16.0 project inspect instituto-vivance --scope vtr-consulting
npx --yes vercel@59.16.0 deploy --prod --skip-domain --yes --scope vtr-consulting
```

Guarde a URL e o ID retornados pelo comando **desta execução**. Espere o estado
`READY` e confirme `target=production` em `vercel inspect <URL>`. O deploy deve
conter o SHA integrado que foi testado. A região do build (`iad1`, por exemplo)
não é a região de execução da função (`gru1` nas verificações anteriores).

### 5. Apontar e comprovar os domínios

O auto-assignment de domínios já esteve desativado; portanto, **não suponha**
que um deploy de produção assumiu `institutovivance.app`. Se a inspeção mostrar
outro alvo, use a URL técnica `READY` recém-gerada:

```bash
DEPLOY_URL='https://URL-TECNICA-READY.vercel.app' # substitua pela URL desta execução
npx --yes vercel@59.16.0 alias set "$DEPLOY_URL" institutovivance.app --scope vtr-consulting
npx --yes vercel@59.16.0 alias set "$DEPLOY_URL" instituto-vivance.vercel.app --scope vtr-consulting
npx --yes vercel@59.16.0 inspect institutovivance.app --scope vtr-consulting
npx --yes vercel@59.16.0 inspect instituto-vivance.vercel.app --scope vtr-consulting
```

Os dois `inspect` devem resolver para o **mesmo ID de deployment**. Faça três
requisições ao endereço público, anotando HTTP, `x-vercel-id` e TTFB; repita
para o domínio secundário e confira o redirecionamento. Exemplo:

```bash
for attempt in 1 2 3; do
  curl -sS -o /dev/null -D - -w 'TTFB=%{time_starttransfer} HTTP=%{http_code}\n' \
    https://institutovivance.app/login | rg -i '^(x-vercel-id:|location:|TTFB=)'
done
```

Um `200` em `/login` confirma alcance técnico; o domínio secundário pode
responder `307` para o principal. Proteção de deployment exige `vercel curl`,
sem desativá-la. Consulte logs do deployment quando houver tráfego; `No logs
found` significa ausência de eventos naquele intervalo, não prova de zero
erros. Não altere plano, CPU, variáveis, região ou auto-assignment sem pedido
específico.

### 6. Aceite, registro e recuperação

Depois do apontamento, execute o fluxo autenticado que foi alterado com contas
e dados sintéticos: recarregamento, papéis envolvidos, vínculo ativo e revogado,
separação entre pacientes e clínicas. Registre separadamente o que foi validado
localmente, em Preview e no domínio de produção. Para liberar **dados reais**,
exija o fechamento documentado do [Gate P](GATE_P.md); publicação técnica não o
substitui.

Ao relatar a entrega, informe: SHA da `main`, PR/checks, resultado de cada etapa
do workflow, estado das migrations, deployment ID/URL/`READY`, alvo dos dois
domínios, HTTP e percurso autenticado efetivamente testado. Declare ausências
como `não verificado`, nunca como sucesso. Guarde o deployment anterior antes
de trocar o alias. Para voltar o código, repointe os domínios a um artefato
anterior conhecido e verifique ambos; para o banco, faça correção compatível
por nova migration, sem editar histórico aplicado.

## Mapa rápido para outras áreas

| Área | Fonte principal | Atenção ao alterar |
|---|---|---|
| Acesso, papéis e clínicas | `apps/web/modules/identity/`, `apps/web/modules/team/` | Sessão real, papel do banco, tenant e vínculo ativo; admin não ganha leitura clínica automaticamente. |
| Paciente e início da jornada | `apps/web/modules/onboarding/`, `apps/web/modules/patient-intake/`, `apps/web/app/clinicas/[tenantId]/meu-cuidado/` | Preservar respostas originais, rascunho, consentimento e quatro abas. |
| Agenda e consulta | `apps/web/modules/agenda/`, `apps/web/modules/encounters/`, `apps/web/modules/teleconsultations/` | Associar preparo e atendimento ao agendamento correto; teleconsulta usa link de sala próprio. |
| Pré-consulta e pedidos | `apps/web/modules/return-preparation/`, `apps/web/modules/care-requests/` | Pedido → resposta → conclusão do mesmo vínculo; antiga enviada pode coexistir com nova pendente. |
| Acompanhamento | `apps/web/modules/check-ins/`, `daily-check-ins/`, `meals/`, `measurements/`, `longitudinal/` | Datas, unidades e origem visíveis; gráfico não interpreta clinicamente; texto/foto originais persistem. |
| Documentos e mensagens | `apps/web/modules/documents/`, `apps/web/modules/messages/` | Arquivos privados, acesso autorizado, download temporário e idempotência; conversa não é canal de urgência. |
| Planos e relatórios | `apps/web/modules/care-plans/`, `apps/web/modules/reports/` | Rascunho, revisão, aprovação, publicação e retirada são estados distintos. |
| Notificações e lembretes | `apps/web/modules/notifications/`, `apps/web/modules/reminders/` | Diferenciar preferência salva, dispositivo habilitado, falha e entrega confirmada. |

Em qualquer área, siga [Funcionalidades](FUNCIONALIDADES.md) e
[Produto](../PRODUCT.md), mas confira o código e os testes da `main` antes de
afirmar que algo está ativo. Os arquivos `docs/STATUS_ATUAL.md` e
`docs/TELECONSULTA.md` contêm fotografias históricas: valide seus IDs e
pendências novamente. Não converta relato em diagnóstico, prescrição,
classificação de risco ou publicação clínica automática. IA, quando usada,
organiza material para decisão e aprovação humana.

## Fotografia usada ao criar este guia (25/09/2026)

- `origin/main` estava em `1507f6f`; o deployment público inspecionado era
  `dpl_78uywiyzx6N7gQpZbahVRso16eUf`, `READY`, com funções em `gru1`.
- `vercel project inspect` confirmou Root Directory `apps/web` e Node 24.x.
- No run de release desse SHA, `verify` passou, mas as etapas de migration e
  promoção ficaram `skipped` por configuração ausente; o domínio foi alinhado
  manualmente. **Não reutilize esse SHA ou deployment no próximo release.**
