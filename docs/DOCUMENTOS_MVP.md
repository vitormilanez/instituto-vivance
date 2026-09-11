# Documentos privados — Slice 5A

## Entrega e fronteira

Médico ou enfermagem com vínculo de cuidado ativo pode enviar um exame ou documento clínico para um paciente sob sua responsabilidade. O paciente vinculado à própria ficha pode enviar apenas um documento compartilhado com a equipe. O administrador operacional não vê arquivos nem metadados clínicos.

São aceitos PDF, JPG e PNG de até 5 MB. O arquivo começa em estado `reserved`, privado e invisível para outras pessoas. A função autenticada `private-documents` revalida a sessão e o papel do chamador, confere o tamanho real e a assinatura binária declarada e só então muda o documento para `available`. Formato ou tamanho incompatível levam a `rejected`; o arquivo não é disponibilizado.

Há duas visibilidades:

- `internal`: somente a equipe clínica com vínculo ativo.
- `shared`: equipe clínica vinculada e o paciente da própria ficha.

O envio não interpreta, resume, classifica ou altera plano de cuidado. Também não substitui o contato com a clínica em urgências.

## Proteção técnica

- Bucket `vivance-documents` é privado, com formatos e limite configurados no Storage.
- Caminhos de objeto são aleatórios e não carregam identificador de clínica ou paciente.
- Upload usa URL assinada limitada ao caminho reservado; download usa URL assinada de 60 segundos e resposta sem cache. Após uma revogação, uma nova URL é bloqueada imediatamente pelas regras de acesso, mas uma URL já emitida pode continuar utilizável até expirar.
- RLS protege tabela e objetos: documento reservado não aparece a terceiros; administrador, outra clínica, vínculo suspenso/revogado e paciente sem compartilhamento são bloqueados.
- As RPCs que reservam, rejeitam ou disponibilizam documento são executáveis somente pelo papel de serviço da Edge Function. A aplicação web não contém chave privilegiada.
- Auditoria registra ação, autor e metadados necessários sem copiar nome original nem conteúdo do arquivo.

## Caminhos na interface

- Equipe: `/clinicas/:tenantId/documentos`.
- Paciente: `/clinicas/:tenantId/meu-cuidado/documentos`.
- Download: `/api/v1/clinics/:tenantId/documents/:documentId/download`.

O envio passa por duas chamadas privadas da aplicação: preparar o upload e confirmar o arquivo. O navegador envia o arquivo diretamente para o Storage com a URL assinada; ele não passa pelo corpo da função da Vercel.

## Verificação local e de desenvolvimento

- A suíte local passou com 93 testes, incluindo entrada limitada, assinatura binária, reserva, isolamento entre clínica/papéis, arquivo interno/compartilhado, revogação e rollback de auditoria.
- TypeScript, lint, build de produção, `git diff --check` e a checagem Deno da Edge Function passaram.
- No navegador local, a entrada carregou com conteúdo real e sem erros atuais de console; a rota de download sem sessão respondeu `401` com `Cache-Control: private, no-store`.
- No Supabase de desenvolvimento, a migração `20260911162631_private_patient_documents` está aplicada, o bucket permanece privado com RLS e a Edge Function `private-documents` está ativa com verificação obrigatória de JWT. Uma chamada sem sessão recebeu `401` antes de alcançar a função.
- A jornada autenticada usou médico e paciente sintéticos: arquivo compartilhado foi disponibilizado e baixado pelo paciente, arquivo interno foi bloqueado para ele, arquivo com assinatura inválida foi rejeitado e removido, e uma revogação de vínculo bloqueou nova reserva com `403`.
- Os dois usuários, clínica, ficha, vínculo, documentos, auditorias e objetos sintéticos foram removidos por IDs conferidos após a prova. Não houve Preview, push, merge ou alteração de Production.

## Limites do piloto

- A conferência atual verifica formato permitido, nome, tamanho real e assinatura inicial de PDF/JPEG/PNG. Não é antivírus, inspeção completa do conteúdo, OCR ou classificação clínica.
- Não há exclusão, substituição, busca avançada, retenção automática, quarentena com scanner externo, anexos em conversas, áudio ou notificações.
- Reservas que não forem concluídas permanecem privadas e inacessíveis; política de limpeza/retenção é decisão do Gate P.
- Revogação imediata de um download já entregue não é oferecida: o limite de exposição residual é a validade máxima de 60 segundos da URL assinada. Se isso não for aceitável para o piloto, o download deverá passar por uma mediação revogável antes da validação remota.
- Este slice não autoriza dados de saúde reais, uso clínico, Preview pública ou Production.
