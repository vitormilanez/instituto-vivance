# Convite Vivance

`invite.html` substitui somente o template **Invite user** do Supabase Auth.
Assunto: **Seu convite para a Vivance**.

O corpo apresenta Dr. Guilherme Martins, CRM-SP 182364 (registro fornecido pelo
usuário em 11/10/2026), somente quando os metadados de apresentação indicam um
convite de paciente desse médico. Outros convites usam a versão institucional,
sem atribuir a ele convites de equipe ou de outros profissionais. A foto já
publicada pertence ao material institucional. CPF e dados de paciente não são
incluídos. Metadados não concedem permissões: vínculos e aceite continuam no banco.
Em contas não confirmadas, as funções atualizam os dois campos de apresentação
com o contexto validado antes do reenvio (o GoTrue não aplica `data` novamente
ao usuário existente). Falha de atualização impede um e-mail com autoria antiga.

## Prévia sem envio

Execute `node scripts/ops/preview-invitation-email.mjs` na raiz. Abra
`http://127.0.0.1:3044` e `/generic`. O link da prévia é inerte. A prévia seleciona
o ramo do HTML, não substitui a validação do motor Go do Supabase nem um teste
real em Gmail/Outlook.

## Aplicação hospedada, separada do código

1. Confirmar `instituto-vivance-dev` / `oxuwrdjojsmgxoljqkuk` no painel autenticado.
2. Após autorização de publicação, publicar as Edge Functions `invite-patient`,
   `claim-patient-invitation` e `invite-staff` com os metadados de apresentação.
3. Em Auth / Email Templates / Invite user, substituir assunto e corpo pelo HTML.
   Preservar `{{ .ConfirmationURL }}`; não trocar por URL de login estática.
   Pela Management API, os campos equivalentes em `/v1/projects/{ref}/config/auth`
   são `mailer_subjects_invite` e `mailer_templates_invite_content`. Não alterar
   outras configurações de Auth. Guardar o template anterior para rollback.
4. Um remetente institucional exige configuração SMTP própria. O HTML não muda
   o remetente padrão Supabase Auth. Não contratar serviço nem inserir segredos
   no repositório como parte desta alteração.
5. Com um destinatário sintético autorizado, verificar recebimento, assunto,
   foto, variante correta e ativação/aceite no domínio principal. Não consumir
   links nem recriar a conta do usuário antes de seu teste.

Em 11/10 à tarde, a CLI autenticada confirmou o projeto e tentou aplicar somente
assunto/corpo declarados. Auth respondeu HTTP400: customização indisponível no
free tier com provedor padrão; exige SMTP próprio ou plano diferente. Portanto
**template hospedado, envio real e aceite não estão verificados**. Não contratar
serviço/alterar plano automaticamente. Código/Edge foram publicados separadamente.

Fontes: https://supabase.com/docs/guides/auth/auth-email-templates e
https://supabase.com/docs/guides/auth/auth-smtp.
