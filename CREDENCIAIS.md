# Credenciais do Vivance

Atualizado em 11/10/2026. Este documento contém somente nomes e caminhos; nenhum valor secreto.

## Arquivo central local

Todas as credenciais de projeto disponíveis neste computador estão em
`.env.vivance.local`, na raiz `/Users/vitormilanez/Desktop/Codes/vivance`.
O arquivo tem modo `0600`, é ignorado pelo Git e não deve ser compartilhado.

Os caminhos antigos são links simbólicos para esse único arquivo:

- `apps/web/.env.local`: configuração local do Next.js.
- `apps/web/.env.claude.local`: compatibilidade com operações Anthropic.
- `apps/web/.env.test-accounts.local`: compatibilidade com testes de login.
- `.env.smtp.local`: compatibilidade com operações SMTP.

Editar o arquivo central atualiza todos esses caminhos. Não substituir um
atalho com `vercel env pull`; isso criaria outra cópia e quebraria a
centralização. Para scripts Node, usar `node --env-file=.env.vivance.local ...`
ou carregar explicitamente esse arquivo. O arquivo não é criptografado; o
modo `0600` restringe leitura ao usuário do computador.

## Inventário conferido

| Grupo | Variáveis disponíveis |
| --- | --- |
| Supabase do dev sintético | `SUPABASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, duas `NEXT_PUBLIC_SUPABASE_*` |
| Resend / SMTP | `RESEND_API_KEY`, host/porta/usuário/remetente `SMTP_*`; a senha SMTP é a própria `RESEND_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY`, conferida pelo digest do segredo Edge remoto |
| Worker de exames | `EXAM_WORKER_CRON_SECRET`, recuperado do Vault do projeto confirmado e conferido pelo digest Edge |
| QA | E-mail e senha de médico/paciente sintéticos, sob `VIVANCE_TEST_*` |
| Configuração operacional | `PATIENT_INVITE_REDIRECT_URL`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` |

O projeto Supabase é `oxuwrdjojsmgxoljqkuk`, temporário para testes sintéticos.
A aplicação pública permanece em `vtr-consulting/instituto-vivance`.
Somente as duas variáveis `NEXT_PUBLIC_*` são públicas; jamais renomear uma
chave secreta com esse prefixo. Os valores anteriores foram preservados e os
quatro caminhos de compatibilidade resolveram para o arquivo central.

## O que ainda falta

Desde 11/10, publicação nativa do site pela integração Git da Vercel está
automática na `main` (`autoAssignCustomDomains=true`), a pedido do usuário.
Ela não exige `VERCEL_TOKEN` no GitHub; as pendências abaixo são para a
pipeline completa de banco/Edge/promoção, não para o deploy nativo do site.

Não existem cópias locais de `SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN`
e `VERCEL_TOKEN`. As CLIs estão autenticadas pelos cofres próprios do
computador e permitem as operações manuais atuais; esses acessos globais não
foram exportados como tokens de CI.

A leitura de metadados do GitHub confirmou zero secrets/variables tanto no
repositório quanto no environment `production`. Para habilitar a publicação
automática de banco/Edge/promoção, ainda são necessários os três secrets acima
e as variáveis `SUPABASE_PROJECT_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`.
Os IDs já estão no arquivo central; os tokens de CI e a senha devem ser
fornecidos por canal local seguro, sem enviá-los na conversa. Não houve
criação de tokens ou alteração da pipeline nesta organização.

A Vercel conserva também secrets `POSTGRES_*` e chaves Supabase do vínculo
histórico; eles não são legíveis por `env pull` e não foram copiados ou
substituídos. Uma chave existir remotamente não significa haver backup local.
Nenhuma chave adicional é necessária para o WhatsApp manual: o produto abre
`wa.me` com texto e link, e a equipe confirma o envio no aplicativo.

## Publicação e WhatsApp

Em 11/10, o domínio oficial foi reconferido no deployment
`dpl_7k8WpipTjZuJKRYrhjkNn7u3xCfx`, código `18a6a188`; `/login` e `/convite`
responderam HTTP 200. As três Edge Functions de convite estão ACTIVE
(`invite-patient` v10, claim v9, staff v9). SMTP e template Auth foram
reconferidos por `config diff` sem atualizações pendentes.

O convite pode ser iniciado pelo WhatsApp: na área de pacientes, informar
nome e telefone → gerar link → abrir WhatsApp → enviar. Quem recebe informa
o e-mail; uma conta não ativada recebe o e-mail médico e define a senha; uma
conta confirmada entra e aceita o vínculo. O HTML com foto/CRM pertence ao
e-mail e não é renderizado dentro da mensagem do WhatsApp. Gerar link novo;
não reutilizar links cancelados nem encaminhar links Auth pessoais a terceiros.
Se já houver convite por e-mail pendente, o fluxo orienta usar esse e-mail.

O primeiro e-mail SMTP de teste foi recebido, mas inicialmente caiu no Spam.
Ativação/aceite pelo destinatário e entregabilidade externa seguem pendentes.
As entregas deste lote estão publicadas tecnicamente; drafts de Pulse e
IA/governança ainda dependem de seus próprios critérios.

