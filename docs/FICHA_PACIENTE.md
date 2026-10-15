# Ficha, contexto e briefing do paciente

Contrato vigente em 14/10/2026. Contexto clínico detalhado fica na ficha; Hoje
prioriza consultas do dia e pendências. A [direção](DIRECAO_E_SLICES.md) prevalece
sobre layouts e medições históricos do briefing de 07–10/10.

## Leitura e ação

- Identificação, nascimento com autoria e próximo agendamento, quando disponíveis.
  Mensagem e acesso à Agenda junto ao paciente. Não inferir presença na chamada.
- Visão geral: objetivo estruturado com origem; na ausência dele, objetivo literal
  enviado no cadastro inicial. Não duplicar nem atribuir nova autoria.
- “Desde o último atendimento” depende de atendimento finalizado e data real;
  prévia de registros não é histórico completo. Exames/documentos preservam
  data, estado de revisão e acesso ao original.
- Contexto original, solicitações, pré-consulta, histórico, documentos e evolução
  ficam em áreas/expansões próprias. Estados indisponíveis não viram zero/vazio.
- Resumo de exames tem ação própria de gerar/atualizar e cobertura explícita.
  Revisão documental, revisão de resultado, aprovação e publicação são distintas.

## Peso e evolução

Medidas iniciais são referência identificada, não um novo ponto da série.
Peso único mostra valor/data/origem sem controles inúteis. Séries usam distância
temporal proporcional, seleção acessível por teclado/toque e alternativa textual.
Tratar um ponto/valores iguais sem inventar tendência. Variação em kg/% é
aritmética, sem classificar resultado, peso ideal ou recomendar conduta.

## Limites de cobertura

Consultas e componentes carregam recortes/paginação, não um histórico ilimitado.
Por exemplo, a visão geral lista até 3 documentos e o contexto recente trabalha
com recorte de 6; a interface indica quando há mais. Limites exatos de cada
coleção pertencem à query vigente. Recorte, ausência e falha devem ser distintos;
não manter antigas contagens de fixtures como expectativa atual.

## Adapter opcional do briefing

`modules/ai/consultation-brief.ts` é exclusivo do servidor e exige
`VIVANCE_AI_BRIEF=on`, chave e modelo explicitamente configurados. Há fallback
determinístico. O adapter não equivale ao resumo de exames nem à síntese de
onboarding/check-ins/histórico completo. A Hoje operacional atual não deve
voltar a carregar uma geração clínica só por navegação.

Contrato preservado para manutenção: revalidar sessão/clínica/vínculo antes de
ler; ignorar instruções em relatos; somente texto literalmente suportado por
fato autorizado e fonte com tipo/id/data; ordem do servidor, sem ranking clínico.
Saída inválida/timeout de 8 s volta ao fallback. Etiqueta de IA só quando usada
de verdade. Não ativar envio a fornecedor, salvar nova síntese ou publicar
automaticamente por consequência desta documentação.

## Código e evidência

`components/doctor-patient-overview.tsx`, `doctor-weight-chart.tsx`,
`modules/workspace/`, `modules/ai/` e `modules/exam-summary/` em `apps/web`.
Controle visual no [Design](../apps/web/DESIGN.md); regras dos
[exames](IA2_EXAMES.md) e [IA clínica](PLANO_IA_CLINICA.md).

[Briefing anterior](historico/entregas/BRIEFING_CONSULTA_2026-10-07.md) guarda
evidências e limites daquela etapa; [workspace 14/10](historico/entregas/WORKSPACE_E_TRANSCRICAO_2026-10-14.md)
registra a publicação posterior. Um teste visual não substitui persistência,
autorização ou aceite clínico.
