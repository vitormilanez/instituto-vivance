# Publicação automática da `main`

Hoje a publicação depende de gestos manuais: alguém aplica as migrações no
Supabase pela CLI ou pelo painel e alguém promove o deployment na Vercel. Foi
assim que, em 21/09/2026, as PRs #31 e #32 ficaram mescladas e construídas sem
nunca assumirem `institutovivance.app` — o domínio seguia no commit `a261f07`.

O workflow `.github/workflows/release.yml` passa essa sequência para o CI.

## O que acontece a cada push na `main`

1. **verify** — reaproveita `web-foundation.yml` (test, lint, typecheck, build).
2. **migrate** — vincula o projeto Supabase de destino, imprime o estado das
   migrações, aplica o que falta (`supabase db push`), imprime o estado de novo
   e publica as Edge Functions quando algo em `supabase/functions` mudou.
3. **promote** — espera o deployment que a integração Git criou **para este
   commit** ficar `READY`, promove esse deployment e confirma que o alvo de
   produção do projeto passou a ser ele.

A ordem importa: schema primeiro, código depois. Como o código antigo continua
no ar entre os passos 2 e 3, **toda migração precisa ser compatível para trás**
— adicionar coluna, tabela ou política pode; remover ou renomear o que o código
publicado ainda usa, não.

Enquanto os segredos não estiverem preenchidos, os passos 2 e 3 se anunciam como
ignorados e o workflow passa. Nada quebra por ainda não estar configurado.

## O que precisa ser preenchido

No repositório, em *Settings → Secrets and variables → Actions*.

### Secrets

| Nome | O que é | Onde obter |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | Token pessoal da conta Supabase | Painel Supabase → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | Senha do banco do projeto de destino | Painel do projeto → Settings → Database |
| `VERCEL_TOKEN` | Token de API da Vercel | vercel.com → Account Settings → Tokens (escopo do time `VTR CONSULTING`) |

### Variables

| Nome | Valor |
|---|---|
| `SUPABASE_PROJECT_ID` | Ref do projeto de destino (hoje `oxuwrdjojsmgxoljqkuk`, o `instituto-vivance-dev`; passa a ser o projeto de produção quando ele existir) |
| `VERCEL_PROJECT_ID` | ID do projeto `instituto-vivance` (Settings → General) |
| `VERCEL_TEAM_ID` | ID do time `VTR CONSULTING` (Settings → General do time) |

Os três *secrets* nunca aparecem em log: o workflow só testa se estão vazios.

## Environment `production`

Os jobs `migrate` e `promote` rodam no environment `production`. Se você criar
esse environment em *Settings → Environments* e marcar *Required reviewers*,
cada publicação passa a esperar um clique seu — útil enquanto o banco de
produção for o mesmo de desenvolvimento. Sem reviewers configurados, publica
sozinho.

## Como reverter

- **Código:** promover o deployment anterior na Vercel (Deployments → o anterior
  → Promote), ou `Revert` na PR e deixar o pipeline publicar de novo.
- **Schema:** migração não tem volta automática. Reverter é escrever uma
  migração nova que desfaz o que a anterior fez — mais uma razão para manter
  cada migração compatível para trás.

## O que este workflow não faz

- Não troca variáveis de ambiente da Vercel. A promoção controlada para um
  Supabase de produção — criar o projeto, aplicar migrações, publicar funções,
  trocar `NEXT_PUBLIC_SUPABASE_URL` e a chave pública, limpar as variáveis
  legadas — continua sendo uma decisão manual, registrada no Gate P.
- Não publica nada a partir de branch: só `main`.
