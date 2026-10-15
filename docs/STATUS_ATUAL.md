# Estado atual do Vivance

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
| Código de referência | `origin/main=a86c99400505d7bfa125baa7aacd9980987a0cee`, PR139 integrado. |
| Aplicação | `apps/web`, Next.js/Node 24. Árvore de aplicação/banco sem diferença para o release PR137/`a1d2153`. |
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

Consulta GitHub desta rodada: PR94 (contexto), PR79 (Pulse), PR78 (piloto IA2)
e PR64 (governança IA1) continuam **draft**; PR40 (cópias iCloud) continua aberto.
Não integrar nem fechar por inferência. Partes foram superadas por entregas da
main, mas cada restante exige comparação específica. Nenhum PR alheio foi alterado.

Próxima execução: seguir [direção](DIRECAO_E_SLICES.md) e
[checkpoints](CHECKPOINTS_ENTREGAS.md). Evidência técnica, aceite do usuário,
aprovação médica e publicação ao paciente não se confundem.
