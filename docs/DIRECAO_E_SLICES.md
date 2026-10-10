# Direção do Vivance e próximos slices

**Pacote publicado em 10/10:** PRs #97/#98, SHA `95bc995`, domínio principal
conferido após promoção pela CLI. Próximo: gerar convite novo (o de 08:27
está cancelado) e percorrer aceite/onboarding no celular.

**Ajuste prioritário de 10/10:** facilitar convite e primeiro acesso antes de
avaliar novamente o onboarding. Adotar do conceito do Claude a ação de convite
na própria área de Pacientes, estados recentes visíveis e alternativa discreta
para ficha sem app, adaptados ao azul-marinho e componentes do Vivance. Não
copiar o QR de recepção sem contrato de aprovação do médico e prevenção de
cadastros não autorizados. Google Sign-In depende de configuração OAuth real.

**Estado do cenário de teste em 10/10:** após pedido explícito de limpar todos
os pacientes, o dev sintético está sem fichas, vínculos de paciente ou arquivos.
O convite pendente para `vitor.milanezz@gmail.com` permite recomeçar o
onboarding. As contagens e IDs de pacientes nos relatos abaixo são históricos;
o [status](STATUS_ATUAL.md) registra o reset. A próxima observação útil é Vitor
aceitar o convite e percorrer o onboarding no celular, antes de alegar aceite
do fluxo. Não recriar automaticamente os cenários C2/C3/IA2 apagados.

Consolidada em **08/10/2026**, preservando decisões anteriores e incorporando
as orientações do usuário para a retomada. O [status](STATUS_ATUAL.md) separa
código integrado, pilotos e evidências; o [histórico útil](historico/README.md)
preserva decisões únicas e aponta às evidências anteriores. Reorganizar este plano não aprova novos slices.
Para executar a sequência sem misturar evidência e aceite, use os
[checkpoints das entregas](CHECKPOINTS_ENTREGAS.md).

## Resultado que estamos construindo

Cuidado longitudinal supervisionado: **convite → contexto inicial → preparação
→ consulta → registro médico → acompanhamento → retorno**. Paciente e médico
compartilham uma linha do tempo com relato original, documento, medida, consulta,
mensagem, revisão profissional e orientação publicada.

O médico decide interpretação e conduta. Mostrar origem, data, autoria e estado
de revisão; lacunas continuam visíveis. O fluxo manual permanece disponível.
Preservar papéis, clínica/vínculo, RLS, auditoria, versionamento, oito ações rápidas
da equipe, Agenda e a distinção entre aprovar, publicar e exportar.

## Prioridade atual — onboarding paciente

**Decisão em 09/10:** antes de retomar ampliações C3/IA2, entregar o
[onboarding progressivo](ONBOARDING_PACIENTE.md): contexto e objetivo inicial →
conclusão animada → Hoje → alimentação → fotos → exames anteriores. Reutilizar
coleta existente e remover a repetição das cinco perguntas genéricas no caminho
padrão. O pacote único foi integrado à `main` pelo PR #95 e publicado
tecnicamente em 09/10, sem publicação individual dos slices. Implementação,
Preview, domínio principal e aceite permanecem checkpoints separados; o smoke
test autenticado com as duas contas sintéticas está no [status](STATUS_ATUAL.md).
O wizard inicial foi percorrido em 09/10 com uma conta nova sintética no celular:
convite, retomada, envio, conclusão e Hoje. Os ajustes descobertos estão na
branch `codex/onboarding-novo-paciente-20261009`; ainda faltam revisão dessa
branch e aceite de usabilidade. Permanecem os limites C3/IA2 e Gate P.

## Experiência médica — orientação para a próxima proposta

- **Hoje:** leitura operacional de agenda, próxima consulta, solicitações e itens
  para revisão. Preservar o briefing já entregue e evitar repetir detalhes de
  todos os pacientes ou classificar urgência automaticamente.
- **Pacientes:** identificação e medidas disponíveis; objetivos, expectativas e
  dificuldades declaradas; condições, medicamentos, alergias e histórico
  informados; evolução, pendências e documentos com acesso ao original.
- Separar visualmente relato literal, dado extraído, cálculo e interpretação
  profissional. Medida ausente não é zero; ausência de registro não prova baixa adesão.
- Leitura rápida com detalhes progressivos e histórico completo acessível.
  Preservar a identidade existente; não criar outro design system nem redesenhar
  partes fora do escopo. Cada novo campo exige confirmar coleta e persistência reais.

## Frentes e dependências

**Ambiente:** manter temporariamente `instituto-vivance-dev`
(`oxuwrdjojsmgxoljqkuk`) somente para testes sintéticos. C2/C3 podem continuar
nesse destino; produção separada, restauração e [Gate P](GATE_P.md) seguem
obrigatórios antes de dados reais. Preservar registros de origem incerta.

| Ordem | Slice e valor | Escopo e dependências | Conclusão e validação |
| --- | --- | --- | --- |
| Base contínua | **C1 — ambiente confiável** | Confirmar destinos, migrations, papéis, Storage, backups e reversão. Aproveitar o inventário, atualizando o que mudou. | Evidência do destino, diferenças resolvidas e restauração testada; operação clínica exige separação e Gate P. |
| 1 | **C2 — demonstração coerente** para paciente e médico | Reutilizar as contas mantidas por decisão de 29/09, sem nova limpeza; completar apenas lacunas sintéticas da jornada consulta/retorno. | Percurso verificável nos dois perfis, dados persistidos e originais preservados; não forjar decisão ou assinatura médica. |
| 2 | **C3 — contexto e operação confiáveis** | Validar Hoje/Pacientes e a resposta do paciente com a base atual; corrigir falhas comprovadas dentro do escopo validado. Depende de cenário C2 coerente. | Paciente → solicitação/resposta → revisão médica → publicação autorizada → retorno, com contexto, datas e estados corretos; recarregar e conferir persistência. Registrar limites por papel. |
| Paralelo | **IA1 — contrato de governança** | Finalidade, fontes, fornecedor, dados permitidos, privacidade, rastreabilidade e revisão; PR #64 em rascunho. | Decisão documentada dos responsáveis; não inferir autorização de envio a fornecedor. |
| Piloto sintético em andamento | **IA2 — extração verificável** | Continuar o piloto sintético do PR #78, sem confundi-lo com main; arquivo/página, unidades e revisão por item. | Corpus sintético com cobertura/erros medidos, falhas controladas, original navegável e revisão humana; processamento independente da aba antes de alegar fila autônoma. |
| Depois | **IA3 — biblioteca aprovada** | Poucas fontes versionadas com população, trecho, autoria e revisão. | Busca reproduzível apenas em fontes aprovadas/vigentes e retirada rastreável. |
| Depois | **IA4–IA6 — evidência, revisão e validação** | Capacidades e critérios do plano de IA; dependem de IA1–IA3 e gates clínicos. | Verificação por afirmação, revisão/correção médica, publicação separada e métricas aceitas antes de liberação. |

**Primeira entrega aceita como ponto de partida em 08/10: C3 — fechar o ciclo de um exame solicitado.**
A [avaliação de UX e dados](AVALIACAO_JORNADA.md) identificou lacunas no vínculo
pedido/resposta, acompanhamento após revisão e recibo do paciente. Recomenda-se
entregar esse percurso delimitado antes de ampliar IA2; a sequência completa e
os aceites estão na avaliação. O usuário pediu iniciar na nova branch
`codex/c3-exame-solicitado-20261008`; o PR #78 continua preservado.

**Decisão de execução em 09/10:** avançar pela sequência dos
[checkpoints](CHECKPOINTS_ENTREGAS.md) e reunir o código em um pacote de
integração, sem publicar cada slice separadamente. O pacote está na branch `codex/vivance-package-20261009`,
[PR #95](https://github.com/vitormilanez/instituto-vivance/pull/95) draft.
Preview e implantação técnica **somente no dev sintético** foram conferidos;
aceite operacional, avaliação clínica, integração à main e liberação para dados
reais continuam marcos distintos. A reunião de código não fecha esses aceites.

Para IA2, o [handoff](IA2_EXAMES.md) registra o worker agendado, negação ao
paciente e um percurso fictício de 45 itens com revisão versionada por item.
Uma lease expirada simulada no dev foi recuperada pelo Cron, com segunda tentativa
concluída e sem duplicar os 45 itens. Faltam avaliar outras classes de falha e
definir com o médico o contrato de laudos/resultados antes de ampliar a fixture. Claude, OCR e uso clínico
continuam pendentes.

C1/C2/C3 são trilha de prontidão operacional, não motivo para refazer o piloto
sintético já validado. Evoluções adicionais de Hoje/Pacientes devem demonstrar
lacuna, escopo e aceite, preservando o briefing/gráfico entregues.

C3 validou parcialmente pedido/resposta, revisão e recibo posteriores no Preview
com PDF fictício, preservando revisão separada de publicação. Em 09/10, o
percurso sintético pré-consulta → registro médico → plano aprovado e publicado →
retorno também foi observado nos dois perfis; a correção do rótulo de publicação
no fechamento passou no novo Preview do pacote. Ainda faltam decidir a coleta da data de
realização do exame, isolamento de UI por outros papéis/vínculos e aceite
operacional. A decisão de manter apenas Guilherme e
Vitor não cobre admin, enfermagem ou isolamento entre pacientes; esses casos
exigem outro ciclo de teste e não podem ser declarados aceitos.

## IA: escolher o recurso pelo problema

| Necessidade | Direção |
| --- | --- |
| Idade, IMC, unidades, variações, cronologia, estados e pendências | Dados estruturados, consultas e regras determinísticas, com testes de cálculo e ausência de dados. |
| Resposta aberta e resumo longitudinal | Avaliar LLM apenas se a organização literal/estruturada não resolver; preservar original, fonte e validação médica. Não ampliar silenciosamente o contrato do briefing atual. |
| Exames/documentos | Tentar extração convencional do texto; OCR somente quando necessário. Qualquer extração liga arquivo/página e fica para conferência quando incerta. |
| Localizar informação médica | Começar pelos registros autorizados e fontes aprovadas; biblioteca clínica/RAG depende de curadoria e versionamento. |

Comparar qualidade, custo, latência, privacidade e rastreabilidade por tarefa antes
de escolher modelo. Fornecedor ou modelo não está aprovado por esta tabela.
O briefing atual preserva texto literal; o [plano separado](PLANO_IA_CLINICA.md)
rege capacidades futuras. IA não diagnostica, prescreve, classifica urgência,
escolhe conduta nem publica orientação autonomamente.

## Frente comercial separada

Virada 90 mantém a [jornada de cinco etapas](VIRADA90_JORNADA.md), valores na
etapa final e WhatsApp editável. [Medição](virada90/MEDICAO_GOOGLE.md) e
[funil](virada90/FUNIL_COMERCIAL_LEVE.md) preservam consentimento e distinguem
clique, conversa recebida, avaliação, comparecimento e entrada no programa.
O [acompanhamento](virada90/MODELO_ACOMPANHAMENTO.md) usa o CRM existente.
Validar mensagem recebida, atribuição consentida e deduplicação antes de
considerar ativação do PR #79 ou importação Ads. Os releases ficam nos registros
comerciais, sem alterar gates ou prioridades clínicas por inferência.

## Execução

Aplicar o [brief de retomada e método por slices](RETOMADA_DESENVOLVIMENTO.md):
diagnóstico curto, proposta validada, implementação delimitada, testes proporcionais,
fechamento integrado e evidência. Manter implementação, Preview, publicação técnica
e aceite clínico como marcos distintos. Decisões novas devem atualizar esta direção,
o status e a tarefa correspondente no Asana após reconciliação com Git/ambientes.

### Refinamento aprovado — pacientes e convites, 10/10

Adotar a estrutura do Claude com identidade Vivance: convite inline, acompanhamento
com estados reais e cadastro sem app secundário na lateral. Atalho explícito
“Adicionar novo paciente” no menu desktop/mobile. Entregar como pacote; layout
local não equivale a publicação. QR da recepção deve incluir entrada coletiva e
aprovação; Google exige configuração OAuth. Não confundir convite aceito com
cadastro inicial enviado ou acolhimento concluído.

### Ajuste de entrada aprovado — 10/10

Priorizar conta correta e continuidade do cadastro: convite nunca aproveita
silenciosamente a sessão de outra pessoa; login retoma o onboarding em rascunho.
Altura apresentada em metros e armazenada em centímetros, com decimal local.
“Salvar e sair” é a saída persistente; dashboard após envio destaca alimentação,
fotos e exames. Revisão completa com Impeccable e fluxo sintético antes do
pacote autorizado. Recebimento real de e-mail novo permanece um checkpoint
separado de conta existente, que não recebe nova mensagem.
