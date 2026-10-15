# IA2 — exames com origem verificável

**Contrato técnico vigente, reconciliado em 14/10/2026.** Extração, cota,
conferência e resumo factual estão integrados/publicados para testes sintéticos.
Qualidade clínica e curadoria não foram aceitas por consequência do deploy.
[Estado atual](STATUS_ATUAL.md) · [contrato funcional completo](FLUXO_EXAMES_E_ANALISE_LONGITUDINAL.md).

## Pipeline e dados

Original privado/hash → elegibilidade/cota/deduplicação → fila → texto por
página → extração factual por lotes → fundamentação literal → conferência
médica/documental → histórico comparável → resumo sob solicitação →
verificação → aprovação → publicação explícita apropriada ao paciente.

- Cron/Edge operam sem aba aberta no dev sintético autorizado. Abrir a ficha
  não chama IA nem habilita automaticamente um documento.
- Recebimento é diferente de elegibilidade para processamento; zero resultados
  não prova falha do extractor. Mostrar bloqueio, pendência e erro separadamente.
- Cota de 15 por paciente/clínica/ciclo, concessão médica e deduplicação por
  conteúdo estão no contrato completo. Fotos de perfil/refeição têm seus fluxos
  próprios; não devem ser contabilizadas como exames por semelhança de upload.
- Texto integral fica por página, sem substituir o original por resumo.
  Identidade de clínica/paciente/documento/run, hashes e método acompanham a origem.
- Medição laboratorial e laudo narrativo não são o mesmo tipo de dado.
  Resultado pode ser textual; unidade, referência, método/material ou data ausentes
  permanecem ausentes. Referência condicional não vira intervalo universal.
- Cada fato é ligado a trecho literal/página/offset. Não associar valores,
  referências ou lados anatômicos diferentes para preencher lacunas.

## Checkpoints, retomada e custo

- PDF com texto embutido usa leitura determinística; transcrição visual é
  seletiva quando necessária. Não gastar uma chamada anterior só para resumir/classificar.
- `claude-extraction.ts` define `claude-haiku-5-5` primário e
  `claude-sonnet-5-5` para recuperação seletiva. São IDs configurados no código,
  não recomendação de preço ou garantia atual de disponibilidade do fornecedor.
- Lotes/auditorias concluídos têm checkpoint imutável por entrada/hash/modelo/
  prompt/finalidade. Retry reaproveita texto e checkpoints compatíveis do mesmo job.
- Lease/token, margem de runtime e continuação preservam progresso durável.
  Sem progresso, a tentativa é limitada; não fazer loop infinito ou reprocessar
  todo o documento para contornar falha determinística.
- Médico responsável retoma documento elegível via
  `/extraction/resume`, com sessão/vínculo/autoria, sem apagar run/histórico.
  Job em fila ou lease ativa não recebe retomada concorrente.
- Resposta paga seguida de queda antes do checkpoint ainda pode gerar custo
  sem resultado persistido. Não prometer exactly-once financeiro ou completude.
- Não colocar preço mutável no contrato corrente. Valores consultados em 10/10,
  adapters antigos e contagens do piloto ficam no [histórico](historico/EVOLUCAO_ATE_2026-10-14.md).
  Mudança de modelo/prompt exige avaliação e versionamento, não troca silenciosa.

## Revisão e referência do laudo

Revisão guarda snapshot acumulado: campo omitido preserva; `null` limpa o
campo opcional. Versão esperada evita sobrescrita; replay idêntico é idempotente.
Confirmar após corrigir conserva correções; rejeitar exclui o fato utilizável
sem apagar extração/fonte.

Comparação automática só para número inequívoco, faixa numérica fechada e
unidade explicitamente idêntica. Sem conversão tácita, meta individual ou faixa
por população. “Dentro/fora/sem comparação” tem texto/ícone além da cor e não
classifica saúde ou urgência.

A conferência documental registra identidade, cobertura, notas/páginas incertas
e exclusões justificadas. Revisar itens, concluir conferência, aprovar resumo e
publicar são operações diferentes. Paciente não lê extração/rascunho internos.

## Resumo longitudinal e biblioteca

Usar fatos efetivos conferidos de documentos elegíveis, com origem e manifesto.
Comparação longitudinal respeita data de coleta, unidade, método e contexto;
incompatibilidade bloqueia comparação. Uma geração por snapshot/versão/modelo,
cache e lease evitam repetição por navegação. Correção/novo fato sinaliza versão
desatualizada, preservando o histórico.

Biblioteca exige aprovação médica por versão/vigência/aplicabilidade. O cadastro
técnico não aprova fonte; possibilidades sem suporte não aparecem.
Resumo factual aprovado e publicado foi exercitado no QA, não clinicamente
homologado. Síntese de onboarding + check-ins + todas as fontes não é equivalente
a este resumo de exames.

## Onde manter

| Parte | Código |
| --- | --- |
| Extração e orçamento | `supabase/functions/exam-text-worker/` |
| Resumo em fila | `supabase/functions/exam-summary-worker/` |
| Resultados, revisão e conferência | `apps/web/modules/exams/` |
| Resumo e publicação | `apps/web/modules/exam-summary/` |
| Recebimento, arquivos e cota | `apps/web/modules/documents/` e migrations `exam_upload_cycles` |
| Interface | `exam-results-panel.tsx`, `exam-overview-panel.tsx`, `exam-longitudinal-summary.tsx` |
| Corpus fictício versionado | `apps/web/tests/fixtures/exams/coverage-corpus.json` |

## Evidência e próximos gates

[Release dos exames 11/10](historico/entregas/EXAMES_2026-10-11.md): quatro
originais/117 itens/28 páginas; conferência e publicação QA com leitura paciente.
[Recuperação anterior](historico/EVOLUCAO_ATE_2026-10-14.md): mesmo job/run de
25 páginas, checkpoints preservados e65 itens, sem provar ausência de omissões.

Próximo trabalho: gabarito médico, precisão/omissões/estabilidade, corpus por tipo,
curadoria e aceites do [plano clínico](PLANO_IA_CLINICA.md). Não reconstruir a
aprovação/publicação já implementada. [Gate P](GATE_P.md) antes de dados reais.
