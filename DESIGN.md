---
name: "VIVANCE"
description: "Ponte para o sistema visual canônico da aplicação autenticada."
status: "Somente redirecionamento; o sistema visual canônico está em apps/web/DESIGN.md."
---

# Sistema visual VIVANCE

**Este arquivo não descreve mais o sistema visual.** Ele existe só para apontar
para o documento canônico e impedir que duas fontes descrevam produtos
diferentes.

## Canônico

**[`apps/web/DESIGN.md`](apps/web/DESIGN.md)** é o sistema visual da aplicação
publicada: paleta, tipografia, espaçamento, forma, elevação, componentes e as
regras de navegação e disponibilidade de `apps/web`.

Leia aquele arquivo antes de criar ou alterar qualquer tela. Ferramentas que
carregam o sistema visual a partir da raiz devem ser apontadas para
`apps/web/DESIGN.md`.

## O que havia aqui

A versão anterior descrevia o **protótipo** que ocupava a raiz do repositório —
uma referência visual preservada, com paleta e tokens próprios (`midnight`,
`gold-logo`, `amber-soft`, `rose-soft`) que nenhuma tela da aplicação atual usa.

Manter dois documentos descrevendo sistemas diferentes produziu divergências
reais: o guia de `apps/web` afirmava uma fonte que a aplicação não carrega e
negava sombras que o `globals.css` declara, enquanto este arquivo listava
tokens sem uso. O protótipo continua no histórico do Git.

O contexto de produto permanece em [`PRODUCT.md`](PRODUCT.md).
