# Direção do Vivance e próximos slices

Atualizado em 28/09/2026. Este é o plano vigente. O [estado técnico](STATUS_ATUAL.md) registra o que foi comprovado; o [plano de IA clínica](PLANO_IA_CLINICA.md) detalha essa frente.

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

## Próximos slices

Os códigos são **propostos para o novo plano**; não renumeram cards ou branches já em curso.

| Ordem | Slice | Entrega e aceite mínimo |
| --- | --- | --- |
| 1 | **C1 · Base operacional** | Identificar e separar bancos, reconciliar migrations e backups. Evidência: destino inequívoco, schema compatível e restauração testada. |
| 2 | **C2 · Demonstração longitudinal** | Três pacientes de teste nominados, Guilherme como único médico de demonstração, consultas/retornos e histórico sintético coerente. Preservar registros possivelmente reais. Exames precisam existir no Storage e abrir pela interface. Evidência: contagem, vínculos, ausência de órfãos e percursos paciente ↔ médico. Essa carga não valida IA clínica. |
| 3 | **C3 · Contexto e aceite operacional** | Resolver pendências de continuidade: fonte de cada item, estado recebido/revisado/publicado e acesso ao original. Validar troca de paciente, histórico por agendamento, papéis e negações; concluir ou rejeitar explicitamente o Gate P, com remoção verificável dos dados sintéticos antes de dados reais. |
| 4 | **IA1 · Governança e contrato** | Finalidade de uso, risco regulatório, responsável médico, modelo de observação/documento/evidência e política de fontes. Sem conclusões geradas. |
| 5 | **IA2–IA3 · Extração e biblioteca** | Extração conferível de poucos exames e Biblioteca Clínica Vivance versionada. Referência do laboratório e guideline ficam distintos. |
| 6 | **IA4–IA6 · Análise, revisão e validação** | Evidência aplicável, verificador independente, aprovação médica e estudo com casos revisados antes de liberação. |

Os slices de interface já aprovados podem continuar se não mudarem o contrato clínico. IA1 pode avançar em paralelo como trabalho de contrato e governança; IA2–IA3 usam apenas dados sintéticos até o Gate P. Uso clínico de IA depende dos gates próprios e mantém fallback manual.

**Decisão operacional de 29/09/2026:** para facilitar os testes, usar temporariamente o projeto Supabase atual `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`) como ambiente único. C2 pode avançar com dados sintéticos identificados sem aguardar a criação de outro projeto. A separação de desenvolvimento e produção continua planejada antes de dados reais e do fechamento do Gate P. A autorização para testar não equivale ao aceite integral de C1 nem à liberação clínica.

O [inventário de C2 em 29/09](STATUS_ATUAL.md) confirmou que a demonstração de três pacientes ainda está incompleta: duas contas têm histórico parcial e a terceira não possui vínculo de paciente. Os demais prontuários permanecem intactos até que sua origem seja estabelecida.

## Decisões antes de IA clínica

1. Direção médica, gestão e assessoria regulatória definem finalidade pretendida e saídas permitidas.
2. Guilherme aprova fontes, populações aplicáveis, revisão e retirada de versões.
3. Produto e engenharia definem como cada valor volta ao arquivo e à página originais, inclusive após correção humana.
4. Governança define fornecedor, dados permitidos, retenção, acesso, auditoria e incidente.
5. O piloto começa pequeno, com dados sintéticos e casos anonimizados revisados; expansão depende de métricas aceitas pelo médico.

Cada slice entrega contrato, migrations versionadas quando necessárias, testes de autorização e falha, interface verificável e evidência no ambiente correto. Implementação local, Preview, publicação técnica e aceite clínico são marcos separados.
