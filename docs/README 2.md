# Documentação do Vivance

Esta pasta contém apenas documentação ativa. Relatórios antigos de Preview,
roteiros concluídos e prompts de ferramentas foram removidos do diretório de
trabalho; o histórico continua disponível no Git.

## Leia nesta ordem

1. [Estado atual](STATUS_ATUAL.md) — o que está publicado, o que foi validado e
   quais bloqueios permanecem.
2. [Funcionalidades](FUNCIONALIDADES.md) — contrato funcional consolidado da
   aplicação atual.
3. [Gate P](GATE_P.md) — critérios antes de usar dados clínicos reais.
4. [Pipeline de publicação](PIPELINE_PUBLICACAO.md) — como código, banco e
   Vercel devem chegar ao mesmo commit.

## Referências na raiz

- [README](../README.md): entrada rápida para desenvolvimento.
- [Produto](../PRODUCT.md): propósito, público e limites do produto.
- [Design](../DESIGN.md): linguagem visual do Vivance.
- [AGENTS](../AGENTS.md): regras para agentes que trabalham no repositório.

## Fonte de verdade

Em caso de divergência, vale esta ordem:

1. código, migrations e testes da `main`;
2. `STATUS_ATUAL.md`;
3. `FUNCIONALIDADES.md`, `PRODUCT.md` e `DESIGN.md`;
4. histórico do Git.

Um build `READY`, HTTP 200 ou uma página pública não comprovam, sozinhos,
migration aplicada, fluxo autenticado ou aceite clínico.
