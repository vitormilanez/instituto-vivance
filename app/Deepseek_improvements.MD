Requisito confirmado: contexto ausente continua visível e acionável

O bloco “Contexto para esta consulta” não deve desaparecer nem mostrar apenas uma mensagem genérica quando faltarem informações.

Os cards devem permanecer abaixo dos dados da consulta, sempre na mesma posição, inclusive quando vazios. Cada card precisa mostrar um estado curto e factual:

- Pré-consulta: “Não preenchida”, “Rascunho salvo” ou “Enviada”.
- Exames: “Nenhum exame enviado” ou “Enviado em DD/MM”.
- Medidas: “Não preenchidas” ou “Última atualização em DD/MM”.
- Metas e expectativas: “Não informadas” ou “Respondidas”.
- Outros registros aplicáveis: usar “Não enviado”, “Não preenchido” ou “Não informado”, conforme a natureza do dado.

Evite “Não há contexto clínico disponível para este vínculo”, porque a frase não explica exatamente o que falta nem oferece uma próxima ação.

Ação do médico

Todo card com informação ausente deve oferecer uma ação direta:
“Solicitar ao paciente”.

O médico deve conseguir solicitar, com um clique:

- preenchimento da pré-consulta;
- envio de exames ou documentos;
- atualização de medidas;
- resposta sobre metas e expectativas;
- outro registro já previsto no produto.

Após o clique:

1. Criar uma solicitação persistida e auditável.
2. Mostrar confirmação objetiva: “Solicitado ao paciente”.
3. Registrar autor, data, paciente, consulta e tipo da solicitação.
4. Impedir solicitações pendentes duplicadas para o mesmo paciente, consulta e tipo.
5. Substituir o botão por estado como “Solicitado em DD/MM” enquanto estiver pendente.
6. Permitir nova solicitação somente depois de concluída, cancelada ou explicitamente reenviada.
7. Fazer a solicitação aparecer no “Hoje” do paciente, em “O que precisa de você”.
8. O clique do paciente deve abrir diretamente o formulário ou fluxo correspondente.
9. Quando o paciente concluir, atualizar o card do médico sem apagar o histórico da solicitação.

Limites clínicos

- “Solicitado” significa pendência operacional, não risco ou urgência clínica.
- Não cancelar, bloquear ou remarcar consulta automaticamente.
- Não classificar gravidade e não gerar recomendação clínica.
- Não inventar dados para preencher cards vazios.
- Manter aprovação separada de publicação.
- Exames e respostas continuam privados e sujeitos às permissões existentes.

O critique deve avaliar especificamente:

- se os estados vazios são compreendidos em poucos segundos;
- se o médico identifica exatamente o que está faltando;
- se a ação “Solicitar ao paciente” é descoberta sem competir com “Preparar atendimento”;
- se os cards mantêm hierarquia adequada abaixo da consulta;
- se a fila lateral e os cards não apresentam a mesma pendência de forma confusa;
- como o conjunto se comporta em 320px, 390px e 1440px;
- quais partes exigem somente UI e quais exigem migration, API, notificação e auditoria.

Não implemente essa funcionalidade durante o critique. Transforme-a em contrato e backlog para o próximo `$impeccable shape`.



Exames: seleção e envio de vários arquivos

O paciente deve poder selecionar vários exames na mesma etapa, não apenas um arquivo.

- O seletor deve aceitar múltiplos arquivos PDF, JPG e PNG.
- Mostrar uma lista clara dos arquivos selecionados antes do envio, com nome original, tipo e tamanho.
- Não exibir UUID, storage path ou identificador técnico como nome do arquivo.
- Permitir remover um arquivo individual e adicionar mais arquivos sem perder os já selecionados.
- Validar cada arquivo separadamente: formato permitido e limite de tamanho vigente.
- Aceitar até 50 arquivos, preservando o limite já existente do contrato de onboarding.
- Mostrar progresso e erro por arquivo.
- Se um arquivo falhar, manter os demais selecionados/enviados e permitir tentar novamente somente aquele arquivo.
- O consentimento deve referir-se à lista efetivamente selecionada; adicionar ou remover arquivo exige nova confirmação.
- Após salvar, o rascunho deve preservar a lista de exames já enviados para que o paciente possa sair e voltar.
- “Pular por enquanto” continua disponível, pois exames seguem opcionais.

Estados objetivos nos cards

- Paciente: “Nenhum exame enviado”, “3 exames selecionados”, “2 exames enviados” ou “1 arquivo precisa ser reenviado”.
- Médico: “Nenhum exame enviado” com “Solicitar ao paciente”; ou “3 exames enviados em DD/MM” com acesso à lista.
- Quando houver pendência, o médico solicita exames com um clique; o paciente abre diretamente a etapa de Exames.

Aceites adicionais

- Selecionar 3 PDFs/imagens e enviar todos.
- Remover 1 arquivo antes do envio sem afetar os demais.
- Falhar 1 upload e reenviar apenas ele.
- Atualizar a página e recuperar a lista persistida.
- Médico vê todos os arquivos do paciente, nunca arquivos de outro vínculo.
- Testar em 320px, 390px e 1440px sem overflow horizontal.
