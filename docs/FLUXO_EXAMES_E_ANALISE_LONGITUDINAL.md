# Exames: recebimento controlado e análise longitudinal para o médico

**Plano aprovado para execução em 11/10/2026 (São Paulo); implementação e QA em andamento.**
Pedido: validar todos os exames recebidos, limitar a 15 uploads diferentes com
desbloqueio médico, tornar resultados/referências intuitivos e preparar um resumo
de passado e presente com possibilidades para avaliação médica, economizando IA.
Após o planejamento, o usuário autorizou implementação completa, testes e
publicação com execução GPT-6.1 e revisão Astra. Confirmou que as contas e
documentos envolvidos são de teste e pediu reaproveitar os PDFs existentes.
Evidências e limites da entrega estão no [registro da fase](ENTREGA_EXAMES_2026-10-11.md).

## 1. Decisão solicitada e premissas propostas

O limite de **15 arquivos distintos**, o desbloqueio exclusivo pelo médico, a
conferência dos exames e a análise para o médico são requisitos do usuário.
Os detalhes abaixo foram adotados na execução autorizada de “seguir o próprio
plano”; ajustes futuros continuam versionados e registrados:

| Questão | Proposta operacional |
| --- | --- |
| Unidade da cota | Por paciente + clínica + ciclo de recebimento; 15 arquivos, não 15 resultados, páginas ou chamadas de IA. Não é limite vitalício. |
| Primeiro ciclo | Disponibilizar 15 vagas quando o paciente estiver habilitado para o fluxo de exames da clínica. Não exigir uma ação extra por arquivo. Elegibilidade clínica e política de dados são pré-requisitos separados. |
| Ao atingir 15 | Bloquear novos arquivos distintos; mostrar **Solicitar mais envios**. Médico responsável libera **mais 15 arquivos**, em novo ciclo auditado, sem renovação automática por calendário. |
| Pendências anteriores | Mostrar pendências ao médico antes de liberar outro ciclo. Recomenda-se resolvê-las; se houver necessidade de receber novos exames antes disso, exigir justificativa registrada, sem fingir revisão concluída. |
| Página do paciente | A análise fica na **ficha do paciente acessada pelo médico**. No portal do paciente: envio, acompanhamento e somente conteúdo aprovado e publicado separadamente. Hipóteses internas não são publicadas. |
| Momento da análise | Primeiro organizar e revisar fatos; depois **Gerar resumo**. Novos fatos tornam o resumo desatualizado, mas não disparam novas chamadas por abertura de tela. |

O usuário confirmou as contas e arquivos como testes e autorizou processar os
quatro PDFs existentes da sua conta. A habilitação ocorre por sessão médica,
com declaração sintética e auditoria; originais permanecem preservados.
[Gate P](GATE_P.md) e [IA1–IA6](PLANO_IA_CLINICA.md) seguem aplicáveis antes de dados reais.

## 2. Diagnóstico e reaproveitamento

Base de código consultada: árvore de aplicação do worktree de release em
`6440b28`, equivalente à `main` observada `2f93b70` (#133). O checkout canônico
está em `26ae59f`, anterior a essa integração; este plano é preparado nele sem
trocar branch ou sobrescrever alterações de outras entregas.

Na investigação imediatamente anterior, quatro PDFs estavam recebidos/disponíveis,
mas sem jobs, runs ou resultados. Não estavam elegíveis no piloto sintético;
o gatilho de recebimento estava ativo. Portanto, naquele caso **não houve falha
de uma extração iniciada**: a elegibilidade impediu o enfileiramento. A mensagem
genérica de zero resultados não explicou o bloqueio. Nenhum dado foi modificado.

| Já existe | Lacuna que este plano resolve |
| --- | --- |
| Upload privado em reserva → envio → conclusão; PDF/JPEG/PNG até 5 MB, validação binária e vínculo | Cota transacional de 15; hoje há limite de 50 no contrato/interface de onboarding, não a nova cota de servidor |
| Fila autônoma Cron/Edge, leases, retomada, checkpoints e idempotência por documento | Autorizações médicas auditáveis e estado explícito quando não há elegibilidade |
| Texto por página, extração em lotes e recuperação seletiva de leitura | Cobertura e pendências visíveis para todas as páginas, sem confundir `completed` com qualidade aprovada |
| Hash, documento original, página/trecho/offset e revisões imutáveis por item | Deduplicação entre uploads de conteúdo idêntico; a retomada atual reaproveita o mesmo documento/job |
| Comparação com intervalo do laudo e briefing com até três fatos revisados | Linha do tempo factual completa e rascunho longitudinal com evidências |
| Relatórios com versões, aprovação e publicação distintas | Manifesto de fontes da geração, verificação por afirmação e biblioteca clínica aprovada |

Referências de implementação: `apps/web/lib/document-upload.ts`,
`apps/web/modules/documents/{validation,batch,service}.ts`,
`apps/web/modules/exams/{service,results-service}.ts`,
`apps/web/components/exam-results-panel.tsx`,
`supabase/functions/exam-text-worker/`, migrations `20261010210749`,
`20261010234104` e `20261011002635`. Contrato histórico: [IA2](IA2_EXAMES.md).

## 3. Fluxo e significado de “validado”

```text
Elegibilidade + até 15 vagas
  → recebimento e validação técnica → identidade de conteúdo / duplicata
  → fila → leitura por página → extração → verificação contra o original
  → conferência médica dos itens e pendências
  → comparação longitudinal determinística
  → rascunho IA sob solicitação → verificação → revisão/aprovação médica
  → publicação explícita de conteúdo apropriado, se desejada
```

Três validações independentes:

1. **Arquivo aceito:** bytes/tipo/tamanho/integridade, segurança, identidade do
   paciente e vínculo conferíveis. Divergência de identidade bloqueia o uso
   clínico e pede conferência; não se troca o paciente automaticamente.
2. **Extração conferível:** cada item possui valor literal, unidade, referência,
   data e fonte, ou ausência explícita. Cobertura de páginas, ilegibilidade,
   omissões suspeitas e duplicatas ficam registradas. JSON válido não prova fidelidade.
3. **Revisão médica concluída:** todos os itens têm revisão vigente
   `confirmed`, `corrected` ou `rejected`; páginas/notas de qualidade receberam
   resolução ou exclusão justificada. Item rejeitado não vira fato clínico.

“Todos validados” significa que **todo arquivo recebido tem um desfecho rastreável**,
não que a IA consegue extrair qualquer documento nem que rejeição vira aprovação.
Arquivo ilegível, incompleto ou que não contém exame permanece identificado;
o médico pode pedir substituição, transcrever com fonte ou excluí-lo da análise
com motivo. Revisão documental, revisão dos itens e aprovação do resumo não se substituem.

## 4. Cota de 15 e liberação médica

- Aplicar a mesma regra no onboarding, portal, ficha médica, seleção múltipla e
  API. Mudar a categoria ou enviar pela equipe não pode contornar a cota de exames.
- Reservar capacidade no servidor antes da URL assinada. Conferir hash SHA-256
  dos bytes no servidor ao concluir e reconciliar reserva/contagem atomicamente.
  O hash fornecido pelo cliente é apenas uma pista, nunca prova.
- Identidade exata limitada a **clínica + paciente + conteúdo**. Mesmo arquivo
  com nome diferente retorna **Já recebido**, sem nova vaga ou chamada de IA.
  Arquivo com mesmo nome e bytes diferentes é novo. Sem deduplicação global que
  revele existência de documentos de outros pacientes/clínicas.
- Versões escaneadas ou exportadas novamente podem ter hashes diferentes:
  sinalizar possível duplicata, sem descartar ou mesclar automaticamente.
- Reserva abandonada expira; rejeição técnica anterior à aceitação devolve vaga.
  Falha do provedor após aceitação não consome outra vaga no retry. Excluir da
  interface não devolve crédito automaticamente. Ajuste excepcional de contagem
  exige motivo/auditoria, sem apagar originais ou evidências.
- A conferência de duplicata deve funcionar também com cota cheia: permitir
  verificação isolada de conteúdo, com limite temporário de bytes/tempo e sem
  job de IA. Hash novo resulta em recusa sem aceitação definitiva; hash já
  conhecido retorna o registro existente. Não confiar só no hash do cliente.
- Mostrar **12 de 15 recebidos**, vagas disponíveis e envios em andamento
  separadamente. Selecionar mais que o saldo informa quais podem entrar, conserva
  sucessos anteriores e permite retry individual; nada desaparece silenciosamente.
- **Solicitar mais envios** cria uma única pendência interna aberta por paciente;
  não envia e-mail/WhatsApp automaticamente. A ação do médico fica junto ao contador
  e às pendências, com quantidade anterior/nova e confirmação explícita.
- Só médico responsável com sessão, vínculo e participação na clínica ativos
  libera outro ciclo. Paciente, equipe não médica e médico sem vínculo não podem;
  administrador técnico não recebe autorização clínica implícita.
- Liberação registra ator, momento, motivo, ciclo, versão esperada e idempotência.
  Dois cliques não concedem 30 vagas. Proposta: não acumular ciclos de 15 ainda
  abertos; liberar o próximo após esgotamento ou fechamento explícito do anterior.
- Revogação impede novas reservas e novos trabalhos autorizados; revalidar vínculo
  antes de chamar o provedor e antes de persistir resultados utilizáveis. Resposta
  de chamada já em andamento não se torna visível/publicada após revogação.
- Documentos anteriores: inventário e contagem sem apagar registros. Médico
  seleciona um lote elegível de até 15, com snapshot de IDs/hashes; excedentes
  continuam guardados e pendentes de outro ciclo. Não reprocessar automaticamente.

A liberação médica não substitui a habilitação de ambiente/fornecedor nem abre
o Gate P. O piloto sintético permanece isolado até o novo contrato ser validado.

## 5. Experiência: resultado, referência e ação juntos

Preservar navegação da ficha e identidade do paciente. No resumo da ficha,
mostrar **Resumo para revisão médica**, sua data/cobertura e botão local
**Gerar resumo** ou **Atualizar resumo**. Na área existente de exames, leitura
progressiva de resultados e arquivos, sem criar várias camadas de abas.

**Linha de resultado:** nome → valor e unidade → referência do próprio laudo →
data de coleta → resultado anterior comparável. Junto dela: **Conferir fonte**
e **Revisar**. Abrir fonte na página correta, com trecho e formulário próximos,
mantendo posição, filtro, rascunho e retorno à linha de origem.

- Usar “Acima/abaixo/dentro da referência do laboratório” e “Sem comparação”.
  Cor é auxiliar, nunca o único sinal; “dentro” não significa paciente saudável.
- Separar referência do laboratório, critério de diretriz e meta individual.
  Referência não informada permanece ausente; não completar com palpite do modelo.
- Datas de coleta/observação ordenam o histórico; data de envio é exibida à parte.
  Sem data confiável: **Data não identificada**, sem posicionamento inventado.
- Comparar somente analito, unidade, método e contexto compatíveis. Conversão de
  unidade só por regra validada, mantendo literal e fórmula. Não unir exames
  diferentes por semelhança de nome. Menos de dois pontos: **Sem histórico comparável**.
- Pendência de revisão é estado diferente de posição na referência. Resultado
  extraído aparece para conferir; só versões confirmadas/corrigidas entram como
  fatos na análise longitudinal. Pendências aparecem como lacunas de cobertura.
- Estados explícitos: aguardando liberação, validando arquivo, já recebido,
  aguardando processamento, lendo páginas X/Y, organizando, pronto para conferir,
  parcialmente organizado, falha com retomada, revisado ou excluído com motivo.
  Nunca usar apenas “0 resultados” para autorização ausente ou processamento pendente.
- Não inventar percentual global de progresso ou prazo. Atualização de estado
  reserva espaço, mantém rolagem/foco e não abre/fecha cartões automaticamente.
  Conferir teclado, leitor de tela, movimento reduzido e largura de 320 px.

## 6. Resumo longitudinal e possibilidades para avaliação

Entrada: fatos revisados, datas, contexto autorizado disponível e fontes clínicas
vigentes. Relatos do paciente, extrações, cálculos e observações médicas mantêm
rótulos de origem. A ausência de dado não é uma resposta negativa.

Saída proposta, curta e expansível:

1. **O que mudou:** mudanças objetivas desde o período anterior, com datas e fontes.
2. **Passado e atual:** comparações compatíveis, persistência/variação observada,
   sem inferir causalidade, adesão ou evolução clínica só por números.
3. **Possibilidades para avaliação médica:** até três pontos priorizados por
   pertinência, não por alarmismo; separar hipótese de fato, mostrar evidência
   favorável, incompatibilidades, informação faltante e referência clínica aplicável.
4. **O que falta conferir:** arquivos/páginas pendentes, conflitos e limites do período.

Cada afirmação factual tem proveniência adequada ao tipo: exame aponta para
item/revisão, documento, página/trecho e data; check-in, medida, relato ou
observação aponta para registro, versão, autoria/origem e data. Não inventar
página para fontes sem documento. Cada possibilidade exige também fonte clínica
autorizada e contexto aplicável.
Sem sustentação: abster-se, não preencher o bloco com generalidades. Não gerar
diagnóstico definitivo, prescrição, conduta automática, decisão de urgência ou
probabilidades numéricas sem método validado. Nenhuma hipótese é enviada ao paciente.

O médico pode aceitar, corrigir ou rejeitar o rascunho. **Aprovar** não é
**Publicar**. Conteúdo destinado ao paciente exige versão apropriada e revisão
própria; não basta publicar o rascunho interno com uma etiqueta de aprovação.
Guardar versão aprovada, autoria e origem IA. Nova revisão/fonte/contexto marca
o rascunho como **Desatualizado**; nova geração cria outra versão, não sobrescreve
histórico. Alteração durante geração impede apresentar a resposta como atual.

## 7. Qualidade e economia de chamadas

**Reutilizar a infraestrutura atual, sem outra pipeline paralela de IA.**

- Validação, hash, datas, comparação, cálculos e seleção de fontes por regras
  não precisam de LLM. Ler texto embutido primeiro; usar OCR/visão apenas em
  páginas ilegíveis ou cuja estrutura exige verificação. Texto abundante não
  garante tabela corretamente lida. Preservar original e texto por página.
- Manter lotes/checkpoints existentes; reprocessar somente parte inválida ou
  alterada. Checkpoint de resposta completa sem resultados também é reutilizável;
  erro/timeout não deve ser registrado como resultado vazio bem-sucedido.
- Deduplicar antes do enfileiramento: um documento canônico por conteúdo no
  paciente/clínica e uma execução lógica por versão de extração. Todos os envios
  associados mantêm histórico próprio, sem copiar uma origem pertencente a outro
  paciente. Um reenvio duplicado registra evento de recebimento/alias vinculado
  ao canônico, não outro documento processável nem outra vaga consumida.
- Modelo econômico para extração factual, modelo mais capaz apenas quando os
  critérios de qualidade justificarem fallback. Haiku/Sonnet são a base do código
  consultado, não garantia de disponibilidade/preço futuro: validar IDs, custos e
  desempenho na implementação. Não escolher modelo só por ser o mais recente.
- Schema estrito ajuda a forma; validadores independentes conferem valor, unidade,
  data, referência, trechos e identidade. Priorizar métricas de omissão e fidelidade,
  não quantidade de itens ou sucesso HTTP. Não cortar páginas silenciosamente.
- Uma **geração lógica de resumo por snapshot revisado**, solicitada pelo médico.
  Seleção múltipla agrega arquivos antes de oferecer a geração; abrir ficha, filtrar
  ou alternar abas não chama IA. Resumo parcial só com cobertura explícita.
- Cache de resultado inclui clínica/paciente, fontes e versões de revisão,
  contexto, modelo, prompt, schema, regras e biblioteca. Manifesto idêntico retorna
  rascunho persistido. Incluir só dados relevantes na entrada; resumo anterior
  nunca é a única fonte de memória nem substitui fatos históricos.
- Cache de prefixo do provedor é otimização adicional para instruções/biblioteca
  estáveis, não substitui cache de resultado. Medir taxa de acerto e condições do
  provedor antes de ativar; não prometer economia percentual antecipada.
- Verificação de afirmações começa por regras, fontes e contratos; a verificação
  independente clínica exigida pelo plano continua obrigatória. Se houver segundo
  modelo verificador, não aceitar autoavaliação do gerador como prova de qualidade.
- Limitar páginas, tokens, tentativas, duração e gasto por arquivo/ciclo/clínica.
  Os limites atuais de 5 MB e leitura de até 50 páginas são base técnica, não
  promessa de suporte clínico completo. Valores de orçamento monetário dependem
  de benchmark e aprovação operacional. 15 arquivos não equivalem a 15 chamadas.
- Erros transitórios: retry limitado com espera progressiva e checkpoints;
  orçamento esgotado: pausar e informar, nunca fazer fallback/retry ilimitado.
  Custo desconhecido fica desconhecido, não zero. Biblioteca indisponível bloqueia
  possibilidades, mas não esconde fatos revisados e originais.

Medir por documento/paciente: tokens de entrada/saída/cache, custo de OCR e
fallback/retries, tempo em fila/processamento, páginas cobertas, itens corretos,
omissões, taxa de correção médica e custo por resumo aproveitável. Comparar com
baseline no mesmo corpus. Fórmula de custo considera entrada não cacheada,
escrita/leitura de cache, saída, OCR, tentativas e armazenamento; não inventar preço.

## 8. Contratos técnicos do fluxo

| Contrato | Direção |
| --- | --- |
| Ciclo/cota e reservas | Contagem transacional, expiração, concessão/revogação, versão e auditoria; aplicar antes de autorizar upload e novamente ao concluir |
| Identidade do conteúdo | SHA verificado e vínculo canônico/duplicata por paciente/clínica; índice único e enqueue idempotente; conservar registros de recebimento |
| Elegibilidade | Separar modo sintético/política de dados, autorização clínica e capacidade disponível; não reaproveitar cadastro QA como permissão clínica |
| Jobs/runs de extração | Reutilizar `processing_jobs`, leases, fences e checkpoints; acrescentar relação com autorização e estado de cobertura quando necessário |
| Rascunho longitudinal | Job próprio ou tipo explicitamente suportado, snapshot imutável, manifesto/hash, afirmações/fontes, validações, uso/custo e estado stale |
| Revisão/publicação | Reaproveitar padrões de `care_reports`/versões/fontes; o contrato atual de fontes não cobre toda a IA, portanto ampliar explicitamente ou usar entidade de rascunho própria, sem adaptar por coerção |
| Biblioteca | Fontes aprovadas/versionadas, população, vigência, trechos e retirada; sem busca clínica livre na web durante geração |

Leituras/escritas expostas ao usuário usam RLS e autorização no servidor.
Operações privilegiadas de Edge/RPC não dependem de RLS como proteção suficiente:
`service_role` pode ignorá-la, e funções `SECURITY DEFINER` exigem conferência
explícita de autorização/escopo, permissões mínimas e auditoria. Testar os dois
caminhos, preservando sessão/vínculo vivos quando exigidos, isolamento por
clínica/paciente e proteção same-origin quando aplicável. Erros
tipados de cota, permissão e duplicata orientam a interface sem expor outro paciente.
Texto de laudo é dado não confiável: instruções embutidas não podem trocar
prompts, acionar ferramentas, liberar quota ou vazar informações. Logs operacionais
usam IDs/métricas, sem laudos completos ou dados sensíveis em mensagens de erro.

Não adicionar RAG/MCP genérico para resolver upload/extração. Busca clínica
versionada só entra no slice da biblioteca e deve provar ganho sobre busca
simples de fontes curadas. Política de fornecedor/retenção segue IA1 e Gate P.

## 9. Slices de entrega e aceites

| Slice | Valor ponta a ponta e aceite | Dependências/limites |
| --- | --- | --- |
| **IA2.a — recebimento e controle** | Paciente envia até 15 distintos, vê motivo de bloqueio, solicita capacidade; médico vê pendência e libera novo ciclo; fila recebe somente elegíveis, duplicata não gera outra extração | Primeiro recomendado. Contrato de cota/permissão e dados sintéticos; sem interpretação clínica |
| **IA2.b — conferência completa e histórico factual** | Todos os arquivos têm desfecho, cobertura/páginas e revisão; resultado/referência/fonte juntos, histórico determinístico respeita compatibilidade | Reusar IA2 e revisão por item; ampliar corpus e resolver possíveis omissões; sem hipóteses |
| **IA3 + IA4 — rascunho longitudinal** | Biblioteca pequena aprovada; uma geração por snapshot revisado; fatos, comparações e possibilidades sustentadas separados; ausência de evidência gera abstenção | IA1, qualidade IA2 e curadoria aprovadas; médico apenas; não liberar possibilidades antes desses gates |
| **IA5 — verificar, revisar e publicar** | Verificação independente por afirmação, correção versionada e aprovação; publicação explícita de versão apropriada ao paciente | Contrato de relatórios/fontes e testes negativos; nenhuma hipótese interna publicada |
| **IA6 — avaliação e operação** | Gabarito médico, métricas e limites de qualidade/custo definidos antes da avaliação; monitoramento e incidentes | Primeiro corpus sintético; dados clínicos somente após Gate P e política específica. Não equivale a aceite só por deploy |

Casos obrigatórios antes de marcar cada slice:

- Com 14 arquivos, duas conclusões concorrentes de conteúdo novo deixam exatamente
  15; 16º recebe erro de cota. Pedido repetido e dois cliques em liberação não duplicam vagas.
- Mesmo conteúdo/nome diferente não conta nem chama IA novamente, inclusive na
  cota cheia; mesmo nome/conteúdo diferente conta. Reservas expiradas não bloqueiam
  permanentemente; falha parcial conserva sucessos; tentativa de trocar categoria não burla limite.
- Paciente, equipe não médica, médico sem vínculo e outra clínica não liberam nem
  leem rascunhos. Revogação durante job e alteração de fonte durante geração têm
  desfecho seguro. Troca de médico não transfere autoria de revisão silenciosamente.
- Retry/cron simultâneo gera só um job canônico. Queda após checkpoint não repete
  lote persistido; registrar risco residual de chamada paga sem checkpoint por
  queda entre resposta do provedor e gravação, sem prometer exactly-once financeiro.
- PDFs com tabelas, scans, páginas ilegíveis, laudos sem resultados, valores
  decimais/vírgula, unidades e referências diversas, identidade conflitante,
  duplicatas e muitos arquivos respeitam limites e nunca ocultam páginas excluídas.
- Data de coleta anterior com envio recente mantém cronologia; unidade/método
  incompatível não gera tendência; resultado rejeitado sai do resumo; correção
  médica invalida snapshot sem apagar versão aprovada anterior.
- Abrir/reabrir ficha e filtros gera zero chamadas. Mesmo manifesto reaproveita
  resumo. Novo conjunto revisado gera outra versão; orçamento/falha/refusal têm
  mensagem explícita, manual disponível e nenhum texto falso de sucesso.
- Afirmação sem fonte/aplicabilidade é bloqueada. Instrução maliciosa no PDF não
  altera pipeline. Aprovar não publica; nenhuma rota paciente lê hipóteses internas.

Avaliação de qualidade: precisão/recall por exame e página, exatidão de
valor/unidade/referência/data, suporte de citações, omissões e taxa de correção.
Direção médica define limiares por tipo antes de habilitar análise. No conjunto
de liberação, nenhum item inventado ou hipótese sem suporte pode ser aceito;
isso é critério de teste, não promessa de ausência universal de erro.

Reversão: desabilitar novas concessões/gerações por feature flag, preservar
originais, revisões e versões, manter leitura/manual disponíveis; não desfazer
histórico nem retirar proteção de acesso para recuperar serviço.

## 10. Preparação para Git e execução

Este documento é a fonte única do novo fluxo; direção/status/IA2/plano clínico e
checkpoints contêm somente links e decisões resumidas. O primeiro trabalho após
aprovar as premissas é **IA2.a**, não o gerador de hipóteses.

Pacote local: este plano, `DIRECAO_E_SLICES.md`, `STATUS_ATUAL.md`,
`CHECKPOINTS_ENTREGAS.md`, `IA2_EXAMES.md`, `PLANO_IA_CLINICA.md` e `README.md`
do diretório `docs/`. Na fase de implementação, acrescentar código, migrations,
testes e registro específico da entrega. Preparar revisão por caminhos explícitos;
não incluir arquivos ` 2`, credenciais, outputs ou mudanças de outras entregas.
Ao integrar, reaplicar este patch sobre a main atualizada e reconciliar os
registros recentes de publicação, sem substituí-los pelo histórico mais antigo
da branch local. O pedido posterior autoriza commit, integração e publicação
após revisão e verificação; consultar o registro da fase antes de operar.

Handoff para o quadro de execução, quando autorizado a sincronizar: **IA2.a —
cota de 15 exames distintos, liberação médica auditada e estados de recebimento**;
subtarefas de contrato/RLS e concorrência, deduplicação/reserva, jornada
paciente/médico e QA sintético. Vincular a este plano e manter aceite clínico
separado. O registro da fase distingue a atualização do Asana do planejamento local anterior.

## 11. Fontes técnicas consultadas

Consulta em 11/10/2026; referências de capacidade, não homologação clínica:

- [Structured outputs — Anthropic](https://platform.claude.com/docs/en/build-with-claude/structured-outputs): schema/validação de formato; ainda exigir validação semântica e da fonte no Vivance.
- [Prompt caching — Anthropic](https://platform.claude.com/docs/en/build-with-claude/prompt-caching): reutilização de prefixo idêntico, com condições de TTL e tamanho; não é cache do resultado final.
- [PDF support — Anthropic](https://platform.claude.com/docs/en/build-with-claude/pdf-support): envio direto considera texto e imagens das páginas. Recomendação deste plano: preservar leitura local e escalar visual seletivamente, medindo qualidade/custo.
- [Batch processing — Anthropic](https://platform.claude.com/docs/en/build-with-claude/batch-processing): processamento pode levar até 24 horas e expirar. Recomendação: considerar em avaliações offline, não como dependência da jornada interativa.

Contratos locais: [IA2](IA2_EXAMES.md), [IA clínica](PLANO_IA_CLINICA.md),
[Gate P](GATE_P.md) e [método por slices](RETOMADA_DESENVOLVIMENTO.md).
