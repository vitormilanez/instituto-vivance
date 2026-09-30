# Estado atual do Vivance

Fotografia técnica verificada entre 28 e 29/09/2026. Para prioridades, leia
[Direção e slices](DIRECAO_E_SLICES.md). Este arquivo não autoriza uso clínico.

## Resumo executivo — 29/09/2026

| Frente | Status atual | Próximo marco |
| --- | --- | --- |
| **C1 · Base operacional** | Projeto único de testes autorizado; 57 migrations pareadas no histórico do projeto atual. Sem restauração testada nem produção separada. | Confirmar destino de cada ferramenta antes de escrita e manter a separação como requisito prévio a dados reais. |
| **C2 · Demonstração longitudinal** | Limpeza e carga histórica parcial executadas. Restam Guilherme e Vitor no Auth e um prontuário; Vitor tem 21 dias seguidos de check-in e 18 refeições fictícias. Quatro exames receberam títulos conferidos. A lista e um PDF original foram validados na sessão autenticada do médico. | Validar a sessão do paciente e completar consulta/retorno sem forjar conduta ou assinatura médica. |
| **C3 · Contexto e aceite operacional** | Iniciado na sessão do médico: abas e fontes verificadas; unidade de altura legada corrigida e conferida. Linha do tempo vazia apesar dos check-ins em Evolução. Sem aceite operacional. | Corrigir a expectativa do feed e exercitar ambos os papéis; planejar outro ciclo para admin, enfermagem e isolamento entre pacientes. |
| **IA1 · Governança** | Contrato documental no [PR #64](https://github.com/vitormilanez/instituto-vivance/pull/64), ainda sem aprovação dos responsáveis. | Fechar finalidade, fonte, fornecedor, privacidade e revisão médica. |
| **IA2–IA6** | Planejados; não há análise clínica por IA ativa. | Iniciar apenas após os gates próprios, com material sintético nas etapas iniciais. |
| **Gate P** | Aberto. O deployment está tecnicamente `READY`, sem aceite clínico. | Separar produção, conferir migrations/backup/restauração, segurança e percursos antes de dados reais. |

O [PR #63](https://github.com/vitormilanez/instituto-vivance/pull/63) foi integrado à `main` em `a1ba2e9` e publicado tecnicamente em 29/09/2026. As correções posteriores dos [PRs #66](https://github.com/vitormilanez/instituto-vivance/pull/66) e [#67](https://github.com/vitormilanez/instituto-vivance/pull/67) também foram publicadas e verificadas no navegador.

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
medidas e Storage existentes não foram alterados pelo script. A aba Evolução
foi vista na sessão autenticada do médico; o aceite médico segue pendente.

**Documentos C2 em 29/09/2026:** a migration
`20260929234224_patient_document_display_title` acrescentou um título de
exibição opcional, sem sobrescrever `original_filename` nem ampliar permissão
de escrita. No projeto de teste `oxuwrdjojsmgxoljqkuk`, os quatro PDFs de exame
de Vitor receberam títulos conferidos contra o cabeçalho dos próprios laudos;
o quinto documento permanece com título genérico. A leitura de controle
encontrou 57 versões de migration, cinco documentos disponíveis, quatro com
título e RLS ainda ativa. A listagem compacta e a revisão em linha passaram
por prévia local com dados fictícios em desktop e celular, além de build,
typecheck, lint e testes. Após a publicação, a sessão autenticada do médico
mostrou os cinco documentos, os quatro títulos e o formulário de revisão que
abre e fecha sem gravar. A rota de download gerou redirecionamento assinado,
mas o Chrome bloqueou o domínio do Storage com `ERR_BLOCKED_BY_CLIENT`. O
PR #66 passou a entregar o arquivo pelo domínio do app após a autorização no
servidor. No deployment `dpl_EB7ddcDXVvbMj37WmWowkQmwvtAu` do merge
`dacd3d3`, um PDF original abriu no visualizador do Chrome na sessão real do
médico, sem desvio para o Storage. Os outros originais não foram abertos
nesta rodada. A sessão do
paciente e o aceite da demonstração seguem pendentes. Nenhum resultado de
exame foi interpretado.

**Primeira verificação C3 em 29/09/2026:** Visão geral, Documentos, Linha do
tempo e Evolução foram acessados na sessão real do médico, mantendo Vitor no
contexto. Evolução exibiu os check-ins retrospectivos marcados
`DEMONSTRAÇÃO` e medidas com fonte. A altura legada `1,73` foi mostrada como
`1,73 cm` no cartão e na tabela; o PR #67 corrigiu apenas a apresentação
para `173 cm`, sem alterar o valor persistido. O merge `b4e8a42` teve CI
completo aprovado e foi publicado em
`dpl_FSM8Yof4tsz5SiTYgXyQ7PfhSoaT`; a sessão do médico confirmou
`173 cm` no cartão e na tabela. A Linha do tempo mostrou estado vazio embora
Evolução liste check-ins diários: o feed atual é delimitado a relatos
solicitados e publicações. Essa discrepância exige um slice de contexto;
nenhum aceite operacional foi registrado.

**Inventário C2 anterior à limpeza:** havia 8 contas Auth, 20 prontuários e 87
agendamentos. Vitor já tinha 5 agendamentos, 4 exames disponíveis com objeto no
Storage, 2 check-ins diários e 5 mensagens. A solicitação anterior de três
pacientes completos **não foi concluída**. Esta fotografia foi superada pela
decisão final de manter somente Vitor e Guilherme.

## Código e publicação

- A aplicação é `apps/web`; as migrations estão em `supabase/`. O protótipo da raiz não participa do deploy.
- O código da aplicação foi verificado no merge `b4e8a42` do PR #67. O check do PR e `verify` do release passaram, incluindo testes, lint, typecheck e build. O PR #66 também passou pelos mesmos checks. Não houve nova migration nessas correções.
- Pela CLI, a migration foi confirmada no Supabase de testes: 57 versões pareadas, cinco documentos disponíveis, quatro titulados e RLS ativa. A Vercel gerou `dpl_DLq5cWoGxkAw69BNzMZwyGv4Qmki`, `production`, `READY`, com `gitSource.sha=a1ba2e9`; a promoção manual apontou ambos os domínios ao mesmo deployment. Três chamadas a `/login` no domínio principal deram HTTP 200 (TTFB 1,03 s, 0,36 s e 0,11 s); três no secundário deram HTTP 307 para o principal. Isso comprova publicação técnica, não aceite clínico.
- Para as correções sem migration, a Vercel gerou `dpl_EB7ddcDXVvbMj37WmWowkQmwvtAu` do merge `dacd3d3` e depois `dpl_FSM8Yof4tsz5SiTYgXyQ7PfhSoaT` do merge `b4e8a42`. A CLI confirmou `production`, `READY` e o `gitSource.sha` de cada um, promoveu após CI e verificou ambos os domínios no último deployment. O domínio principal respondeu HTTP 200 em `/login`. PDF e altura foram verificados em sessão autenticada do médico, sem constituir aceite clínico.
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
4. Continuar C3: esclarecer e corrigir o estado vazio da Linha do tempo diante
   dos check-ins visíveis em Evolução, verificar a sessão de Vitor e a
   separação entre revisão e publicação. Com apenas duas contas, não aceitar
   admin, enfermagem ou isolamento entre pacientes.
5. Definir finalidade, governança e avaliação regulatória da IA antes de qualquer análise clínica. Ver [Plano de IA clínica](PLANO_IA_CLINICA.md).

`READY`, HTTP 200 e migrations listadas são evidências técnicas delimitadas. Não comprovam a jornada completa, nem autorizam dados de saúde reais.
