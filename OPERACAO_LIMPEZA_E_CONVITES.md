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

Estado antes da publicação: 536 testes, tipos, lint (um aviso anterior) e build
passaram no Node 24.21.0; revisão independente aprovada. Migration aplicada
pela CLI e história local/remota pareada; conferência do domínio ainda pendente.
Backend deve ser compatível antes de integrar a main, que publica o site
automaticamente. Nenhuma Edge Function ou SMTP precisa de alteração.
