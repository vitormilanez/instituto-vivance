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
- Validação do diário alimentar integrado: 219 testes, lint, TypeScript, build e
  `git diff --check` aprovados localmente.

## O que está confirmado

- O código da pré-consulta obrigatória e a pipeline de publicação estão em
  `main`.
- O diário alimentar está integrado na `main` (PR #36) e a correção do
  cabeçalho do check-in em telas estreitas está na PR #37.
- A tela "Meu diário" foi exercitada com sessão autenticada real, usando as
  contas de demonstração do ambiente de desenvolvimento: em 320px, 390px e
  1440px, sem rolagem horizontal e sem conteúdo encoberto pelo dock fixo. A
  visão da equipe ("Refeições registradas", em Acompanhamento) foi conferida com
  a conta de médico nas mesmas larguras.
- O envio real também foi exercitado: um relato gravado pelo formulário apareceu
  no histórico, e duas chamadas à API com a mesma `request_key` devolveram o
  mesmo `id` e produziram **um único** registro — idempotência confirmada no
  banco, não apenas no teste.
- Essa conferência encontrou um defeito e ele foi corrigido: em 320px o selo de
  status do check-in escapava do card e era recortado; o card do paciente passou
  a empilhar o cabeçalho como o card da equipe já fazia.
- A Vercel serve o mesmo commit informado acima e o domínio público responde.
- A migration `20260922190000_patient_care_requests.sql` (solicitação de
  informação ao paciente) está aplicada no Supabase de desenvolvimento e os
  objetos foram conferidos no destino. A versão `20260922190000` foi registrada
  em `supabase_migrations.schema_migrations`, sem reaplicar o SQL. O smoke test
  da RPC rodou ali dentro de uma transação revertida, sem resíduo, e confirmou
  idempotência pela mesma chave, deduplicação por tipo, uma única pendência
  aberta, histórico com a anterior cancelada e a nota preservada, e uma mensagem
  com um aviso por pedido criado.
- A entrega agora inclui a rota autenticada, o serviço, a validação do payload e
  a ação “Solicitar” nos quatro cards que dependem de informação do paciente.
- A aplicação preserva separação por clínica, papéis, vínculo de cuidado, RLS,
  versionamento, auditoria e ações clínicas explícitas conforme os testes.

## O que ainda não está confirmado

- A migration `20260921185603_required_preconsultation.sql` não foi confirmada
  em um Supabase de produção.
- A migration `20260921191924_patient_meal_logs.sql`, do diário alimentar, está
  aplicada no Supabase de desenvolvimento. A tabela e a função que já existiam
  naquele destino estavam em versão anterior ao ajuste de preservação literal.
- A correção do relato literal vem em
  `20260922015500_patient_meal_literal_description.sql`, que recria o CHECK e a
  função para bancos onde a migration anterior já rodou. Ela foi aplicada em
  22/09/2026 no projeto de desenvolvimento `instituto-vivance-dev`
  (`oxuwrdjojsmgxoljqkuk`); segue pendente somente em um eventual destino de
  produção, que não foi definido neste trabalho.
- O diário alimentar não foi homologado em produção nem em Preview.
- **Medição de 22/09/2026 no ambiente de desenvolvimento: a correção do relato
  literal ainda não está em vigor ali.** Um relato enviado com espaços nas
  extremidades voltou normalizado — `"  texto  "` foi gravado como `"texto"` —,
  o que confirma que a função em uso é a anterior a
  `20260922015500_patient_meal_literal_description.sql`. A migration foi aplicada
  depois dessa medição; falta repetir o envio autenticado para confirmar o texto
  literal no histórico atualizado.
- O `.env.local` de `apps/web` mistura credenciais de **dois** projetos Supabase:
  o app usa `oxuwrdjojsmgxoljqkuk` (`instituto-vivance-dev`, o mesmo do link em
  `supabase/.temp/`), enquanto `POSTGRES_HOST`/`POSTGRES_URL` apontam para
  `azgtefhfduvtlxqfikzm`. Aplicar migration por essas variáveis atingiria o
  projeto errado; conferir o destino antes de qualquer `db push`.
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
