# Limpeza e exclusão da lista de convites — 11/10/2026

## Limpeza autorizada e executada

Projeto confirmado pela CLI: `instituto-vivance-dev` / `oxuwrdjojsmgxoljqkuk`,
ambiente temporário sintético. O pedido foi reiniciar todos os demais acessos
e convites, mantendo o médico e a conta permanente QA.

Mantidos: `guilhe.martins@gmail.com` e `paciente.teste@vivance.example`.
Preservados clínica, dois memberships, um paciente/conta/vínculo QA, seus nove
documentos/objetos, exames/revisões e demais registros atuais. Comparação dos
hashes das linhas sobreviventes passou na transação.

Removidos definitivamente: quatro identidades Auth, três pacientes e seus
dependentes, seis convites (dois aceitos e quatro cancelados), quatro objetos
privados via API Storage, sessões/refresh/fluxos/tokens das contas removidas.
Também removidos 699 eventos de auditoria de entidades eliminadas ou já
inexistentes e uma notificação com mensagem de origem inexistente. Preservados
94 eventos de entidades atuais, incluindo os dois eventos do perfil QA.

Houve simulação com ROLLBACK; o resultado foi vinculado ao SHA-256 do corpo
SQL executado. Ordem: commit do banco → remoção dos quatro paths exatos no
Storage → Auth Admin. Nenhum backup/export com conteúdo pessoal foi criado.

Conferência posterior: duas contas Auth, um paciente, dois memberships, uma
conta de paciente, zero convites, nove documentos e nove objetos. Busca pelos
IDs/e-mails dos alvos e IDs dos documentos/convites em 100 tabelas dos schemas
Auth/Storage/public/private retornou zero; 173 relações FK sem órfãos.
Não recriar as contas antes dos novos convites manuais do usuário.

A exclusão é definitiva no banco ativo e Storage; esta operação não elimina
mensagens já entregues, logs do provedor nem cópias/backups externos. Links
antigos de convite ficam inválidos. JWT é stateless; sessões foram revogadas
e operações sensíveis exigem sessão viva. Não equivale a aceite clínico/Gate P.

## Ação médica: Excluir da lista

Implementada ação por convite, com confirmação explicando o alcance.
Convites pendentes são cancelados e têm o token invalidado atomicamente;
aceitos/cancelados apenas ficam ocultos da lista e contadores. Esta ação não
apaga paciente, identidade Auth, ficha ou vínculo. O registro fica auditável.
Não é ferramenta de exclusão de prontuário ou mecanismo de limpeza do banco.

RPC exige sessão viva e confirmação explícita, clínica/papel ativo, admin ou
médico criador. Bloqueio de linha serializa aceite/cancelamento/arquivamento.
API exige mesma origem e JSON estrito. Migration aditiva:
`20261011202934_archive_patient_invitation_history.sql`.

Publicação técnica concluída: [PR129](https://github.com/vitormilanez/instituto-vivance/pull/129)
integrado no SHA `56b4dedec5dd7aeca6a8e911de075c6d1c0b14d2`. 536 testes, tipos,
lint (um aviso anterior) e build passaram no Node 24.21.0 localmente e no CI
`38173117222`; release `38173229148` aprovado em verify. As etapas automáticas
de banco/Edge/promoção ficaram skipped por secrets ausentes: migration foi
aplicada manualmente antes do merge; Vercel nativa fez a publicação automática.
Nenhuma Edge Function ou SMTP foi alterada.

Deployment `dpl_DFyCXvM2WSPTGRPxBCvG3Jn87nPu`, production/READY do mesmo SHA,
confirmado nos dois domínios oficiais; principal `/convite`200, secundário307.
Médico entrou realmente pela interface. No domínio publicado a confirmação
“Excluir da lista” retornou PATCH200, ocultou o convite sintético e conservou
o único paciente QA. Banco confirmou revoked/arquivado/autor médico/token nulo.
Fixture temporária e seus eventos de auditoria foram depois removidos por ID
guardado; nenhum e-mail/WhatsApp enviado. Lista final zerada.

Desktop1440/celular390 conferidos em uma rodada agrupada e uma confirmação após
correção do alinhamento das colunas/texto pequeno: sem overflow, alvos44px,
confirmação14px desktop/16px mobile. Evidências locais em
`output/release-20261011/invite-delete-{1440,390}.png`.
Detector Impeccable apontou advisories de estilo já presentes na folha; sem
novo bloqueio nos controles. Advisors Supabase: zero ERROR; warning da RPC
SECURITY DEFINER autenticada esperado, guardas de sessão/papel/tenant revistas.
Consulta limitada aos logs de erro deste deployment nos dez minutos da entrega
retornou zero registros. Isso não garante monitoramento contínuo.
