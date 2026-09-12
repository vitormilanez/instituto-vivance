# Vivance — execução e escolha de modelos

## Política por slice

O usuário pediu escolha automática de modelo por trabalho para equilibrar consumo e qualidade. Aplicar esta política dentro das ferramentas disponíveis; informar brevemente o modelo efetivamente utilizado, sem pedir escolha a cada slice.

- Padrão para implementar 7B.3, 7B.4 e o 7B.5 proposto: `gpt-5.6-terra`, raciocínio `medium`.
- Texto, espaçamento, documentação e correções pequenas com aceite claro: `gpt-5.6-luna`, `low`; usar `medium` se necessário.
- Novos contratos de banco, permissões, idempotência, versionamento e publicação (5A.1, 5B.1, 7A.1/7A.2): `gpt-5.6-sol`, `medium`; `high` somente quando houver complexidade concreta.
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
- Preservar oito ações rápidas da equipe, a Agenda existente e a separação entre aprovação e publicação. Áudio e IA permanecem adiados conforme o plano vigente.

Referências de capacidade: https://learn.chatgpt.com/docs/models e https://learn.chatgpt.com/docs/agent-configuration/subagents . Política definida em 12/09/2026.
