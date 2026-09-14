# Continuidade do Vivance entre Macs

Auditoria e conciliação realizadas em 14/09/2026, por solicitação do titular, para preservar trabalho antes de continuar o desenvolvimento.

## Base de continuação

Usar o branch **`codex/reconcile-macs-2026-09-14`**. A cópia local de trabalho está em `~/Developer/instituto-vivance`, fora da pasta Desktop sincronizada pelo iCloud. A aplicação conectada continua em `apps/web`.

Este branch reúne os históricos remotos e a evolução local recuperada; não representa merge em `main` nem publicação na Vercel.

| Origem inspecionada | Commit original | Resultado |
| --- | --- | --- |
| `main` / checkout `Instituto Vivance` | `b68c397` | Protótipo histórico; ancestral da consolidação |
| Checkout `instituto-vivance-vercel` | `64b9a6b` | Estava quatro commits atrás do branch remoto de mesmo nome |
| GitHub `codex/slice-7b1-patient-record` | `79061fb` | Histórico de 7B.2 e correção de autenticação incorporado |
| GitHub `codex/onboarding-paciente` | `f2cf76a` | Base funcional remota mais avançada identificada: onboarding, documentos, mensagens e relatórios |
| Worktree local `codex/impeccable-doctor-workspace` | `c99d097` | Três commits adicionais recuperados: `737ff0d`, `9848dbc`, `c99d097` |

Os três commits locais modificam 19 arquivos de interface e testes. A árvore de `apps/web` da consolidação é idêntica à de `c99d097`. A correção de autenticação `7b49597` já era ancestral do onboarding; o merge remoto `79061fb` não acrescentava diferença de conteúdo a essa correção. Os históricos foram reunidos sem conflitos e sem reescrever commits existentes.

## Alterações locais preservadas

A comparação dos arquivos rastreados dos cinco worktrees terminou sem arquivos ausentes ou pendências de download. Foram identificadas somente duas diferenças em relação aos respectivos commits:

- `scripts/asana-vivance.mjs`, no protótipo: suporte a token pessoal armazenado no Chaves do macOS. Incorporado em `2ea8b4d`, com o mesmo blob original `c7b58659446487c5f51c1146c16ab6639c2671af`. Nenhuma credencial foi incluída.
- `docs/PROXIMOS_SLICES_E_HANDOFF.md`, no checkout Vercel antigo: complemento sobre seed sintético. Seu conteúdo foi preservado no backup e sua referência incorporada ao documento vigente, mantendo as atualizações posteriores de onboarding e relatórios.

Documentos não rastreados também foram preservados:

- [Avaliação do seed sintético](AVALIACAO_SEED_SINTETICO_SUPABASE.md): documento histórico de 12/09, baseado em `64b9a6b`.
- [Planejamentos anteriores do protótipo](archive/2026-09-14/README.md): entrega para o desenvolvedor e versão anterior do plano de slices. Não substituem decisões posteriores nem autorizam novas funcionalidades.

Configurações por máquina, arquivos de ambiente, capturas autenticadas, PDFs, saídas do Canva e demais artefatos locais permanecem no backup privado. Não são necessários para reproduzir o código e não foram adicionados ao branch por esta conciliação. Dependências/cache, inclusive a pasta duplicada `apps/web/node_modules 2`, não são fontes de produto.

## Preservação e integridade

O iCloud mantinha milhares de arquivos como placeholders, incluindo objetos internos de Git. Foi solicitado e concluído o download de todos os itens inventariados. Não há evidência de corrupção dos commits recuperados: `git fsck --full --no-dangling` passou no repositório independente.

Foram mantidos backups privados fora do Desktop:

- `~/Developer/vivance-preservation-20260914.AggCut`: primeira captura, inventário original e relatório de comparação.
- `~/Developer/vivance-preservation-complete-20260914.z9kNjj`: preservação dos arquivos disponíveis após download, incluindo metadados Git, arquivos não rastreados e configurações privadas. O inventário terminou com zero arquivos somente na nuvem e zero erros de cópia. Caches regeneráveis (`node_modules`, `.next`, `.wrangler`, `.turbo`, `.cache`, `dist`) foram excluídos.

Os commits antigos sem branch `4a44e6a` e `bec5faa` foram preservados em referências locais `refs/archive/recovery-20260914/*`, para inclusão no bundle de recuperação. São revisões anteriores de handoff e Hoje do paciente, não uma versão de produto mais recente. Não foram misturadas ao conteúdo atual.

Os checkouts antigos foram mantidos. Foi encontrada uma referência duplicada `refs/remotes/origin/HEAD 2` no repositório sincronizado; ela não foi importada como referência no clone independente.

## Validação da consolidação

- 141 testes aprovados, zero falhas.
- ESLint aprovado.
- TypeScript aprovado.
- Build Next.js aprovado.
- Sintaxe do script Asana aprovada.
- Integridade dos objetos Git e equivalência de `apps/web` com `c99d097` verificadas.

Estes testes não substituem a homologação visual/autenticada nem o Gate P já previsto. Nenhuma migration ou carga de dados foi executada nesta conciliação. Não houve ativação de áudio ou IA.

## GitHub, revisão e Vercel

As PRs existentes #11 (fundação) e #16 (onboarding) permanecem como referências de revisão. Esta organização preserva seus branches e não altera seu estado de aprovação.

O arquivo `vercel.json` recuperado mantém `git.deploymentEnabled: false`. A consulta ao projeto Vercel `instituto-vivance`, na equipe `vtr-consulting`, retornou 403 nesta sessão; portanto o commit atualmente publicado não foi confirmado. Publicação exige uma verificação separada com acesso à equipe correta.

## Como retomar no outro Mac

1. Antes de alterar o checkout antigo, verificar `git status` e preservar qualquer modificação que ainda esteja somente naquele Mac.
2. Criar um clone independente fora do Desktop/iCloud, em uma pasta ainda inexistente:

   ```sh
   git clone https://github.com/vitormilanez/instituto-vivance.git "$HOME/Developer/instituto-vivance"
   cd "$HOME/Developer/instituto-vivance"
   git switch --track origin/codex/reconcile-macs-2026-09-14
   ```

3. Usar commits e push para transferir código entre computadores. Manter segredos e configurações de ambiente fora do Git.
4. Se houver trabalho ainda não sincronizado no Mac fechado, comparar e incorporar em um branch separado antes de prosseguir.

A conclusão desta auditoria abrange o GitHub consultado e todos os arquivos disponibilizados pelo iCloud nos worktrees inspecionados. Não comprova ausência de arquivos que nunca tenham sido enviados pelo outro Mac.
