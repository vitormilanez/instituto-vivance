# Documentação do Vivance

Reconciliada em **14/10/2026** com `origin/main`, código e verificações técnicas
identificadas no [estado atual](STATUS_ATUAL.md). Documentos abaixo têm funções
distintas; relatórios antigos não são novas instruções de execução.

## Entrada única

| Documento | Responsabilidade |
| --- | --- |
| [Estado atual](STATUS_ATUAL.md) | O que está implementado/publicado e o que não foi validado. |
| [Direção e slices](DIRECAO_E_SLICES.md) | Decisões de produto, limites e ordem do trabalho restante. |
| [Checkpoints](CHECKPOINTS_ENTREGAS.md) | Pendências reais de execução e aceite; não um log de comandos. |
| [Método de desenvolvimento](RETOMADA_DESENVOLVIMENTO.md) | Investigar, propor, implementar e testar proporcionalmente. |
| [Funcionalidades](FUNCIONALIDADES.md) | Catálogo funcional vigente, sem confundir código com serviço clínico liberado. |

## Contratos do produto

- [Produto](../PRODUCT.md) e [sistema visual canônico](../apps/web/DESIGN.md).
- [Onboarding do paciente](ONBOARDING_PACIENTE.md).
- [Ficha e briefing do paciente](FICHA_PACIENTE.md): fontes, medidas, histórico e IA opcional.
- [Exames IA2](IA2_EXAMES.md): pipeline e manutenção.
- [Recebimento e resumo longitudinal de exames](FLUXO_EXAMES_E_ANALISE_LONGITUDINAL.md):
  cota de 15, liberação, conferência, cache, aprovação e publicação.
- [Teleconsulta](TELECONSULTA.md): agendamento/link externo e registro.
- [Google Meet e transcrição](TELECONSULTA_GOOGLE_MEET.md): manual disponível,
  nativa preparada/OFF, autorização e segurança.
- [Consentimento e pós-consulta](CONSENTIMENTO_E_POS_CONSULTA.md):
  pedido ainda não implementado, com dependências e aceites.
- [Plano de IA clínica](PLANO_IA_CLINICA.md) e [Gate P](GATE_P.md):
  governança/curadoria/aceite antes de dados reais.

## Engenharia e operação

- [Aplicação atual](../apps/web/README.md), [guia operacional](GUIA_OPERACIONAL_CODEX.md)
  e [pipeline de publicação](PIPELINE_PUBLICACAO.md).
- [Checkout canônico](CONSOLIDACAO_REPOSITORIO.md), [credenciais sem valores](../CREDENCIAIS.md)
  e [contas de teste](CONTA_TESTE.md).
- [Convites e arquivamento](../OPERACAO_LIMPEZA_E_CONVITES.md) e
  [SMTP/entrega de e-mail](../OPERACAO_SUPABASE_EMAIL.md). Operações passadas
  não autorizam repetir limpeza, envio ou reset.

## Frente comercial separada

[Virada90](VIRADA90_JORNADA.md): [conteúdo](virada90/CONTEUDO_E_IMAGENS.md),
[design](virada90/DESIGN.md), [funil](virada90/FUNIL_COMERCIAL_LEVE.md),
[medição](virada90/MEDICAO_GOOGLE.md) e [acompanhamento](virada90/MODELO_ACOMPANHAMENTO.md).
Registros de publicação ficam em `virada90/releases/`; números de campanhas,
metas e integrações são fotografias datadas, não auditoria atual dessas contas.

## Histórico e material não vigente

- [Índice do histórico](historico/README.md): releases, avaliações e planos antigos.
- [Linha do tempo até 14/10](historico/EVOLUCAO_ATE_2026-10-14.md):
  marcos e acesso às versões integrais anteriores pelo Git.
- [QA auxiliar](qa/patient-continuity/README.md) e
  [proposta de 22/09](propostas/2026-09-22-nao-visto/README.md): material de referência,
  não roteiro autorizado nem funcionalidade entregue.

## Política de manutenção

1. Alterar a seção vigente em vez de acrescentar outro relatório no topo.
   Direção guarda decisões; status, uma fotografia datada; checkpoints, trabalho restante.
2. Guardar IDs, logs e capturas por entrega no histórico. Não copiar o mesmo
   resultado em vários contratos; ligar ao registro original.
3. Distinguir **proposto → implementado → validado local/Preview → publicado
   tecnicamente → aceito operacional/clinicamente**. Uma etapa não prova a outra.
4. Código/migrations comprovam implementação; ambientes e jornada autenticada
   comprovam somente o que foi observado. Asana acompanha execução, não substitui evidência.
5. Arquivar com aviso de não vigência, corrigir links e preservar contratos únicos.
   Versões substituídas de status/direção/checkpoints são recuperáveis pelo Git;
   não manter cópias integrais só para mover a bagunça.
6. Não versionar senhas, tokens, sessões, exports OAuth, dados clínicos ou
   sufixos locais ` 2.md`. Arquivos locais não versionados de outros trabalhos
   não são lixo autorizado para exclusão.
7. Mudança só documental exige revisão de coerência, links e diff. A integração
   Git da Vercel pode construir a `main` até em um merge documental; não
   confundir organização de docs com autorização de nova operação remota.
