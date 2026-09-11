# Equipe e vínculos de cuidado — slice 3C

## Entrega e fronteira

O administrador operacional pode convidar médico ou profissional de enfermagem, suspender e reativar acesso, atribuir um paciente e revogar ou reatribuir o vínculo. O profissional precisa aceitar tanto o convite da clínica quanto cada responsabilidade de cuidado antes de receber acesso correspondente. O administrador trabalha somente com identidade, papel, estado e identificação cadastral; a entrega não lhe concede leitura ou escrita de evolução, versões ou adendos.

Não há cadastro público, autoelevação de papel, atribuição entre clínicas, convite de administrador, exclusão de histórico ou IA. O e-mail é usado pelo Supabase Auth para localizar ou convidar a identidade e não é copiado para a tabela operacional de equipe.

## Matriz de autorização

| Papel | Equipe operacional | Vínculo de cuidado | Conteúdo clínico |
| --- | --- | --- | --- |
| Administrador ativo | Convida médico/enfermagem; suspende e reativa | Atribui pendente; revoga; reatribui pendente | Bloqueado |
| Médico ativo | Na tela de Equipe, vê somente o próprio acesso | Vê e aceita somente suas atribuições | Somente paciente com vínculo ativo próprio |
| Enfermagem ativa | Na tela de Equipe, vê somente o próprio acesso | Vê e aceita somente suas atribuições | Somente paciente com vínculo ativo próprio; sem escrita de atendimento neste slice |
| Paciente | Bloqueado | Bloqueado | Mantém apenas a área própria já autorizada |

Suspender o profissional invalida imediatamente seu papel operacional e, por consequência, todo acesso clínico, mesmo se ainda existir um vínculo marcado como ativo. Revogar um vínculo bloqueia aquele paciente imediatamente. Reativação de membro não reativa vínculo revogado; reatribuição exige que o profissional esteja ativo, volta ao estado pendente e exige novo aceite.

## Estados e integridade

- Equipe: `invited → active ↔ suspended`. Convite suspenso volta a `invited`; acesso já aceito volta a `active`.
- Responsabilidade: `assigned → active → revoked → assigned`. Somente o profissional atribído aceita; somente o administrador revoga ou reatribui.
- Toda alteração exige a versão lida. O banco elimina `expected_version`, incrementa a versão e devolve conflito para tela desatualizada.
- Identidade, clínica, papel, profissional, paciente, autoria e datas não podem ser trocados pelo chamador. Exclusão não foi concedida.
- RLS, privilégios por coluna e triggers validam a mesma fronteira. Saber um UUID ou modificar a requisição não amplia o acesso.
- Eventos de auditoria registram entidade, ação, ator e nomes dos campos alterados, sem copiar e-mail nem conteúdo clínico.

## Convites

`invite-staff` é uma Supabase Edge Function autenticada. A aplicação envia o token da sessão; a função o revalida, confirma pelo RLS que o chamador é administrador ativo e só então usa a chave secreta hospedada para localizar ou convidar a identidade no Auth. A chave nunca é enviada ao navegador ou à aplicação Next.js.

A interface mostra uma revisão explícita antes do envio externo. Conta existente recebe somente o vínculo pendente, sem novo e-mail; conta nova recebe convite com retorno para o endereço fixo protegido de primeiro acesso. A resposta ao administrador é igual nos dois casos, sem revelar se o e-mail já possuía conta. Se o Auth criar a identidade e a gravação operacional falhar, nenhum acesso à clínica é concedido e a tentativa pode ser repetida com segurança.

## Interfaces

- `/clinicas/:tenantId/equipe`: gestão para administrador e responsabilidades próprias para médico/enfermagem.
- `/clinicas`: convites pendentes e aceite explícito de entrada na clínica.
- `POST /api/v1/clinics/:tenantId/team/invitations`.
- `PATCH /api/v1/clinics/:tenantId/team/members/:memberId`.
- `POST /api/v1/clinics/:tenantId/team/relationships`.
- `PATCH /api/v1/clinics/:tenantId/team/relationships/:relationshipId`.
- `POST /api/v1/clinics/:tenantId/membership/accept`.

As mutações exigem sessão, origem válida, JSON limitado e apenas campos conhecidos. Respostas privadas usam `no-store`. As listas desta etapa são limitadas a 200 profissionais e 1.000 pacientes/vínculos, com aviso visível ao atingir o limite.

## Validação

- 66 testes passaram com as migrações reais em PostgreSQL efêmero: convite sem acesso antecipado, aceite versionado, matriz de papéis, atribuição/aceite/revogação/reatribuição, suspensão imediata, isolamento entre clínicas, identidade imutável, ausência de exclusão e fronteira da chave privilegiada.
- TypeScript, lint e build Next.js passaram. O painel preserva exatamente 8 ações rápidas.
- Arquivos de migração `20260911042022_team_and_care_relationships` e `20260911044600_care_reassignment_requires_active_member` aplicados no Supabase de desenvolvimento (versões remotas `20260911043121` e `20260911044758`). A Edge Function `invite-staff` está ativa na versão 2, com validação JWT. Chamada sem sessão retornou 401 sem criar identidade ou vínculo.
- Navegador local com sessão real de médico: Equipe exibiu os dois vínculos persistidos, sem controles administrativos; saída e retorno preservaram o resultado, o painel mostrou 8 cards e o console ficou sem erros ou avisos.
- Navegador local administrativo com duas identidades sintéticas descartáveis: convite de conta já existente sem envio de e-mail, aceite da clínica, atribuição, aceite profissional, suspensão com bloqueio imediato na sessão aberta, revogação, falha segura de reatribuição enquanto suspenso, reativação, reatribuição e novo aceite. A tela administrativa passou em 390 px com largura do documento igual à janela e sem falhas de rede/runtime. As identidades, sessões, memberships, vínculo e auditorias sintéticos foram removidos depois da validação.
- O banco remoto permaneceu com três identidades, três memberships ativas, dois vínculos ativos e zero convites pendentes depois dos testes negativos. Nenhuma mensagem de convite foi enviada nesta validação.
- O advisor de segurança não encontrou novo problema de RLS. Permanece o aviso anterior de proteção contra senhas vazadas desativada. O advisor de desempenho sinaliza índices ainda não usados e políticas permissivas sobrepostas; nesta escala piloto, eles preservam as leituras separadas e serão reavaliados com tráfego real.

## Publicação verificada

- Código funcional: `94b3e48` (`feat: add operational care team management`), no PR de trabalho #11.
- Preview protegida: deployment `dpl_H6gFqQf1Lvj3ACztE7KkZTVf99TK`, estado `READY`, no endereço fixo https://instituto-vivance-testes-vtr-consulting.vercel.app. Nenhum merge ou envio para Production foi realizado.
- Um visitante sem acesso à Vercel recebe redirecionamento para a proteção da plataforma. Com a proteção autenticada, a tela de login respondeu `200` com `noindex`; a API de Equipe sem sessão Vivance respondeu `401` e `Cache-Control: private, no-store`.
- Os checks do GitHub passaram e a consulta de logs de erro do deployment não retornou entradas no intervalo observado. Isso não garante ausência de falhas futuras.

## Limites do piloto

Esta entrega é para teste controlado, não para uso clínico real. Ainda faltam reenvio/cancelamento de convite, busca e paginação completa da equipe, entrega ponta a ponta de um novo e-mail, MFA, proteção de senha vazada, revisão profissional de privacidade/acessibilidade, restauração de backup e monitoramento operacional.
