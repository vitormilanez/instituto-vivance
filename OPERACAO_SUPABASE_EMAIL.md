# Operação e envio de e-mails — Vivance

Verificado em 11/10/2026 (São Paulo). Este arquivo é um índice operacional sem segredos; releia o estado remoto antes de executar mudanças.

## Ambiente e acesso

- Checkout canônico: `/Users/vitormilanez/Desktop/Codes/vivance`.
- GitHub: `vitormilanez/instituto-vivance`; aplicação em `apps/web/`.
- Supabase: `instituto-vivance-dev`, ref `oxuwrdjojsmgxoljqkuk`, organização `laamvjzeoppcwvvvrnlf`, região `sa-east-1`.
- CLI Supabase 2.117.0 autenticada: `projects list` confirmou projeto vinculado e `ACTIVE_HEALTHY`.
- Ambiente único temporário para testes sintéticos. O rótulo Production no painel não libera dados reais; separação de produção e Gate P permanecem pendentes.
- Vercel: conta `vtrconsulting`, equipe `vtr-consulting`, projeto `instituto-vivance` / `prj_ligeZuFRycRXA21u5rRzaLAORTrI`.
- Domínio principal: https://institutovivance.app . Secundário: https://instituto-vivance.vercel.app .

## SMTP: conectado não significa configurado

Auditoria somente de leitura com `config diff --output-format json`, em configuração isolada, comparou explicitamente SMTP desabilitado, host/usuário/senha/remetente vazios e porta 587: **zero diferenças SMTP** no projeto remoto. Não há SMTP próprio configurado. Não foram encontradas variáveis SMTP/Resend/SendGrid/Postmark/Brevo/Mailgun/Mailjet/SES nos arquivos locais `apps/web/.env.local` e `apps/web/.env.test-accounts.local`; nenhum valor foi exibido. Isso não prova inexistência de uma conta de provedor fora deste projeto.

A tentativa anterior de aplicar somente o template pelo CLI retornou HTTP 400: customização indisponível em projeto Free usando o provedor padrão; a resposta pede plano diferente ou SMTP próprio. **Template preparado, não ativo.** Não houve contratação, mudança de plano, escrita SMTP, desativação de confirmação ou envio de novo e-mail nesta auditoria.

O provedor padrão tem restrições e não é indicado para operação com pacientes. Consulte a [documentação oficial de SMTP](https://supabase.com/docs/guides/auth/auth-smtp). Um upgrade de plano, sozinho, não comprova entregabilidade nem substitui a configuração de um remetente institucional.

## O que falta para ativar o convite personalizado

1. Escolher/identificar provedor SMTP e remetente institucional autorizado. Uma conta de Gmail ou o domínio do site, por si só, não comprovam SMTP preparado.
2. Obter host, porta, usuário e senha SMTP por canal seguro/cofre; nunca colocar credenciais neste arquivo, no Git ou na conversa.
3. Validar domínio/remetente e DNS exigido pelo provedor (SPF/DKIM/DMARC). Alterações DNS, contratação e plano exigem escopo próprio.
4. Configurar SMTP no projeto confirmado, aplicar apenas a configuração de convite e verificar leitura remota. HTML: `supabase/templates/invite.html`; procedimento: `supabase/templates/README.md`.
5. Enviar convite sintético autorizado, verificar recebimento real e ativação no navegador. Pedido de envio não é confirmação de entrega. Não testar consumindo convites reais de terceiros.

## Publicação técnica de 11/10

- PRs #121/#122 integrados: código `18a6a1881870d8ea60b0a4caa982c4ac39bb4a48`; 534 testes locais e CI/release aprovados.
- Deployment `dpl_7k8WpipTjZuJKRYrhjkNn7u3xCfx`: domínio principal/produção conferidos na publicação; HTTP 200 principal, 307 secundário. Revalidar antes de nova promoção.
- Edge: `invite-patient` v10, `claim-patient-invitation` v9 e `invite-staff` v9 ACTIVE; nenhuma migration nova.
- Colisão e-mail/WhatsApp pendente retorna 409 com orientação específica, sem consumir token. Link revogado retorna 410 e orienta novo convite/e-mail mais recente.
- Fluxo sintético publicado e mobile 390 px verificados; fixtures revogadas após teste. Convites de destinatários reais preservados. Aceites de usabilidade e clínico separados.
- Rascunhos antigos/substituídos não foram integrados indiscriminadamente; SMTP/layout do e-mail continuam pendentes.

Evidências e histórico: [STATUS_ATUAL](docs/STATUS_ATUAL.md), [DIRECAO_E_SLICES](docs/DIRECAO_E_SLICES.md), [CHECKPOINTS_ENTREGAS](docs/CHECKPOINTS_ENTREGAS.md) e [GUIA_OPERACIONAL_CODEX](docs/GUIA_OPERACIONAL_CODEX.md).
