# Migração dos módulos da Vivance

## Decisão e sequência

Estender a aplicação Next.js em `apps/web`, usando o Supabase existente, com autorização por clínica e dados persistidos. Reaproveitar a identidade e os fluxos de `app/`, retirando dependências de demonstração antes de cada entrega. O protótipo continua sendo a referência funcional; não é uma fonte de dados.

| Etapa | Entrega verificável | Dependências |
| --- | --- | --- |
| 1 — implementada localmente | Painel da clínica com 8 ações rápidas; pacientes com busca, paginação, cadastro e ficha; histórico administrativo | Auth, memberships, patients e audit_events existentes |
| 2 — planejada | Agenda: cadastrar, listar, reagendar e cancelar compromissos, com responsáveis e horários reais | Migrar o fluxo de `app/medico/agenda/page.tsx` e a vista Agenda de `app/components/doctor.tsx`; modelo persistido de agenda, equipe e testes de acesso |
| 3 — planejada | Atendimento manual e evolução com autoria e histórico | Agenda, vínculo ativo de cuidado e autorização clínica separada do administrador |
| 4 — planejada | Plano versionado: rascunho, revisão médica, aprovado, publicado e nova versão; acompanhamento/check-ins | Atendimento e políticas de publicação |
| 5 — planejada | Documentos privados, mensagens e áudio com processamento assíncrono | Regras de armazenamento, autorização, retenção e filas |
| 6 — planejada | IA assistiva com fontes, custos e revisão humana | Fluxos manuais e dados de origem disponíveis |

## Critérios da primeira entrega

- Início com a identidade da clínica e o papel do usuário; total de pacientes vem do banco.
- Oito ações: Pacientes, Novo paciente, Agenda, Atendimento, Planos de cuidado, Acompanhamento, Documentos e Histórico de ações. Funções futuras aparecem indisponíveis com uma explicação; histórico só é acessível ao administrador.
- Busca por nome na clínica atual, com paginação de 25 itens e termo preservado ao trocar de página. Caracteres de busca não podem ampliar indevidamente a consulta.
- Ficha individual mostra somente nome, nascimento e data de cadastro persistidos. Não representa prontuário nem confere permissão clínica.
- Cadastro salva usando a sessão do usuário e mantém a auditoria atômica; não há inserção automática de pacientes.
- Sem resultados, sem acesso, link inexistente e erro do serviço têm tratamento explícito.
- Verificar tipos, lint, testes de autorização e navegação real, incluindo desktop e celular.

## Publicação

Manter a entrega na branch `codex/vercel-supabase-foundation` e PR de revisão. Após verificar esta fatia localmente, resolver a primeira publicação do projeto Vercel e disponibilizar um ambiente de testes protegido; nenhum merge automático na produção. A migração completa não está concluída com a primeira fatia.

## Direção visual desta extensão

Modo Operate. Preservar `DESIGN.md`: navegação azul-marinho, superfícies claras e bordas discretas. Identidade da clínica no menu, título e ação principal no topo, 8 atalhos compactos e lista real de pacientes abaixo. Em telas estreitas, navegação horizontal, atalhos em duas colunas e demais conteúdos em uma coluna. Não preencher consultas, métricas clínicas ou alertas sem fonte persistida.

## Evidência da etapa 1 — 10/09/2026

- Build de produção, lint e TypeScript concluídos; 23 testes passaram, incluindo isolamento de ficha por ID, busca e caracteres literais.
- Login real do administrador e navegação no navegador: clínica, lista, busca vazia, limpeza da busca, ficha do cadastro existente e histórico.
- API autenticada: busca por parte do nome retorna o cadastro existente; busca literal por `%` retorna zero resultados. API sem sessão retorna 401.
- Capturas desktop 1440 px e mobile 390 px revisadas; pacientes no mobile sem transbordamento horizontal. Ajustados texto auxiliar e contraste do foco no menu.
- Nenhum paciente inserido automaticamente nesta entrega. Capturas autenticadas ficam somente locais, excluídas do Git.
- Limites: não há dados suficientes para exercitar visualmente múltiplas páginas; próxima etapa é Agenda. Ainda sem publicação Vercel ou homologação clínica.
