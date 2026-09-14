# Convite e onboarding VIVANCE — Slices 3E e 4E

12/09/2026 · Supabase de desenvolvimento e Preview protegida atualizados · sem Production.

## Valor desta entrega

O médico pode iniciar o cuidado sem depender do administrador. O paciente chega com a clínica e o médico definidos, apresenta seu contexto no próprio ritmo e não precisa repetir tudo na consulta.

## Resultado demonstrável

Médico ou administrador cria convite → paciente confirma acesso → aceita o cuidado com a clínica/médico → informa dados opcionais → responde cinco perguntas ou pula → envia exames ou deixa para depois → revisa e compartilha. O progresso reaparece após novo login, e o médico autorizado vê somente a versão enviada.

## Por que agora

A consulta integrada 7B.3 precisa receber contexto verdadeiro de uma pessoa convidada. O onboarding complementa a fundação de acesso e a pré-consulta manual, sem ativar IA, áudio ou novo fornecedor.

## Convite e vínculo

- Médico ativo informa nome e e-mail ou telefone. O médico responsável é o próprio usuário, derivado da sessão no servidor.
- Administrador ativo pode convidar e escolhe um médico ativo da mesma clínica. Administrador não recebe acesso a respostas, medidas ou exames.
- A clínica vem do contexto autorizado; o paciente não escolhe livremente outro médico/clínica por URL.
- E-mail usa o serviço de autenticação já existente; falha de envio é visível e nunca aparece como convite entregue.
- WhatsApp: criar link seguro e botão para o profissional enviá-lo manualmente; não disparar mensagens automaticamente. O paciente informa seu e-mail ao abrir o convite, conforme decisão explícita do titular, e confirma o acesso por e-mail.
- Aceitar convite exige identidade autenticada com e-mail verificado. Conhecer um telefone, e-mail ou ID não autoriza vincular uma conta existente.
- Convite opaco, com expiração, revogação e uso controlado; token não aparece em logs nem em parâmetros de consulta. O código não pode sobrescrever um paciente existente por coincidência de nome/e-mail.
- Preservar as regras de aceite profissional: médico que convida a si mesmo confirma sua responsabilidade; designação feita pelo administrador conserva aceite do médico, sem conceder permissão clínica silenciosamente.

## Experiência do paciente

Usar identidade VIVANCE, uma pergunta por vez e uma ação principal. Todo texto em português cotidiano. Não pedir dados para decorar cards. Não afirmar “salvo” antes de confirmação do banco.

1. **Boas-vindas:** “Seu cuidado começa com uma conversa.” Mostrar clínica e médico associados ao convite; explicar que os dados opcionais podem ser completados depois.
2. **Sobre você:** foto opcional e nascimento opcional. Avatar neutro quando não houver foto. Imagem em armazenamento privado, com metadados e referência no banco.
3. **Suas medidas:** peso (kg), altura (cm), cintura (cm) e data, todos opcionais. Informar que são medidas relatadas pelo paciente. Sem cálculo de risco, metas ou avaliação clínica automática.
4. **Prepare sua conversa:** cinco perguntas dirigidas, uma por tela; permitir pular individualmente ou deixar toda a pré-consulta para depois.
5. **Seus exames:** “Você tem exames relacionados ao que quer conversar?” Permitir vários PDFs/fotos, mostrar cada arquivo com estado de envio e reaproveitar o upload privado. “Enviar depois” e “Não tenho exames agora” são opções honestas, não erro.
6. **Revisar e compartilhar:** resumo editável, campos pulados identificados e confirmação explícita de compartilhamento. Informar o que será visto pelo médico e o que ainda não foi enviado.

O fluxo pode sair para Hoje em qualquer momento seguro. Progresso salvo retoma no ponto correto. O checklist é um apoio, nunca bloqueia o uso normal. Pular não equivale a responder, consentir ou concluir clinicamente a pré-consulta.

## As cinco perguntas

| Tema | Pergunta | Apoio curto |
| --- | --- | --- |
| Motivo e objetivo | O que trouxe você à Vivance e o que gostaria de melhorar? | Conte com suas palavras. Pode começar pelo que mais importa hoje. |
| História e mudanças | Há quanto tempo isso acontece e o que mudou recentemente? | Vale contar quando começou e se algo melhorou ou piorou. |
| Rotina e impacto | Como estão seu sono, alimentação, movimento e disposição? O que mais pesa no seu dia a dia? | Compartilhe só o que fizer sentido para você. |
| Cuidado atual | O que já tentou e quais tratamentos, medicamentos ou suplementos usa hoje? | Se souber, informe os nomes. Você pode completar isso na consulta. |
| Prioridades da conversa | Quais dúvidas ou preocupações você quer conversar com o médico nesta consulta? | O que você não gostaria de esquecer de perguntar? |

As perguntas organizam o relato, não diagnosticam. A versão do questionário e as respostas originais enviadas ficam preservadas. Não gerar síntese automática nem transformar a resposta em conduta.

## Banco e privacidade

- Persistir convite, associação à clínica/médico/paciente, andamento por etapa, dados de perfil/medidas, rascunho, itens pulados e versão enviada.
- Rascunho acessível somente ao próprio paciente. Profissional autorizado lê o envio final; administrador operacional não lê conteúdo clínico.
- Imagens e exames permanecem privados. Usar autorização e confirmação explícita por upload; não tratar imagem como salva apenas porque existe preview no navegador.
- Gravar revisão do questionário, autoria, datas, versão e ciência de compartilhamento. Nova submissão não sobrescreve o original anterior.
- Evitar dados de saúde no armazenamento do navegador, URLs, logs e avisos. Concorrência e revogação devem ser verificadas no servidor/banco.
- Toda escrita usa contratos persistentes; interfaces não podem cair em modo demonstração se banco ou serviço estiver indisponível.

## BDD de saída

1. **Dado** médico ativo, **quando** convida nome+e-mail, **então** o convite fica na clínica correta e para o próprio médico, sem permitir forjar outro responsável.
2. **Dado** administrador ativo, **quando** convida e escolhe médico da própria clínica, **então** a associação é registrada; médico de outra clínica e enfermagem convidante são negados.
3. **Dado** convite por WhatsApp, **quando** o paciente abre o link e informa e-mail, **então** só ganha vínculo após confirmar identidade e aceitar; nenhum SMS ou WhatsApp é disparado pelo sistema.
4. **Dado** convite expirado, revogado ou de outra identidade, **quando** há tentativa de aceite, **então** nenhum acesso clínico ou paciente duplicado é criado.
5. **Dado** onboarding parcialmente preenchido, **quando** salva, sai e retorna, **então** recupera dados e etapa, sem copiar dados de outro paciente.
6. **Dado** foto, medidas ou pergunta omitida, **quando** pula, **então** consegue seguir e usar Hoje; o estado pulado fica preservado, sem preenchimento fictício.
7. **Dado** pré-consulta, **quando** percorre o fluxo, **então** encontra exatamente cinco perguntas e pode voltar para corrigir antes de compartilhar.
8. **Dado** exames válidos, **quando** envia vários arquivos, **então** cada original autorizado pode ser aberto; falha de um arquivo não apaga os demais nem declara o lote concluído.
9. **Dado** rascunho e envio final, **quando** o médico abre a ficha, **então** vê somente os originais compartilhados, com data e autoria. Administrador, outra clínica e vínculo revogado não leem conteúdo clínico.
10. **Dado** edição simultânea ou falha de rede, **quando** salva/envia, **então** conflito/falha fica visível e o texto local não é apagado; recarga não inventa salvamento.

## Sequência de execução

3E/4E primeiro; em seguida 7B.3 recebe o contexto da pré-consulta, mantendo as quatro etapas de consulta. Depois seguem 7B.4, 7B.5, 5A.1, 5B.1 e 7A.1/7A.2. Os oito atalhos da equipe e a Agenda existente são preservados.

Modelo: Sol/Medium nos contratos de acesso/banco; Terra/Medium na interface; coordenação/integração no agente principal. Testes de SQL e entradas, isolamento/revogação, tipos/lint/build, uma rodada visual desktop/celular. Publicação, configuração de entrega e aplicação remota de migrations são estados separados; evidências finais serão acrescentadas após a implementação.

## Evidências locais e limites de ativação

- Banco: 119 testes da suíte existente e dos novos cenários aprovados. Todas as migrations carregadas do zero no PostgreSQL de teste (PGlite); cobertura de email verificado, convite não reivindicado, atribuição médica, cancelamento, versões concorrentes, snapshot imutável, suspensão e revogação de acesso aos registros e objetos de Storage.
- Typecheck, lint e verificação de whitespace aprovados; `deno check` aprovado nas duas novas Edge Functions. Build local de produção (`next build --webpack`, Node 24.20) aprovado com configuração Supabase fictícia local; nenhuma conexão ao banco remoto foi usada no build.
- Navegador: componentes reais em um ambiente temporário **fora do produto**, com API simulada e dados sintéticos; verificados perfil opcional → medidas → perguntas → pular pré-consulta → exames opcionais → revisão → consentimento → conclusão, retomada após recarga e convite por WhatsApp. Rodada desktop e viewport móvel solicitada de 390×844; largura CSS observada de 433px na sessão do navegador, sem rolagem lateral. Isso valida interação/layout, não autenticação, entrega de email ou Storage real.
- O seletor de arquivos da extensão recusou os arquivos de teste por falta de acesso a file URLs. Portanto, upload múltiplo via navegador **não foi concluído**; não contar a tentativa como evidência de envio. A implementação salva cada referência antes do próximo arquivo e mantém arquivos anteriores se um posterior falhar.
- Respostas, foto e IDs dos exames persistem em `patient_onboarding`; a confirmação copia para `patient_onboarding_submissions`, com `vivance-preconsulta-v1`, autoria, data e versão. Arquivos internos do paciente ficam ocultos da equipe durante o rascunho, inclusive no Storage; após envio, somente equipe com vínculo ativo pode lê-los. Administrador permanece operacional.
- O formulário da equipe diferencia email solicitado, falha e conta já existente. Conta existente usa email/senha e revisa o convite em Minhas clínicas. Convites pendentes podem ser cancelados pelo criador médico ou administrador. O link WhatsApp é exibido uma única vez; não se recupera segredo a partir do hash.

Antes de ativar em ambiente conectado: reconciliar o histórico remoto de migrations e publicar `invite-patient`/`claim-patient-invitation`; configurar `PATIENT_INVITE_REDIRECT_URL` como URL HTTPS exata de `/primeiro-acesso` e incluí-la nas URLs permitidas do Auth. `supabase/config.toml` versiona `verify_jwt = false` somente para a função pública `claim-patient-invitation`, pois a pessoa ainda não tem sessão; seu acesso continua limitado pelo token opaco de uso único. A função `invite-patient` mantém `verify_jwt = true` e revalida identidade/papel. Não desabilitar JWT das outras funções. Falhas ao consultar Auth, validar o redirect ou solicitar o e-mail restauram o token com guarda de estado, permitindo nova tentativa sem desfazer uma reivindicação posterior bem-sucedida.

Validar então, com contas descartáveis no ambiente autorizado, entrega do email, primeiro acesso, aceite, retomada após novo login, foto/exames e leitura pelo médico. Nenhuma configuração remota, função, mensagem, Preview ou Production foi alterada nesta etapa local. Não há comprovante de entrega de email, recuperação automática de link perdido, antivírus, OCR, IA ou áudio.
