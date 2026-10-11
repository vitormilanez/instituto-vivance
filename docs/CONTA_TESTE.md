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

## Fixtures de texto integral e retomada (#114/#115)

As credenciais, conta e vínculo QA foram preservados. Uploads pela sessão do
paciente, em `private-documents`, usaram PDFs inteiramente fictícios criados para
esta verificação; o cabeçalho deixa explícito que são testes. Nenhum laudo real
foi reprocessado nesta rodada.

| Fixture | Documento / run | Evidência |
| --- | --- | --- |
| `vivance-qa-pdf-25-paginas-lotes.pdf` | `42c0f0a4-9d38-490a-815d-3f976b161a5a` / `5a8fa8a9-0dc5-4a3b-b217-8e3434fd0f10` | 25 páginas, dois lotes preservados da primeira tentativa, segunda tentativa completa, nove checkpoints. Run inicial conserva 29 itens e referências ausentes; reaplicação offline com adapter `.6` gerou 25 itens com unidade/referência/data sem nova chamada Claude nem mutar histórico. |
| `vivance-qa-pdf-referencias-3-paginas.pdf` | `976f638e-7235-4fd1-84ce-767c89a997f7` / `2be8f60d-1e11-4b92-b775-9b725b4a1fd2` | Adapter `.6`: primeira tentativa completa, três páginas/três itens, unidade/referência/data presentes e nome multiline. Haiku inicial + auditoria Sonnet de uma página; fonte da página 2 e conferência abertas pelo médico no domínio principal. |

Após a última recarga, a ficha acumulava 77 resultados/76 pendentes/oito arquivos,
incluindo execuções anteriores. Não usar o total como gabarito de completude.
Glicose v5 permanece como evidência anterior de edição; não houve nova revisão
clínica nem publicação ao paciente. A retomada do PDF esgotado reportado pelo
usuário continua pendente, com original/texto preservados.

A conta de QA não substitui o teste manual de Vitor com convite novo. Sua existência não fecha C2/C3, aceite clínico ou [Gate P](GATE_P.md).
