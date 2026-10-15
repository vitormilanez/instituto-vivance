# Contas e fixtures sintéticas de QA

Reconciliado em 14/10/2026. Credenciais ficam exclusivamente em
[cofre local ignorado](../CREDENCIAIS.md). Não registrar senhas, tokens, hashes
de autenticação, URLs de recuperação ou sessões em Git/Asana/capturas/logs.

## Identidades autorizadas

| Uso | Identidade | Limite |
| --- | --- | --- |
| Médico de teste | `guilhe.martins@gmail.com` | Usuário autorizou QA; papel/vínculo devem ser conferidos, não inferidos pelo e-mail. |
| Paciente de teste | `vtrconsultingbr@gmail.com` | Conta e PDFs existentes autorizados pelo usuário para a fase de exames/QA. |
| Paciente fixture permanente | `paciente.teste@vivance.example` | Preservar; `.example` não prova entrega de e-mail. |
| Google temporário | `vtrconsultingbr@gmail.com` | Conta pessoal autorizada para preparo Google de teste; não usar senha Vivance no Google. Grant continua pendente. |

Projeto temporário único: `instituto-vivance-dev`/`oxuwrdjojsmgxoljqkuk`.
Clínica da fixture: `61846445-8d30-4f68-b166-82d08c198cd0`.
Autorização de QA não abre [Gate P](GATE_P.md) nem permite importar pessoas reais.

## IDs de referência, não inventário atual

| Fixture | Identificador registrado |
| --- | --- |
| Paciente permanente | `e855e1a9-8603-40c3-aa3e-7caa4854a572` |
| Auth permanente | `beb341ca-e5b8-4dd2-bd45-10e1fa043727` |
| Vínculo permanente | `82dd0ae3-5c3f-4a55-ad20-d4c686f3cb74` |
| Médico da fixture | `5fa1330b-a7d3-4843-8e4a-57ef3533062e` |
| Paciente dos PDFs autorizados | `b26db19f-abdb-40bb-aa6a-99974fe730df` |
| Consulta da fixture de texto | `5993b9f0-c43e-4178-a24c-b4c76350d182` |
| Fonte de transcrição fictícia | `c9e55f08-6a01-47e8-a035-76f744a7681f` |
| PDF recuperado no PR117 | Documento `89d96ca4-f5e9-427e-acd4-1a0116b4f749`; job `fd1100d4-7000-4254-b1ee-6436d9256f92`; run `08779990-c35f-41b9-ae80-12493d5b5ba7` |

Conferir existência/vínculo/ambiente antes de reutilizar ID. Não recriar conta,
re-enviar convite, atribuir consentimento ou limpar registros apenas para
restaurar a fotografia de um teste antigo.

## Preparar um teste

1. Confirmar destino/ref e papel/vínculo; usar somente cenário sintético autorizado.
2. Carregar credenciais sem imprimir valores. `apps/web/.env.test-accounts.local`
   aponta ao arquivo central; não sobrescrever o link com env pull.
3. Preferir jornada real pela interface para provar autenticação/experiência.
   API isolada não prova UX; screenshot não prova persistência.
4. Verificar a ação alterada, recarga, fonte e negação pertinente por outro
   papel/vínculo. Não forjar aprovação/assinatura/decisão médica.
5. Preservar fixtures/originais entre ciclos; limpeza só de alvos exatos autorizados.

## Evidências históricas e limites

[Exames 11/10](historico/entregas/EXAMES_2026-10-11.md) e
[workspace/transcrição14/10](historico/entregas/WORKSPACE_E_TRANSCRICAO_2026-10-14.md)
guardam os testes pertinentes. Contagens antigas de pacientes, documentos,
resultados ou convites não descrevem a base atual.

Recuperação PR117: original/texto25/25 preservados,13 checkpoints e65 itens,
com possíveis omissões ainda para avaliação. Os IDs/medições extensos e revisões
anteriores podem ser recuperados na
[versão integral anterior](https://github.com/vitormilanez/instituto-vivance/blob/a86c99400505d7bfa125baa7aacd9980987a0cee/docs/CONTA_TESTE.md).
O reset de 11/10 é [operação passada](../OPERACAO_LIMPEZA_E_CONVITES.md), não ordem
para voltar a deixar apenas duas contas. A conta foi reutilizada/criada depois
pelo usuário. QA técnico não substitui aceite operacional, clínico ou de usabilidade.
