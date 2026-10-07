# Funil comercial enxuto — Virada 90

Decisão de 06/10/2026. O médico oferece dois formatos do mesmo programa de três meses: presencial e online. A closer já trabalha em um CRM. O Vivance não deve criar outro cadastro comercial para essa etapa.

## Primeiro slice: origem legível no WhatsApp

Depois do aceite de medição, os botões públicos de `/virada90` e `/virada90/conhecer` acrescentam à mensagem editável `Origem do link: Google Ads` ou `Origem do link: Anúncio nas redes sociais`, somente quando os parâmetros do link permitem essa classificação. IDs de clique, UTMs livres e respostas sobre saúde não entram nesse rótulo. Sem aceite ou com origem incerta, a mensagem segue como antes. O Google continua medindo apenas o **clique**, não o envio da mensagem. O rótulo pode ser alterado pela pessoa e não comprova que a mensagem chegou ao Pulse.

## Registro mínimo no CRM existente

Para cada conversa que realmente chegou, registrar apenas:

| Campo | Valores sugeridos |
| --- | --- |
| Interesse | Virada 90 presencial; Virada 90 online; ainda indefinido |
| Origem | Google Ads; anúncio nas redes; orgânico; indicação; não identificada |
| Etapa | Nova conversa; respondeu; avaliação agendada; compareceu; entrou no programa; perdido |
| Datas | Primeira mensagem, agendamento e comparecimento, quando ocorrerem |

Usar o identificador de contato já existente no CRM para evitar duplicados. Valor de consulta e valor do programa são negócios diferentes; receita só entra após confirmação da equipe. Se a mensagem não trouxer origem, a closer classifica pela evidência disponível no CRM, sem adivinhar. Não colocar objetivo clínico, texto da conversa ou telefone em relatórios para o Google.

## Leitura semanal e próximo passo

Um quadro semanal pequeno basta: **conversas recebidas → avaliações agendadas → comparecimentos → entradas no programa**, separado por origem e formato. Para anúncios, olhar principalmente custo por avaliação agendada; cliques e conversas são diagnósticos anteriores, não venda. Presencial e online devem ser lidos separadamente.

Antes de qualquer importação de conversão real para o Google Ads, conferir amostra do CRM com a closer, deduplicação, vínculo consentido com o clique, credenciais e uma conversão recebida no destino correto. O webhook Pulse e o importador do PR #79 continuam em rascunho/desligados. Nenhum dado real de conversa entra no banco clínico do Vivance nesta etapa; Gate P permanece aberto.
