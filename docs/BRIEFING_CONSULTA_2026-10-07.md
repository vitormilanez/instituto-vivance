# Briefing da consulta e gráfico de peso — 07/10/2026

Implementação na branch `codex/consultation-brief-20261007`, criada da main atualizada `0e280111af4e81c075e25f5ce2ee47187ccf3633`, publicada após autorização em 07/10/2026 pelo PR #82. O checkout usado é `/Users/vitormilanez/Developer/vivance-consultation-brief-20261007`; a pasta de protótipo aberta inicialmente no Codex não foi modificada.

## O que mudou

- Cabeçalho compacto, chips com fontes e ação principal contextual: rascunho da consulta ou ainda não agendado vira **Retomar atendimento**. Rascunho de outro agendamento conserva ação distinta.
- Abas da Home do médico substituídas por relatos com fontes, feed cronológico, pré-consulta mais recente aberta e comparação dos dois originais. Cadastro inicial recolhido como contexto de base. Dados originais e datas são preservados.
- Fatos compactos substituem cartões vazios. Receitas abrem em painel lateral sem sub-abas, com aviso de que a Vivance não emite nem valida receitas. O painel só busca dados quando aberto.
- Pendências do paciente em foco aparecem no briefing. Outros pacientes permanecem nas filas. Documentos de trabalho substituem a contagem recebida, sem duplicação; documentos da equipe e anteriores ao último atendimento abrem a coleção completa, enquanto os demais envios têm destino próprio.
- Um único menu Solicitar conserva os tipos e a mensagem opcional do fluxo existente, com idempotência. Links de fontes e originais conservam a marcação de não visto. Aceite de vínculo, Agenda, teleconsulta e atalhos do médico são preservados. A rota autenticada mantém oito ações rápidas; a fixture sintética contém seis. `globals.css` não teve alteração nesta fatia; as regras de `d78e4c6` permanecem.

## Gráfico

Datas têm distância proporcional no eixo horizontal. Pesos inválidos não viram pontos fictícios; séries de um ponto ou valores iguais são tratadas. O cadastro aparece como referência separada, sem inventar uma medição adicional. Variação em kg e percentual é aritmética, sem classificação de resultado, peso ideal ou recomendação clínica. Cada ponto pode ser selecionado; controles anterior/próximo, Home/End, setas e tabela acessível fornecem alternativas por teclado e toque.

## Contrato da IA

O serviço `modules/ai/consultation-brief.ts` é exclusivo do servidor. Requer simultaneamente `VIVANCE_AI_BRIEF=on`, `ANTHROPIC_API_KEY` e `VIVANCE_AI_BRIEF_MODEL`; não há chave nem modelo padrão. Nesta entrega nenhuma chamada real ao provedor ocorreu. A geração só é usada na Home do médico.

A sessão, clínica, paciente e vínculo profissional ativo são conferidos antes de ler contexto clínico. Queries mantêm filtros explícitos, além da RLS existente. O prompt é fixo, ignora instruções contidas nos relatos e proíbe interpretação, diagnóstico, risco, conduta, dose e prescrição. A saída JSON é validada: só passa texto literalmente igual a um fato autorizado, com fonte real contendo tipo, id e data. A ordem final pertence ao servidor, sem ranking clínico. Tempo limite de 8 segundos; falha retorna relatos e lacunas determinísticos e oferece tentar novamente. A etiqueta de IA só aparece quando esse modo realmente produziu tópicos válidos.

Não há migration, gravação, cache persistente ou armazenamento de rascunho. Ativar envio de dados clínicos ao provedor em produção depende de decisão expressa do usuário sobre fornecedor/LGPD e dos gates pertinentes. Gate P e C3 não são declarados aceitos.

## Verificação visual e de interação

Prévia exclusiva de desenvolvimento em `http://localhost:4186/refinamentos-preview`, com Ana e Marina marcadas FICTÍCIO, IDs sintéticos e endpoint local de Supabase sem sessão. Capturas ficam em `output/playwright/consultation-briefing/` e são artefatos locais ignorados pelo Git:

| Captura | Resultado |
| --- | --- |
| 1440.png | viewport 1440; largura do documento 1440 |
| 390.png | viewport 390; largura do documento 390 |
| 320.png | viewport 320; largura do documento 320 |
| briefing.png | bloco completo em desktop |
| chart.png | gráfico em tamanho nativo |
| recipes-drawer.png | dialog lateral aberto |

Nenhuma rolagem horizontal nessas três larguras. Ações principais, solicitar, teleconsulta, receita e navegação do gráfico mediram 44 px de altura. Links curtos dos fatos têm também largura mínima de 44 px. Cores textuais usadas no briefing e no gráfico mantêm contraste AA sobre suas superfícies; estado e seleção também têm texto/forma, sem depender só de cor.

No navegador: anterior selecionou 79,2 kg (7/8); Home selecionou 82,0 kg (1/8); End voltou a 78,8 kg (8/8). Comparação abriu com ambos os originais, o menu único abriu, receitas abriram sem tablist e com o aviso obrigatório. Escape fechou o dialog e restaurou foco ao botão. Não houve envio de solicitação nem adição de receita. Ao abrir receitas nesta prévia sem login, a API retorna 401 e mostra erro com nova tentativa: não é validação de persistência ou autorização real.

Revisão independente de código encontrou três problemas, corrigidos: tolerância de falhas indevidamente estendida à enfermagem; destino incompatível das pendências documentais; ausência afirmada apesar de falha no feed. A confirmação de código e uma rodada visual independente não encontraram novo bloqueio. A UI da enfermagem mantém o comportamento anterior.

## Limites

Histórico de pré-consultas consulta até 20 solicitações e materializa até 8; o contexto carrega 6 documentos recentes, com contagem exata da coleção. Pesos recentes preservam o limite existente de 8. A fila de trabalho existente varre até 300 documentos, portanto sua contagem não deve ser tratada como inventário histórico ilimitado. As fontes de documentos do briefing são apenas documentos sem revisão efetivamente identificados nessa leitura.

Os testes abaixo incluem regressões de fallback, descarte de fontes inválidas, erro do provedor, deduplicação, navegação contextual e cálculo do gráfico. Os testes de banco existentes usam PostgreSQL efêmero; a verificação das novas queries de contexto inspeciona seus filtros e estados de erro. Isso não comprova execução de RLS no banco remoto nem uma jornada autenticada nova. A verificação posterior à publicação cobre a Home na sessão existente do médico, conforme registro abaixo; aceite clínico, outros perfis e isolamento remoto permanecem fora deste aceite.

## Publicação e conferência autenticada — 07/10/2026

O usuário autorizou subir e publicar. Código integrado pelo [PR #82](https://github.com/vitormilanez/instituto-vivance/pull/82), merge `abefcb30b37ba335bb77c41c3b6987bd9f2af546`, em 07/10/2026 às 04:23:19 UTC. A árvore de `apps/web` corresponde à implementação testada localmente. [Foundation CI](https://github.com/vitormilanez/instituto-vivance/actions/runs/37571211721) e [release](https://github.com/vitormilanez/instituto-vivance/actions/runs/37571212062) concluíram com sucesso nesse SHA; o job verify executou testes, lint, typecheck e build. As etapas de aplicar migrations, publicar Edge Functions e promover/confirmar domínio foram skipped por ausência das credenciais/configurações do workflow. Não se declarou publicação só pelo workflow verde.

A CLI autenticada confirmou VTR CONSULTING (`vtr-consulting`), projeto `instituto-vivance` / `prj_ligeZuFRycRXA21u5rRzaLAORTrI`, root `apps/web`, Next.js e Node 24. A integração Git já havia produzido deployment READY do mesmo SHA, target production. Esse deployment foi reutilizado e promovido manualmente:

| Evidência | Resultado observado |
| --- | --- |
| Deployment publicado | `dpl_AKdqxwrBgQuVjrwAJjRMVXJ6frAR`, READY, target production |
| URL do deployment | `https://instituto-vivance-igmnlag29-vtr-consulting.vercel.app` |
| `institutovivance.app` | inspect aponta para o deployment publicado; `/login` retornou HTTP 200 nas três leituras |
| `instituto-vivance.vercel.app` | inspect aponta para o mesmo deployment; `/login` retornou HTTP 307 para o domínio principal nas três leituras |
| Rollback anterior registrado | `dpl_AgWG4tj1AQ3QeyGpiqpGpRRRXZvv`, `https://instituto-vivance-6el5wc9tn-vtr-consulting.vercel.app` |

Após recarregar o domínio público na sessão autenticada existente do médico, o briefing contínuo, fontes, feed, pendências sem duplicação e oito ações rápidas apareceram. A comparação expandiu os dois originais e recolheu novamente; o gráfico selecionou o registro anterior e voltou ao último. Receitas carregaram o estado vazio sem erro, com o aviso obrigatório e sem sub-abas; o menu Solicitar abriu os quatro tipos e fechou. Não houve envio de solicitação, inclusão de receita, finalização de atendimento ou alteração clínica. Os resultados e títulos clínicos dessa sessão não são reproduzidos neste registro.

As três variáveis exigidas para IA não constam na configuração production consultada; o recurso permanece desligado e o briefing usa fallback determinístico. Nenhuma variável de IA foi adicionada, nenhuma chamada real ao provedor ocorreu e esta publicação não aplicou migrations, Edge Functions ou comandos no Supabase. A promoção do frontend não altera a decisão de usar o projeto de desenvolvimento somente para testes sintéticos nem valida a origem dos registros existentes.

Esta é publicação técnica com conferência autenticada da Home do médico. Jornada do paciente, outros perfis, persistência/revisão/publicação clínica, isolamento remoto, backup/restauração e aceite operacional C3 não foram concluídos nesta fatia. Gate P permanece aberto.

## Refinamento solicitado em 07/10/2026

A leitura do card foi revista após avaliação do usuário: respostas literais do paciente, solicitações sem resposta e documentos aguardando revisão têm grupos próprios. O texto clínico não é reescrito nem classificado. Documentos recebem link para a linha original, data e número de arquivo para distinguir títulos repetidos; a linha de destino fica realçada. A lista operacional de pendências continua visível também se o modo de IA vier a selecionar apenas parte dos relatos.

O card da próxima consulta inicia expandido e pode ser minimizado para pessoa, horário e tipo de encontro, deixando as seções seguintes subirem. O controle é um disclosure nativo com texto, foco e teclado; reabrir restaura o conteúdo. A navegação do médico deixou de renderizar o fallback global que removia o menu entre páginas, e o link pendente mostra um sinal discreto. No painel médico de mensagens, o seletor de referências fica recolhido por padrão; aberto no desktop, flutua sobre a conversa, sem deslocar o botão de envio. O histórico posiciona a última mensagem no painel interno.

Na sessão publicada anterior à alteração, a transição para Mensagens exibiu apenas “Carregando sua clínica…” até a página carregar. O usuário autorizou testar envio; uma mensagem curta identificada como teste, sem conteúdo clínico, foi enviada ao paciente selecionado e apareceu no histórico, com campo limpo e confirmação “Mensagem enviada.” O teste não avalia entrega ao destinatário fora do app.

Na prévia local com dados fictícios, as larguras de 390 e 320 px não apresentaram rolagem horizontal; minimização e expansão moveram o conteúdo abaixo. Em viewport desktop de 806 px de altura, o compositor compacto deixou “Enviar mensagem” a 788 px, e a lista de mensagens passou a ter 199 px, com rolagem ao registro mais recente. Abrir as referências não alterou essas medidas. Essa conferência é local e não declara a nova versão publicada ou aceita clinicamente.

## Saídas reais dos comandos

Node 24.19.0. Todos os comandos abaixo encerraram com código 0. Os arquivos integrais são preservados localmente em `output/consultation-*-final.log`.

### npm test

Trecho final real; saída integral em `output/consultation-test-final.log`.

```
✔ variação é objetiva e não mistura cadastro com a série (0.165125ms)
ℹ tests 438
ℹ suites 0
ℹ pass 438
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5152.15975
```

### npm run lint

```
> @vivance/web@0.1.0 lint
> eslint .
```

### npm run typecheck

```
> @vivance/web@0.1.0 typecheck
> tsc --noEmit
```

### npm run build

```
> @vivance/web@0.1.0 build
> next build

▲ Next.js 16.3.4 (Turbopack)
✓ Running next.config.ts took 16ms

  Creating an optimized production build ...
✓ Compiled successfully in 3.3s
  Running TypeScript ...
  Finished TypeScript in 5.3s ...
  Collecting page data using 9 workers ...
  Generating static pages using 9 workers (0/9) ...
  Generating static pages using 9 workers (2/9)
  Generating static pages using 9 workers (4/9)
  Generating static pages using 9 workers (6/9)
✓ Generating static pages using 9 workers (9/9) in 107ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/patient-invitations
├ ƒ /api/patient-invitations/claim
├ ƒ /api/v1/clinics
├ ƒ /api/v1/clinics/[tenantId]/appointments
├ ƒ /api/v1/clinics/[tenantId]/appointments/[appointmentId]
├ ƒ /api/v1/clinics/[tenantId]/appointments/[appointmentId]/teleconsultation
├ ƒ /api/v1/clinics/[tenantId]/audit
├ ƒ /api/v1/clinics/[tenantId]/check-ins
├ ƒ /api/v1/clinics/[tenantId]/check-ins/[checkInId]/review
├ ƒ /api/v1/clinics/[tenantId]/check-ins/[checkInId]/submission
├ ƒ /api/v1/clinics/[tenantId]/daily-check-ins
├ ƒ /api/v1/clinics/[tenantId]/documents
├ ƒ /api/v1/clinics/[tenantId]/documents/[documentId]/complete
├ ƒ /api/v1/clinics/[tenantId]/documents/[documentId]/download
├ ƒ /api/v1/clinics/[tenantId]/documents/[documentId]/review
├ ƒ /api/v1/clinics/[tenantId]/encounters
├ ƒ /api/v1/clinics/[tenantId]/encounters/[encounterId]
├ ƒ /api/v1/clinics/[tenantId]/encounters/[encounterId]/addenda
├ ƒ /api/v1/clinics/[tenantId]/encounters/search
├ ƒ /api/v1/clinics/[tenantId]/intake
├ ƒ /api/v1/clinics/[tenantId]/meals
├ ƒ /api/v1/clinics/[tenantId]/measurements
├ ƒ /api/v1/clinics/[tenantId]/membership/accept
├ ƒ /api/v1/clinics/[tenantId]/messages
├ ƒ /api/v1/clinics/[tenantId]/messages/read
├ ƒ /api/v1/clinics/[tenantId]/notification-preferences
├ ƒ /api/v1/clinics/[tenantId]/notifications/[notificationId]/read
├ ƒ /api/v1/clinics/[tenantId]/onboarding
├ ƒ /api/v1/clinics/[tenantId]/onboarding/submit
├ ƒ /api/v1/clinics/[tenantId]/patient-invitations
├ ƒ /api/v1/clinics/[tenantId]/patient-invitations/[invitationId]
├ ƒ /api/v1/clinics/[tenantId]/patients
├ ƒ /api/v1/clinics/[tenantId]/patients/[patientId]/care-requests
├ ƒ /api/v1/clinics/[tenantId]/patients/[patientId]/check-in-settings
├ ƒ /api/v1/clinics/[tenantId]/patients/[patientId]/intake
├ ƒ /api/v1/clinics/[tenantId]/patients/[patientId]/onboarding
├ ƒ /api/v1/clinics/[tenantId]/plans
├ ƒ /api/v1/clinics/[tenantId]/plans/[planId]
├ ƒ /api/v1/clinics/[tenantId]/plans/[planId]/publication
├ ƒ /api/v1/clinics/[tenantId]/prescriptions
├ ƒ /api/v1/clinics/[tenantId]/published-plans
├ ƒ /api/v1/clinics/[tenantId]/published-plans/[publicationId]/receipt
├ ƒ /api/v1/clinics/[tenantId]/push-subscriptions
├ ƒ /api/v1/clinics/[tenantId]/received/read
├ ƒ /api/v1/clinics/[tenantId]/reminders
├ ƒ /api/v1/clinics/[tenantId]/report-publications/[publicationId]/pdf
├ ƒ /api/v1/clinics/[tenantId]/reports
├ ƒ /api/v1/clinics/[tenantId]/reports/[reportId]
├ ƒ /api/v1/clinics/[tenantId]/reports/[reportId]/approval
├ ƒ /api/v1/clinics/[tenantId]/reports/[reportId]/publication
├ ƒ /api/v1/clinics/[tenantId]/reports/[reportId]/revision
├ ƒ /api/v1/clinics/[tenantId]/return-preparations
├ ƒ /api/v1/clinics/[tenantId]/return-preparations/[requestId]/draft
├ ƒ /api/v1/clinics/[tenantId]/return-preparations/[requestId]/review
├ ƒ /api/v1/clinics/[tenantId]/return-preparations/[requestId]/submission
├ ƒ /api/v1/clinics/[tenantId]/return-preparations/required
├ ƒ /api/v1/clinics/[tenantId]/team
├ ƒ /api/v1/clinics/[tenantId]/team/invitations
├ ƒ /api/v1/clinics/[tenantId]/team/members/[memberId]
├ ƒ /api/v1/clinics/[tenantId]/team/relationships
├ ƒ /api/v1/clinics/[tenantId]/team/relationships/[relationshipId]
├ ƒ /api/v1/clinics/[tenantId]/teleconsultations
├ ƒ /api/v1/cron/reminders
├ ƒ /clinicas
├ ƒ /clinicas/[tenantId]
├ ƒ /clinicas/[tenantId]/[module]
├ ƒ /clinicas/[tenantId]/agenda
├ ƒ /clinicas/[tenantId]/atendimentos
├ ƒ /clinicas/[tenantId]/atendimentos/[encounterId]
├ ƒ /clinicas/[tenantId]/avisos
├ ƒ /clinicas/[tenantId]/equipe
├ ƒ /clinicas/[tenantId]/historico
├ ƒ /clinicas/[tenantId]/meu-cuidado/[section]
├ ƒ /clinicas/[tenantId]/meu-cuidado/envios/[kind]/[key]
├ ƒ /clinicas/[tenantId]/meu-cuidado/metas
├ ƒ /clinicas/[tenantId]/meu-perfil
├ ƒ /clinicas/[tenantId]/pacientes
├ ƒ /clinicas/[tenantId]/pacientes/[patientId]
├ ƒ /clinicas/[tenantId]/planos
├ ƒ /clinicas/[tenantId]/planos/[planId]
├ ƒ /clinicas/[tenantId]/planos/novo
├ ƒ /clinicas/[tenantId]/primeiros-passos
├ ƒ /clinicas/[tenantId]/processamentos
├ ƒ /clinicas/[tenantId]/relatorios/[reportId]
├ ƒ /clinicas/[tenantId]/revisar
├ ƒ /clinicas/[tenantId]/teleconsulta
├ ○ /convite
├ ○ /esqueci-minha-senha
├ ƒ /login
├ ○ /primeiro-acesso
└ ƒ /refinamentos-preview


ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### git diff --check

`git diff --check` e `git diff --check origin/main...HEAD`: sem saída, código 0.
`git diff origin/main -- apps/web/app/globals.css`: sem saída.

Contraste calculado (WCAG, luminância relativa): texto herdado `#5b6478`
sobre `#f2f6fb` = 5,47:1; rótulos `#4c5d78` = 6,15:1; links
`#124da0` = 7,46:1; texto do gráfico `#405675` sobre branco =
7,48:1; chips `#334e70` sobre `#f0f4fa` = 7,72:1; linha
`#286966` sobre branco = 6,36:1.
