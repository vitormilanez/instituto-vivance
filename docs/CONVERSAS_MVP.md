# Conversas diretas e assíncronas — Slice 5B

## Valor desta entrega

Paciente e médico com vínculo de cuidado ativo podem trocar mensagens persistentes entre consultas, sem transformar o canal em chat de equipe, plantão, triagem ou atendimento de urgência.

## Resultado demonstrável

- Há uma conversa independente para cada dupla paciente–médico vinculada.
- O médico abre **Mensagens** e o paciente abre **Meu cuidado → Conversas**; ambos veem somente o histórico daquela dupla.
- O envio é persistido e o histórico é paginado em grupos de 20 mensagens.
- A interface informa de forma explícita que o canal é assíncrono, não emergencial e não aceita anexos nesta etapa.

## Regras de acesso e persistência

- Somente o paciente e o médico que tenham vínculo de cuidado ativo na mesma clínica podem ler ou enviar mensagens. Administrador operacional, enfermagem, outro médico, outro paciente e sessão revogada não acessam conteúdo nem metadados da conversa.
- As mensagens são somente de acréscimo: não há edição nem exclusão pela aplicação. O banco normaliza o texto, limita-o a 4.000 caracteres e registra a hora do servidor.
- A mensagem é criada por uma RPC estreita; tabelas não concedem escrita direta ao navegador. A revogação do vínculo ou da sessão corta novas leituras e envios.
- A auditoria registra o evento e os nomes dos campos alterados, nunca o conteúdo da mensagem.
- Não há destinatário em grupo nem encaminhamento automático para equipe. Se houver mais de um médico vinculado, cada conversa permanece uma dupla separada.

## Rotas e migrações

- Médico: `/clinicas/:tenantId/mensagens`
- Paciente: `/clinicas/:tenantId/meu-cuidado/conversas`
- Envio: `POST /api/v1/clinics/:tenantId/messages`
- Banco: `20260911173050_direct_patient_messages` e `20260911174240_message_foreign_key_indexes`

## Evidências de validação

- Com o Slice 5C, a suíte local passou com 100 testes, além de tipos, lint, build e `git diff --check`.
- No Supabase de desenvolvimento, médico e paciente sintéticos autenticados enviaram e leram mensagens nos dois sentidos. Os testes cobriram isolamento, papéis bloqueados, revogação de vínculo/sessão, imutabilidade e rollback se a auditoria falhar.
- No navegador local, médico e paciente percorreram a conversa real contra o Supabase de desenvolvimento; a tela do paciente foi conferida em 390 px.
- A Preview protegida `dpl_FKoZk34nWhsT222zMLR9pNVPUhdf` está pronta em https://instituto-vivance-48gxuveol-vtr-consulting.vercel.app. Visitante recebe a proteção Vercel; a API de mensagens sem sessão responde `401` com `Cache-Control: private, no-store`.
- A Preview atual do Slice 5C é `dpl_HYMJsHRXMNtiNCA1g1ZWLgZeqC1i`, em https://instituto-vivance-mnyoog4i5-vtr-consulting.vercel.app. Ela preserva a proteção Vercel, cache privado e resposta `401` sem sessão na API de preferência de avisos.
- A clínica, os usuários, as sessões, as mensagens e as auditorias sintéticas desta prova foram removidos por IDs conferidos. Não houve uso de dado clínico real, merge ou promoção para Production.

## Limites desta entrega

O Slice 5C adiciona somente um aviso interno, genérico e optável: nova mensagem → destinatário correto → abertura da conversa. Não há notificação externa, confirmação de leitura da mensagem, indicador em tempo real, anexo, áudio, resposta automática, classificação de urgência ou prazo de resposta. Arquivos seguem pelo módulo de [Documentos](DOCUMENTOS_MVP.md). O canal não substitui atendimento de urgência nem cria uma obrigação de cobertura. Ver [escopo de avisos](NOTIFICACOES_MVP.md).

## Próximo passo

O próximo incremento de comunicação que exigir canal externo, agenda ou prazo de entrega precisa de uma decisão específica sobre fornecedor, custo, conteúdo, consentimento e responsabilidade. Ele não está implícito no aviso interno.
