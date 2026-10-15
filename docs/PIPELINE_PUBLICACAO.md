# Pipeline e publicação do Vivance

**Reconciliado em 14/10/2026** com `.github/workflows/release.yml`,
`web-foundation.yml` e operação registrada. Há **dois mecanismos distintos**:
GitHub verifica/prevê operações de backend; a integração Git da Vercel pode
publicar o frontend independentemente desses jobs.

## Comportamento efetivo

| Mecanismo | O que faz | O que não comprova |
| --- | --- | --- |
| Foundation CI | Testes, lint, tipos e build para os caminhos configurados. | Aceite clínico, schema remoto ou jornada autenticada completa. |
| Release GitHub | Ordem prevista `verify → migrate → promote`; apply de migrations/Edge e promoção dependem da configuração protegida. | Que as etapas internas executaram: podem ficar `skipped` com run verde. |
| Vercel Git | Builds de branches/PRs geram Preview; main/produção tem auto-assignment ativo desde 11/10 e assume domínios após build bem-sucedido. | Que esperou backend/CI, aplicou SQL/Edge/Auth ou fechou Gate P. |

Markdown fora dos caminhos filtrados (por exemplo, apenas `docs/`) não dispara
esses workflows. **Documentação dentro de `apps/web/**` dispara Foundation CI
e, no merge, release**, porque o filtro é por caminho, não extensão. Os checks
automáticos pertinentes continuam obrigatórios. Além disso, **o merge na main
pode disparar build/deploy nativo Vercel**. Não lançar
deploy manual ou mexer em proteção só para atualizar Markdown. Esta revisão
documental não autoriza nova publicação de aplicação.

## Antes de integrar ou publicar código

1. Confirmar autorização, equipe/projeto/ref/ambiente e SHA do lote.
2. Alinhar primeiro schema/Edge compatíveis quando exigidos; preservar o código
   ainda no ar durante a transição. Renome/destruição exige estratégia em versões.
3. Cumprir checks e revisão proporcionais antes do merge; não presumir gate
   automático de CI/backend na Vercel.
4. Examinar etapas internas do workflow, não somente a conclusão.
5. Verificar projeto/SHA/deployment/destino dos dois domínios e fluxo autenticado
   alterado, registrando exatamente o que passou e o que não foi testado.

Procedimento e comandos no [guia operacional](GUIA_OPERACIONAL_CODEX.md).

## Configuração protegida necessária para o caminho completo

No environment `production` do GitHub:

| Tipo | Nome | Finalidade |
| --- | --- | --- |
| Secret | `SUPABASE_ACCESS_TOKEN` | CLI Supabase |
| Secret | `SUPABASE_DB_PASSWORD` | Banco de destino |
| Variable | `SUPABASE_PROJECT_ID` | Ref explicitamente confirmado |
| Secret | `VERCEL_TOKEN` | CLI/promoção |
| Variable | `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | Projeto/equipe |

A última entrega registrou falta dessa configuração e execução manual de
backend. Não significa falta de credenciais do runtime ou de acesso local das
CLIs. Conferir metadados antes de afirmar disponibilidade atual; valores nunca
em docs/logs. Required reviewers/restrições de branch precisam ser configurados
e verificados, não presumidos por existirem no texto.

## Recuperação e dados

Frontend: usar artefato anterior conhecido/autorizado ou PR de reversão, depois
conferir domínios, SHA e comportamento; verificar também auto-assignment.
Banco: correção por nova migration compatível, nunca reescrever histórico aplicado.
Rollback de frontend não desfaz dados, secrets ou grants externos.

Publicação técnica é distinta de homologação sintética, aceite operacional e
liberação clínica. Produção separada e [Gate P](GATE_P.md) antes de dados reais.
