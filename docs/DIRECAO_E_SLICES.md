# Direção do Vivance e próximos slices

**Decisões vigentes reconciliadas em 14/10/2026.** Estado de publicação em
[STATUS_ATUAL](STATUS_ATUAL.md), execução em [CHECKPOINTS](CHECKPOINTS_ENTREGAS.md)
e decisões substituídas no [histórico](historico/EVOLUCAO_ATE_2026-10-14.md).
Esta organização não autoriza iniciar um novo slice nem altera regras clínicas.

## Produto e fronteiras

Cuidado longitudinal supervisionado:
**convite → contexto inicial → preparação → consulta → registro médico →
acompanhamento → retorno**. O médico interpreta e decide. Relato literal,
extração, cálculo, revisão, aprovação e publicação têm origens/estados distintos.

O domínio público usa temporariamente o dev sintético `oxuwrdjojsmgxoljqkuk`.
Dados reais exigem produção separada e [Gate P](GATE_P.md). Preservar registros
de origem incerta; não repetir limpezas ou resets narrados no histórico.

## Experiência aprovada e implementada

- **Hoje:** visão operacional das consultas do dia e pendências de maior impacto.
  Indicadores usam dados existentes; não simular tendências. Contexto clínico
  detalhado pertence à ficha. Próxima consulta não domina a página principal.
- **Navegação:** uma navegação principal inferior para o médico, branco/azul/navy,
  com destinos secundários em Mais. Preservar os oito destinos/ações existentes;
  a antiga grade gigante de widgets e o menu superior/lateral não são o layout vigente.
  Outros papéis mantêm suas jornadas próprias.
- **Sem consultas:** ação Agendar consulta → Agenda; carrossel manual de incentivo.
  Texto e destinatários elegíveis são revisados antes do envio; nunca disparar
  mensagens automaticamente nem presumir WhatsApp/e-mail.
- **Pacientes:** lista, busca e acesso à ficha primeiro. Convite, histórico de
  convites e cadastro sem app são tarefas locais separadas, com ações próximas.
- **Agenda/Mensagens:** preservar calendário, modos, dados e rascunhos; priorizar
  ação do horário e conversa. Contexto secundário sob expansão.
- **Fluidez:** minimizar saltos, manter posição/rascunho quando aplicável, foco
  acessível e movimento reduzido. Transição visual não prova salvamento.

Contratos: [Design](../apps/web/DESIGN.md), [Ficha](FICHA_PACIENTE.md),
[Onboarding](ONBOARDING_PACIENTE.md) e [Funcionalidades](FUNCIONALIDADES.md).

## Exames e IA

Recebimento em ciclos de 15 arquivos distintos por paciente/clínica; novo ciclo
somente pelo médico responsável, com motivo, versão e auditoria. Deduplicação
não consome outra vaga nem chama IA novamente. Conferência dos itens, resolução
de pendências documentais e aprovação do resumo são atos diferentes.

A extração factual e o resumo sob solicitação com manifesto/cache já existem.
Não planejar novamente a aprovação/publicação como se faltasse código: o fluxo
foi publicado tecnicamente em 11/10. O próximo gate é qualidade/curadoria/aceite,
não um gerador livre de hipóteses. Possibilidades só com fontes autorizadas e
aplicáveis, revisão médica e gates do [plano clínico](PLANO_IA_CLINICA.md).

Usar regras determinísticas para datas, medidas e comparações inequívocas.
Modelo só para organizar informação autorizada com qualidade, custo e fonte
verificáveis. Não chamar IA ao abrir a ficha. RAG exige biblioteca curada;
MCP não substitui autorização, proveniência ou revisão.

## Teleconsulta: direção atual

- **Disponível:** link manual de sala externa e transcrição gratuita do
  navegador, iniciada pelo médico. Captura pode ser parcial; sem áudio armazenado.
- **Preparado:** conexão individual Google e sala exclusiva do agendamento.
  Projeto de teste separado, API/cliente/configuração de servidor publicados.
  Google Auth Testing somente para `vtrconsultingbr@gmail.com`; grant pessoal
  pendente e transcrição nativa `false`.
- Escopo `meetings.space.settings` abrange configurações de todas as chamadas,
  embora o adapter só opere salas próprias. Obter ciência na concessão; não
  remover o OFF dos artefatos para esconder esse alcance.
- **Pedido ainda não implementado:** paciente decide antes de entrar; recusar
  não cancela atendimento; médico vê estado curto; resumo e original ficam na
  mesma consulta após o provedor concluir. Preferir notas Google quando elegíveis,
  sem fornecedor/chamada de IA adicional implícitos.

Contratos: [Teleconsulta](TELECONSULTA.md),
[Google e navegador](TELECONSULTA_GOOGLE_MEET.md) e
[consentimento/pós-consulta](CONSENTIMENTO_E_POS_CONSULTA.md).

## Ordem do trabalho restante

| Frente | Próxima conclusão verificável |
| --- | --- |
| Consentimento por consulta | Implementar decisão pelo paciente autenticado, recusa/retirada versionadas e estado de entrada/médico; preservar consulta sem transcrição. |
| Conexão e chamada Google | Grant pessoal no mesmo navegador da sessão médica; testar sala/conta elegível. Conectar não ativa transcrição nem prova licença. |
| Pós-consulta | Só após contrato de consentimento/background, vincular artefatos finais e notas privadas à consulta, com retries, origem e revisão. |
| Exames IA2/IA3–IA6 | Gabarito/qualidade, curadoria versionada, aplicabilidade, métricas e aceite médico antes de ampliar análise. |
| C2/C3 operacional | Jornada paciente → pedido/resposta → revisão/recibo → consulta/retorno, papéis/vínculos e persistência, sem forjar assinatura ou conduta. |
| C1/Gate P | Produção separada, restauração, segurança/privacidade/retenção e aceite explícito antes de dados reais. |
| Convites | Validar ativação/aceite/entregabilidade externa sem prometer caixa de entrada nem recriar contas antecipadamente. |

Asana acompanha execução e pode estar atrasado; reconciliar após decisões novas.
Virada90 e conversões comerciais seguem em [frente separada](VIRADA90_JORNADA.md).
