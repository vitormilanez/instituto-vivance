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
| 1 | **C1 · Preparar o ambiente de teste** | Confirmar o ref do Supabase em cada comando e a configuração do app sem expor chaves; inventariar schema, migrations, backups, papéis e Storage. Registrar diferenças e um modo de reversão antes de qualquer carga. | Parcial: 57 versões de migration pareadas no histórico; backups físicos não listados e restauração não testada. |
| 2 | **C2 · Completar a demonstração** | Usar somente as contas de Guilherme e Vitor; completar e conferir uma jornada longitudinal de demonstração no prontuário de Vitor. | Limpeza e carga histórica parcial executadas: 21 dias seguidos de check-in e 18 refeições fictícias. Quatro exames têm títulos conferidos. A lista e um PDF original foram validados na sessão do médico; sessão do paciente, consulta/retorno e aceite da demonstração seguem pendentes. |
| 3 | **C3 · Validar contexto e operação** | Executar as duas etapas de C3 abaixo com sessões reais de paciente e médico; registrar falhas e decisão de aceite **dos testes**. | Iniciado na sessão do médico: abas e fontes conferidas, altura legada corrigida e check-ins diários incluídos na Linha do tempo em ordem de referência. Ainda sem sessão do paciente ou aceite operacional. |
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
   assinada fictícia ao médico; preservar laudos, nomes originais e medidas
   já existentes. Os quatro exames existentes receberam títulos de exibição
   fiéis ao cabeçalho dos PDFs, sem modificar o arquivo original.
3. **Aceite da demonstração:** conferir contagens, chaves e ausência de órfãos;
   a nova listagem já está publicada e foi conferida na sessão do médico.
   O primeiro PDF original abriu no visualizador do Chrome pelo domínio do app
   após o [PR #66](https://github.com/vitormilanez/instituto-vivance/pull/66).
   Ainda é preciso validar a sessão real do paciente
   e percorrer consulta → registro → acompanhamento → retorno. Guardar evidência do
   ambiente e dos registros utilizados. Isso valida a demonstração, não IA
   clínica nem Gate P.

### Etapas de C3

1. **Contexto longitudinal:** em cada item, conferir origem, data, autoria,
   estado recebido/revisado/publicado e acesso ao original. Validar troca de
   agendamento e navegação pelas abas do histórico de Vitor sem misturar
   informações; a troca entre pacientes fica para outro ciclo. Na primeira
   passagem autenticada do médico, a altura legada de `1,73` apareceu como
   `1,73 cm` em Evolução; o [PR #67](https://github.com/vitormilanez/instituto-vivance/pull/67)
   corrigiu somente a apresentação para `173 cm`, conferida no app publicado.
   Os [PRs #69](https://github.com/vitormilanez/instituto-vivance/pull/69)
   e [#70](https://github.com/vitormilanez/instituto-vivance/pull/70)
   incluíram check-ins diários na Linha do tempo de médico e paciente,
   ordenados pela data de referência e com a hora real do envio explícita.
   A sessão do médico confirmou a sequência de Vitor no app publicado. A
   sessão do paciente e a autoria/estado dos demais tipos de item ainda
   precisam de validação.
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

## Landing Virada 90 — 30/09/2026

Publicação autorizada em `/virada90` no domínio Vivance para o Instituto
Guilherme Martins. Página pública estática, com textos, vídeo, foto e três
links de WhatsApp do material aprovado. Não altera autenticação clínica,
banco, CRM ou regras de cuidado. Publicação técnica confirmada no PR #72, merge `1803dd1`, deployment
`dpl_Gz8nJKSKPbXswJLFML47aYGsGBXc` promovido pela CLI. Ambos os domínios
resolvem para esse artefato. `/virada90` e `/login` responderam HTTP 200.
416 testes, lint, typecheck e build passaram no release `36755802273`;
migrations não necessárias e promoção automática skipped. Navegador no
domínio público confirmou vídeo de 38,3 s, FAQ, três links originais e ausência
de overflow em 390 e 1440 px. Nenhum envio ao CRM realizado.

## Jornada comercial Virada 90 — 02/10/2026

Revisão de 02/10: após apontar conteúdo incompleto, o usuário forneceu as doze telas do protocolo. A apresentação em `/virada90/conhecer` passa a dez tópicos cobrindo pilares, avaliação, plano, acompanhamento, manutenção, exames, suplementos, dúvidas e formatos. [Contrato](VIRADA90_JORNADA.md) e [cobertura das telas](virada90/CONTEUDO_E_IMAGENS.md).

Ambos os programas duram três meses. Presencial com aplicações e medições quando indicadas: 12× R$ 1.000 (total R$ 12.000). Online com acompanhamento e plano alimentar: R$ 6.500 no total em 12×. Valores apenas no último tópico; não há limite de três consultas ou promessa de parcelamento sem juros.

A única saída comercial final prepara mensagem revisável no WhatsApp. Cadastro intermediário, checkout e espaços “video” foram retirados; três imagens editoriais substituem a mídia reservada. Objetivo e formato são opcionais, sem armazenamento. Não há CRM, gravação no banco ou envio automático. Revisão local na branch `codex/virada90-guided-form`, PR #74: 416 testes, lint, typecheck e build passaram com Node 24. Navegação, imagens, valores finais e enquadramentos de 320/390/1440 px foram conferidos; [evidências e limites locais](../apps/web/.impeccable/review/virada90-complete/evidence.md).

Publicação autorizada e realizada em 02/10: PR #74 mesclado em `5d6fe4c`; verificação da main aprovada e deployment `dpl_51T4TDH34NRadvymSWK3XbCBsm5x` promovido manualmente. Os dois domínios apontam para esse artefato. O navegador percorreu a apresentação pública, confirmou as três imagens, escolhas opcionais, navegação e valores apenas no final, com destino ao WhatsApp existente. [Registro de publicação](virada90/releases/2026-10-02/README.md). Isso publica a jornada comercial; os gates clínicos e operacionais permanecem separados.

### Medição da campanha — 03/10/2026

Pedido aprovado: adicionar GA4 e Google Ads usando os destinos existentes do
Instituto Guilherme Martins. Medir visitas, etapas e clique em WhatsApp somente
nas duas páginas públicas e após aceite de cookies. Não enviar objetivo de
saúde nem importar o container inteiro (widget/Meta). [Contrato e IDs conferidos](virada90/MEDICAO_GOOGLE.md).

O Pulse oferece Webhooks de mensagem recebida e widget com origem de visita.
A integração de conversa recebida permanece um próximo slice, dependente de
atribuição consentida e deduplicação; clique não equivale a contato recebido.

Medição pública publicada pelo PR #76 (`a97f94d`), com verificação da main e
promoção manual do deployment `dpl_GG3xheoUfPTYcjjoxfCz2kHbxVxy`.
[Evidências e limites](virada90/releases/2026-10-03/README.md). A confirmação
de recebimento no Google e a configuração da campanha não foram validadas.

### Funil comercial enxuto — 06/10/2026

Como há apenas dois formatos do Virada 90 e uma closer já classifica contatos no CRM, a primeira entrega enriquece o encaminhamento ao WhatsApp com um rótulo de origem de anúncio após consentimento, sem criar outro CRM. O acompanhamento semanal usa conversa recebida, avaliação agendada, comparecimento e entrada no programa, por formato e origem. [Contrato e limites](virada90/FUNIL_COMERCIAL_LEVE.md). O PR #80 foi mesclado e publicado tecnicamente em 06/10/2026; [evidências e limites](virada90/releases/2026-10-06/README.md). A mensagem recebida e a conversão real no Ads não foram confirmadas. O PR #79 de webhook/importação permanece desligado e separado.


## Briefing da consulta e peso — 07/10/2026, entrega local

Na branch `codex/consultation-brief-20261007`, iniciada da `main` atualizada
(`0e28011`), a Home do médico troca as abas da próxima consulta por leitura
contínua: identidade e ação contextual, relatos com fontes, pré-consulta
mais recente aberta, comparação de originais e fatos compactos. As pendências
da pessoa selecionada ficam no briefing; a revisão dos demais inclui documentos
sem somar os mesmos arquivos duas vezes e abre a coleção correta. Agenda,
solicitações, aceite de vínculo e seis ações rápidas do médico são preservados.

O gráfico usa datas reais no eixo, seleção por toque/teclado, peso e data de
cada registro, variação factual em kg/percentual, tabela acessível e cadastro
como referência separada. Não determina peso ideal, gravidade ou conduta.

O serviço de IA fica no servidor, desligado por padrão. O fallback cita
literalmente relatos e calcula lacunas por regra. A IA só pode selecionar
fatos existentes com fontes válidas, mantendo a ordem do servidor; texto
reescrito ou sem fonte é descartado. Não há nova persistência nem migration.
Ativar o envio de dados clínicos ao provedor exige decisão expressa do usuário
sobre fornecedor/LGPD e os gates aplicáveis.

Validação nesta fatia é local e sintética. Não houve push, deploy, escrita no
Supabase nem aceite autenticado/clinico. C3 permanece sem aceite operacional e
Gate P aberto. [Contrato, saídas reais e limites](BRIEFING_CONSULTA_2026-10-07.md).
