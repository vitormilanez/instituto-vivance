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

Publicado pelo PR143, integrado em 5df63e0be445c8e10e679589948f512cd3042650.
CI da PR 38802142520: instalação, 627 testes, lint, tipos e build passaram.
Release 38802469515: verify passou; migrate/promote terminaram verdes mas as
operações internas foram skipped. Banco foi aplicado e conferido manualmente,
com permissões RPC anon/authenticated=false e service_role=true; frontend
assumiu domínio pela integração Git/auto-assignment.

Deployment dpl_GJ4TsU5iShgN5DmrjBvew2yWY9wr,
instituto-vivance-mus3d76um-vtr-consulting.vercel.app, production/READY,
gitSource.sha=5df63e0 e projeto correto confirmados na API autenticada.
Ambos os domínios resolveram ao mesmo ID. Três requisições ao login principal:
200, TTFB 0,177–0,251 s; secundário:307 para o principal, TTFB 0,043–0,124 s.

Sessão médica existente conferiu /clinicas indo direto ao workspace, grade
compacta/slot com Agendar ou Bloquear sem salvar, Teleconsulta e consulta
sintética antiga sem iniciar captura, e ficha com novo histórico em estado
vazio, sem erro. Nenhum registro clínico, consentimento ou áudio foi criado
no remoto nesta conferência; a amostra de 15 minutos continua apenas local.
Geração de IA pela aplicação publicada e captura real ainda não exercitadas.
Capturas privadas em output/teleconsulta-20261015/{ficha,agenda}-publicada.jpg.
