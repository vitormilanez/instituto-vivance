# Operação e envio de e-mails — Vivance

Verificado em 11/10/2026 (São Paulo). Este arquivo é um índice operacional sem segredos; releia o estado remoto antes de executar mudanças.

## Estado vigente — 16h55 de 11/10/2026

Organização posterior de 11/10: a credencial Resend e as demais chaves locais
foram centralizadas em `.env.vivance.local`; `.env.smtp.local` é agora um
atalho para ela. Ver [inventário e pendências](CREDENCIAIS.md).

- Resend Free configurado sob a conta `vtrconsultingbr`; domínio de envio `auth.institutovivance.app` **Verified** em São Paulo. DNS Vercel: DKIM TXT `resend._domainkey.auth`, CNAMEs `rsend.auth` e `send.auth`, todos verificados pelo Resend. DMARC opcional ainda não publicado; recebimento no subdomínio não habilitado.
- Supabase Auth do projeto sintético confirmado `oxuwrdjojsmgxoljqkuk` recebeu SMTP `smtp.resend.com:465`, usuário SMTP `resend`, remetente `Vivance <convites@auth.institutovivance.app>`, assunto **Seu convite para a Vivance** e `supabase/templates/invite.html`. Push isolado de nove propriedades; `config diff` de retorno sem alterações pendentes. A senha foi lida de arquivo local `.env.smtp.local` ignorado pelo Git e modo `600`; **não** registrá-la neste documento, em terminal ou commit.
- Um convite Auth sintético enviado a alias do próprio Gmail foi marcado **Delivered** no Resend e encontrado no Gmail às 16h54. Layout, foto, Dr. Guilherme Martins/CRM-SP 182364 e CTA foram renderizados. Gmail exibiu `mailed-by: rsend.auth.institutovivance.app`, `signed-by: auth.institutovivance.app` e TLS.
- **Entregabilidade ainda é ressalva:** o primeiro envio caiu em Spam no Gmail (“similar a mensagens identificadas como spam no passado”). Foi marcado “não é spam” somente nessa caixa, sem enviar o conteúdo à equipe anti-spam do Google. Isso não corrige nem garante a entrega na entrada de terceiros. Orientar destinatários a verificar Spam enquanto o domínio ganha histórico e monitorar próximos envios; validar com outro destinatário autorizado antes de declarar aceite.
- A identidade Auth sintética de teste foi excluída com guarda de ID/e-mail/estado e ausência posterior confirmada. O e-mail permanece na caixa como evidência, **mas seu link de ativação é inválido**. Não houve teste de clique, ativação nem aceite de convite de paciente neste envio.
- Supabase continua no Free. Nenhuma assinatura paga, migration, Edge Function ou deploy Vercel ocorreu nesta configuração de e-mail. Gate P e separação futura de produção permanecem pendentes.

As seções de auditoria e recomendação abaixo descrevem o estado **anterior** à configuração acima.

## Ambiente e acesso

- Checkout canônico: `/Users/vitormilanez/Desktop/Codes/vivance`.
- GitHub: `vitormilanez/instituto-vivance`; aplicação em `apps/web/`.
- Supabase: `instituto-vivance-dev`, ref `oxuwrdjojsmgxoljqkuk`, organização `laamvjzeoppcwvvvrnlf`, região `sa-east-1`.
- CLI Supabase 2.117.0 autenticada: `projects list` confirmou projeto vinculado e `ACTIVE_HEALTHY`.
- Ambiente único temporário para testes sintéticos. O rótulo Production no painel não libera dados reais; separação de produção e Gate P permanecem pendentes.
- Vercel: conta `vtrconsulting`, equipe `vtr-consulting`, projeto `instituto-vivance` / `prj_ligeZuFRycRXA21u5rRzaLAORTrI`.
- Domínio principal: https://institutovivance.app . Secundário: https://instituto-vivance.vercel.app .

## Auditoria anterior: conectado não significava configurado

Auditoria somente de leitura com `config diff --output-format json`, em configuração isolada, comparou explicitamente SMTP desabilitado, host/usuário/senha/remetente vazios e porta 587: **zero diferenças SMTP** no projeto remoto. Não há SMTP próprio configurado. Não foram encontradas variáveis SMTP/Resend/SendGrid/Postmark/Brevo/Mailgun/Mailjet/SES nos arquivos locais `apps/web/.env.local` e `apps/web/.env.test-accounts.local`; nenhum valor foi exibido. Isso não prova inexistência de uma conta de provedor fora deste projeto.

A tentativa anterior de aplicar somente o template pelo CLI retornou HTTP 400: customização indisponível em projeto Free usando o provedor padrão; a resposta pede plano diferente ou SMTP próprio. **Template preparado, não ativo.** Não houve contratação, mudança de plano, escrita SMTP, desativação de confirmação ou envio de novo e-mail nesta auditoria.

O provedor padrão tem restrições e não é indicado para operação com pacientes. Consulte a [documentação oficial de SMTP](https://supabase.com/docs/guides/auth/auth-smtp). Um upgrade de plano, sozinho, não comprova entregabilidade nem substitui a configuração de um remetente institucional.

## Decisão de 11/10: Resend Free durante o desenvolvimento

Usar [Resend Free](https://resend.com/pricing) para o SMTP do Auth: US$ 0,
até 3.000 e-mails por mês e 100 por dia, três domínios e SMTP relay. O limite
é adequado para testes e convites iniciais; reavaliar com volume real. O
Supabase [permite template personalizado no Free quando há SMTP próprio](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).

Preparar o subdomínio de envio `auth.institutovivance.app` e o remetente
`Vivance <convites@auth.institutovivance.app>`; confirmar o endereço na conta
Resend antes de ativar. DNS do domínio principal usa `ns1.vercel-dns.com` e
`ns2.vercel-dns.com`; na checagem de 11/10 não havia TXT/MX no ápice nem TXT
em `_dmarc.institutovivance.app`. Inserir somente os registros exibidos pela
verificação de domínio da conta Resend, depois conferir propagação e status.
Esses valores ainda não foram gerados; não inventar DKIM/SPF/DMARC.

A CLI Vercel confirmou que `institutovivance.app` está registrado sob a equipe
`vtr-consulting`, com nameservers atuais corretos, e permitiu listar a zona
DNS. Após o login na conta Resend e a geração dos registros, a edição DNS pode
ser feita na conta Vercel conectada, preservando os registros atuais.

O [Supabase Pro](https://supabase.com/pricing) começa em US$ 25/mês para a
organização. Vale considerar quando houver piloto contínuo/necessidade de
backups diários, mais espaço, suporte ou evitar a [pausa por inatividade do
Free](https://supabase.com/docs/guides/platform/free-project-pausing). Não é
necessário comprar Pro apenas para ativar este template; para convites a
destinatários externos, o [SMTP padrão tem restrições próprias](https://supabase.com/docs/guides/auth/auth-smtp).

Estado anterior da configuração: página de cadastro do Resend aberta para o responsável
entrar/criar a conta; nenhum domínio validado nem SMTP habilitado ainda. Após
esse login, criar a chave de envio com acesso mínimo, mantê-la em local seguro,
configurar SMTP no Supabase do projeto confirmado, aplicar o template e verificar
um convite sintético recebido. Nunca registrar a chave em Git ou neste arquivo.

## Checklist original de ativação (itens 1–4 concluídos)

1. Entrar/criar a conta Resend controlada pela Vivance e confirmar o remetente proposto. Uma conta de Gmail ou o domínio do site, por si só, não comprovam SMTP preparado.
2. Obter host, porta, usuário e senha SMTP por canal seguro/cofre; nunca colocar credenciais neste arquivo, no Git ou na conversa.
3. Validar domínio/remetente e DNS exigido pelo provedor (SPF/DKIM/DMARC), conferindo os valores gerados na conta.
4. Configurar SMTP no projeto confirmado, aplicar apenas a configuração de convite e verificar leitura remota. HTML: `supabase/templates/invite.html`; procedimento: `supabase/templates/README.md`.
5. Convite sintético enviado e recebido no Gmail, inicialmente em Spam. Ativação e aceite no navegador não testados; não usar o link da identidade QA excluída. Não testar consumindo convites reais de terceiros.

## Publicação técnica de 11/10

- PRs #121/#122 integrados: código `18a6a1881870d8ea60b0a4caa982c4ac39bb4a48`; 534 testes locais e CI/release aprovados.
- Deployment `dpl_7k8WpipTjZuJKRYrhjkNn7u3xCfx`: domínio principal/produção conferidos na publicação; HTTP 200 principal, 307 secundário. Revalidar antes de nova promoção.
- Edge: `invite-patient` v10, `claim-patient-invitation` v9 e `invite-staff` v9 ACTIVE; nenhuma migration nova.
- Colisão e-mail/WhatsApp pendente retorna 409 com orientação específica, sem consumir token. Link revogado retorna 410 e orienta novo convite/e-mail mais recente.
- Fluxo sintético publicado e mobile 390 px verificados; fixtures revogadas após teste. Convites de destinatários reais preservados. Aceites de usabilidade e clínico separados.
- Rascunhos antigos/substituídos não foram integrados indiscriminadamente. SMTP/layout foram aplicados mais tarde nesta data; entregabilidade e aceite seguem pendentes conforme o estado vigente acima.

Evidências e histórico: [STATUS_ATUAL](docs/STATUS_ATUAL.md), [DIRECAO_E_SLICES](docs/DIRECAO_E_SLICES.md), [CHECKPOINTS_ENTREGAS](docs/CHECKPOINTS_ENTREGAS.md) e [GUIA_OPERACIONAL_CODEX](docs/GUIA_OPERACIONAL_CODEX.md).
