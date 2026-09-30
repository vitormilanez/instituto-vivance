# C1 — base operacional

Auditoria inicial de 29/09/2026. Referência de código: `origin/main` no commit
`5a64be9`. Este registro não altera banco, ambiente ou dados.

## Decisão do slice

**C1 iniciado, ainda não aceito para operação clínica.** O projeto Supabase acessível e ativo é
`instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`). Não foi identificado um
projeto de produção separado para o Vivance na conta acessível. As 56 migrations
do checkout constam no histórico remoto desse projeto de desenvolvimento, mas
isso não demonstra compatibilidade com um futuro banco de produção nem substitui
uma comparação de schema. A lista de backups físicos retornou vazia, PITR está
desativado e não há restauração testada.

**Decisão de 29/09/2026:** usar temporariamente esse mesmo projeto como ambiente
único para os testes do Vivance. Não criar nem migrar para um segundo projeto
agora. A separação entre desenvolvimento e produção fica planejada para antes
do uso de dados de saúde reais e do fechamento do Gate P. A decisão permite
prosseguir com testes controlados e dados sintéticos; não equivale a aceitar
o projeto compartilhado como infraestrutura de produção clínica. Nenhum dado,
configuração ou ambiente foi alterado por este registro.

## Evidência observada

| Verificação | Resultado | Alcance da conclusão |
| --- | --- | --- |
| Projetos Supabase acessíveis | `instituto-vivance-dev` ativo; outro projeto pessoal inativo e sem vínculo demonstrado com o Vivance | Nenhum destino de produção separado identificado nessa conta. |
| Histórico de migrations | 56 versões locais e 56 remotas, pareadas até `20260926120000_clinic_patient_info` | Histórico reconciliado **no desenvolvimento**; não prova igualdade estrutural após eventuais alterações manuais. |
| Backups | `backups list --project-ref oxuwrdjojsmgxoljqkuk`: `backups: []`, `pitr_enabled: false`, `walg_enabled: true` | A CLI não mostrou backups físicos disponíveis; não conclui que não exista qualquer outra estratégia de backup. |
| Restauração | Nenhuma restauração executada | Critério de aceite aberto. Não copiar dados sensíveis para ambiente de teste sem plano e autorização apropriados. |
| GitHub `production` | Nenhuma variável nem segredo listado no ambiente ou no repositório | No último run da `main` (`36153775423`), aplicar migrations, promover o deployment e confirmar o domínio ficaram `skipped`, embora os jobs terminassem verdes. |
| Vercel | Projeto `vtr-consulting/instituto-vivance`, Root Directory `apps/web`, Node 24; domínio principal resolvido para deployment `dpl_3zS5YNhZZopKTVzaLuZ6p33rS6X2`, `READY` | Alcance técnico; não comprova banco de produção separado, schema ou aceite clínico. |

Uma inspeção registrada em 28/09 relatou que a configuração pública do
deployment aponta ao projeto `instituto-vivance-dev`. O valor do ambiente
Vercel não foi reexibido nesta auditoria; essa associação precisa de
confirmação controlada antes de qualquer mudança de destino.

## Próximas ações no ambiente único de testes

1. Tratar `oxuwrdjojsmgxoljqkuk` como destino explícito de teste antes de
   qualquer escrita. Conferir a configuração do app e das CLIs sem imprimir
   chaves; não usar `POSTGRES_HOST`/`POSTGRES_URL` de um projeto divergente.
2. Identificar nominalmente as contas e os dados sintéticos do C2. Preservar
   qualquer registro de origem incerta ou possivelmente real; não limpar nem
   sobrescrever dados existentes para preparar a demonstração.
3. Verificar schema, papéis, RLS, Storage e percursos autenticados no ambiente
   compartilhado. Registrar o resultado como **teste**, sem declarar aceite
   clínico ou produção isolada.

## Pendências antes de dados reais e do Gate P

1. Criar ou identificar o projeto Supabase de produção separado, com
   organização, referência, responsável e região registrados sem credenciais.
2. Inventariar variáveis Vercel de Preview e Production e a configuração
   protegida do GitHub; comprovar a correspondência de cada ambiente com o
   projeto e o histórico de migrations corretos.
3. Comparar schema, aplicar somente migrations versionadas no destino aprovado
   e registrar o histórico antes e depois. Nunca editar migration já aplicada.
4. Definir backups, retenção e destino de restauração; executar restauração
   isolada e documentar integridade, tempo e falhas.
5. Revalidar acesso por papéis, Storage, Edge Functions, deployment e aliases
   no destino separado antes de qualquer dado clínico real.

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
