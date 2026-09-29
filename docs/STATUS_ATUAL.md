# Estado atual do Vivance

Fotografia técnica verificada em 28/09/2026. Para prioridades, leia [Direção e slices](DIRECAO_E_SLICES.md). Este arquivo não autoriza uso clínico.

**Decisão de 29/09/2026:** o projeto `instituto-vivance-dev` será o ambiente único temporário para testes com dados sintéticos. A separação dos ambientes fica para antes de dados reais e do fechamento do Gate P; não foi dispensada.

**Inventário C2, leitura de 29/09/2026:** o projeto tem 8 contas de Auth, 20 prontuários, 87 agendamentos e um médico ativo. Vitor já tem 5 agendamentos, 4 exames disponíveis com objeto no Storage, 2 check-ins diários e 5 mensagens. A conta de paciente de teste tem 7 agendamentos, 3 exames com objeto no Storage, 1 check-in diário e 5 mensagens. A terceira conta proposta existe no Auth, mas ainda não está vinculada a um prontuário e não tem histórico. Não há agendamento futuro para nenhuma das três. A solicitação anterior de três pacientes completos **não foi concluída**; nenhum dado foi alterado nesta verificação. Os demais prontuários permanecem preservados.

## Código e publicação

- A aplicação é `apps/web`; as migrations estão em `supabase/`. O protótipo da raiz não participa do deploy.
- `main` local está em `5a64be9`, merge da PR #62; a PR #61 também está integrada. Esta revisão só altera documentação.
- Em 28/09, `institutovivance.app` respondeu HTTP 200. Nova inspeção pela CLI em 29/09 resolveu o domínio para `dpl_3zS5YNhZZopKTVzaLuZ6p33rS6X2`, `production`, `READY`, com funções em `gru1`. Isso confirma alcance técnico, não aceite clínico.
- A variável pública de Supabase do deployment de produção aponta para `oxuwrdjojsmgxoljqkuk`, projeto chamado `instituto-vivance-dev`. A separação produção/desenvolvimento exigida pelo Gate P **não está demonstrada**. Outra variável de servidor aponta para projeto distinto; nunca inferir o destino de migrations por nome ou `.env`.
- O histórico remoto de `oxuwrdjojsmgxoljqkuk` lista migrations até `20260926120000_clinic_patient_info`. A comparação completa com um banco de produção separado não foi feita nesta revisão.

## Consolidado na aplicação

Há identidade por clínica e papel, vínculo de cuidado, agenda, atendimento versionado, pré-consulta, onboarding, contexto em abas, evolução, check-ins, diário alimentar, documentos privados, conversas, pedidos ao paciente, receitas anteriores, teleconsulta por link externo e relatórios manuais. A fundação de tarefas de processamento existe; **não há worker de OCR/IA clínica ativo**, biblioteca médica controlada ou análise automática liberada. Os contratos e limites estão em [Funcionalidades](FUNCIONALIDADES.md).

## Pendências que governam os próximos slices

1. Usar o projeto atual para testes sintéticos controlados; identificar e separar os ambientes, conferir migrations e testar restauração antes de dados reais.
2. Fechar o [Gate P](GATE_P.md) com percursos autenticados por papel e negações entre pacientes/clínicas.
3. Concluir C2 com o trio indicado na captura do pedido anterior: Vitor, a conta `paciente@test.com` e a conta `teste1@gmail.com`; Guilherme é o único médico ativo na leitura de 29/09. Apenas duas dessas contas estão vinculadas a prontuário. **Nenhuma exclusão ou carga foi executada nessa solicitação.** Não remover os demais prontuários, inclusive o registro de origem incerta identificado anteriormente, sem inventário e decisão específica.
4. Definir finalidade, governança e avaliação regulatória da IA antes de qualquer análise clínica. Ver [Plano de IA clínica](PLANO_IA_CLINICA.md).

`READY`, HTTP 200 e migrations listadas são evidências técnicas delimitadas. Não comprovam a jornada completa, nem autorizam dados de saúde reais.
