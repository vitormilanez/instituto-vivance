# Estado atual do Vivance

Fotografia técnica verificada entre 28 e 29/09/2026. Para prioridades, leia
[Direção e slices](DIRECAO_E_SLICES.md). Este arquivo não autoriza uso clínico.

## Resumo executivo — 29/09/2026

| Frente | Status atual | Próximo marco |
| --- | --- | --- |
| **C1 · Base operacional** | Projeto único de testes autorizado; 57 migrations pareadas no histórico do projeto atual. Sem restauração testada nem produção separada. | Confirmar destino de cada ferramenta antes de escrita e manter a separação como requisito prévio a dados reais. |
| **C2 · Demonstração longitudinal** | Limpeza e carga histórica parcial executadas. Restam apenas Guilherme e Vitor no Auth e um prontuário; Vitor tem 21 dias seguidos de check-in e 18 refeições fictícias. Quatro exames receberam títulos descritivos verificados nos PDFs, preservando os nomes originais. A nova lista de documentos foi validada somente em prévia local. | Publicar e verificar a interface autenticada; completar consulta/retorno sem forjar conduta ou assinatura médica. |
| **C3 · Contexto e aceite operacional** | Não validado neste ciclo. O ambiente agora tem apenas as contas de médico e paciente. | Exercitar esses dois papéis com sessões reais; planejar outro ciclo para admin, enfermagem e isolamento entre pacientes. |
| **IA1 · Governança** | Contrato documental no [PR #64](https://github.com/vitormilanez/instituto-vivance/pull/64), ainda sem aprovação dos responsáveis. | Fechar finalidade, fonte, fornecedor, privacidade e revisão médica. |
| **IA2–IA6** | Planejados; não há análise clínica por IA ativa. | Iniciar apenas após os gates próprios, com material sintético nas etapas iniciais. |
| **Gate P** | Aberto. O deployment está tecnicamente `READY`, sem aceite clínico. | Separar produção, conferir migrations/backup/restauração, segurança e percursos antes de dados reais. |

As mudanças de direção e status estão no [PR #63](https://github.com/vitormilanez/instituto-vivance/pull/63), ainda em rascunho; a `main` permanece em `5a64be9` até integração.

**Decisão de 29/09/2026:** o projeto `instituto-vivance-dev` será o ambiente único temporário para testes com dados sintéticos. A separação dos ambientes fica para antes de dados reais e do fechamento do Gate P; não foi dispensada.

**Decisão final de escopo em 29/09/2026:** o usuário substituiu a proposta de
três sintéticos por **apenas Guilherme e Vitor** e dispensou manter cópia dos
registros removidos. No projeto `oxuwrdjojsmgxoljqkuk`, a limpeza excluiu
seis contas Auth, 19 prontuários e os respectivos registros dependentes; seis
arquivos não vinculados a Vitor foram removidos pela API do Storage. A leitura
após a operação confirmou duas contas ativas, dois memberships, um
patient_account, um prontuário, cinco agendamentos, um atendimento, cinco
documentos e cinco objetos no Storage. Todos os documentos têm objeto, e não
há objeto órfão. Nenhuma tabela pública com `patient_id` mantém linha de
outro paciente. Os registros técnicos de auditoria permanecem como trilha
histórica; a limpeza não constitui aceite clínico.

**Carga histórica C2 em 29/09/2026:** o script repetível
[`seed_vitor_history.sql`](../scripts/demo/seed_vitor_history.sql) acrescentou
19 check-ins retrospectivos (08–28/09, sem duplicar 23 e 24/09) e 18
refeições fictícias (19–28/09). Todos os textos novos têm marcador
`DEMONSTRAÇÃO`; as datas técnicas de criação refletem a carga, enquanto a
data de referência representa o histórico simulado. Um ensaio com
`ROLLBACK`, a execução e uma segunda execução sem novas linhas passaram.
Contagem após a carga: 21 check-ins e 18 refeições para Vitor, duas contas
Auth e um prontuário. Agendamentos, atendimento, mensagens, documentos,
medidas e Storage existentes não foram alterados pelo script. A visualização
autenticada e o aceite médico seguem pendentes.

**Documentos C2 em 29/09/2026:** a migration
`20260929234224_patient_document_display_title` acrescentou um título de
exibição opcional, sem sobrescrever `original_filename` nem ampliar permissão
de escrita. No projeto de teste `oxuwrdjojsmgxoljqkuk`, os quatro PDFs de exame
de Vitor receberam títulos conferidos contra o cabeçalho dos próprios laudos;
o quinto documento permanece com título genérico. A leitura de controle
encontrou 57 versões de migration, cinco documentos disponíveis, quatro com
título e RLS ainda ativa. A listagem compacta e a revisão em linha passaram
por prévia local com dados fictícios em desktop e celular, além de build,
typecheck, lint e testes. **A interface nova ainda não foi publicada nem aceita
em sessão autenticada.** Nenhum resultado de exame foi interpretado.

**Inventário C2 anterior à limpeza:** havia 8 contas Auth, 20 prontuários e 87
agendamentos. Vitor já tinha 5 agendamentos, 4 exames disponíveis com objeto no
Storage, 2 check-ins diários e 5 mensagens. A solicitação anterior de três
pacientes completos **não foi concluída**. Esta fotografia foi superada pela
decisão final de manter somente Vitor e Guilherme.

## Código e publicação

- A aplicação é `apps/web`; as migrations estão em `supabase/`. O protótipo da raiz não participa do deploy.
- `main` local está em `5a64be9`, merge da PR #62; a PR #61 também está integrada. O [PR #63](https://github.com/vitormilanez/instituto-vivance/pull/63) reúne documentação, carga C2 e a interface de documentos, ainda em rascunho.
- Em 28/09, `institutovivance.app` respondeu HTTP 200. Nova inspeção pela CLI em 29/09 resolveu o domínio para `dpl_3zS5YNhZZopKTVzaLuZ6p33rS6X2`, `production`, `READY`, com funções em `gru1`. Isso confirma alcance técnico, não aceite clínico.
- A variável pública de Supabase do deployment de produção aponta para `oxuwrdjojsmgxoljqkuk`, projeto chamado `instituto-vivance-dev`. A separação produção/desenvolvimento exigida pelo Gate P **não está demonstrada**. Outra variável de servidor aponta para projeto distinto; nunca inferir o destino de migrations por nome ou `.env`.
- O histórico remoto de `oxuwrdjojsmgxoljqkuk` lista migrations até `20260929234224_patient_document_display_title`. A comparação completa com um banco de produção separado não foi feita nesta revisão.

## Consolidado na aplicação

Há identidade por clínica e papel, vínculo de cuidado, agenda, atendimento versionado, pré-consulta, onboarding, contexto em abas, evolução, check-ins, diário alimentar, documentos privados, conversas, pedidos ao paciente, receitas anteriores, teleconsulta por link externo e relatórios manuais. A fundação de tarefas de processamento existe; **não há worker de OCR/IA clínica ativo**, biblioteca médica controlada ou análise automática liberada. Os contratos e limites estão em [Funcionalidades](FUNCIONALIDADES.md).

## Pendências que governam os próximos slices

1. Usar o projeto atual para testes sintéticos controlados; identificar e separar os ambientes, conferir migrations e testar restauração antes de dados reais.
2. Fechar o [Gate P](GATE_P.md) com percursos autenticados por papel e negações entre pacientes/clínicas.
3. Concluir C2 somente com Vitor e Guilherme. A limpeza e a carga de
   autorrelatos sintéticos foram executadas e verificadas no banco; marcos de
   consulta/retorno e aceite pela interface ainda estão pendentes.
4. Definir finalidade, governança e avaliação regulatória da IA antes de qualquer análise clínica. Ver [Plano de IA clínica](PLANO_IA_CLINICA.md).

`READY`, HTTP 200 e migrations listadas são evidências técnicas delimitadas. Não comprovam a jornada completa, nem autorizam dados de saúde reais.
