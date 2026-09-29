# Direção do Vivance e próximos slices

Atualizado em 29/09/2026. Este é o plano vigente. O [estado técnico](STATUS_ATUAL.md) registra o que foi comprovado; o [plano de IA clínica](PLANO_IA_CLINICA.md) detalha essa frente.

## Resultado que estamos construindo

O Vivance organiza o cuidado longitudinal antes, durante e depois da consulta. Paciente e médico compartilham uma linha do tempo rastreável: relato original, documento, medida, consulta, mensagem, revisão profissional e orientação publicada. O médico decide interpretação e conduta. A interface mostra origem, data, autoria e estado de revisão, sem preencher lacunas.

O fluxo principal é **convite → contexto inicial → preparação → consulta → registro médico → acompanhamento → retorno**. O fluxo manual continua disponível quando não há IA, exame, integração ou dado suficiente.

## Base consolidada

| Área | Base existente | Limite |
| --- | --- | --- |
| Acesso | Auth, papéis, clínica, vínculo e autorização no banco | Administrador não recebe acesso clínico automático. |
| Jornada | Convite, onboarding, pré-consulta, agenda e atendimento | Horário vencido não determina realização; o médico finaliza. |
| Continuidade | Check-ins, refeições, medidas, pedidos, mensagens e evolução | Originais permanecem; gráficos não diagnosticam. |
| Documentos e saídas | Arquivo privado, revisão humana, receitas anteriores e relatório versionado | Aprovar, publicar e exportar são ações distintas. |
| Plataforma | Migrations, RLS, auditoria e fundação de processamento | Worker e análise clínica por IA ainda não estão ativos. |

## Próximos slices — ordem executável

Os códigos organizam o plano atual; não renumeram entregas anteriores. A
[fotografia de 29/09](STATUS_ATUAL.md) e as tarefas do Asana registram o que já
foi observado. Nenhum card, PR ou deployment substitui o aceite do próprio
slice.

**Decisão de ambiente:** usar temporariamente `instituto-vivance-dev`
(`oxuwrdjojsmgxoljqkuk`) como projeto único para testes sintéticos. C2 pode
avançar sem um segundo banco. Separar desenvolvimento e produção, testar
restauração e fechar o [Gate P](GATE_P.md) permanecem requisitos antes de dados
de saúde reais; o uso temporário não conclui C1 para operação clínica.

| Ordem | Slice | Entrega verificável | Estado em 29/09 |
| --- | --- | --- | --- |
| 1 | **C1 · Preparar o ambiente de teste** | Confirmar o ref do Supabase em cada comando e a configuração do app sem expor chaves; inventariar schema, migrations, backups, papéis e Storage. Registrar diferenças e um modo de reversão antes de qualquer carga. | Parcial: 56 versões de migration pareadas no histórico; backups físicos não listados e restauração não testada. |
| 2 | **C2 · Completar a demonstração** | Usar somente as contas de Guilherme e Vitor; completar e conferir uma jornada longitudinal de demonstração no prontuário de Vitor. | Limpeza executada. Carga histórica parcial: 19 check-ins retrospectivos e 18 refeições fictícias, sem duplicação; há 21 dias seguidos de check-in ao todo. Consulta/retorno e aceite pela interface pendentes. |
| 3 | **C3 · Validar contexto e operação** | Executar as duas etapas de C3 abaixo com sessões reais de paciente e médico; registrar falhas e decisão de aceite **dos testes**. | Não validado neste ciclo. |
| Paralelo | **IA1 · Governança e contrato** | Obter decisão sobre finalidade, fonte, fornecedor, privacidade, rastreabilidade e revisão médica no [contrato IA1](https://github.com/vitormilanez/instituto-vivance/pull/64). | Rascunho em revisão; nenhuma análise clínica por IA ativa. |
| Depois | **IA2–IA3** | Extração conferível de poucos exames sintéticos e biblioteca versionada de fontes aprovadas. | Aguarda aceite de IA1. |
| Depois | **IA4–IA6** | Evidência aplicável, verificação independente, revisão médica e validação clínica com limites previamente definidos. | Aguarda IA1–IA3 e gates clínicos. |

### Etapas de C2

1. **Curadoria concluída:** por decisão expressa de 29/09, manter apenas
   Guilherme e Vitor. Foram removidas as outras seis contas, os outros 19
   prontuários e os seis objetos do Storage associados ao prontuário de teste.
   O usuário dispensou a manutenção de cópia. A verificação final encontrou
   duas contas, um prontuário e cinco objetos vinculados a Vitor.
2. **História sintética coerente:** a carga repetível em
   [`scripts/demo/seed_vitor_history.sql`](../scripts/demo/seed_vitor_history.sql)
   adicionou 19 check-ins datados de 08–28/09, sem sobrescrever os dois
   existentes, e 18 refeições datadas de 19–28/09. Todos os novos textos
   começam com `DEMONSTRAÇÃO`; a data técnica de criação registra a carga, não
   finge o envio no passado. O script foi executado duas vezes sem duplicar.
   Ainda faltam marcos coerentes de consulta e retorno validados pelo médico e
   eventual complemento documental. Não atribuir decisão clínica ou nota
   assinada fictícia ao médico; não alterar exames e medidas já existentes.
3. **Aceite da demonstração:** conferir contagens, chaves e ausência de órfãos;
   abrir os exames pela interface; entrar com sessões reais de paciente e
   médico e percorrer consulta → registro → acompanhamento → retorno. Guardar evidência do
   ambiente e dos registros utilizados. Isso valida a demonstração, não IA
   clínica nem Gate P.

### Etapas de C3

1. **Contexto longitudinal:** em cada item, conferir origem, data, autoria,
   estado recebido/revisado/publicado e acesso ao original. Validar troca de
   agendamento e navegação pelas abas do histórico de Vitor sem misturar
   informações; a troca entre pacientes fica para outro ciclo.
2. **Aceite operacional dos testes:** executar os caminhos de médico e paciente
   com as duas contas mantidas; conferir persistência e a separação entre
   revisão e publicação. Os testes de administrador, enfermagem e isolamento
   entre pacientes exigem contas de teste em um ciclo posterior e não serão
   declarados aceitos com este ambiente de duas contas. Registrar
   defeitos, correções e aceite técnico do ambiente compartilhado. O Gate P
   permanece **não liberado**
   enquanto faltarem produção separada, backup/restauração e os demais
   critérios para dados reais.

Os slices de interface já aprovados podem continuar se não mudarem o contrato
clínico. IA1 pode avançar em paralelo como trabalho de governança. IA2–IA3
usam apenas material sintético; uso assistencial de IA depende dos gates
próprios e mantém o fluxo manual.

## Decisões antes de IA clínica

1. Direção médica, gestão e assessoria regulatória definem finalidade pretendida e saídas permitidas.
2. Guilherme aprova fontes, populações aplicáveis, revisão e retirada de versões.
3. Produto e engenharia definem como cada valor volta ao arquivo e à página originais, inclusive após correção humana.
4. Governança define fornecedor, dados permitidos, retenção, acesso, auditoria e incidente.
5. O piloto começa pequeno, com dados sintéticos e casos anonimizados revisados; expansão depende de métricas aceitas pelo médico.

Cada slice entrega contrato, migrations versionadas quando necessárias, testes de autorização e falha, interface verificável e evidência no ambiente correto. Implementação local, Preview, publicação técnica e aceite clínico são marcos separados.
