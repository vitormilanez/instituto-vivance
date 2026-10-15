# Vivance — execução e escolha de modelos

## Entrada rápida

O único checkout Git é `/Users/vitormilanez/Desktop/Codes/vivance`.
Confirme Git/HEAD e o [registro de consolidação](docs/CONSOLIDACAO_REPOSITORIO.md)
antes de usar resultados antigos como estado vigente. Leia [STATUS_ATUAL](docs/STATUS_ATUAL.md),
[DIRECAO_E_SLICES](docs/DIRECAO_E_SLICES.md) e
[CHECKPOINTS_ENTREGAS](docs/CHECKPOINTS_ENTREGAS.md). Para exames, leia também
[IA2_EXAMES](docs/IA2_EXAMES.md) e [CONTA_TESTE](docs/CONTA_TESTE.md).
Antes de propor novo trabalho, aplique o
[brief e método por slices](docs/RETOMADA_DESENVOLVIMENTO.md).

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
  Se a branch consultada ainda não contiver a direção, procure o PR documental
  vigente antes de confiar em um status antigo da `main`.
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

O usuário pode escolher manualmente, a qualquer momento, o modelo e o esforço
de raciocínio disponíveis no Codex. Essa escolha prevalece para a conversa ou
entrega atual e substitui os padrões abaixo, inclusive se mudar durante o
trabalho. Estas instruções não devem ser apresentadas como uma restrição ao
seletor de modelos da interface nem como motivo para impedir a troca.

Na ausência de uma escolha manual vigente, aplicar esta política para equilibrar
consumo e qualidade; informar brevemente o modelo efetivamente utilizado, sem
pedir escolha a cada slice.

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
- Preservar os oito destinos/ações da equipe e a Agenda existente; para o médico, a decisão de 14/10 substitui os widgets grandes por Hoje operacional, ficha organizada e navegação inferior única. Aprovação e publicação continuam separadas.
- Transcrição manual do navegador foi autorizada/publicada em 14/10, sem arquivo de áudio. Nativa do Meet permanece preparada/OFF; consentimento direto do paciente e resumo automático pós-call ainda não implementados. Não tratar o antigo adiamento de áudio como bloqueio da opção manual já entregue nem como autorização para novas capturas. IA clínica segue seus gates.

Referências de capacidade: https://learn.chatgpt.com/docs/models e https://learn.chatgpt.com/docs/agent-configuration/subagents . Política definida em 12/09/2026.
