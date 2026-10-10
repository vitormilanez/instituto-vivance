# Conta permanente de QA — paciente sintético

**Criada e preservada em 10/10/2026 no dev sintético confirmado.** A identidade `paciente.teste@vivance.example` serve para testes repetíveis de autenticação, convite, onboarding, documentos e isolamento no projeto temporário `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`). Houve login real pela interface local e no percurso pós-publicação sintético; médico e paciente foram conferidos no domínio publicado. A conta permaneceu intacta após as rodadas #109/#110. O domínio `.example` identifica uma conta de fixture; não presumir entrega de e-mail. Ela não representa pessoa real nem autorização para importar dados clínicos.

## Preparação e registro

1. Confirmar conta, projeto/ref e ambiente do Supabase antes de criar Auth, vínculo ou paciente. Criar apenas dados sintéticos, identificados como fixture, com clínica e papel esperados. Usar fluxo de convite/consentimento real da aplicação quando o cenário exigir; não forjar consentimento de pessoa real nem decisão médica.
2. Guardar usuário e senha apenas em `apps/web/.env.test-accounts.local` no checkout consolidado `/Users/vitormilanez/Desktop/Codes/vivance`. O arquivo existe, é ignorado pelo Git e tem permissão `0600`. **Nunca registrar a senha, token, hash, URL de recuperação ou conteúdo de sessão em Git, Asana, logs, screenshots ou nesta página.**
3. Registrar aqui apenas identificadores não secretos e estado. Os IDs abaixo foram confirmados no projeto dev. Não usar o nome da conta como prova de que o vínculo existe.
4. Conferir login pela interface, persistência, papel e isolamento médico/paciente; guardar evidência sem tokens. Preservar a conta entre ciclos de QA. Para reiniciar um cenário, limpar somente os registros sintéticos explicitamente vinculados a ela após conferir dependências; preservar registros de origem incerta.

## IDs confirmados

| Campo | Valor |
| --- | --- |
| Projeto/ref | `instituto-vivance-dev` / `oxuwrdjojsmgxoljqkuk` |
| Auth UID | `beb341ca-e5b8-4dd2-bd45-10e1fa043727` |
| Paciente ID | `e855e1a9-8603-40c3-aa3e-7caa4854a572` |
| Clínica ID | `61846445-8d30-4f68-b166-82d08c198cd0` |
| Vínculo de cuidado ID | `82dd0ae3-5c3f-4a55-ad20-d4c686f3cb74` |
| Médico da fixture | `5fa1330b-a7d3-4843-8e4a-57ef3533062e` |
| Onboarding sintético | Submissão `9eefdc89-03d9-4219-8888-cd88783be0a4`, versão 3, enviada por RPC para a fixture |
| Data e login | 10/10/2026; login real pela interface local e no domínio publicado confirmado |
| Consentimento de compartilhamento sintético | `patient_onboarding.share_consent=true` e submissão confirmados por SQL; não equivale a consentimento de pessoa real |

Na rodada #109, a fixture médica original do item sintético de Glicose `c56ba11a-9fa3-4a5e-aab0-67c8c5da228a` foi restaurada pela interface após a conferência das revisões v2–v4; a restauração gerou v5. Isso não altera as credenciais ou os IDs da conta QA e não constitui publicação de resultado ao paciente. No #110, o Cron reprocessou somente a fixture de medidas e salvou cinco resultados sem duplicatas na run `17d4fdf6-8be5-4159-9829-d7ee597a4b43`; execuções anteriores foram preservadas. Após recarga autenticada do médico no domínio final, havia 25 resultados e 24 pendentes, com a revisão v5 intacta. As credenciais e IDs continuam os mesmos.

A conta de QA não substitui o teste manual de Vitor com convite novo. Sua existência não fecha C2/C3, aceite clínico ou [Gate P](GATE_P.md).
