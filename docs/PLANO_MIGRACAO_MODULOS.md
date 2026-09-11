# Migração dos módulos da Vivance

## Decisão e sequência

Estender a aplicação Next.js em `apps/web`, usando o Supabase existente, com autorização por clínica e dados persistidos. Reaproveitar a identidade e os fluxos de `app/`, retirando dependências de demonstração antes de cada entrega. O protótipo continua sendo a referência funcional; não é uma fonte de dados.

Decisão atual do titular: antecipar a estrutura visual navegável, sem mocks, antes de conectar os demais módulos. Isso não antecipa sua disponibilidade operacional. Cadastros persistidos e contas de teste solicitadas pelo titular são preservados; não apagar dados para deixar a interface vazia.

| Etapa | Entrega verificável | Dependências |
| --- | --- | --- |
| 1 — implementada localmente | Painel da clínica com 8 ações rápidas; pacientes com busca, paginação, cadastro e ficha; histórico administrativo | Auth, memberships, patients e audit_events existentes |
| 1B — implementada localmente | Navegação e estados vazios da equipe e do paciente; calendário navegável; abas da ficha; ações futuras desativadas | Mesma sessão e autorização por clínica; sem novas tabelas nem inserções |
| 2 — implementada em testes | Agenda: cadastrar, listar, reagendar e cancelar compromissos, com médico e paciente reais | Supabase com RLS, conflitos e auditoria; interfaces de equipe/paciente e API modular. Evidências em `AGENDA_MVP.md` |
| 3 — implementada em testes | Atendimento manual e evolução com autoria e histórico | Agenda, vínculo ativo de cuidado e autorização clínica separada do administrador. Evidências e limites em `ATENDIMENTO_MVP.md` |
| 4 — planejada | Plano versionado: rascunho, revisão médica, aprovado, publicado e nova versão; acompanhamento/check-ins | Atendimento e políticas de publicação |
| 5 — planejada | Documentos privados, mensagens e áudio com processamento assíncrono | Regras de armazenamento, autorização, retenção e filas |
| 6 — planejada | IA assistiva com fontes, custos e revisão humana | Fluxos manuais e dados de origem disponíveis |

## Critérios da primeira entrega

- Início com a identidade da clínica e o papel do usuário; total de pacientes vem do banco.
- Oito ações: Pacientes, Novo paciente, Agenda, Atendimento, Planos de cuidado, Acompanhamento, Documentos e Histórico de ações. Atalhos futuros abrem a estrutura visual com uma explicação; operações de escrita permanecem desativadas. Histórico só é acessível ao administrador.
- Busca por nome na clínica atual, com paginação de 25 itens e termo preservado ao trocar de página. Caracteres de busca não podem ampliar indevidamente a consulta.
- Ficha individual mostra somente nome, nascimento e data de cadastro persistidos. Não representa prontuário nem confere permissão clínica.
- Cadastro salva usando a sessão do usuário e mantém a auditoria atômica; não há inserção automática de pacientes.
- Sem resultados, sem acesso, link inexistente e erro do serviço têm tratamento explícito.
- Verificar tipos, lint, testes de autorização e navegação real, incluindo desktop e celular.

## Publicação

Manter a entrega na branch `codex/vercel-supabase-foundation` e PR de revisão. Após verificar esta fatia localmente, resolver a primeira publicação do projeto Vercel e disponibilizar um ambiente de testes protegido; nenhum merge automático na produção. A migração completa não está concluída com a primeira fatia.

Atualização de 10/09/2026: prévia protegida publicada, deployment `dpl_8TAwnssREwZp6Y4DEqtQdgnmvmQD`, código `ca6076f`. Detalhes, URL e limites no [README da aplicação](../apps/web/README.md). A primeira inicialização Production contém apenas uma página técnica sem banco; a aplicação está em Preview. Publicação automática e promoção continuam desabilitadas. Nenhum dado ou papel foi criado/alterado nesta publicação.

## Direção visual desta extensão

Modo Operate. Preservar `DESIGN.md`: navegação azul-marinho, superfícies claras e bordas discretas. Identidade da clínica no menu, título e ação principal no topo, 8 atalhos compactos e lista real de pacientes abaixo. Em telas estreitas, navegação horizontal, atalhos em duas colunas e demais conteúdos em uma coluna. Não preencher consultas, métricas clínicas ou alertas sem fonte persistida.

## Evidência da etapa 1 — 10/09/2026

- Build de produção, lint e TypeScript concluídos; 23 testes passaram, incluindo isolamento de ficha por ID, busca e caracteres literais.
- Login real do administrador e navegação no navegador: clínica, lista, busca vazia, limpeza da busca, ficha do cadastro existente e histórico.
- API autenticada: busca por parte do nome retorna o cadastro existente; busca literal por `%` retorna zero resultados. API sem sessão retorna 401.
- Capturas desktop 1440 px e mobile 390 px revisadas; pacientes no mobile sem transbordamento horizontal. Ajustados texto auxiliar e contraste do foco no menu.
- Nenhum paciente inserido automaticamente nesta entrega. Capturas autenticadas ficam somente locais, excluídas do Git.
- Limites: não há dados suficientes para exercitar visualmente múltiplas páginas; próxima integração funcional é Agenda, após a estrutura visual 1B. Ainda sem publicação Vercel ou homologação clínica.

## Estrutura visual 1B — 10/09/2026

- Equipe: agenda, atendimentos, planos, acompanhamento, documentos, mensagens, relatórios e Central da IA. Rotas explicitamente permitidas e protegidas por `requireClinic`; não importam o estado do protótipo.
- Paciente: Hoje, Meu cuidado, Conversas e Evolução; subdivisões de orientações, tratamento, diário, consultas e documentos. `/meu-perfil` continua disponível; todas as áreas exigem o papel paciente e a consulta da própria ficha.
- Ficha profissional: Visão geral real; Linha do tempo, Documentos e Evolução como seções futuras, após a mesma autorização da ficha.
- Calendário usa a data atual de São Paulo e permite selecionar datas/mudar meses, sem representar disponibilidade de horários. Não grava consultas.
- Sem envio de mensagens, arquivos, áudio ou chamadas a modelos. Os botões dessas operações são nativamente desativados, sem sucesso simulado. Não há novas migrações ou inserções no banco.
- 29 testes passaram; lint, TypeScript e build concluídos. Verificação real com sessões de médico/paciente; módulos profissionais bloqueados para paciente e histórico bloqueado para médico. Capturas locais em `outputs/empty-shell/`, fora do Git.
- Revisão visual independente: `ship` no escopo das quatro capturas (Agenda e Hoje do paciente, desktop 1440 e mobile 390) e código representativo. Fonte Arial herdada preservada. Nenhum problema material apontado nesse escopo.
- Esta é uma estrutura de navegação, não uma reprodução completa de cada fluxo do protótipo, nem liberação para atendimento real. Publicação Vercel segue pendente.
