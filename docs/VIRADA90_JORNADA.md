# Virada 90 — jornada guiada

Solicitação de 02/10/2026: o CTA final da landing abre `/virada90/conhecer`, com o nome do Dr. Guilherme Martins, visual da landing aprovada e espaços de avatar com o texto literal “video”.

## Contrato

Apresentação e objetivo → método → modalidade → dúvidas → contato → escolha final. As etapas preservam as respostas ao voltar. Nome e canal de contato têm validação; a dúvida é opcional e limitada. Respostas comerciais não determinam elegibilidade clínica.

O contato é preparado para a equipe no WhatsApp existente, permitindo à pessoa revisar e enviar a mensagem. A interface não afirma que um lead foi salvo ou enviado. Nenhuma integração de CRM ou gravação no Supabase foi especificada. Dados preenchidos ficam apenas na memória da página, sem localStorage ou inclusão no endereço.

Oferta atual informada pelo usuário: ambos os programas duram três meses. Presencial em Presidente Prudente com aplicações e medições, por 12× de R$ 1.000 (R$ 12.000 no total). Online com acompanhamento por três meses e plano alimentar, por R$ 6.500 no total em 12 vezes. Não há limite de três consultas declarado.

As URLs de checkout ficam separadas por modalidade em `apps/web/public/virada90/checkout.json`; inicialmente ambas são nulas. “Pagar agora” informa que o checkout ainda será conectado, sem cobrança. Com uma URL HTTPS válida configurada para a modalidade, abre o checkout externo. Nenhum cartão ou dado financeiro é coletado nesta página. Quem escolhe “Ainda não sei” segue para a equipe e pode voltar para escolher um formato.

## Vídeos

Os blocos “video” são espaços intencionais solicitados pelo usuário. Conteúdo e gravação dos avatares serão fornecidos em uma etapa posterior. Não apresentar o placeholder como vídeo reproduzível.

## Implementação e validação

Nova branch `codex/virada90-guided-form`. Implementação local e PR para revisão; publicação desta nova jornada ainda não solicitada. Validação concluída: percurso completo, preservação ao voltar, erros de nome/telefone/e-mail, FAQ, seleção por teclado, Enter sem envio acidental e ausência de cobrança. Layout medido em contextos internos de 320/390/1440 px sem overflow horizontal (renderização da mesma fonte em iframe srcdoc; não é aceite em aparelho físico). Ofertas presencial e online conferidas com dados sintéticos; link WhatsApp inspecionado, sem envio.

416 testes, lint, typecheck e build passaram em Node 24. Detector Impeccable em modo degradado por falta dos módulos HTML retornou zero achados de regex; não comprova contraste computado. Revisão visual independente solicitou dois ajustes, ambos resolvidos no verdict pass `ship`: espaço de avatar na lateral do desktop e remoção da faixa de preço. [Evidências](../apps/web/.impeccable/review/virada90-form/evidence.md).

Pagamento real e captura persistente/CRM não foram testados nem implementados. Ambas as URLs de checkout estão nulas. A pessoa deve enviar a mensagem no WhatsApp para iniciar o contato com a equipe.
