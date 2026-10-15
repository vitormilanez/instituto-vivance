# Estado atual do Vivance

## Consulta integrada e resumo na ficha — publicação autorizada em 15/10/2026

Usuário autorizou publicar Agenda compacta/bloqueio, entrada direta,
consentimento do paciente, consulta assistida e resumo privado no histórico
da ficha com data/horário/modalidade/médico/status. Reutilização da credencial
Anthropic na Vercel autorizada expressamente; geração habilitada para o novo
deployment. Lote isolado sobre d0c80bd; 627 testes, tipos/build e lint sem
erros. Três migrações aplicadas no dev sintético após dry-run; advisors sem
erros. Deployment em preparação; Gate P e aceite clínico separados.
[Escopo, evidências e limites](ENTREGA_CONSULTA_INTEGRADA_2026-10-15.md).

## Virada 90 — publicação autorizada em 15/10/2026

Usuário aprovou publicar agenda de preferência, fotos reais e parcelas em
destaque. Confirmou segunda a sexta às 08h, 09h, 10h, 14h, 15h e 16h para
presencial/online. Datas futuras nos próximos 30 dias, fuso Brasília; equipe
confirma disponibilidade no WhatsApp. Seleção pode começar pelo horário e a
primeira escolha de modalidade o preserva; mudança posterior limpa horário.
Nenhuma reserva automática ou alteração de banco. Publicação em preparação
isolada sobre `origin/main=32d948f`, preservando trabalho local de outras áreas.
[Conteúdo, fotos e aceite](virada90/CONTEUDO_E_IMAGENS.md).

Pré-integração: 596 testes, typecheck e build de produção passaram com Node24;
lint sem erros e um aviso preexistente de variável não usada no onboarding.

**Fotografia reconciliada em 14/10/2026 (São Paulo).** Este documento resume o
estado vigente; a [linha do tempo](historico/EVOLUCAO_ATE_2026-10-14.md) guarda
os marcos anteriores. Não usar um SHA ou total antigo como inventário atual.

## Base e ambientes

| Item | Estado conferido |
| --- | --- |
| Código de referência | `origin/main=ee5864b657c006200432bfe9d455c7b884b0879c`, PR141 integrado. Envio documental reconciliado em 15/10; triagem de 14/10 comparada com `32d948f`, após PR140 documental. |
| Aplicação | `apps/web`, Next.js/Node 24. Workspace/exames/transcrição na base do release PR137/`a1d2153`; PR141 acrescentou agenda de preferência e fotos à Virada 90, sem migrations. |
| Vercel | `vtr-consulting/instituto-vivance`, projeto `prj_ligeZuFRycRXA21u5rRzaLAORTrI`, Root Directory `apps/web`. |
| Domínio publicado | `institutovivance.app`; secundário `instituto-vivance.vercel.app` redireciona para ele. Último deployment conferido `dpl_DdWrMiR7JynVD6XpnjDdK1sAD2sd`, production/READY, SHA `a86c994`. |
| Dados | Único destino temporário autorizado: dev sintético `oxuwrdjojsmgxoljqkuk`. Não é banco liberado para uso clínico real. |
| Publicação | Integração Git da main publica frontend automaticamente; não aplica banco, Edge ou Auth. Backend/CI têm gates separados. |

Esta organização documental usa cópia isolada para não sobrescrever alterações
locais do checkout canônico. Não houve migration, publicação em produção,
troca de credenciais ou exclusão de dados. Reconferir os IDs na próxima operação.

## O que está implementado e publicado tecnicamente

| Frente | Estado e evidência |
| --- | --- |
| Workspace médico | Hoje operacional com consultas do dia, indicadores reais e pendências; ficha com contexto; navegação inferior única; Agenda, Pacientes, Mensagens e Teleconsulta alinhados. PR137; [release14/10](historico/entregas/WORKSPACE_E_TRANSCRICAO_2026-10-14.md). |
| Dia sem consulta | Agendar consulta leva à Agenda. Carrossel de incentivo é manual, com revisão e confirmação dos destinatários. Um envio/replay/recebimento sintético foi validado; não foi disparado para toda a base. |
| Convites/onboarding | Ativação diferencia conta confirmada de pendente; cadastro inicial e perfil complementar persistidos. Convites separados da lista de pacientes. SMTP Resend configurado; o teste de e-mail inicialmente caiu em Spam. Entregabilidade externa/aceite do usuário continuam próprios. |
| Exames | Cota de 15 distintos por paciente/clínica/ciclo, liberação médica, deduplicação, extração por página/checkpoints, conferência documental, histórico e resumo factual com cache/aprovação/publicação. PR134/135; [release11/10](historico/entregas/EXAMES_2026-10-11.md). |
| IA clínica | Biblioteca/versionamento e verificação implementados; não há fonte clínica automaticamente aprovada. Possibilidades dependem de curadoria, aplicabilidade e gates; não há autorização de diagnóstico livre. |
| Transcrição do navegador | Manual pelo médico, original privado e revisão separada. Desktop compatível pode combinar aba+microfone; mobile usa microfone. Não grava arquivo de áudio nem garante toda a fala da chamada. |
| Google Meet | API/cliente/escopos/servidor preparados para teste; transcrição nativa explicitamente desligada. Conta pessoal ainda não conectada. |

## Verificação e limites

- Release do workspace: **591 testes**, lint/tipos/build e CI passaram.
  Mobile em 320 px e navegação autenticada médico/paciente foram conferidos nos caminhos
  descritos no registro. Não equivale a auditoria de todas as jornadas/papéis.
- Configuração Google: **21 testes focados** e build passaram. Verificação
  autenticada reconferida nesta organização: médico 200,
  `configured=true`/`available=true`/**`connected=false`**, paciente 403, nativa 409.
  Leitura anterior após publicação preservou original/revisão da fixture.
- Exames: quatro PDFs sintéticos, 117 itens/28 páginas e versão final de QA com
  28 fatos publicada/lida pelo paciente. Esses números não medem completude,
  precisão clínica ou aprovação real de diretrizes.
- Migrations de 14/10 (`20261014192700`, `20261014202953`, `20261014205608`)
  tiveram aplicação manual conferida no dev na entrega. Nenhuma reaplicada aqui.
  Etapas automáticas de backend/promoção ficaram `skipped`; não atribuir a elas
  operações manuais nem inferir schema de um workflow verde.

## O que continua pendente

1. **Teleconsulta:** grant pessoal Google, licença/elegibilidade e chamada real.
   Google Auth permanece Testing para a conta autorizada; nativa OFF. A qualidade
   real do reconhecimento do navegador também não foi validada.
2. **Consentimento e pós-consulta:** decisão registrada pelo próprio paciente
   antes de entrar, recusa/retirada, importação em background e resumo pós-call
   ainda **não implementados**. A declaração manual do médico não os substitui.
3. **Qualidade clínica:** gabarito médico, avaliação de omissões/estabilidade,
   curadoria da biblioteca, IA1–IA6 e aceite clínico permanecem abertos.
4. **Operação:** C2/C3, outros papéis/vínculos, entregabilidade de convites,
   recuperação/restauração e separação de produção exigem seus próprios aceites.
5. **Gate P:** continua aberto antes de dados de saúde reais.

## PRs antigos que não são a base atual

**Triagem autorizada pelo mantenedor em 14/10/2026**, comparada com a main
`32d948f`. Cinco PRs foram revistas; três encerradas e duas preservadas como
draft. Estado e heads foram reconferidos antes do fechamento, e as três branches
encerradas continuam no remoto. Não houve merge, exclusão de branch/arquivo,
migration ou publicação da aplicação nesta triagem.

Estados das cinco PRs reconfirmados em 15/10 para este envio documental, sem
novos fechamentos nem alteração das decisões abaixo.

| PR | Decisão e evidência |
| --- | --- |
| [94 — objetivo declarado](https://github.com/vitormilanez/instituto-vivance/pull/94) | **Fechada, superada.** Componente, módulo e testes de objetivo estão idênticos na main. Ficha/briefing preservam origem, autoria, data e acesso ao acolhimento; continuidade mantém próxima/última consulta e ausência explícita de registro. Aceite operacional/clínico não é declarado concluído. |
| [78 — piloto IA2](https://github.com/vitormilanez/instituto-vivance/pull/78) | **Fechada, superada.** As três migrations originais, módulos de texto/piloto/overview e testes correspondentes já estão na main. Pipeline Cron/Edge posterior substituiu o worker ligado à aba. Contrato e evidências preservados no [histórico IA2](historico/planos/IA2_CONTRATO_E_PILOTO_2026-10-04.md); qualidade clínica e Gate P continuam pendentes. |
| [40 — cópias iCloud](https://github.com/vitormilanez/instituto-vivance/pull/40) | **Fechada, manutenção antiga sem conteúdo exclusivo.** As 29 exclusões remanescentes são cópias de hash idêntico ao original; os dois Markdown duplicados já estavam ausentes. A limpeza e as regras gerais de ignore propostas **não foram integralmente aplicadas**. Uma limpeza futura exige alvos explícitos e preservação de cópias divergentes. |
| [79 — atribuição Pulse](https://github.com/vitormilanez/instituto-vivance/pull/79) | **Mantida draft: trabalho único útil.** Módulos de atribuição/Firestore/OIDC/HTTP, testes e contrato ainda não existem na main. Runtime permanece inativo; contrato real do provedor, segurança, deduplicação e recebimento da conversão precisam de validação. Retomar sobre a main atual, sem integrar versões antigas de proxy/dependências/status diretamente. |
| [64 — governança IA1](https://github.com/vitormilanez/instituto-vivance/pull/64) | **Mantida draft: decisões relevantes pendentes.** Preserva matriz de responsáveis/decisões, critérios de aceite e registro de aprovação ainda não incorporados integralmente ao plano atual. Reconciliar afirmações de implementação antigas com a main antes de integrar; não constitui aprovação clínica, jurídica ou de fornecedor. |

Fechamentos têm justificativa registrada nas próprias PRs e podem ser revertidos.
Não retomar uma branch antiga apenas por permanecer aberta; contrato atual,
conteúdo exclusivo e gates devem ser conferidos antes de qualquer integração.

### Limpeza documental de 15/10

Na preparação do merge da PR142, foi removida somente a cópia Markdown
`.impeccable/surfaces/app-components-doctor-dashboard-vivanse-tsx 3.md`:
blob idêntico ao original sem sufixo e sem referências à cópia. O original e
os registros históricos úteis foram preservados. O índice histórico teve a
nota antiga sobre a PR40 corrigida; não foram aplicadas regras amplas de ignore,
excluídas imagens ou apagados arquivos locais de outros trabalhos.

Próxima execução: seguir [direção](DIRECAO_E_SLICES.md) e
[checkpoints](CHECKPOINTS_ENTREGAS.md). Evidência técnica, aceite do usuário,
aprovação médica e publicação ao paciente não se confundem.
