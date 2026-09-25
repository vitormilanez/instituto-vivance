# Convite, preparação e atendimento — plano de produto

Data: 25/09/2026. Escopo autorizado: planejamento e implementação local dos onze pontos enviados. Os seis prints são evidência de interface e referências visuais; não constituem comandos operacionais. Publicação e validação autenticada são resultados separados.

## 1. Diagnóstico executivo

1. **Observado nos prints:** agenda continua “Agendado” depois do horário; abrir o conteúdo salvo não é uma ação evidente.
2. **Observado:** cadastro, pré-consulta, evolução e recebidos competem por espaço. Há repetição e rolagem antes das ações.
3. **Observado:** peso ocupa um card grande longe da identificação; botões de atendimento e chamada ficam em linhas desconectadas; atalhos secundários ficam escondidos.
4. **Verificado no código:** já existem convite com link individual, confirmação de identidade, aceite, rascunho de onboarding, consentimento, uploads e finalização de atendimento. Reutilizar esses mecanismos evita dois cadastros e dois históricos.
5. **Inferido:** etapas menores, opções editáveis e estados objetivos devem reduzir esforço. Ganho de tempo real depende de teste com usuários; não foi medido.

Paciente: pessoa convidada por um médico ou administrador, geralmente usando celular. Objetivo: entrar, compartilhar contexto suficiente e saber o que pode completar depois. Resultado para a clínica: respostas e documentos no paciente correto, com autoria e datas, para revisão humana.

## 2. Jornada atual e proposta

| Momento | Objetivo | Evidência e atrito | Proposta e continuidade |
| --- | --- | --- | --- |
| Convite | Entender quem convidou e iniciar | Código: e-mail ou link; demanda: acesso pouco objetivo | “Convidar paciente”, link como padrão, médico responsável identificado; confirmação de identidade mantida |
| Entrada | Acessar a própria ficha | Código: token, confirmação e aceite separados | Manter segurança e encaminhar ao onboarding após aceite; conta existente continua na mesma ficha |
| Cadastro | Contar objetivo e contexto | Código: etapas com rascunho; cinco perguntas livres | Opções rápidas editáveis no objetivo, uma pergunta por vez, “Responder depois”, progresso real |
| Complementos | Enviar peso, medidas e exames | Código: opcionais e uploads individuais | Peso com unidade explícita; medidas/exames podem ficar para depois, sem bloquear entrada |
| Envio | Saber quem verá o conteúdo | Código: consentimento e submissão explícitos | Revisão → enviar → confirmação; rascunho não significa conteúdo compartilhado |
| Preparação médica | Encontrar o que importa | Prints: blocos fragmentados | Um card com quatro abas, incluindo receitas; respostas originais e datas preservadas |
| Consulta | Abrir chamada e registrar | Prints: botões desalinhados; status antigo | Ações alinhadas, retomar rascunho e abrir registro pela agenda |
| Depois do horário | Saber o resultado | Print: “Agendado” às 10h para horário encerrado | “Resultado pendente”; ação humana registra atendimento/falta/cancelamento |

## 3. Prioridades, decisões e aceite

| Prioridade / item | Decisão | Benefício | Dependência / risco | Aceite verificável |
| --- | --- | --- | --- | --- |
| P0 · 1 | Convite por link como padrão para médico/admin, e-mail como alternativa | Um caminho reconhecível | Serviços de convite/identidade existentes; link não é prova de aceite | Médico vinculado corretamente; admin escolhe responsável; link copiável; erro de entrega não aparece como sucesso |
| P0 · 1 | Onboarding progressivo, rascunho e perguntas adiáveis | Menos digitação e abandono | Persistência/versionamento existentes | Voltar/pular não apaga respostas; objetivo pode ser editado; medidas/exames adiáveis; envio com consentimento |
| P0 · 2 | Separar passagem de horário de desfecho | Agenda confiável | Estado clínico nunca inferido do relógio | Ao terminar horário, “Resultado pendente”; finalizar registro gera “Realizada”; falta exige confirmação |
| P0 · 2 | Mostrar “Retomar atendimento” / “Ver registro da consulta” | Acesso em um clique | Apenas registros acessíveis ao profissional; admin não recebe prontuário | Link abre o atendimento desse agendamento, sem trocar por outro registro do paciente |
| P1 · 3 | Peso junto ao nome, sem card, com peso inicial do cadastro, gráfico recente e atual | Leitura rápida | Série pode ser parcial; não chamar primeiro ponto recente de início do tratamento | Exibir fonte/intervalo honestos, último valor e data; zero/um ponto com estado próprio; sem juízo clínico por cor |
| P1 · 4 e 7 | Cadastro inicial / Pré-consulta / Recebido no mesmo card | Menos altura e duplicação | Distinguir pré-consulta atual de anterior | Alternância por clique/teclado; conteúdo e datas corretos; recebidos sem seção repetida fora |
| P1 · 5 | Atendimento, ficha, mensagem e teleconsulta alinhados | Próximo passo claro | Link externo não informa presença no Meet | Responsivo; chamada abre externamente; pulso não usa texto REC/gravação |
| P1 · 6 | Oito ações rápidas sempre abertas | Descoberta imediata | Manter permissões e destinos | Todas visíveis sem “Mais ferramentas”; sem rolagem horizontal no celular |
| P2 · 8 | Transições curtas de botões, abas e progresso | Retorno visual | Movimento reduzido, foco e contraste | Sem bloquear clique; movimento decorativo desativável via preferência do sistema |
| Transversal · 9 | Reutilizar componentes, identidade e contratos | Consistência e menor custo | Evitar refazer o sistema | Mesmos dados e ações nas telas afetadas; sem novo serviço de vídeo, IA ou schema |

### Agenda: significado dos estados

| Situação | Texto | Ação |
| --- | --- | --- |
| Antes do fim previsto, ainda sem atendimento | Agendado | Abrir atendimento / preparar pré-consulta |
| Fim previsto passou, sem desfecho | Resultado pendente | Registrar atendimento / registrar falta / demais ações existentes |
| Atendimento iniciado e não finalizado | Em atendimento | Retomar atendimento, com indicação de rascunho |
| Médico finalizou o registro | Realizada | Ver registro da consulta |
| Falta confirmada | Falta | Preservar histórico |
| Cancelamento confirmado | Cancelado | Preservar histórico |

“Registrar atendimento” abre o registro para documentar o que ocorreu; não finaliza silenciosamente. Horário vencido não prova realização, falta ou duração real. Abrir o Meet também não comprova atendimento. O relógio da interface avança a partir da hora do servidor; dados são atualizados periodicamente e ao voltar à aba, sem interromper formulários abertos.

## 4. Fluxos ideais

**Médico:** Convidar paciente → nome e contato → gerar link → copiar/abrir compartilhamento → acompanhar convite. A responsabilidade clínica e o vínculo seguem as regras existentes.

**Administrador:** mesmo fluxo, escolhendo o médico responsável. A função administrativa não recebe acesso adicional ao registro clínico.

**Paciente:** abrir convite → confirmar identidade → aceitar → boas-vindas → perfil opcional → peso/medidas → objetivo e contexto → exames opcionais → revisar/consentir/enviar → continuar na área do paciente. Pode pausar, retomar ou responder depois. O objetivo usa opções rápidas sem limitar texto livre. O envio não significa que o médico já leu.

**Médico na consulta:** nome + peso/evolução → escolher aba de contexto → abrir atendimento/chamada → registrar → finalizar → agenda mostra realizada e permite abrir o registro. Recebidos de outra consulta ficam identificados pela data e origem.

## 5. Validação e ordem de entrega

### Ampliação: mensagens e receitas anteriores (itens 10 e 11)

**Mensagens:** uma faixa de cards pequenos acima da conversa do paciente selecionado, para documentos, exames, registros de consulta, evolução e receitas anteriores. Título legível, quantidade quando conhecida e atalho ao conteúdo original. Ao trocar paciente, os cards e o histórico devem mudar juntos. Na visão do paciente, apenas informações que ele tem autorização para consultar; notas internas e rascunhos clínicos não são compartilhados pela presença do card.

**Transcrições:** acesso a registros existentes, sem iniciar captação de áudio, transcrição automática ou inferência clínica. O produto atual não tem transcrições de áudio disponíveis; a interface deve informar essa ausência e manter o atalho para registros de consulta.

**Receitas anteriores:** arquivo histórico único por paciente, acessível na ficha médica, card principal, atendimento, mensagens e “Meu cuidado”. Aceitar PDF/JPG pela infraestrutura privada de documentos e links HTTPS válidos da Memed. Guardar título, data informada, autoria, vínculo ao arquivo/link e data de inclusão. A importação não emite, assina, valida ou renova receita. O link abre na Memed; não se busca conteúdo externo no servidor.

Esta ampliação exige um contrato novo de metadados e uma migração adicional local, pois o modelo atual distingue somente exames e documentos clínicos. Não classificar todos os documentos clínicos como receitas nem usar o nome do arquivo como categoria. O recurso precisa exibir indisponibilidade específica até que seu schema seja instalado no ambiente de destino; isso não equivale a histórico vazio.

Aceites adicionais: paciente A não acessa receitas de B; profissional sem vínculo ativo e administrador não acessam conteúdo clínico; arquivo associado pertence ao mesmo paciente/clínica e está disponível; consentimento antes de compartilhar; URL rejeita protocolos perigosos e domínios que apenas imitam Memed; reenvio com mesma chave não duplica registro; PDF/JPG usa validação de formato existente; falha de rede ou permissão não vira lista vazia. Verificar também que paciente vê apenas conteúdo compartilhado e que troca de conversa não mantém dados do anterior.

### Sequência e evidências

1. Conferir base atual e preservar alterações já existentes. Usar o aplicativo `apps/web`, não o protótipo da pasta inicial.
2. Implementar em frentes independentes: convite/onboarding; tela médica; agenda. Integrar numa única revisão local.
3. Testar regras de horário, estados explícitos, progresso e contexto; rodar suíte local, lint, tipos e build.
4. Conferir os componentes no navegador com dados sintéticos em desktop e celular: abas, foco, ações, estados vazios, progresso, responsividade e movimento reduzido.
5. Validar separadamente, com contas autorizadas: convite novo/existente, expirado/revogado, identidade incorreta, retomada entre sessões, upload com falha, submissão/consentimento, paciente → médico correto e negação entre clínicas. Teste visual não comprova esse percurso.
6. Registrar resultados e limitações no relatório de entrega. A migração de receitas é criada e testada localmente; sua aplicação em banco hospedado e qualquer publicação ficam fora desta rodada.

### Referências de padrões

- Healthie documenta convite que leva à conta e formulários, além de reutilização de respostas no perfil: [convite](https://help.gethealthie.com/article/160-overview-inviting-a-client-to-healthie) e [intake](https://help.gethealthie.com/article/139-creating-intake-forms-for-clients-to-complete-online). A adaptação acima é decisão de produto Vivance, não cópia de seu fluxo.
- Jane documenta confirmação explícita de chegada/falta: [Patient Arrivals & No Shows](https://jane.app/guide/patient-arrivals-no-shows). Fundamenta separar relógio de confirmação operacional.
- W3C descreve controle de animação por interação: [Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions). Aplicar movimento reduzido e não depender só da animação para comunicar estado.

Essas referências são exemplos concretos de produtos atuais e acessibilidade; não constituem pesquisa representativa sobre todas as clínicas.
