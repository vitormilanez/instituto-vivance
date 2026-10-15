# Teleconsulta: agendamento, sala e registro

Contrato vigente em 14/10/2026. O Meet abre em aba/janela externa; Vivance
organiza agendamento, contexto e registro. Não simula câmera/microfone ou afirma
que a pessoa entrou/terminou a reunião por ter clicado no link.

## Jornada

1. Agenda mantém Presencial/Teleconsulta e link canônico de sala já criada.
   Teleconsulta oferece preparar sala para um horário existente, sem duplicar
   agendamento; nova consulta continua acessível pela Agenda.
2. Link manual permanece disponível. Criação automática depende da conexão
   Google individual preparada, ainda sem grant pessoal concluído.
3. Médico abre a reunião externa e usa atendimento/contexto no Vivance.
   Paciente vê Entrar na teleconsulta somente na própria consulta autorizada.
4. Rascunho, finalização, revisão e publicação têm ações e estados próprios;
   fechar o Meet não finaliza o registro nem publica orientação.
5. Texto gratuito manual está no contexto da consulta. Transcrição nativa
   está OFF; consentimento direto do paciente/arquivo pós-call não estão ativos.
   [Contrato Google/navegador](TELECONSULTA_GOOGLE_MEET.md).

## Persistência e limites

- `appointment_teleconsultations`: configuração única por clínica/agendamento,
  modalidade, provedor, URL, versão e autoria. Sem configuração, preservar fluxo presencial.
- GET/PUT em `/api/v1/clinics/:tenantId/appointments/:appointmentId/teleconsultation`.
  `delivery_mode`, `join_url` e `version`; versão0 cria, versão lida atualiza.
  Presencial exige URL nula; vídeo manual aceita URL canônica Meet sem parâmetros/fragmentos.
- Permissões dependem de papel, clínica e atribuição. Paciente lê apenas sua
  configuração em estado permitido, sem escrita; anônimo não acessa.
- Lock/versionamento/auditoria não expõem URL da reunião em logs de auditoria.
  Fluxo manual usa sessão do usuário; adapters Google privados têm contrato próprio.
- Modo atendimento salva rascunho pela API clínica com debounce/serialização;
  resposta não substitui texto digitado depois. Falha conserva edição e permite
  retry manual; alterações pendentes exigem confirmação ao sair. Sem prontuário em localStorage.
- Modalidade, link e captura respeitam estado/versionamento do agendamento.
  Conferir a regra vigente da API; não reutilizar a restrição inicial de 23/09
  como se nenhuma evolução posterior tivesse ocorrido.

Migrations iniciais `20260924003423`/`20260924003636`, evolução para atendimento
em curso e Google/navegador estão no Git; não reaplicar histórico. A
[linha do tempo](historico/EVOLUCAO_ATE_2026-10-14.md) referencia as evidências
antigas sem transformar advisor/count/estado de tabela vazio em inventário atual.

## Aceite

Publicação/contratos testados não equivalem a chamada real com dois participantes,
licença, precisão de áudio ou consentimento direto do paciente.
[Consentimento e pós-consulta](CONSENTIMENTO_E_POS_CONSULTA.md) seguem propostos;
aceite clínico e [Gate P](GATE_P.md) permanecem obrigatórios antes de dados reais.
