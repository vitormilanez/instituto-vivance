# Documentação do Vivance

Esta pasta contém apenas documentação ativa. Relatórios antigos de Preview,
roteiros concluídos e prompts de ferramentas foram removidos do diretório de
trabalho; o histórico continua disponível no Git.

## Leia nesta ordem

1. [Direção e slices](DIRECAO_E_SLICES.md) — objetivo, sequência atual e decisões
   de escopo, inclusive o ambiente temporário de testes.
2. [Plano de IA clínica](PLANO_IA_CLINICA.md) — capacidade futura, governança e
   gates próprios.
3. [Estado atual](STATUS_ATUAL.md) — fotografia datada do que foi comprovado e
   das pendências.
4. [Funcionalidades](FUNCIONALIDADES.md) — contrato funcional consolidado da
   aplicação atual.
5. [Gate P](GATE_P.md) — critérios antes de usar dados clínicos reais.
6. [Guia operacional Codex](GUIA_OPERACIONAL_CODEX.md) — passos para publicar,
   promover o domínio e localizar as áreas do produto.
7. [Pipeline de publicação](PIPELINE_PUBLICACAO.md) — como código, banco e
   Vercel devem chegar ao mesmo commit.

## Referências na raiz

- [README](../README.md): entrada rápida para desenvolvimento.
- [Produto](../PRODUCT.md): propósito, público e limites do produto.
- [Design](../DESIGN.md): linguagem visual do Vivance.
- [AGENTS](../AGENTS.md): regras para agentes que trabalham no repositório.

## Fonte de verdade

Em caso de divergência, vale esta ordem:

1. código, migrations e evidência viva do ambiente para afirmar implementação;
2. `DIRECAO_E_SLICES.md` e `PLANO_IA_CLINICA.md` para direção aprovada;
3. `STATUS_ATUAL.md` para a fotografia técnica datada;
4. `FUNCIONALIDADES.md`, `PRODUCT.md`, `DESIGN.md` e histórico do Git.

O Asana acompanha a execução, mas pode estar atrasado em relação a uma decisão
nova. Atualize o documento e a tarefa correspondente depois de conferir o
estado vivo; não transforme um card em prova de entrega.

Um build `READY`, HTTP 200 ou uma página pública não comprovam, sozinhos,
migration aplicada, fluxo autenticado ou aceite clínico.
