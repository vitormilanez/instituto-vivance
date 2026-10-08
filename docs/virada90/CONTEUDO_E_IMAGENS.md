# Virada 90 — conteúdo de referência e imagens

Revisão solicitada em 02/10/2026 após o usuário apontar conteúdo incompleto. Os arquivos HTML baixados são fonte de informação, sem importar a identidade visual, o nome de médico fictício nem promessas de resultado.

Agrupamento revisto em 07/10/2026: cinco etapas, preservando as doze fontes.

## Cobertura das telas

| Tela do material | Informação preservada | Tópico da nova apresentação |
|---|---|---|
| 1 · Apresentação | Protocolo individual, acompanhamento médico, identidade do programa | 1 · Programa e pilares |
| 2 · O que é | Ciência, histórico, rotina, mudanças viáveis, saúde além do peso | 1 · Programa e pilares |
| 3 · Pilares | Nutrição, comportamento, atividade física e acompanhamento médico | 1 · Programa e pilares |
| 4 · Jornada | Avaliação, plano, acompanhamento, evolução/manutenção; ritmo individual | 2 · Avaliação; sequência das etapas 3–4 |
| 5 · Avaliação | História e exame clínico, exames laboratoriais, composição corporal, hábitos | 2 · Avaliação |
| 6 · Plano | Metas realistas, alimentação flexível, suplementação indicada, movimento compatível | 3 · Plano e acompanhamento |
| 7 · Acompanhamento | Consultas periódicas, ajustes, dificuldades/platôs, revisão de exames e medidas | 3 · Plano e acompanhamento |
| 8 · Evolução | Consolidação de hábitos, manutenção, viagens/celebrações, sinais além da balança | 4 · Continuidade e dúvidas |
| 9 · Exames | Glicemia/insulina/HbA1c; lipídios; TSH/T4 livre; vitamina D/B12/ferritina | 2 · Avaliação, exames e suplementos |
| 10 · Suplementos | Vitaminas/minerais, probióticos, complementos/substitutos de refeição quando indicados | 2 · Avaliação, exames e suplementos |
| 11 · Dúvidas | Fome, carboidratos, tempo dos resultados e medicamentos | 4 · Continuidade e dúvidas |
| 12 · Próximo passo | Avaliação inicial e conversa para entender o cuidado | 5 · Formatos, valores e conversa |
| Decisões da conversa | Presencial/online por três meses; valores apenas no final; WhatsApp | 5 · Formatos, valores e conversa |

O nome de referência “Dr. [Nome]” foi substituído por **Dr. Guilherme Martins**, sem atribuir uma especialidade não confirmada. Exames, bioimpedância, medicamentos e suplementos dependem da avaliação e da disponibilidade no formato escolhido. Não há painel universal de exames, resultado garantido, número fixo de consultas ou prescrição automática. As quatro perguntas frequentes permanecem; suas respostas foram redigidas em linguagem condicional, sem prometer resultados.

## Imagens editoriais

Geradas pela ferramenta nativa **image_gen**, modo built-in. São cenas ilustrativas, sem representar o médico, a clínica ou resultados de pacientes reais. O vídeo original da landing continua; os espaços reservados a avatar da jornada foram retirados.

| Arquivo final | Uso | Papel |
|---|---|---|
| `apps/web/public/virada90/assets/journey/avaliacao.jpg` | Etapa 2 | Conversa individual antes de definir o plano |
| `apps/web/public/virada90/assets/journey/alimentacao.jpg` | Etapa 3 | Alimentação variada no cotidiano |
| `apps/web/public/virada90/assets/journey/evolucao.jpg` | Etapa 4 | Movimento e hábitos no dia a dia |

As imagens finais têm 1200×800 pixels, JPEG otimizado; o prompt integral é incorporado ao próprio arquivo pelo script Impeccable `embed-prompt.mjs`.

## Prompts integrais

### avaliacao

```text
Use case: photorealistic-natural
Asset type: editorial landscape photograph for a physician-led Brazilian health program presentation.
Primary request: a calm individual medical assessment shown through a close view of a healthcare professional's hands taking notes while an adult patient's hands rest comfortably across a consultation desk. A simple blank notebook, pen and compact body-composition scale softly out of focus nearby. The professional wears a discreet navy sleeve; no visible face or identifiable physician.
Style: sophisticated natural editorial photography, authentic materials, no glossy advertising finish.
Composition: landscape 3:2, close, quiet, uncluttered, soft daylight from the side, warm off-white interior, cream and pale wood surfaces, restrained deep navy and warm muted gold details.
Constraints: anatomy must be plausible. No medical procedure, no injection, no lab values or readable text, no charts, no logos, no watermark. This is a generic illustrative scene, not a photograph of a named doctor or real clinic.
```

### alimentacao

```text
Use case: photorealistic-natural
Asset type: editorial landscape photograph for a Brazilian physician-led nutrition program presentation.
Primary request: a thoughtfully prepared, everyday balanced Brazilian lunch on a warm ivory dining table: a simple ceramic plate with modest portions of rice, beans, grilled chicken and varied colorful cooked and fresh vegetables. A glass of water, linen napkin and ordinary cutlery. A person's hand is gently setting down the plate, suggesting a practical meal in a normal routine, without focusing on their body.
Style: sophisticated natural editorial food photography, realistic texture and appetizing natural color, no glossy advertisement treatment.
Composition: landscape 3:2 with slightly overhead angle, soft afternoon window light, warm off-white and pale wood, muted sage greens and small deep navy cloth detail. Tidy but lived-in, not a luxury restaurant.
Constraints: no weighing food, calorie numbers, diet supplements, restrictive diet symbols, logos, text or watermark. This illustrates flexible nutrition, not a prescribed meal plan or promised health result.
```

### evolucao

```text
Use case: photorealistic-natural
Asset type: editorial landscape photograph for a physician-led Brazilian health program presentation.
Primary request: two ordinary middle-aged adults taking an easy conversational walk along a leafy public park path in Brazil. Seen from behind at a comfortable distance. Diverse natural body types, relaxed posture, ordinary navy and muted sage walking clothes, appropriate sneakers. A quiet everyday routine rather than athletic competition.
Style: sophisticated candid editorial lifestyle photograph, true-to-life natural textures and proportions, soft morning daylight, warm off-white highlights and muted green foliage.
Composition: landscape 3:2, path leads calmly into the background, adults slightly off-center, enough environment to feel open and restful.
Constraints: no body transformation, no before/after, no exaggerated fitness bodies, no identifiable celebrities or doctor, no logos, text, numbers or watermark. Generic illustrative scene, no claimed patient outcome.
```
