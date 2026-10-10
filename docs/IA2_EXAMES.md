# IA2 — exames sintéticos com origem verificável

**Estado em 10/10/2026:** [PR #106](https://github.com/vitormilanez/instituto-vivance/pull/106) integrou extração estruturada com Claude Haiku 5.5 e fallback seletivo Sonnet 5.5, fila/Cron, tabela médica e briefing limitado a fatos revisados. Código e publicação técnica do #106 foram conferidos no dev sintético; [PR #107](https://github.com/vitormilanez/instituto-vivance/pull/107) integrou o ajuste de rótulo e Edge v9 está ACTIVE. O deployment #107 `dpl_FZ4aX2gzUJGfimWAm1kyKs63FTcw` foi promovido e conferido com sessão médica; detalhes no [status](STATUS_ATUAL.md). Não houve Preview nesta rodada nem aceite clínico.

## Contrato e evidência

- O projeto temporário `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`) contém 67 migrations, inclusive `20261010210749`/`20261010212152`. Cron job 1 `vivance-ia2-exam-text-worker-synthetic` executa a cada minuto; a chave Claude fica em segredo da Edge, fora do Git.
- Arquivo privado, página, offset e trecho original acompanham cada item. Metadados/modelo/tokens são registrados; ausência ou ambiguidade não vira fato clínico. Adapter/prompt/extractor .2 validam data de calendário e fonte ISO/DD/MM, exigem metadados literais e usam nome narrativo neutro ou título documental quando não há suporte.
- Reprocessamento v2 das três fixtures QA via Cron concluiu na primeira tentativa: PDF 13 itens, PNGs 7 e 5, total **25 itens, quatro páginas, três metadados**. Histórico v1 preservado. Médico confirmou revisão v1 de um item; paciente recebeu 403 na extração interna. No #106 publicado, briefing mostrou só “Glicose 92” revisada, com data e link de origem; 24 itens ficaram pendentes. PDF original protegido abriu com mesmo SHA-256. Isso verifica um percurso sintético, sem publicar resultados ao paciente.
- A avaliação privada v1 de PDF de 25 páginas e duas JPEG ocorreu **somente via API**, com arquivos em `/tmp`, fora da aplicação. Ela aceitou 76 offsets Unicode exatos e descartou 15 propostas; a revalidação **offline** após .2 preservou os 76 offsets, deixou identidade/emissor nulos em 3/3 casos aplicáveis com título do banco como fallback e confirmou 53/53 datas com fonte/calendário válido. Não houve nova chamada API. Cobertura permanece parcial, especialmente páginas 1, 11 e 21 do PDF e imagem B1. Offset correto não mede completude ou utilidade clínica; custo em USD não foi confirmado.

## Próximo slice

A correção disponível hoje altera o valor ou texto do item. Acrescentar edição explícita de unidade, referência e data, mantendo autoria e versões, faz parte da próxima entrega.

Criar corpus com campos esperados por arquivo/página, medir omissões por tipo e corrigir lacunas específicas antes de IA3 ou interpretação. Verificar separadamente revisão/aprovação médica e **publicação explícita ao paciente**. O [plano de IA](PLANO_IA_CLINICA.md), IA1 e [Gate P](GATE_P.md) continuam obrigatórios antes de dados reais ou uso clínico. Não inferir aceite de CI, READY, HTTP 200 ou teste sintético. [Checkpoints](CHECKPOINTS_ENTREGAS.md) e [status](STATUS_ATUAL.md) registram os marcos.
