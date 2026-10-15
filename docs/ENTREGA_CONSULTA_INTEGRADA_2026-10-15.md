# Consulta integrada, ficha e agenda — 15/10/2026

## Autorização e escopo

Usuário aprovou o fluxo local e autorizou publicar. Confirmou expressamente
reutilizar a credencial Anthropic existente na Vercel do Vivance e habilitar
o resumo automático. Nenhuma chave foi exibida ou adicionada ao Git.
Não autoriza dados reais: domínio continua temporariamente no dev sintético,
com Gate P e aceite clínico separados.

Lote isolado sobre origin/main d0c80bd, preservando o checkout canônico:

- Agenda compacta, horários clicáveis, agendar/bloquear e criação/recuperação
  do Meet pela integração existente.
- Login direto para uma clínica, preservando múltiplas clínicas/onboarding.
- Início/retomada, pausa, checkpoints de texto e encerramento assistido.
- Consentimento versionado do próprio paciente; recusa/retirada não impedem
  atendimento manual.
- Fonte imutável, resumo factual com citações, correção/rejeição/revisão
  versionada e privada. Revisar resumo não finaliza atendimento nem publica.
- Histórico na ficha médica com data/horário da consulta em Brasília,
  modalidade, médico, versão/data da versão e status de revisão.

## Banco e configuração

Destino confirmado: instituto-vivance-dev, oxuwrdjojsmgxoljqkuk, sa-east-1.
Migrações autorizadas:

- 20261015185506_agenda_time_blocks
- 20261015192136_consultation_integrated_workflow
- 20261015200227_consultation_patient_history

As três foram aplicadas em 15/10 após dry-run limitado a elas, sem seeds,
roles ou atualização do Vault. Advisors de segurança nível error sem achados.

Vercel confirmado: vtr-consulting/instituto-vivance,
prj_ligeZuFRycRXA21u5rRzaLAORTrI, apps/web, Node24.
Production recebeu ANTHROPIC_API_KEY como Secret e
VIVANCE_AI_CONSULTATION_SUMMARY=on como Config. Meet nativo continua OFF.
Deployment anterior: dpl_4p9FDRFXVwf6XH2ij36G6wq1qtMU.

## Verificação pré-integração

627 testes passaram; typecheck e build webpack passaram com Node24.
Lint sem erros, apenas aviso preexistente no onboarding. Revisão crítica
delimitada não encontrou bloqueador. Não repetir como aceite clínico.
Desktop/mobile locais, fonte, recarga, consentimento e histórico conferidos
com fixtures. Saída sintética de 35 turnos, 1.499 palavras, aproximadamente
15 minutos: 20 itens, citações exatas validadas. Expectativa/meta ficaram nas
seções trocadas; achado preservado, prompt futuro ajustado e correção humana
disponível. Falantes anotados manualmente nessa amostra.

## Limites

O navegador real fornece autoria desconhecida; não há diarização validada.
Captura real das duas pontas, qualidade clínica e Gate P permanecem pendentes.
Falha/ausência de IA preserva fallback extrativo identificado e registro
manual. Não migrar fixtures locais para registros reais.

## Publicação

Em preparação. Registrar PR/SHA, execução efetiva das migrações, deployment,
domínios e percurso autenticado após concluir; não inferir sucesso de READY.
