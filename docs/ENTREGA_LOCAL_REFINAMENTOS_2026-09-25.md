# Entrega local — convite, atendimento e histórico

25/09/2026 · Instituto Vivance · código em `apps/web` · base `1507f6f`.

## O que foi entregue

| Itens | Implementação |
| --- | --- |
| 1 | Convite por link como padrão para médico/admin, alternativa por e-mail e identificação correta do envio. Onboarding com escolhas rápidas editáveis, perguntas adiáveis e progresso animado. Reutiliza confirmação de identidade, rascunho, consentimento e upload existentes. |
| 2 | Agenda avança com o relógio e atualiza dados ao retornar/periodicamente. Horário encerrado sem desfecho mostra Resultado pendente. Finalização e falta continuam explícitas. Abre o registro salvo do agendamento correto. |
| 3 | Peso inicial do cadastro, gráfico recente e peso atual ao lado do nome, sem card. Datas e fonte explícitas; ausência de dados não vira zero. |
| 4, 7, 11 | Contexto único com Cadastro inicial, Pré-consulta, Recebido desde a última consulta e Receitas anteriores. Exames, medidas, metas, última consulta e plano de cuidado permanecem em cards visíveis na consulta. |
| 5, 8 | Ações alinhadas, 44px de altura, transições breves e pulso discreto na teleconsulta. O pulso não significa gravação, presença ou realização. Movimento reduzido respeitado. |
| 6 | Oito ações rápidas abertas. |
| 9 | Decisões, prioridades, referências e critérios de aceite no plano vinculado abaixo. |
| 10 | Cards de documentos, exames, consultas, evolução e receitas no topo da conversa selecionada. Registros existentes são acessíveis; geração de transcrições de áudio permanece fora desta entrega. |
| 11 | Histórico de receitas na ficha, contexto principal, atendimento, mensagens e Meu cuidado. PDF/JPG privados ou link HTTPS oficial Memed; título/data, consentimento do paciente, autoria, isolamento e paginação para receitas antigas. |

## Revisar localmente

- [Consulta e ações rápidas](http://127.0.0.1:3091/refinamentos-preview)
- [Agenda](http://127.0.0.1:3091/refinamentos-preview?tela=agenda)
- [Convite](http://127.0.0.1:3091/refinamentos-preview?tela=convite)
- [Onboarding](http://127.0.0.1:3091/refinamentos-preview?tela=onboarding)
- [Mensagens](http://127.0.0.1:3091/refinamentos-preview?tela=mensagens)

A prévia compõe os componentes reais com dados fictícios. Não fornece uma sessão autenticada nem um banco substituto. APIs clínicas respondem 401 sem login. A rota existe apenas em desenvolvimento; no build de produção retornou HTTP 404.

Capturas locais em `output/playwright/`: `refinements-desktop-final.png`, `receitas-desktop.png`, `receitas-mobile.png`, `mensagens-1440.png`, `agenda-1440.png` e variantes móveis. As capturas de receitas usam respostas sintéticas interceptadas somente no navegador para conferir os estados de interface; não comprovam persistência.

## Validação executada

- `npm test`: **413/413 testes aprovados**.
- `npm run lint`, `npm run typecheck`, `npm run build`: aprovados, com Node 24.
- `git diff --check HEAD`: aprovado.
- PGlite: migrações e regras de isolamento, propriedade, vínculo clínico, consentimento, idempotência, URL Memed, revogação de visibilidade do documento e paginação de receitas. Histórico com 22 registros atravessa duas páginas sem sobreposição.
- Navegador: desktop 1440px e celular 390px para consulta, agenda, convite, onboarding e mensagens; consulta também em 320px. Sem overflow horizontal nos cenários verificados.
- Abas operadas por clique e setas. Quatro ações principais alinhadas no mesmo eixo e com altura 44px no desktop. Oito atalhos visíveis.
- Objetivo rápido atualiza o campo editável; avançar/pular pergunta atualiza o progresso. Preferência de movimento reduzido resulta em animação `none` no pulso.
- Receitas: arquivo/link alternáveis, layout móvel sem overflow e formulário desabilitado quando o schema está indisponível (respostas sintéticas). Nenhum formulário de escrita foi enviado a ambiente hospedado.

## Limites e próximo passo de publicação

A migração `supabase/migrations/20260925141533_patient_prescription_archive.sql` foi criada e validada localmente, **não aplicada em Supabase hospedado**. Instalar essa migração será necessário para ativar o histórico no ambiente de destino. Banco Supabase local completo não estava em execução; a validação SQL usou PGlite. Não houve push, PR, publicação ou mensagens reais.

Ainda precisa de aceite ponta a ponta com contas autorizadas no ambiente de destino: convite novo/existente/expirado, confirmação de identidade, retomada entre sessões, upload real PDF/JPG, compartilhamento e exibição paciente→médico, finalização de consulta e atualização em outra sessão. Os testes locais e a prévia visual não substituem esse aceite.

A organização de receitas não emite, assina, valida nem renova prescrições. Links Memed abrem externamente; não há importação automática de conteúdo. Transcrições automáticas não foram ativadas.

[Plano de produto, decisões e critérios de aceite](PLANO_CONVITE_E_ATENDIMENTO_2026-09-25.md).
