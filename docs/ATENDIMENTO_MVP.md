# Atendimento manual — slice 3

## Entrega e fronteira

Agenda → confirmar responsabilidade de cuidado → registro manual → salvar rascunho → retomar → finalizar → consultar versões. Sem IA, áudio, prescrição, publicação para paciente ou integração de prontuário. Interface estende a identidade atual, sem redesign.

O atendimento contém motivo (2.000 caracteres) e evolução (10.000). O salvamento é **explícito**, não automático: texto ainda não salvo permanece somente na memória da aba. Não há cache clínico em localStorage. Avisos de saída cobrem links da aplicação, botão Sair e fechamento da aba, mas não prometem recuperação após travamento ou navegação pelo histórico do navegador. Salvar antes de sair.

## Permissões

| Papel | Leitura clínica | Escrita |
| --- | --- | --- |
| Médico | Pacientes com vínculo ativo próprio | Somente seus atendimentos em rascunho |
| Enfermagem | Pacientes com vínculo ativo previamente atribuído | Não escreve nem finaliza neste slice |
| Administrador | Nenhuma; recebe apenas auditoria operacional sem conteúdo | Nenhuma |
| Paciente | Nenhuma; nem rascunhos nem registros finalizados internos | Nenhuma |

Agendamento, nome semelhante, conhecimento do UUID e vínculo à clínica não conferem acesso clínico. O médico aceita explicitamente o cuidado ao iniciar sua própria consulta agendada. Vínculos revogados não são reativados pelo início. A gestão de vínculos de outros profissionais (incluindo enfermagem) ainda exige provisionamento controlado; não existe tela de gestão de equipe clínica nesta entrega. Suspensão, revogação de vínculo e invalidação de sessão são verificadas no banco.

## Integridade e histórico

- `care_relationships`, `encounters` e `encounter_versions` têm RLS e privilégios mínimos. Nenhuma chave privilegiada é usada na aplicação.
- `start_encounter` usa direitos do chamador, trava o agendamento e é idempotente. Vínculo aceito, rascunho, versão inicial e auditoria são transacionais.
- O banco confirma a correspondência entre clínica, agendamento, paciente e médico. Após o início, o agendamento não pode ser alterado ou cancelado, preservando a identidade clínica.
- A API exige a versão lida antes de salvar; conflito devolve 409 e mantém o texto na tela, sem sobrescrever automaticamente outra versão. A garantia de concorrência otimista é do contrato de API; as permissões de coluna do banco permitem ao médico autor atualizar diretamente textos de seus rascunhos.
- A cada escrita, um snapshot clínico completo é preservado com autor, versão e horário gerados pelo banco. Falha de auditoria reverte a escrita inteira.
- Finalização exige ambos os textos. Registro final não é editável, reaberto ou apagado pela aplicação. Retificações por adendo são etapa futura, **pré-requisito antes de uso clínico real**.
- Auditoria administrativa contém nomes de campos alterados, nunca seus valores. Snapshots ficam na autorização clínica.
- O status clínico é independente do status de agendamento; finalizar não publica ao paciente e não cancela nem libera o horário reservado. Na agenda, Abrir atendimento reabre o mesmo registro.

## Interfaces

- `/clinicas/:tenantId/atendimentos`: 100 registros mais recentes visíveis ao profissional, com aviso de limite.
- `/clinicas/:tenantId/atendimentos/:encounterId`: editor e 100 versões mais recentes, com aviso de limite.
- `GET/POST /api/v1/clinics/:tenantId/encounters`; `GET/PATCH /api/v1/clinics/:tenantId/encounters/:encounterId`.
- Mutações exigem sessão, origem válida, JSON e campos permitidos. Escrita clínica limitada a 64 KB. Respostas privadas `no-store`; erros não registram textos, nomes ou credenciais.

## Validação

- 52 testes passaram, incluindo PostgreSQL efêmero com as migrações reais: isolamento entre clínicas, identidades forjadas, acesso por vínculo, revogação, sessão invalidada, somente autor, versões, finalização imutável, agendamento cancelado, bloqueio de agendamento iniciado e rollback da auditoria.
- TypeScript e lint passaram. Migração remota `20260911022523_clinical_encounters` aplicada ao projeto de desenvolvimento existente.
- Navegador local: médico iniciou consulta do paciente de teste existente, salvou versão 2 e recuperou o texto ao sair e voltar.
- Finalização no navegador gerou versão 3, confirmou o estado somente leitura e preservou 3 snapshots no Supabase. Tentativa de PATCH no registro final retornou 409.
- Sessões reais de administrador e paciente: APIs de listagem e detalhe retornaram 403 com `private, no-store`. O administrador recebeu a tela de acesso clínico restrito; URL direta do registro com paciente recebeu Página indisponível.
- Revisão visual independente: `ship` no escopo das duas capturas e do editor. Não é certificação clínica ou de segurança.
- Um agendamento de validação foi criado em 12/09/2026 às 09h para a ficha de teste já existente, e seu atendimento foi finalizado com texto explicitamente técnico, sem informação clínica real. Registro e histórico são preservados; o horário não foi liberado, pois o agendamento já possui atendimento. Nenhum outro cadastro, agendamento ou papel foi alterado.
- Capturas locais de rascunho em 1440 px e 390 px; celular com largura de documento igual à janela (390 px). Detector visual sem achados nos componentes de agenda/editor. Capturas autenticadas não entram no Git.
- Advisor de segurança sem novos avisos de tabelas/RLS; permanece aviso anterior de proteção de senhas vazadas desativada. Referência: [segurança de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Limites do piloto

Esta entrega é para testes, não homologação clínica. Antes de dados de saúde reais: retificações, revisão profissional dos campos e fluxos, gestão/revogação operacional de vínculos, credenciais fortes/MFA, política de retenção, restauração de backups e revisão de segurança. Também faltam busca/paginação clínica completa e revisão detalhada de acessibilidade. Não há monitoramento clínico automático.

## Publicação verificada — 10/09/2026

- Código funcional `12908c6`; orientação de disponibilidade na ficha/painel ajustada em `128aacf`. Branch `codex/vercel-supabase-foundation`, sem merge para main ou promoção Production.
- Preview final `dpl_3scv4m6KDATCJZRHGfM31T8iGPe4`, **READY**, Next.js 16.3.4, build remoto concluído. URL imutável: https://instituto-vivance-4gpsks6f4-vtr-consulting.vercel.app.
- Alias de testes atualizado e verificado: https://instituto-vivance-testes-vtr-consulting.vercel.app. A versão anterior deste slice foi `dpl_E7uWwVvBXg5njza4JkkXRQs2QH5T`; somente textos de disponibilidade mudaram entre elas.
- No navegador online, o administrador acessou Atendimentos e recebeu a restrição clínica esperada. Este teste foi no primeiro deployment do slice. O depurador da automação perdeu conexão depois; não foi repetido o fluxo completo do médico no navegador online. Início, salvamento, retomada e finalização foram executados no navegador local com o mesmo Supabase real.
- No alias final, API de atendimentos sem sessão da aplicação retornou 401 e `Cache-Control: private, no-store`, com a proteção Vercel autenticada pela CLI. Acesso anônimo à prévia retornou 302, preservando a barreira Vercel.
- Consulta de logs de erro do deployment final (janela de 15 minutos) não retornou entradas; não equivale a garantia de operação sem erros. Servidor local continuou respondendo 200 na porta 3010. Sessões de teste locais encerradas ao final.
- Não houve novas variáveis, mudança de plano, compra, troca de senha, liberação de domínio público ou publicação automática.
