# Virada 90 — revisão aplicada de clareza e conversão

Pedido aprovado em 07/10/2026 após revisão Impeccable. Implementação por dois
agentes `gpt-6.1-sol`, raciocínio medium, em arquivos independentes. Revisão e
verificação integrada pelo agente principal.

## Resultado

- Landing: quatro resumos com detalhes nativos; distinção presencial/online no
  hero; oito entradas e rótulos consistentes para a apresentação; vídeo e
  credenciais preservados; alvos de toque e metadados ampliados.
- Apresentação: seletor completo no celular, salto fixo junto ao progresso,
  personalização opcional recolhida e separação do plano alimentar inicial do
  acompanhamento. Os oito artigos originais da etapa 3 continuam acessíveis.
- Cinco etapas, preços/parcelamento apenas na última, contato editável,
  escolhas locais, consentimento e contrato de medição preservados.

## Verificação local

Node 24: 441 testes, lint, typecheck e build aprovados. `git diff --check`
aprovado. Uma rodada visual agrupada com Chromium e confirmação pontual de
mídia/movimento: landing e cinco etapas em 320/390/768/1440px, sem overflow;
imagens 1200px carregadas; quatro detalhes da landing e dois da etapa 3 abrem;
objetivo permanece ao avançar/voltar; botão de valores permanece na tela após
rolagem; seletor, teclado e foco funcionam. Zoom CSS de 200% sem overflow.
Movimento reduzido sem animação após estabilização da transição anterior.
Handoff local interceptado confirmou objetivo/formato opcionais no rascunho,
sem mensagem real ou conversão Google.

Em 390px: landing de 8849 para 7265px (primeira leitura, detalhes fechados);
etapa 3 de 2170 para 1507px. As alturas são medições de layout no navegador,
não evidência de conversão. Os oito destinos continuam `/virada90/conhecer`;
alvos visíveis medidos de 44px ou mais. Conteúdo original comparado no HTML:
apenas orientação de navegação/personalização e resumo de acompanhamento foram
refraseados; informações clínicas detalhadas preservadas.

Capturas e saídas locais em `output/playwright/conversion-*` (ignoradas pelo
Git). Não verificado em aparelho físico ou leitor de tela. A venda e a conversa
recebida precisam de avaliação do CRM; esta alteração não ativa Pulse/Ads.

## Publicação

Registro técnico será atualizado após CI, merge, promoção e verificação do
domínio. Nenhuma mudança de schema, Edge Function ou dado clínico.
