# Virada 90 — apresentação antes do contato

07/10/2026. Branch `codex/virada90-discovery-first-20261007`, iniciada na
main `422c8d2`. Escopo limitado à landing pública e sua medição de navegação.

## Evidência e decisão

A landing publicada escondia a apresentação em uma única ação no fim. Menu
e hero levavam a âncoras internas; ambos os cards de formato abriam WhatsApp.
A revisão independente (GPT-5.6-sol, medium) confirmou essa divergência de
destino e a descrição de valores no FAQ. Foi escolhido um caminho explícito
para entender o programa, sem impedir atalhos no seletor da apresentação.

Oito entradas levam a `/virada90/conhecer`; nenhuma abre WhatsApp na landing.
Um bloco editorial sage reaproveita a imagem de avaliação com legenda
ilustrativa. O vídeo e os fatos existentes foram preservados. A conversa
continua na etapa final, sem obrigar respostas ou leitura sequencial.

## Validação local

- 440 testes, lint, typecheck e build aprovados com Node 24.21.0.
- Navegador em 1440, 390 e 320px, sem overflow horizontal; destinos, hero,
  cards de formato, seletor de tópicos e ação final conferidos.
- Um lote de capturas do hero e bloco editorial em desktop/mobile inspecionado.
  Gutter e padding efetivos conferidos; avisos mecânicos de padding ignoravam
  `padding-block` e `.wrap` e não corresponderam a um defeito renderizado.
- O evento de entrada usa enum de posição, exige consentimento e não produz
  conversão Ads. Teste cobre recusa, revogação, local, login e apresentação.
- Atribuição permitida segue no link interno; parâmetros arbitrários são
  excluídos. SDK Google ausente no ambiente local. Nenhuma mensagem enviada.

Publicação ainda depende de PR, CI e conferência do domínio. A qualidade dos
contatos deve ser medida no CRM; esta revisão não comprova aumento de vendas.
