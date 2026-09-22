# Estado atual do Vivance

Atualizado em 22/09/2026.

## Código e publicação

- Repositório principal: `main`.
- Commit publicado: `bcd13c6920bc471b81bef225a5c8d691eb0198e4`.
- Aplicação atual: `apps/web`, Next.js 16, Node.js 24.
- Domínio: [institutovivance.app](https://institutovivance.app).
- Deployment Vercel: `dpl_5smEofZ8GUB2shcvzDxdK5LbPHSr`, estado `READY`.
- Validação do lote: 207 testes, lint, TypeScript e build aprovados localmente;
  os checks da PR #34 também passaram.
- Validação do diário alimentar integrado: 216 testes, lint, TypeScript, build e
  `git diff --check` aprovados localmente.

## O que está confirmado

- O código da pré-consulta obrigatória e a pipeline de publicação estão em
  `main`.
- O diário alimentar está integrado e validado localmente sobre a `main` atual,
  na branch `codex/patient-meal-diary-integration` (commit final local, sem
  push, merge ou deploy).
- A Vercel serve o mesmo commit informado acima e o domínio público responde.
- A aplicação preserva separação por clínica, papéis, vínculo de cuidado, RLS,
  versionamento, auditoria e ações clínicas explícitas conforme os testes.

## O que ainda não está confirmado

- A migration `20260921185603_required_preconsultation.sql` não foi confirmada
  em um Supabase de produção.
- A migration `20260921191924_patient_meal_logs.sql`, do diário alimentar, foi
  validada apenas no banco efêmero dos testes; ela não foi aplicada em nenhum
  banco remoto.
- O diário alimentar não foi homologado em produção, Preview ou com contas
  reais; o aceite autenticado do fluxo continua pendente.
- Na execução de publicação da PR #34, as etapas de Supabase e promoção Vercel
  do GitHub foram ignoradas porque os segredos/variáveis de produção não estavam
  configurados. A promoção Vercel foi concluída depois pela CLI local.
- Não houve aceite autenticado completo do fluxo médico/paciente nesse artefato
  de produção.
- O Gate P permanece aberto; dados clínicos reais continuam bloqueados.

## Próximo passo operacional

1. Definir o projeto Supabase de produção, separado do desenvolvimento.
2. Configurar os segredos e variáveis protegidos do ambiente `production` no
   GitHub, sem gravá-los no repositório.
3. Aplicar e conferir o histórico de migrations no destino.
4. Reexecutar a pipeline para provar banco e Vercel no mesmo commit.
5. Validar com contas e dados sintéticos autorizados os caminhos de médico e
   paciente e registrar o aceite do Gate P.

## Trabalho preservado fora da `main`

- O diário alimentar saiu do trabalho isolado: os dois commits originais foram
  integrados sobre a `main` atual em
  `codex/patient-meal-diary-integration` e validados localmente. A branch ainda
  não foi publicada nem mesclada, então o recurso não é funcionalidade de
  produção.
- Dois stashes locais preservam alterações de ferramentas e cópias concorrentes;
  não fazem parte do artefato publicado.

Este documento registra estado técnico. Ele não é autorização clínica nem
substitui homologação do responsável pelo serviço.
