# Virada 90 — conteúdo de referência e imagens

## Publicação autorizada — 15/10/2026

Após revisar a prévia e a correção do clique, usuário autorizou publicar e
confirmou segunda a sexta às 08h, 09h, 10h, 14h, 15h e 16h para presencial
e online. Preferências públicas substituem fixtures restritas a localhost;
horizonte de 30 dias e rejeição de horários passados no fuso Brasília.
Aviso de confirmação pela equipe e alternativa sem horário permanecem.
Sem integração com agenda interna ou reserva automática. As seções de prévia
abaixo registram a sequência anterior, não a configuração pública vigente.

Revisão pré-publicação identificou CRM/RQE divergentes no letreiro do retrato
interno fornecido. A versão pública usa
`assets/real/medico-consultorio-sem-registros.jpg`, derivada por image_gen
built-in para remover somente essas duas linhas do fundo nas duas metades.
Prompt integral incorporado ao JPEG. Fonte gerada:
`/Users/vitormilanez/.codex/generated_images/01a14093-3691-7c40-a48d-b3fccb4745a2/exec-9fe6a91e-acde-4055-a2c8-c9e656ce17c6.png`.
Original fornecido preservado fora do lote público. Conferência visual e scan
de proveniência: três assets, zero sem origem/prompt.

Quando há horário sem modalidade, o CTA orienta a completar a escolha sem
abrir WhatsApp nem propagar uma conversão de clique para medição.

## Planejamento — agenda de preferência e fotos reais, 15/10/2026

**Estado atualizado:** após o plano, usuário autorizou aplicar localmente e mostrar. Implementação local concluída, sem publicação; preferência de horário + confirmação pelo WhatsApp preservada. Começar pela Virada 90; extensão à landing institucional é posterior. O plano original segue abaixo.

### Entrega local e origem dos assets

- Refinamento solicitado em 15/10: destacar o valor das 12 parcelas e deixar o total secundário. Presencial R$ 1.000 por parcela (total R$ 12.000); online aproximadamente R$ 541,67 (total R$ 6.500, arredondamento de centavos). Não acrescentar promessa de ausência de juros nem mudar total ou duração. Aplicado somente localmente.

- Prévia: `http://127.0.0.1:4177/virada90` e `/virada90/conhecer#consulta`; servidor restrito a loopback, script de apoio em `output/playwright/virada90-preview/server.mjs` (`node output/playwright/virada90-preview/server.mjs`).
- Agenda em `scheduling.js`/`consultation.css`, integrada à etapa 5 por `guided.js`. Dias úteis/horários são fixtures apenas em localhost/127.0.0.1 e têm aviso visível. Outros hosts oferecem combinar com a equipe, sem slots. Configuração operacional real continua pendente.
- Fachada: `assets/real/clinica-fachada.jpg`, derivado JPEG de image_gen built-in aplicado à foto fornecida. Prompt integral incorporado ao JPEG; luz/cor ajustadas, original no Downloads intacto. Fonte gerada preservada em `/Users/vitormilanez/.codex/generated_images/01a14093-3691-7c40-a48d-b3fccb4745a2/exec-232f1dd6-d420-4ee2-9a96-c6a4cd1781c0.png`.
- Retratos: `assets/real/medico-consultorio.jpg` e `medico-clinica.jpg`, cópias das montagens fornecidas, sem geração ou alteração de pixels; recortes das metades feitos por CSS. Origem incorporada aos JPEGs; três assets passam no scan de proveniência.
- Endereço aproveitado do rodapé existente: Rua Vicente Furlanetto, 65, Presidente Prudente/SP. Não houve confirmação externa nova.
- 16 testes focados + ESLint passaram. Browser confirmou ausência de overflow em 1440/768/390/320px, seleção/mudança de modalidade, expansão, foco de teclado e mensagem com data/hora de Brasília. WhatsApp interceptado em QA, nenhuma mensagem enviada. Capturas válidas da etapa completa e fotografias em `output/playwright/virada90-preview/`.
- Revisão independente Impeccable: **Ship locally**, sem correção material pendente no escopo da prévia. Ajustado separador CRM/RQE mobile e refeitas capturas após correção. Sem build completo/publicação/aceite clínico. Tarefa Asana `1219555490529972` aberta para revisão do usuário.

### Base conferida

Checkout canônico, branch `codex/hoje-paciente-navegacao`, HEAD `95b69ba`, com alterações locais preexistentes preservadas. `index.html`, `conhecer.html` e `guided.js` têm apresentação em cinco etapas, preços no final e mensagem de WhatsApp com formato opcional; não possuem seletor de horários. HTML público de `/virada90/conhecer` conferido em 15/10: cinco etapas, botão WhatsApp e aviso de ausência de reserva. Não houve auditoria visual pública nesta rodada. Asana `1219288382329047`, concluído, registra a entrega anterior, não este pedido.

### Primeiro slice: escolher uma preferência e preparar a mensagem

- Público: visitante interessado na avaliação inicial do Virada 90. Resultado: selecionar modalidade, dia e horário e abrir uma solicitação coerente no WhatsApp.
- Manter as cinco etapas. Na etapa final, depois dos valores, inserir o bloco **Solicitar minha consulta**; a landing ganha acesso explícito a essa etapa. Vídeo e explicação do programa permanecem.
- Abas **Presencial** e **Online**, sincronizadas com a escolha de formato já existente. Presencial apresenta foto real da fachada, cidade e endereço verificado; online informa atendimento por videochamada.
- Desktop: contexto/foto ao lado da agenda, com quatro dias por vez. Celular: contexto compacto, faixa navegável de dias e horários do dia selecionado, sem corte de nomes ou rolagem horizontal da página.
- Navegar entre períodos e expandir **Mais horários**. Rótulo **Horários de preferência**, com aviso junto aos horários: **Sua escolha é uma preferência. A equipe confirma a disponibilidade pelo WhatsApp.** Não usar “vaga disponível”, “reservado” ou escassez.
- Ao tocar no horário, mostrar resumo editável de modalidade/data/hora e CTA **Solicitar pelo WhatsApp**. Abrir rascunho somente nessa ação explícita; o visitante revisa e envia. Manter **Prefiro combinar com a equipe** como alternativa sem data/hora.
- Modelo: “Olá! Conheci o Virada 90 e gostaria de solicitar uma consulta inicial com o Dr. Guilherme Martins. Modalidade: [presencial/online]. Minha preferência é [dia da semana], [dd/mm/aaaa], às [hh:mm] (horário de Brasília). Podem confirmar a disponibilidade e orientar os próximos passos?”
- Datas futuras calculadas no fuso `America/Sao_Paulo`; rejeitar horários passados, inclusive se a página ficar aberta. Trocar modalidade limpa um horário incompatível; voltar entre etapas conserva a seleção em memória. Nenhuma reserva, pagamento ou escrita na agenda interna.
- Dias de atendimento, faixas de horários, antecedência mínima, horizonte e exceções dependem de confirmação operacional. Não copiar datas/horários, preço de R$850 ou especialidade dos prints como fatos do programa. Sem configuração confirmada, oferecer contato sem horário; fixtures ficam apenas em prévia identificada.

### Direção visual e fotos

Impeccable orienta extensão da identidade existente: azul profundo, marfim, dourado pontual, Manrope, bordas discretas e horários com seleção inequívoca. A referência Doctoralia orienta a interação; informações fixas do único médico dispensam uma sequência extensa de campos.

| Foto enviada | Uso proposto |
| --- | --- |
| Fachada, `WhatsApp Image 2026-08-11 at 15.11.18.jpeg` | Bloco presencial na landing e contexto da agenda. Ajustar luz, sombras, cor e perspectiva moderadamente, preservando arquitetura, jardim e letreiro. |
| Médico na clínica, montagem `16.50.10 (1).jpeg`, metade esquerda | Abertura/apresentação do médico, com recorte vertical próprio. |
| Mesma montagem, metade direita, médico sentado à mesa | Etapa 2, avaliação individual, substituindo a imagem ilustrativa desse trecho. |
| Montagem externa `16.50.10.jpeg`, médico sentado | Etapa 3, presença do médico no acompanhamento; avaliar recorte sem repetição excessiva. |

Separar as metades das montagens, manter arquivos originais intactos e gerar derivados responsivos otimizados. Não modificar rosto/corpo, inventar instalações ou reproduzir credenciais legíveis nas fotos como dados verificados. Manter as informações profissionais já verificadas da landing. Nutrição e hábitos continuam com imagens temáticas onde esclarecem melhor o conteúdo.

### Sequência e aceite

1. Confirmar configuração operacional dos horários e endereço; definir recortes e composição desktop/mobile.
2. Implementar agenda de preferência, resumo, alternativa sem horário e mensagem na Virada 90; integrar fachada e retratos no mesmo slice.
3. Validar navegação, mudança de modalidade, datas passadas, virada do dia, ausência de configuração, retorno entre etapas, teclado/foco, alvos ≥44px e larguras 320/390/768/1440px em uma rodada agrupada. Conferir texto/URL WhatsApp sem enviar mensagem real.
4. Preservar consentimento de medição. Eventos distinguem interação com agenda e clique no WhatsApp; não incluir texto da mensagem, objetivos de saúde ou data/hora exata nos eventos. Clique não comprova mensagem recebida nem consulta confirmada.
5. Revisão do usuário em prévia; publicação técnica e conferência do domínio em etapa própria. Somente depois avaliar reutilização na landing institucional e eventual integração com disponibilidade real.

Arquivos principais: `apps/web/public/virada90/index.html`, `conhecer.html`, `guided.js`, `guided.css`, `styles.css` e `assets/`. Atualizar testes dirigidos e documentação conforme a implementação. Nenhuma dependência nova de banco/IA clínica é necessária para a preferência local + WhatsApp.

Revisão solicitada em 02/10/2026 após o usuário apontar conteúdo incompleto. Os arquivos HTML baixados são fonte de informação, sem importar a identidade visual, o nome de médico fictício nem promessas de resultado.

Agrupamento revisto em 07/10/2026: cinco etapas, preservando as doze fontes.

Refinamento após revisão Impeccable em 07/10: os oito itens de plano e
acompanhamento permanecem em detalhes expansíveis na etapa 3; os demais
conteúdos de referência continuam acessíveis nas mesmas etapas. A landing
mantém método, objetivos, perfil e calendário presencial em quatro detalhes
nativos. Resumos facilitam a primeira leitura sem remover conteúdo clínico.

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
