# Conta permanente de QA — paciente sintético

## Contas adicionais autorizadas em 11/10 para a fase de exames

Usuário confirmou `vtrconsultingbr@gmail.com` (paciente) e
`guilhe.martins@gmail.com` (médico), com os PDFs existentes, como testes
autorizados. O [registro da fase](ENTREGA_EXAMES_2026-10-11.md) preserva evidência
de autenticação, processamento, revisões de QA e limites clínicos. Senhas e
sessões permanecem apenas no cofre/arquivos ignorados, sem publicação no Git.
Essas contas não substituem nem excluem a fixture permanente descrita abaixo.

**Reset geral de 11/10:** conta QA e Guilherme preservados. Restam um paciente
QA, nove documentos/objetos e dois memberships; zero convites antigos.
Dados/exames/revisões atuais mantidos com hashes iguais; nenhum dado novo
injetado. [Limpeza conferida](../OPERACAO_LIMPEZA_E_CONVITES.md). Os totais abaixo
são fotografias históricas e não inventário corrente.

**Criada e preservada em 10/10/2026 no dev sintético confirmado.** A identidade `paciente.teste@vivance.example` serve para testes repetíveis de autenticação, convite, onboarding, documentos e isolamento no projeto temporário `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`). Houve login real pela interface local e no percurso pós-publicação sintético; médico e paciente foram conferidos no domínio publicado. A conta permaneceu intacta após as rodadas #109/#110. O domínio `.example` identifica uma conta de fixture; não presumir entrega de e-mail. Ela não representa pessoa real nem autorização para importar dados clínicos.

## Preparação e registro

1. Confirmar conta, projeto/ref e ambiente do Supabase antes de criar Auth, vínculo ou paciente. Criar apenas dados sintéticos, identificados como fixture, com clínica e papel esperados. Usar fluxo de convite/consentimento real da aplicação quando o cenário exigir; não forjar consentimento de pessoa real nem decisão médica.
2. Guardar usuário e senha apenas em `.env.vivance.local` na raiz do checkout consolidado `/Users/vitormilanez/Desktop/Codes/vivance`. Desde 11/10, `apps/web/.env.test-accounts.local` é um link simbólico para esse arquivo central, ignorado pelo Git e com permissão `0600`. **Nunca registrar a senha, token, hash, URL de recuperação ou conteúdo de sessão em Git, Asana, logs, screenshots ou nesta página.**
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
clínica nem publicação ao paciente. Na rodada #115, o PDF esgotado reportado pelo
usuário permaneceu sem retomada, com original/texto preservados.

## Recuperação técnica no #117 (10/10/2026, São Paulo)

O [#117](https://github.com/vitormilanez/instituto-vivance/pull/117) foi publicado
tecnicamente: migration `20261011002635` aplicada (70 no dev), Edge v14/adapter
`.7` ACTIVE e deployment `dpl_692H3GxaZpMVK7tCczcnBD9FT31N` no SHA
`2454345626b56d259a71aa59c34d23a688e13850`. CI/main/release passaram 525
testes; detalhes de publicação no [status](STATUS_ATUAL.md).

Pelo login médico real no domínio publicado via Playwright CLI, foi acionado
**Retomar organização** do documento `89d96ca4-f5e9-427e-acd4-1a0116b4f749`.
O job `fd1100d4-7000-4254-b1ee-6436d9256f92` manteve a run
`08779990-c35f-41b9-ae80-12493d5b5ba7`: antes da retomada, havia texto em
25/25 páginas, sem checkpoints ou itens nessa run. Após a ação, o job ficou
`pending`, `attempt_count=0`, `available_at=11/10/2026 00:41:34 UTC`; a auditoria
registrou o médico `5fa1330b-a7d3-4843-8e4a-57ef3533062e` como autor. O
claim ocorreu às 00:42 UTC de 11/10 e o mesmo job/run/hash terminou `completed`,
`attempt_count=1`, `completed_at=2026-10-11T00:43:31.835663Z`.

Original, texto das 25/25 páginas e histórico foram preservados. A run tem
13 checkpoints (cinco iniciais, oito auditorias) e 65 itens em 24 páginas:
50 com unidade, 47 com referência, 60 com data 13/08/2026, nenhum offset inválido.
Após recarga no domínio publicado, a ficha mostrou **Exames sangue .pdf**, data
13/08/2026, 65 resultados/65 para conferir, sem estado de falha; total da ficha
142 resultados/141 pendentes. Os filtros globais mostraram 4 acima/0 abaixo/30
dentro da faixa. No filtro **Fora da referência**, quatro itens desse PDF
apareceram em âmbar; a fonte de **Eritrócitos** abriu na página 1 com valor,
unidade, referência, data 13/08/2026 e formulário de conferência, sem gravação.
O botão de retomada sumiu, sem alerta de erro. Captura publicada em
`output/playwright/20261011-exams-resume/published-outside-reference.png`.
`quality_notes` apontam possíveis itens ausentes nas páginas
3, 5, 7, 8, 13, 16 e 17; a auditoria seletiva é limitada a quatro páginas.
**Recuperação técnica concluída, fonte amostral conferida; qualidade ainda pendente.** As
contagens não são gabarito clínico. Não houve revisão/aprovação médica nem
publicação ao paciente.

A conta de QA não substitui o teste manual de Vitor com convite novo. Sua existência não fecha C2/C3, aceite clínico ou [Gate P](GATE_P.md).
