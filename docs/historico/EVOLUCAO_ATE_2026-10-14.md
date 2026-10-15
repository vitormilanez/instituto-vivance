# Evolução técnica e documental até 14/10/2026

Histórico, não roteiro de execução. Estado, decisões e pendências correntes
ficam em [Status](../STATUS_ATUAL.md), [Direção](../DIRECAO_E_SLICES.md) e
[Checkpoints](../CHECKPOINTS_ENTREGAS.md). Não repetir operações, resets ou envios
somente porque foram relatados aqui.

## Marcos preservados

| Data/frente | Evidência daquela etapa e limite |
| --- | --- |
| 23–25/09: teleconsulta | Link externo, modo atendimento, rascunho e RLS; migrações `20260924003423/20260924003636`. Chamada real não validada. [Contrato atual](../TELECONSULTA.md); versão original pelo Git abaixo. |
| 29/09: C1/C2/C3 | Destino temporário sintético e inventário operacional. [C1](operacao/C1_BASE_OPERACIONAL_2026-09-29.md), [C2/C3](C2_C3_2026-09-29.md). Quantidades/backups daquela data não são inventário atual. |
| 03–04/10: IA2 inicial | Piloto do PR78 tinha worker ligado à aba e limitações de estruturação. [Contrato/piloto original](planos/IA2_CONTRATO_E_PILOTO_2026-10-04.md). A implementação atual foi integrada por PRs posteriores. |
| 07–10/10: briefing | PR82/84/112: fontes, peso acessível, fallback literal e continuidade do menu. [Registro](entregas/BRIEFING_CONSULTA_2026-10-07.md); contrato reaproveitável em [Ficha](../FICHA_PACIENTE.md). |
| 08/10: revisão de jornada | Diagnóstico e prioridades antes das evoluções de exames/workspace. [Avaliação](avaliacoes/AVALIACAO_JORNADA_2026-10-08.md). Não usar lacunas antigas como backlog atual. |
| 09–10/10: onboarding | PR95/97/103/104: contexto de saúde, medidas e perfil complementar; validação sintética de convite/cadastro/compartilhamento. [Contrato](../ONBOARDING_PACIENTE.md). Não é aceite externo. |
| 10/10: IA2 revisão/correções | PR106/107/109/110: fonte por item, edição versionada e deduplicação; corpus offline81 itens, sem gabarito clínico/completude. Versões anteriores da IA2 disponíveis pelo Git. |
| 10/10: PDFs longos | PR114/115: texto por página, Unicode/checkpoints e referência literal;512/518 testes e recuperação seletiva. Preços/modelos consultados naquela data não são tabela atual. |
| 10/10: retomada IA2 | PR117: mesma run/hash/job de 25 páginas;13 checkpoints/65 itens em 24 páginas; pendências em 7 páginas sinalizadas. Técnico concluído, qualidade médica pendente. [Fixtures/IDs](../CONTA_TESTE.md), estado original pelo Git. |
| 10/10: UX médica | PR119, aplicação `e05cb4c`,525 testes, Preview e publicação técnica. Hoje com abas era a composição daquela etapa, substituída em 14/10. [Registro](entregas/UX_MEDICA_2026-10-10.md). |
| 11/10: check-in/alimentação e convite | PR121/122,534 testes, frontend/Edge publicados manualmente após etapas skipped. SMTP Resend configurado posteriormente; Gmail recebeu emSpam. [UX](entregas/UX_CHECKIN_ALIMENTACAO_2026-10-11.md), [SMTP](../../OPERACAO_SUPABASE_EMAIL.md). |
| 11/10: limpeza/convites | PR129/130; reset explicitamente autorizado preservou médico/QA e nove arquivos; arquivamento de convite validado com paciente preservado. Totais são históricos; não autorizam nova limpeza. [Operação](../../OPERACAO_LIMPEZA_E_CONVITES.md). |
| 11/10: widgets/pacientes | PR131/133,538 testes: widgets variáveis e depois lista de pacientes como foco. [QA](avaliacoes/QA_DESIGN_ATE_2026-10-14.md). Grade antiga superada pelo workspace 14/10. |
| 11/10: exames completos | PR134/135/136: cota15, liberação, conferência, histórico/resumo/cache, aprovação/publicação factual;555 testes. Quatro PDFs/117 itens/28 páginas e resumo QA28 fatos; sem curadoria/aceite clínico. [Release](entregas/EXAMES_2026-10-11.md). |
| 14/10: workspace | PR137, aplicação `a1d2153`,591 testes/CI e navegação/mobile320; original/revisão de texto e envio/replay de uma mensagem interna QA verificados. [Conceito](entregas/HOJE_2026-10-14.md), [publicação](entregas/WORKSPACE_E_TRANSCRICAO_2026-10-14.md). |
| 14/10: Google preparado | PR139/main `a86c994`, servidor configurado, app OAuthTesting, grant pessoal pendente e nativaOFF.21 testes/configuração200, paciente 403/nativa 409; sem chamada real. [Registro](entregas/WORKSPACE_E_TRANSCRICAO_2026-10-14.md#configuração-google-de-teste-publicada--14102026). |

## Onde recuperar os relatos integrais substituídos

Para não manter três logs duplicados dentro dos contratos correntes, os textos
completos anteriores permanecem no commit base imutável
[`a86c99400505d7bfa125baa7aacd9980987a0cee`](https://github.com/vitormilanez/instituto-vivance/tree/a86c99400505d7bfa125baa7aacd9980987a0cee):

- [Status anterior, com IDs/CI/deployments e medições](https://github.com/vitormilanez/instituto-vivance/blob/a86c99400505d7bfa125baa7aacd9980987a0cee/docs/STATUS_ATUAL.md).
- [Decisões anteriores](https://github.com/vitormilanez/instituto-vivance/blob/a86c99400505d7bfa125baa7aacd9980987a0cee/docs/DIRECAO_E_SLICES.md).
- [Checkpoints anteriores](https://github.com/vitormilanez/instituto-vivance/blob/a86c99400505d7bfa125baa7aacd9980987a0cee/docs/CHECKPOINTS_ENTREGAS.md).
- [IA2 anterior, adapters/valores históricos e retomada](https://github.com/vitormilanez/instituto-vivance/blob/a86c99400505d7bfa125baa7aacd9980987a0cee/docs/IA2_EXAMES.md).
- [Teleconsulta/consentimento antes da separação dos contratos](https://github.com/vitormilanez/instituto-vivance/blob/a86c99400505d7bfa125baa7aacd9980987a0cee/docs/TELECONSULTA_GOOGLE_MEET.md).
- [Contas e fixtures anteriores](https://github.com/vitormilanez/instituto-vivance/blob/a86c99400505d7bfa125baa7aacd9980987a0cee/docs/CONTA_TESTE.md).

Exemplo local: `git show a86c994:docs/STATUS_ATUAL.md`. Não há segredo novo,
mudança clínica ou autorização de operação nessas referências.

## Organização de 14/10

Dez registros datados foram movidos para entregas/avaliações/operação/planos
neste histórico, com aviso de não vigência e atualização de links. Requisitos
únicos foram preservados nos contratos de ficha, IA2, design e consentimento.
Não foram removidos código, migrations, contratos comerciais binários, imagens,
fixtures, credenciais, rascunhos locais de Alfredo ou cópias iCloud não versionadas.

Virada90 mantém releases próprios por data; esta rodada não auditou nem mudou
contas de anúncios, orçamento, Pulse ou conversões. PRs antigos seguem no estado
do GitHub, sem fechamento/merge por inferência.

Validação desta organização: 64 documentos Markdown e 283 links locais,
sem arquivos ou seções inexistentes; 15 referências a capturas não versionadas passaram a texto
explícito, sem publicar imagens autenticadas. Revisão independente corrigiu a
distinção de filtros de CI para Markdown em `apps/web/**`. Diff somente documental,
sem alteração de runtime. Não se repetiu suíte local/E2E da aplicação por MD;
checks automáticos obrigatórios dos caminhos continuam valendo.
