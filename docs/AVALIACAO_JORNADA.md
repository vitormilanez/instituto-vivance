# Avaliação Paciente × Médico × IA

08/10/2026 — **proposta para validação; sem implementação**. Base: checkout
`vivance-atual`, código de `origin/main` `ebadaab8` e organização documental
`a4be0db`; piloto IA2 separado, PR #78, `1e4493a`.

## Diagnóstico

O Vivance é um produto de cuidado longitudinal supervisionado: o paciente relata,
o sistema organiza, o médico revisa e decide, e a orientação publicada volta ao
paciente. A qualidade está na continuidade desse ciclo, incluindo o próximo retorno.

- **Preservar:** Home do paciente com próxima ação; rascunhos e consentimento;
  briefing médico com relato literal/original; gráfico factual; distinção entre
  revisão, aprovação, publicação e confirmação de leitura.
- **Melhorar primeiro:** ligação entre pedido e resposta, destino do acompanhamento
  médico e visibilidade do que aconteceu depois do envio.
- **Melhorar depois:** leitura integrada da pessoa e das mudanças ao longo do tempo.
  Há informação persistida, mas sua projeção nas telas é fragmentada.
- **IA atual:** o briefing funciona sem LLM; a chamada opcional seleciona trechos
  literais. O PR #78 extrai texto por página, ainda sem resultados clínicos
  estruturados ou aceite clínico. Não confundir organização com interpretação.

Método: inspeção de código/contratos e avaliações independentes de UX e dados,
orientadas por patient-journey-audit, Impeccable e Supabase. Houve observação
autenticada, somente leitura, de Hoje médico e da ficha do Paciente Sintético IA2;
sem abrir originais ou praticar ações clínicas. A observação publicada não confirma
o SHA servido. O launcher/detector Impeccable ficou indisponível por permissão de
execução; não há resultado automatizado de design.

**Observado** abaixo significa código ou tela inspecionada; **inferido** é impacto
provável; **não validado** exige cenário sintético. Não foram revalidados banco
remoto, sessão do paciente, mobile, isolamento entre papéis ou jornada completa.
Não houve nova aceitação de C3 ou Gate P. Perguntas adicionais dispensadas porque
o brief e o escopo estavam definidos; a priorização continua sujeita à validação.

## Jornada e atritos

| Etapa / objetivo | Estado observado | Atrito e consequência inferida |
| --- | --- | --- |
| Convite e contexto inicial / entrar e contar sua história | Onboarding salva rascunho, trata conflito e permite revisão/consentimento. | Retoma a etapa, mas `questionIndex` reinicia em zero; a pessoa pode rever perguntas já respondidas. [Fonte](../apps/web/components/onboarding-workspace.tsx). |
| Hoje do paciente / saber o próximo passo | Ação prioritária, solicitações, próxima consulta e últimos envios. | Depois do envio, predomina “Enviado”; falta acompanhar revisão e eventual complemento. [Home](../apps/web/components/patient-home.tsx), [recibo](../apps/web/components/patient/receipt.tsx). |
| Resposta / comprovar atendimento ao pedido | Pré-consulta tem vínculo específico; metas usam versão. | Exames/medidas podem concluir pedido por tipo, sem associação à resposta concreta. Não prova que o pedido específico foi atendido. [Triggers](../supabase/migrations/20260922190000_patient_care_requests.sql), [função vigente](../supabase/migrations/20260924174942_bind_care_requests_to_patient_responses.sql). |
| Hoje médico / preparar e revisar | Briefing separa relatos, lacunas, documentos e trabalho médico. | Documento com qualquer revisão sai da fila de não revisados; não identifiquei fila própria para `needs_follow_up`. [Seleção](../apps/web/modules/workspace/open-work.ts), [fila](../apps/web/modules/workspace/open-work-items.ts). |
| Ficha / entender a pessoa e continuar | Identificação, contexto, abas, documentos e evolução existem. | Contexto fica distribuído; Agenda e Atendimentos abrem destinos gerais. O médico precisa localizar novamente o paciente. [Ficha](../apps/web/app/clinicas/[tenantId]/pacientes/[patientId]/page.tsx). |
| Orientação e retorno / saber o que fazer | Plano aprovado é separado de publicação; “Li estas orientações” registra leitura. | Esse bom contrato ainda não fecha a experiência dos outros envios. Preservar leitura ≠ adesão. [Publicação](../apps/web/components/published-plans.tsx). |

## Melhorias priorizadas

Prioridades de produto: P1 antes de expandir a jornada; P2 refinamento posterior.
Não foi confirmado incidente em produção que justifique classificar algum item como P0.

| Prioridade / evidência | Proposta e benefício | Dependência / risco | Aceite objetivo |
| --- | --- | --- | --- |
| P1 · observado: conclusão de exames/medidas por tipo | Associar pedido à resposta concreta e preservar autoria; evitar conclusão indevida. | Contrato versionado; registro assistido deve continuar possível, com origem explícita. | Registro avulso ou de outro pedido não conclui a solicitação; associação correta persiste após recarga. |
| P1 · observado: recibo sem ciclo de revisão; acompanhamento fora da fila de não revisados | Recibo operacional e continuidade médica: recebido, aguardando revisão, revisão registrada; complemento somente quando solicitado explicitamente. | Projeção autorizada para paciente, sem expor nota interna ou transformar revisão em orientação. | Paciente vê apenas seu estado; acompanhamento continua acionável até resolução registrada. |
| P1 · observado: fontes diferentes na leitura do contexto | Usar origem explícita e contexto vigente. Documentos de qualquer autor entram em “O que o paciente trouxe”; o resumo usa objetivo inicial como fallback, embora consulte intake atualizado. | Não apagar snapshot inicial; definir precedência entre assunto da consulta e objetivo longitudinal. | Documento da equipe não aparece como relato do paciente; meta atual e histórica permanecem distinguíveis. [Feed](../apps/web/components/doctor-consultation-briefing.tsx), [consulta](../apps/web/modules/workspace/today.ts), [brief](../apps/web/modules/ai/consultation-brief-data.ts). |
| P2 · observado: recuperação incompleta | Retomar pergunta exata; preservar paciente ao navegar; mostrar erro parcial sem ocultar todos os comprovantes. | Estado de navegação e falhas por fonte. | Interromper/retomar preserva posição; falha de uma fonte mantém demais envios visíveis. [Envios](../apps/web/modules/workspace/patient-sent.ts). |
| P2 · observado: promessa offline mais ampla que mecanismo | Explicar quando o envio ocorrerá e manter pendência visível. | Fila local sincroniza com app aberto/retomado; não foi identificado envio em background no service worker. | Sem rede, mostrar “salvo neste aparelho”; recebido somente após confirmação do servidor. [Mensagem](../apps/web/components/patient/check-in-flow.tsx), [sincronização](../apps/web/components/patient/connection-status.tsx), [worker](../apps/web/public/sw.js). |

## Hoje e Pacientes: proposta de uso

**Hoje médico:** agenda e próxima consulta, depois trabalho acionável. Cada item
responde “qual paciente, o que chegou/falta, desde quando e qual ação?”. Distinguir
não visto, não revisado e acompanhamento aberto. Preservar briefing/gráfico,
Agenda e oito ações rápidas; reduzir competição visual por agrupamento e detalhes
progressivos. Não priorizar pacientes por risco clínico calculado automaticamente.

**Pacientes:** uma visão geral consistente, seguida do histórico completo:

1. Identidade, idade calculada e últimas medidas disponíveis, com data/unidade/origem.
2. Objetivo atual, expectativa e dificuldade literalmente informados; contexto inicial acessível.
3. Saúde declarada, com medicamentos/histórico e lacunas explícitas.
4. Mudanças desde a última consulta: medidas comparáveis e relatos lado a lado.
5. Pendências acionáveis e documentos, com original e estado de revisão.

Nesta inspeção não identifiquei coleta estruturada de alergias/condições nem IMC;
tratamentos aparecem em resposta aberta. Não preencher esses blocos por inferência.
Exibir idade/IMC exige cálculo determinístico e dados válidos; IMC deve explicitar
datas do peso/altura usados. Ausência de registro não significa ausência de doença,
sintoma ou adesão. O contexto assistido pela equipe também precisa ser identificado.

**Paciente:** manter uma ação principal, razão do pedido, possibilidade de pausar e
comprovante. Fluxo desejado: pedido → resposta vinculada → recebido → revisão
registrada → complemento explícito, se necessário → orientação publicada → retorno.
Nem todo envio gera nova orientação; comunicar essa distinção sem prometer prazo
ou monitoramento contínuo não oferecido pelo serviço.

## Dados e IA

| Camada | Fonte e tratamento | Uso na experiência |
| --- | --- | --- |
| Declarado | Onboarding, intake versionado, pré-consulta, check-ins, mensagens e medidas; autor/data/original. | Contexto atual e histórico literal; equipe assistente identificada. |
| Extraído | IA2, fora da main: documento, execução, página, método, hash e estado. | Texto conferível; resultado estruturado futuro permanece separado até revisão. |
| Calculado | Datas, idade, séries, variações, contagens e estados por regras. | Evolução factual, sem diagnóstico ou interpretação automática. |
| Revisado/publicado | Revisão humana, atendimento versionado, aprovação, publicação e recibo próprios. | Só conteúdo autorizado chega como orientação ao paciente. |

O registro original continua fonte de verdade. Resumos devem ser projeções com
identificadores das fontes, versão/data e cobertura explícita; fonte atualizada
exige recomposição ou indicação de resumo desatualizado. Trecho não carregado não
pode virar “não informado”. O briefing atual tem recortes, não história completa.

Regras/consultas resolvem fila, cronologia, comparação numérica e dados ausentes.
Extração convencional deve preceder OCR quando houver texto no PDF. Avaliar LLM
para estruturar respostas abertas ou documentos e, depois, rascunhar síntese
longitudinal citada; não ampliar silenciosamente o contrato literal atual.
Comparar qualidade em corpus sintético, fidelidade, omissões, custo por documento,
latência e privacidade antes de escolher modelo. Consulta não deve depender de
resposta do provedor: preservar fluxo manual e fallback. RAG depende de biblioteca
aprovada/versionada; MCP não resolve as lacunas de estado e origem identificadas.
Claude, novos fornecedores e uso clínico não ficam autorizados por esta avaliação.

## Roadmap proposto e primeira entrega

| Ordem | Slice / valor | Escopo e dependências | Conclusão e validação |
| --- | --- | --- | --- |
| 1 | **C3 — fechar o ciclo de um exame solicitado** | Pedido → documento associado/origem → revisão → acompanhamento/complemento explícito → recibo operacional. Reutilizar upload e revisão existentes; confirmar contrato e acesso por papel. Excluir extração/LLM e mudanças gerais de cadastro. | Dois perfis sintéticos, recarga e vínculo correto; registro avulso não fecha pedido; acompanhamento não some; nota interna permanece privada; revisão não publica orientação. |
| 2 | **C3 — contexto longitudinal legível** | Projeção coerente para Hoje/ficha, objetivo vigente, medidas, comparação factual e navegação com paciente preservado. Depende de precedência de fontes; coleta de campos ausentes exige escopo próprio. | Médico localiza contexto, mudança, pendência e original sem reconstruir a história; fontes/datas corretas e estados vazio/erro distintos. Teste de tarefa com médico, sem tratar avaliação heurística como aceite. |
| 3 | **IA2 — exames estruturados conferíveis** | Retomar PR #78 sem refazer texto/fila já validados; completar falha/retry, negação ao paciente, contrato de resultados/unidades/páginas/revisão por item. Worker independente da aba antes de alegar autonomia. | Corpus sintético medido, acesso negado onde devido, falha recuperável, original navegável e correção humana. Resultado estruturado não equivale a interpretação. |
| 4 | **IA — síntese longitudinal rastreável** | Rascunho de organização factual com fontes e cobertura; depende dos contratos anteriores e IA1. Busca clínica ampliada depende também da biblioteca aprovada. | Afirmações rastreáveis, omissão/incerteza visíveis, revisão médica e fallback; publicação permanece ação separada. |

**Recomendação revisada:** começar pelo slice 1. A organização inicial dos MDs
recomendava IA2 pela maturidade do piloto; a avaliação de UX/dados mostrou uma
lacuna anterior na continuidade. Esta é uma proposta de repriorização para o
usuário validar, não suspensão ou descarte do PR #78. O problema análogo de
medidas fica registrado para extensão posterior, evitando alargar o primeiro slice.

## Desenvolvimento e validação

Um contrato e uma jornada completos por slice. Durante desenvolvimento: testes
direcionados às regras alteradas, autoria, vínculo, idempotência, persistência e
permissões. No fechamento: um percurso integrado sintético paciente/médico,
incluindo falha, recarga e acesso indevido, mais uma revisão visual agrupada.
Suite ampla somente por impacto transversal ou evidência de regressão.

Nesta avaliação foram feitas leituras e verificação documental, sem alterar
aplicação, banco ou ambiente e sem rodar suite de produto. Implementação, Preview,
publicação técnica e aceite clínico continuam marcos separados. Seguir o
[método de retomada](RETOMADA_DESENVOLVIMENTO.md) e o [Gate P](GATE_P.md).
