# C1 — base operacional

Auditoria inicial de 29/09/2026. Referência de código: `origin/main` no commit
`5a64be9`. Este registro não altera banco, ambiente ou dados.

## Decisão do slice

**C1 iniciado, ainda não aceito.** O projeto Supabase acessível e ativo é
`instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`). Não foi identificado um
projeto de produção separado para o Vivance na conta acessível. As 56 migrations
do checkout constam no histórico remoto desse projeto de desenvolvimento, mas
isso não demonstra compatibilidade com um futuro banco de produção nem substitui
uma comparação de schema. A lista de backups físicos retornou vazia, PITR está
desativado e não há restauração testada.

## Evidência observada

| Verificação | Resultado | Alcance da conclusão |
| --- | --- | --- |
| Projetos Supabase acessíveis | `instituto-vivance-dev` ativo; outro projeto pessoal inativo e sem vínculo demonstrado com o Vivance | Nenhum destino de produção separado identificado nessa conta. |
| Histórico de migrations | 56 versões locais e 56 remotas, pareadas até `20260926120000_clinic_patient_info` | Histórico reconciliado **no desenvolvimento**; não prova igualdade estrutural após eventuais alterações manuais. |
| Backups | `backups list --project-ref oxuwrdjojsmgxoljqkuk`: `backups: []`, `pitr_enabled: false`, `walg_enabled: true` | A CLI não mostrou backups físicos disponíveis; não conclui que não exista qualquer outra estratégia de backup. |
| Restauração | Nenhuma restauração executada | Critério de aceite aberto. Não copiar dados sensíveis para ambiente de teste sem plano e autorização apropriados. |
| GitHub `production` | Nenhuma variável nem segredo listado no ambiente ou no repositório | No último run da `main` (`36153775423`), aplicar migrations, promover o deployment e confirmar o domínio ficaram `skipped`, embora os jobs terminassem verdes. |
| Vercel | Projeto `vtr-consulting/instituto-vivance`, Root Directory `apps/web`, Node 24; domínio principal resolvido para deployment `dpl_3zS5YNhZZopKTVzaLuZ6p33rS6X2`, `READY` | Alcance técnico; não comprova banco de produção separado, schema ou aceite clínico. |

O `docs/STATUS_ATUAL.md` da cópia de trabalho atualizada em 28/09 relata que a
configuração pública do deployment aponta ao projeto `instituto-vivance-dev`.
O valor do ambiente Vercel não foi reexibido nesta auditoria; essa associação
precisa de confirmação controlada antes da mudança de destino.

## Próximas ações para aceitar C1

1. Definir qual organização e projeto Supabase serão o destino de produção,
   separados do desenvolvimento. Registrar a referência do projeto, responsável
   e região, sem divulgar credenciais.
2. Inventariar as variáveis Vercel de Preview e Production e a configuração
   protegida do GitHub. Confirmar, por ambiente, a correspondência entre URL,
   projeto Supabase e banco de migrations, sem imprimir chaves.
3. Criar ou identificar o banco de produção aprovado. Aplicar migrations
   versionadas **somente após** conferir o destino e registrar o histórico antes
   e depois. Nunca editar uma migration já aplicada.
4. Definir backups, retenção, destino de restauração e procedimento de teste.
   Executar uma restauração isolada e documentar integridade, tempo e falhas.
5. Confirmar schema compatível, acesso por papéis, Storage e versões das Edge
   Functions no destino. Revalidar o deployment e seus aliases antes de qualquer
   uso de dados clínicos reais.

O Gate P continua separado: C1 aceito não equivale a autorização clínica.

## Comandos de leitura usados

```sh
npx --yes supabase@2.117.0 projects list
npx --yes supabase@2.117.0 migration list --project-ref oxuwrdjojsmgxoljqkuk
npx --yes supabase@2.117.0 backups list --project-ref oxuwrdjojsmgxoljqkuk
gh variable list --repo vitormilanez/instituto-vivance --env production
gh secret list --repo vitormilanez/instituto-vivance --env production
npx --yes vercel@59.16.0 project inspect instituto-vivance --scope vtr-consulting
npx --yes vercel@59.16.0 inspect institutovivance.app --scope vtr-consulting
```
