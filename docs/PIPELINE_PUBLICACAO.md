# Pipeline de publicação

O workflow `.github/workflows/release.yml` publica somente mudanças integradas
à `main` e preserva a ordem: verificar → migrar banco → promover Vercel.

## Sequência

1. `verify`: testes, lint, TypeScript e build de `apps/web`.
2. `migrate`: vincula o Supabase de destino, lista e aplica migrations e publica
   Edge Functions alteradas.
3. `promote`: espera o deployment Vercel do mesmo commit ficar `READY`, promove
   o artefato e confirma o alvo de produção.

Migrations precisam ser compatíveis com o código ainda publicado enquanto a
promoção não terminou. Remoções ou renomes destrutivos exigem estratégia em mais
de uma versão.

## Configuração protegida

No environment `production` do GitHub:

| Tipo | Nome | Uso |
|---|---|---|
| Secret | `SUPABASE_ACCESS_TOKEN` | autenticar a CLI Supabase |
| Secret | `SUPABASE_DB_PASSWORD` | conectar ao banco de destino |
| Variable | `SUPABASE_PROJECT_ID` | identificar o projeto de produção |
| Secret | `VERCEL_TOKEN` | autenticar a promoção |
| Variable | `VERCEL_PROJECT_ID` | projeto `instituto-vivance` |
| Variable | `VERCEL_TEAM_ID` | time `VTR CONSULTING` |

Nunca registrar valores desses campos em arquivo ou log. Required reviewers no
environment mantêm aprovação humana antes da publicação.

## Comportamento quando falta configuração

O workflow atual deixa `migrate` e `promote` como etapas ignoradas quando os
campos obrigatórios estão vazios. Portanto, um run verde pode provar apenas o
build. Conferir os logs e o alvo real antes de declarar publicação completa.

Na execução de 22/09/2026, a verificação passou, mas a migration foi ignorada
por falta da configuração de produção. A Vercel foi promovida depois pela CLI;
isso não comprova que o schema remoto esteja reconciliado.

## Reversão

- Código: promover o deployment anterior ou reverter a PR e publicar novamente.
- Banco: criar uma nova migration compatível que corrija a anterior; não editar
  uma migration já aplicada.

O fechamento operacional depende também do [Gate P](GATE_P.md).
