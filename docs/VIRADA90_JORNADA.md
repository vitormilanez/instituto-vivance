# Virada 90 — apresentação guiada

Revisão de 02/10/2026: o usuário forneceu todas as telas baixadas do protocolo porque a primeira jornada ficou incompleta. Pediu preservar as informações, deixar valores apenas no final, encaminhar interessados ao WhatsApp e substituir os espaços de vídeo por imagens pertinentes.

## Contrato vigente

O CTA final da landing abre `/virada90/conhecer`, na identidade do Instituto Guilherme Martins/Vivance. A apresentação contém dez tópicos: introdução → quatro pilares → avaliação → plano individual → acompanhamento → evolução/manutenção → exames e suplementos → dúvidas → formatos → valores e contato. [Mapa de cobertura e prompts das imagens](virada90/CONTEUDO_E_IMAGENS.md).

A pessoa pode avançar, voltar ou ir diretamente a um tópico. Objetivo e formato são escolhas opcionais, preservadas somente na memória da página. Não há cadastro intermediário, campo de histórico clínico, exigência de contato para ler ou gravação de lead. A indicação e as decisões clínicas dependem da avaliação do médico.

Ambos os programas duram **três meses**. Presencial em Presidente Prudente com aplicações e medições quando indicadas: **12× R$ 1.000**, **R$ 12.000 no total**. Online com acompanhamento e plano alimentar: **R$ 6.500 no total em 12 vezes**. Não foi informado limite de três consultas, nem condição de parcelamento sem juros.

Os valores aparecem exclusivamente no último tópico. Interessados escolhem **Conversar pelo WhatsApp**. O link usa o número existente da landing (`5518997551234`) e prepara uma mensagem editável sobre o programa, incluindo apenas as escolhas opcionais da página. A pessoa revisa e envia no WhatsApp; a página não afirma recebimento, reserva ou pagamento. O botão de checkout e sua configuração foram removidos conforme a decisão mais recente.

## Conteúdo e mídia

A fonte está nos HTMLs “Protocolo de Emagrecimento — Apresentação Clínica de Nutrologia” fornecidos pelo usuário. Todas as doze telas estão mapeadas no documento de cobertura. A redação preserva método e exemplos, sem acrescentar resultados garantidos, prescrição, especialidade médica não confirmada ou número de consultas.

Três imagens editoriais ilustram avaliação, alimentação e manutenção. Os prompts integrais acompanham os arquivos. Não representam pacientes, equipe ou instalações reais. Não existem espaços reservados a vídeos nesta jornada. O vídeo original da landing permanece.

## Entrega e evidências

Branch `codex/virada90-guided-form`; [PR #74](https://github.com/vitormilanez/instituto-vivance/pull/74) mesclado e publicado em 02/10/2026. A passagem local percorreu os dez tópicos sem preencher escolhas, confirmou voltar/ir direto para um tema, preservação das escolhas e preços exclusivamente no final. As três imagens carregaram. Não houve rolagem horizontal nos enquadramentos de 320, 390 e 1440 px; os estreitos foram verificados no mesmo HTML/CSS/JS em quadros locais, não em dispositivo físico.

Na revisão local, **416 testes, lint, typecheck e build passaram com Node 24**. As capturas, métricas, limites da verificação e parecer Impeccable estão em [evidências locais](../apps/web/.impeccable/review/virada90-complete/evidence.md). A verificação da main também passou no release `37056735229`. O deployment do merge `5d6fe4c`, `dpl_51T4TDH34NRadvymSWK3XbCBsm5x`, foi promovido manualmente e conferido nos domínios públicos. O navegador validou a entrada pela landing, dez tópicos, imagens, valores finais, navegação e escolhas opcionais no link de WhatsApp. [Registro e capturas da publicação](virada90/releases/2026-10-02/README.md).

Nenhuma integração de CRM, banco, API de WhatsApp ou pagamento foi implementada. Nenhuma mensagem foi enviada a clientes ou equipe.

## Medição da campanha — 03/10/2026

[Contrato Google](virada90/MEDICAO_GOOGLE.md): tags existentes do Instituto
Guilherme Martins, restritas às páginas públicas e condicionadas ao aceite.
A página mede visitas/etapas e a ativação de WhatsApp. As escolhas opcionais
continuam só em memória e não são enviadas ao Google. O botão final abre a
mensagem personalizada; o fallback sem JavaScript permanece genérico.
Recebimento de conversa pelo Pulse e importação de conversão são outro slice.
