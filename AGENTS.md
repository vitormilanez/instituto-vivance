# Vivance — execução e escolha de modelos

Antes de atuar em uma área do produto, leia
[`docs/DIRECAO_E_SLICES.md`](docs/DIRECAO_E_SLICES.md) e
[`docs/STATUS_ATUAL.md`](docs/STATUS_ATUAL.md). Para IA clínica, leia também
[`docs/PLANO_IA_CLINICA.md`](docs/PLANO_IA_CLINICA.md). Antes de publicar,
leia [`docs/GUIA_OPERACIONAL_CODEX.md`](docs/GUIA_OPERACIONAL_CODEX.md) e
confirme o estado vivo, sem reutilizar IDs ou resultados antigos.

## Fonte de verdade e integrações

- Localize primeiro o checkout Git real; a pasta aberta no Codex pode ser apenas
  um protótipo. Consulte `docs/DIRECAO_E_SLICES.md`, `docs/STATUS_ATUAL.md` e
  os critérios do slice, mas confira no Git e nos ambientes o que de fato existe.
- O Asana é o quadro de execução e pode estar desatualizado. Antes de criar
  tarefas ou pedir uma decisão, confronte o quadro com as decisões recentes da
  conversa, o plano vigente e o estado vivo. Após uma decisão nova, atualize o
  documento de direção/status e a tarefa correspondente, com data e evidência.
- Há acesso ao Asana pelo conector, ao Supabase pela CLI (`npx supabase`) e à
  Vercel pelo conector ou CLI. Confirme a conta, equipe, projeto, ref e ambiente
  em cada chamada: uma conexão disponível não prova acesso ao destino Vivance.
  Não exponha chaves nem escolha um destino de banco por nome de variável.
- Antes de repetir uma pergunta ao usuário ou declarar um slice concluído,
  consulte pedidos anteriores e verifique a implementação e os dados atuais.
  Separe planejamento, teste sintético, publicação técnica e aceite clínico.
- Decisão de 29/09/2026: o projeto `instituto-vivance-dev`
  (`oxuwrdjojsmgxoljqkuk`) é o ambiente único temporário para testes
  sintéticos. A separação para produção permanece pendente antes de dados reais
  e do Gate P. Não excluir registros de origem incerta ao preparar C2.

## Política por slice

O usuário pediu escolha automática de modelo por trabalho para equilibrar consumo e qualidade. Aplicar esta política dentro das ferramentas disponíveis; informar brevemente o modelo efetivamente utilizado, sem pedir escolha a cada slice.

- Padrão para implementação de interface e fluxos com contrato já definido: `gpt-5.6-terra`, raciocínio `medium`.
- Texto, espaçamento, documentação e correções pequenas com aceite claro: `gpt-5.6-luna`, `low`; usar `medium` se necessário.
- Novos contratos de banco, permissões, idempotência, versionamento e publicação: `gpt-5.6-sol`, `medium`; `high` somente quando houver complexidade concreta.
- Problema difícil de arquitetura, falha persistente sem causa ou revisão crítica delimitada: `gpt-6-astra`, `medium`. Reavaliar depois do diagnóstico; não manter o modelo mais caro por inércia.
- Disponibilidade e nomes podem mudar. Conferir modelos efetivamente oferecidos antes de selecionar; não substituir silenciosamente por um modelo mais caro quando indisponível.

## Delegação econômica

Estas instruções solicitam delegação seletiva para subtarefas concretas e independentes quando o agente principal tiver trabalho útil em paralelo (por exemplo, implementação delimitada enquanto o principal verifica contratos adjacentes, ou revisão independente de uma alteração crítica). Escolher explicitamente o modelo e o raciocínio do agente conforme a política acima. Não delegar apenas para trocar de modelo, não duplicar investigação e não usar vários agentes por rotina. Um agente de execução por padrão; dois somente quando houver independência real ou skill aplicável exigir duas avaliações.

Quando o modelo principal já for adequado e não houver trabalho independente, executar diretamente. A configuração local define padrões; não é um roteador nativo que troca o modelo principal durante o turno. Não alegar que ocorreu troca sem evidência. Se uma seleção do aplicativo prevalecer, explicar isso uma vez e continuar o trabalho autorizado com o menor custo viável. Não criar tarefas no sidebar, enviar mensagens à própria tarefa nem iniciar processos Codex aninhados para contornar essa limitação.

## Controle de consumo e escopo

- Um slice delimitado por vez, com contexto e critérios de aceite suficientes; reutilizar o planejamento e as evidências existentes.
- Contexto curto para agentes: objetivo, arquivos, restrições e aceites. Evitar copiar a conversa inteira quando não necessário.
- Testes focados nos caminhos/riscos alterados; uma rodada visual agrupada e correção dos achados concretos. Repetir apenas quando mudanças ou falhas justificarem.
- Ao escalar, registrar a causa e encaminhar somente o problema delimitado e suas evidências. Não repetir a análise inteira.
- Não usar Max/Ultra por padrão. Preferências explícitas posteriores do usuário prevalecem.
- Escolha de modelo não autoriza iniciar slices ainda não solicitados, migrar banco, publicar, contratar serviços ou alterar regras clínicas.
- Preservar oito ações rápidas da equipe, a Agenda existente e a separação entre aprovação e publicação. Áudio permanece adiado; IA clínica segue os gates do plano separado.

Referências de capacidade: https://learn.chatgpt.com/docs/models e https://learn.chatgpt.com/docs/agent-configuration/subagents . Política definida em 12/09/2026.
