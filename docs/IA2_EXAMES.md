# IA2 — exames sintéticos com origem verificável

**Estado em 10/10/2026:** [PRs #114](https://github.com/vitormilanez/instituto-vivance/pull/114) e [#115](https://github.com/vitormilanez/instituto-vivance/pull/115) integrados e publicados tecnicamente no dev sintético; adapter `1.8.1+vivance-claude.6`, prompt `vivance-exams-20261010.4`. Texto por página, checkpoints e referência/unidade/data conferidos em fixtures e sessão médica autenticada. Retomada operacional é o próximo slice. Não houve aceite clínico. [Status](STATUS_ATUAL.md) registra SHA, CI, Edge e deployment.

## Robustez de PDFs longos — #114/#115 publicados em 10/10

[PR #114](https://github.com/vitormilanez/instituto-vivance/pull/114) integrado e publicado tecnicamente. A falha observada em um PDF de
25 páginas ocorreu após o texto ser salvo: um nome literal com controle de
formatação violou o CHECK de `exam_result_items`. As três tentativas repetiram
Claude e a RPC final reverteu os resultados. Leitura de texto, organização e
revisão devem ter estados e evidências separados.

Pipeline: **original privado + hash → texto integral por página + metadados de
origem → lotes Claude → fundamentação/validação → resultados para conferência**.
Metadados de origem incluem run/documento/paciente/clínica, número de páginas,
contagens de leitura, método, hashes e estado. O texto completo permanece nas
páginas, não em um resumo que possa perder resultados. Não acrescentar uma chamada
de IA só para resumir/classificar o arquivo antes da extração. Metadados semânticos
(título, laboratório, data, trechos da conclusão) são fundamentados e salvos na
finalização; sua presença continua sendo marcador de conclusão, nunca de leitura
preliminar.

- Adapter `.6`/prompt `vivance-exams-20261010.4`: reutiliza texto salvo do mesmo
  arquivo/hash **e mesmo job**, inclusive de adapter anterior. Lotes têm até cinco
  páginas/30 mil caracteres e três chamadas paralelas. Cada resposta completa,
  inclusive sem resultados, ganha checkpoint imutável antes da próxima onda.
  Auditorias bem-sucedidas também ficam em cache. Retry reaproveita lotes concluídos
  sem chamar Claude novamente; falhas de irmãos não impedem gravar seus sucessos.
- `exam_extraction_batch_checkpoints` é interna, com RLS, sem acesso de paciente
  ou equipe; escrita somente por RPC de serviço com documento elegível, run,
  páginas e lease/token ativos. Chave contém hash da entrada, finalidade,
  modelos e versão do prompt. Resposta diferente na mesma identidade é conflito.
  Isso não altera aprovação, revisão ou publicação ao paciente.
- Nome/valor mantêm TAB/LF/CR literais do PDF. Outros controles continuam proibidos.
  Validação pós-grounding respeita limites SQL em caracteres Unicode, incluindo
  campos opcionais e limite de bytes das notas. Não cortar nem normalizar um valor
  clínico para caber no banco; item ilegível/inválido deixa nota para conferência
  e aciona auditoria limitada. Erro determinístico de validação para a repetição
  automática e preserva os checkpoints.
- A tela mostra **Organização não concluída**. Quando as contagens confirmam texto
  em todas as páginas, informa que o texto está disponível e que a organização
  não terminou, mantendo o acesso ao original.

### Modelos e controle de custo

Inventário real da API em 10/10 confirmou os dois IDs. Política escolhida:

| Etapa | Modelo/execução | Motivo |
| --- | --- | --- |
| PDF com texto embutido, hashes, paginação e validação | Determinística (`unpdf` + código) | Preservar texto completo sem custo de IA. |
| Extração factual inicial e transcrição visual quando necessária | `claude-haiku-5-5` | Custo e latência baixos, com fonte literal exigida. |
| Resposta truncada/incompleta, página com lacuna ou proposta rejeitada | `claude-sonnet-5-5` | Segunda leitura seletiva; não enviar o documento inteiro novamente. |
| Conferência e decisão clínica | Médico | A extração não diagnostica nem publica conclusões. |

Preços oficiais consultados em 10/10: Haiku 5.5 US$0,10/US$0,50 por milhão de
tokens de entrada/saída em prompts até 100 mil tokens; Sonnet 5.5 US$2/US$10.
Um exemplo de 10 mil tokens de entrada + 5 mil de saída custa US$0,0035 no Haiku
ou US$0,07 no Sonnet; é cálculo ilustrativo, não medição por documento. Não usar
Opus neste pipeline. Registrar tokens/modelo/prompt; chamadas sem resposta válida
podem ter consumo não refletido nos contadores do resultado. Abrir a ficha não
chama IA. [Preços](https://platform.claude.com/docs/en/about-claude/pricing) e
[modelos](https://platform.claude.com/docs/en/models/overview).

Limites vigentes: 50 páginas/500 mil caracteres por documento, auditoria seletiva
até quatro páginas, lease único de cinco minutos e orçamento de tentativas já
existente. Checkpoints reduzem retrabalho, mas ainda não dividem o job em leases
de continuação. Documento que esgota tentativas requer recuperação operacional;
retomada médica por botão e continuação de jobs são slices posteriores. Não
prometer completude universal. A rodada local passou 512 testes, build, typecheck,
lint (um aviso anterior) e `deno check`; CI e release passaram também. Banco/Edge
e frontend publicados manualmente após etapas skipped. A rodada fictícia de 25
páginas confirmou retomada com checkpoints, mas gerou 29 itens/25 medições e
perdeu referências no grounding. Correção delimitada publicada pelo #115: linha de
referência não é próximo analito e unidade repetida não cria outra medição.
Adapter `.6` mantém prompt `.4` para reusar respostas pagas. Auditoria de
Resultado/Valor usa a ocorrência literal do nome anterior, evitando falsa lacuna
ou cobertura emprestada de outro analito. Local: 518 testes e reaplicação offline
das nove respostas QA: 25 itens/25 páginas com referência, unidade e data, zero
offsets inválidos e lacunas; sem novas chamadas Claude nem mutar histórico.
Confirmação remota posterior: PDF fictício novo de três páginas completou na
primeira tentativa com três itens, todos com unidade/referência/data, dois
checkpoints (Haiku inicial + auditoria Sonnet de uma página). Página de origem e
formulário abertos na sessão médica do domínio principal. O histórico inicial de
29 itens não foi alterado; o PDF previamente esgotado ainda requer recuperação.
Conferir identificadores e publicação vigente no status.

## Contrato vigente

- Extração com Haiku 5.5 e fallback seletivo Sonnet 5.5 preserva arquivo privado, página, offset, trecho e metadados. Fila/Cron operam no `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`) sem aba aberta; paciente não lê a extração interna. A chave Claude fica em segredo da Edge. Dado ausente ou ambíguo não vira fato clínico.
- O #109 acrescentou revisão versionada e acumulada de unidade, referência e data. Campo omitido preserva o valor efetivo; `null` limpa. Versão esperada impede sobrescrita concorrente e reenvio idêntico é idempotente. Extração bruta e histórico são preservados. Tabela e briefing leem os dados efetivos, mas só fatos revisados entram no briefing. Revisão não equivale a aprovação ou publicação ao paciente.
### Evidência histórica #109/#110

Os identificadores e contagens abaixo pertencem às versões anteriores. O ambiente
vigente é #115/Edge v13, registrado no início deste documento e no status.

- CI `38091031080` e release `38091148065` passaram com 499 testes. Migration `20261010220240` foi aplicada (68 no total), na publicação #109, Edge v10 com extractor .3 estava ativa e o deployment `dpl_RA2tuX9j5juaihWkbskxgA4cWvQd` estava production/READY no SHA `8be017cfaa5185d8b2f63ba73c655c4cace7e6d4`. Na UI médica autenticada, Glicose recebeu unidade `mg/dl` e referência `70 a 99 mg/dl` (v2), data de 9 de outubro (v3), confirmação sem recarga (v4) e recarga persistente no briefing. A fixture original foi restaurada pela UI (v5); 390 px sem overflow. Conta QA permanente intacta.
- Reprocessamento .3 expôs duplicatas quando número e unidade aparecem juntos e separados: 10 itens para cinco resultados. O #110 integrou adapter `vivance-claude.4`, extractor 1.8.1 e prompt .3. CI `38091972763` e release `38092076115` passaram **504 testes**, lint, typecheck e build; 16 testes focados finais passaram. Não houve migration nova. Etapas automáticas de migration, Edge, promoção e domínio foram skipped por configuração; execução manual foi conferida.
- Na publicação #110, Edge `exam-text-worker` v11 estava ACTIVE, hash `ea9ade65a514e0c02b6a6210dbe9d1f740d28382650e6bee44eeb31127f83a85`; deployment Git `dpl_DH5etxpExwKTLPDU5d6qj6LttkwU` READY/production no SHA `91970c09f35469673674adc32a661d8d174d9820`. O Cron reprocessou somente a fixture de medidas (job `e6429164-3a14-45f3-9837-daa8f6015500`, primeira tentativa; run `17d4fdf6-8be5-4159-9829-d7ee597a4b43`): cinco itens `requires_review` — Peso 72,4 kg, Altura 1,70 m, Cintura 84 cm, Gordura 25,4% e Massa 29,8 kg. Histórico .3 de dez itens e .2 preservado.
- No domínio principal, sessão médica autenticada de Guilherme confirmou após recarga 25 resultados, 24 pendentes (cinco medidas, sete itens narrativos e 13 PDF), Glicose v5 preservada com `mg/dL`, referência `70–99 mg/dL` e data de 10 de outubro; formulário novo abriu. A prova foi pelo DOM, sem nova captura nativa do formulário publicado. O formulário local em 390 px não teve overflow (`output/playwright/20261010-exams-corrections/form-mobile.png`). Unidade/referência/data e briefing foram mutados e verificados no #109; 403 do paciente e original são evidências anteriores, sem novo teste desses caminhos no #110.
- Corpus fictício com campos esperados por página: uma execução API real teve 19/19 após fallback Sonnet; houve variabilidade entre chamadas. Avaliação privada final **offline**, sem importar arquivos no app/Git: 81 itens fundamentados (64 PDF, 9 JPEG A, 8 JPEG B), zero offsets inválidos. A contagem anterior de 82 não se reproduziu no grounding final. Página 21 contém continuação de referências/metodologia, sem resultado atual. Isso não demonstra completude clínica, estabilidade geral ou custo em USD.

## Contrato técnico para manutenção

Cada revisão guarda um **snapshot acumulado**: campo omitido preserva o valor anterior; `null` limpa unidade, referência ou data. Confirmar depois de corrigir conserva as correções; rejeitar oculta o item sem apagar sua fonte. Versão esperada evita sobrescrever outra revisão e o reenvio idêntico retorna a mesma revisão. A migration `20261010220240` adicionou `review_exam_result_item_versioned` e manteve o RPC anterior durante a transição. O servidor valida papel/vínculo, tamanho, campos, calendário e versão; valor/texto continuam obrigatórios. Intervalo automático compara somente números inequívocos dentro de faixa fechada com unidade explicitamente idêntica, sem conversão ou faixa por população.

Desde o adapter .3, a extração recupera diferenças de espaço/grafia e colunas compostas apenas com suporte literal; não deve associar resultado e referência de linhas ou lados anatômicos diferentes. Fallback Sonnet atua em páginas com propostas rejeitadas ou lacunas detectadas, até **quatro páginas**, em segmentos e com no máximo **três chamadas paralelas**. Respostas adicionais não apagam itens já fundamentados; notas de leitura incompleta acompanham a fonte. A deduplicação iniciada no adapter .4 e ampliada no .6 une representações equivalentes de número/unidade, preservando referência, método, material e data em um trecho literal com offsets. Contextos conflitantes ou evidência que não cabe em um trecho limitado permanecem separados para revisão.

## Onde alterar

- Worker e extração: `supabase/functions/exam-text-worker/index.ts` e `supabase/functions/exam-text-worker/claude-extraction.ts`.
- API de documentos e revisão: `apps/web/app/api/v1/clinics/[tenantId]/documents/[documentId]/extraction/route.ts`, `apps/web/app/api/v1/clinics/[tenantId]/documents/[documentId]/extraction/review/route.ts`, `apps/web/modules/exams/service.ts` e `apps/web/modules/documents/service.ts`.
- Projeção e interface médica: `apps/web/modules/exams/results.ts`, `apps/web/modules/exams/results-service.ts` e `apps/web/components/exam-results-panel.tsx`.
- Briefing: `apps/web/components/doctor-consultation-briefing.tsx`.
- Corpus fictício versionado: `apps/web/tests/fixtures/exams/coverage-corpus.json`.

## Histórico

[PRs #106/#107](https://github.com/vitormilanez/instituto-vivance/pull/107) entregaram fila/Cron, extração estruturada, tabela, original e briefing de fatos revisados. No teste então publicado, três fixtures QA geraram 25 itens em quatro páginas; o médico confirmou um item e o paciente recebeu 403 na extração. Essas contagens pertencem àquela versão e não descrevem o reprocessamento .3/.4. A avaliação privada anterior aceitou 76 offsets; a medição final acima substitui a contagem intermediária.

## Próxima entrega

Próximo slice: **continuação entre leases e retomada médica de jobs esgotados**, aproveitando texto/checkpoints e preservando a execução anterior. Depois, validar aprovação médica e publicação explícita de fatos aprovados ao paciente, com resumo curto e acesso ao original. Ampliar corpus por tipo e medir estabilidade antes de IA3/interpretação. [IA1 e plano de IA](PLANO_IA_CLINICA.md), produção separada e [Gate P](GATE_P.md) precedem dados reais ou uso clínico. CI, READY e teste sintético não são aceite médico.
