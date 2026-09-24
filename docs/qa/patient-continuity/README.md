# Continuidade do paciente — evidência local, 24/09/2026

Branch: `codex/patient-continuity`, baseada em `origin/main` (`199e023`).
Os dois commits de `codex/patient-gaps` foram reaproveitados e revisados; a fila original não foi integrada sem correções.

## Entregas

1. Pedido de pré-consulta cria/reutiliza preparo da consulta elegível, com vínculo exato. Sem consulta elegível, retorna orientação para agendar. Pedidos antigos sem vínculo são preservados e podem ser reparados; nunca assumem o primeiro preparo de outra consulta. Metas têm rota própria, inicialização explícita para contas antigas e versionamento. Novos rascunhos após uma resposta concluída permanecem privados; a equipe consulta a última versão enviada até o novo envio. Home prioriza consulta em andamento, pré-consulta, outros pedidos, check-in diário e demais ações.
2. Pré-consulta salva a etapa ao avançar, voltar e escolher salvar e sair. Navegação por link ou Voltar abre escolha explícita quando há alterações. Falha mantém texto; fechamento/recarregamento usa aviso nativo. Fila distingue pendente, enviado e rejeitado; preserva chave de idempotência, conta e clínica. Armazenamento indisponível não confirma que guardou. Envios concorrentes não apagam itens novos nem ressuscitam itens descartados. Fotos não entram na promessa offline. Lembrete só confirma ativação após inscrição; horário salvo é um estado distinto.
3. Últimos envios abrem o registro identificado por URL: pré-consulta, check-in diário, atualização da equipe, refeição, medida, mensagem e documento. Documento da equipe é identificado como compartilhado. Conteúdo enviado não implica leitura médica. Diário lista check-ins diários. Evolução mostra sintomas mesmo sem medidas. Meu cuidado abre documentos e oferece a lista completa a partir de um documento.
4. Identidade visual e quatro abas preservadas. Modal Registrar tem ciclo de foco, Escape e retorno ao botão. Detalhes preservam quebras de linha e textos longos.

## Verificação realizada

- Node **24.21.0**: suíte completa, TypeScript, ESLint e build de produção com Webpack. **395 testes passaram, zero falhas; typecheck, lint e build passaram.**
- PostgreSQL isolado (PGlite), aplicando a sequência de migrations em memória: vínculo pedido/preparo, idempotência, consulta inelegível sem efeitos parciais, preservação de legados, resposta antiga coexistindo com nova pendência, metas versionadas, inicialização própria, isolamento e revogação.
- Navegador real em `localhost:4333`, login de demonstração do paciente pela interface: Home, Meu cuidado, Diário, Metas; detalhes originais de check-in, refeição e documento. Check-in continuou correto após recarregar.
- Larguras **320, 390 e 1440 px**: Home real, detalhe do check-in e Home com pré-consulta prioritária em fixture. Sem rolagem horizontal. Meu cuidado e início de Metas conferidos também em 320 px.
- Modal Registrar: Tab/Shift+Tab mantêm foco no modal; Escape devolve foco ao botão.
- Componentes reais com dados sintéticos e respostas locais de fetch: Home prioriza pré-consulta sem duplicá-la; Evolução mantém sintomas sem peso; pré-consulta salva ao avançar e voltar; erro ao salvar mantém texto e página; Voltar do navegador oferece salvar, continuar ou descartar.
- Testes da fila cobrem queda/timeout, armazenamento bloqueado/corrompido/cheio, rejeição, sessão expirada, idempotência, mudança de conta/clínica e concorrência. Testes de push cobrem sem suporte, permissão negada, falha e inscrição confirmada.

## Limites do aceite

**Não houve publicação nem aplicação de migration remota.** A migration `20260924174942_bind_care_requests_to_patient_responses.sql` é nova e foi validada apenas no PostgreSQL isolado. Contratos novos precisam dessa migration antes do aceite integrado no ambiente de destino.

A conta de demonstração não tinha consulta futura nem intake. Por isso, a continuidade completa médico → pedido → paciente → resposta → médico foi validada nos testes de banco, não por duas sessões autenticadas no ambiente remoto. A criação legada de metas foi conferida visualmente, mas seu RPC não foi executado contra o banco conectado. Envio real de push em aparelho e aceite clínico também permanecem fora desta evidência.

Não foram criadas respostas clínicas remotas durante esta rodada. Credenciais não fazem parte dos artefatos.

## Reproduzir a fixture visual

`page.tsx.example` e `fixture.tsx.example` são somente fontes de QA, fora das rotas compiladas. Para repetir em desenvolvimento, copie temporariamente para `apps/web/app/patient-fixture/` retirando `.example`, rode `next dev` e abra `/patient-fixture`. Ela usa componentes reais e dados sintéticos; substitui somente o fetch de pré-consulta por estado em memória. Remova a rota ao terminar. Não equivale a um teste de integração de backend.

## Comandos

```sh
npx --yes --package=node@24 --call 'npm --prefix apps/web test'
npx --yes --package=node@24 --call 'npm --prefix apps/web run typecheck && npm --prefix apps/web run lint'
npx --yes --package=node@24 --call 'node apps/web/node_modules/next/dist/bin/next build apps/web --webpack'
```
