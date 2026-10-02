# Virada 90 — revisão completa de 02/10/2026

Superfície pública: `/virada90/conhecer`, branch `codex/virada90-guided-form`, [PR #74](https://github.com/vitormilanez/instituto-vivance/pull/74). A revisão substitui a jornada incompleta; não é evidência de publicação em produção.

## Contrato conferido

- As doze telas HTML fornecidas estão mapeadas em [conteúdo e imagens](../../../../../docs/virada90/CONTEUDO_E_IMAGENS.md), reorganizadas em dez tópicos.
- Ambos os formatos duram três meses. Presencial: 12× R$ 1.000, total R$ 12.000. Online: total R$ 6.500, em 12 parcelas. Valores aparecem somente no último tópico.
- Os espaços de avatar foram substituídos por três imagens editoriais ilustrativas. O vídeo real da landing anterior permanece.
- A única saída comercial final é WhatsApp. Não há cadastro, pagamento, API, CRM ou gravação de dados nesta apresentação.

## Navegador local

O fluxo foi percorrido no navegador real em `http://127.0.0.1:4182/virada90/conhecer`:

- Os dez tópicos podem ser lidos sem selecionar objetivo ou formato.
- Voltar preserva a escolha opcional; o seletor nativo permite ir diretamente ao assunto.
- A troca de etapa mantém somente um tópico visível, atualiza o progresso e move o foco para o título.
- Os dois disclosures de exames/suplementos mostram os exemplos completos. As três imagens carregaram.
- O link final usa `wa.me/5518997551234` e uma mensagem codificada com as escolhas opcionais. O link foi inspecionado, sem enviar mensagem ou abrir conversa com a equipe.
- O botão Continuar deixa de aparecer no último tópico. Nenhum preço apareceu nos tópicos 1–9.

Para os tamanhos de tela, o mesmo HTML/CSS/JS foi carregado em quadros locais de largura fixa, pois o navegador integrado tem largura mínima e a rota não aceita iframe por sua política de enquadramento. Essa verificação não representa um teste em aparelho físico. Não houve overflow horizontal em nenhum dos dez tópicos em 320 e 390 px, nem nos enquadramentos de desktop capturados em 1440 px. Métricas em [layout-metrics.json](layout-metrics.json) e [narrow-layout.json](narrow-layout.json).

As capturas foram recortadas para o quadro e o limite medido do conteúdo, em pixels renderizados 1:1, sem redimensionamento:

- [Entrada no desktop](desktop.jpg) e [entrada em 390 px](mobile.jpg).
- [Avaliação no desktop](assessment-desktop.jpg) e [em 390 px](assessment-mobile.jpg).
- [Plano alimentar](plan-mobile.jpg), [evolução](evolution-mobile.jpg) e [formatos](formats-mobile.jpg).
- [Valores no desktop](final-desktop.jpg), [em 390 px](final-mobile.jpg) e [em 320 px](narrow-final.jpg).

## Checks e revisão

No código atual, com Node 24: `npm test` passou com **416 testes**, `npm run lint`, `npm run typecheck` e `npm run build` encerraram com código zero. `guided.js` passou na checagem de sintaxe. Não foi necessário criar testes que espelhassem conteúdo estático.

O detector Impeccable foi executado uma vez, em modo **degradado**, por indisponibilidade dos parsers `htmlparser2`, `css-select`, `css-tree` e `domutils`. Não avaliou seletores, variáveis CSS ou contraste computado. Registrou avisos sobre Instrument Serif e tokens do mundo global do app; a superfície possui um mundo próprio aprovado. O achado aplicável de animação por largura foi corrigido para `transform: scaleX(...)`. Não declarar um detector limpo ou uma auditoria completa de acessibilidade.

Os seis pares sólidos de texto/ação foram calculados por luminância relativa e ultrapassam 4,5:1; [contraste](contrast.json). As cores principais também foram conferidas no DOM. A inspeção não cobre todas as combinações ou tecnologias assistivas.

A revisão visual independente está em [finish.md](finish.md). Não existe QUALITY BAR card para este mundo customizado; o parecer usa o brief da superfície e o craft floor. A primeira passagem aprovou fidelidade e teto, e pediu apenas reconciliar a documentação de design antiga. O parecer final registra o resultado dessa correção.

## Limites da entrega

Nenhum cliente foi contatado; não houve transação, migration, alteração de autenticação ou de dados clínicos. A jornada permanece em revisão no PR, sem merge ou promoção em produção nesta rodada.
