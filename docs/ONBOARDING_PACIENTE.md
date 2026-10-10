# Onboarding do paciente

Decisão do usuário em **09/10/2026**: priorizar o começo do paciente antes de ampliar
C3/IA2. Implementação no pacote `codex/vivance-package-20261009`, PR #95.
Superfície em modo **Operate**, com identidade paciente existente: Figtree,
fundo quente, azul-marinho e dourado. Um grupo de perguntas por tela, escolhas
com área de toque confortável e animação breve na conclusão.

## Sequência e checkpoints

1. **Primeiros passos** (`/clinicas/[tenantId]/primeiros-passos`): nascimento
   para obter idade, peso em kg, altura e cintura em cm, data das medidas;
   medicamentos/suplementos e alergias; condições diagnosticadas e cirurgias;
   histórico familiar; objetivo em uma ou duas frases; conferência e envio.
   Não perguntar idade e nascimento separadamente. Medidas são um retrato inicial,
   não uma nova série de evolução. Não preencher ausência com zero.
2. **Conclusão**: mensagem positiva, objetivo literal e animação de traço/check
   em até 700 ms. Botão leva diretamente a Hoje; a redução de movimento é respeitada.
3. **Hoje**: aviso persistente para completar alimentação. Após envio, o aviso
   avança para fotos e depois exames; desaparece quando as três seções foram enviadas.
   Trata-se de aviso dentro do app, sem push externo novo.
4. **Alimentação** (`completar-perfil?etapa=alimentacao`): padrão alimentar;
   preferências e alimentos evitados; horários aproximados e exemplos do café,
   almoço, jantar e lanches; conferência. É perfil de rotina, distinto do diário.
5. **Fotos** (`etapa=fotos`): frente, lado e costas; braços suavemente afastados,
   postura natural, fundo simples e câmera na altura do tronco. Roupa ajustada e
   confortável, como camiseta/top e shorts/legging; sem necessidade de nudez ou
   rosto. Opcional para o paciente: “Fazer depois” preserva o rascunho. A seção
   só se completa com três imagens distintas e consentimento.
6. **Exames anteriores** (`etapa=exames`): PDF/JPG/PNG legíveis, arquivos
   enviados e associados individualmente, reenvio apenas do que falhou. “Não
   tenho exames agora” fecha a etapa sem inventar documento nem pedir novo exame.

As seções complementares podem ser reabertas por **Meu cuidado → Seu perfil de
cuidado**. Campos opcionais podem ficar em branco; o objetivo inicial pede ao
menos uma frase. “Prefiro conversar” e “Não sei” são respostas explícitas de
saúde. Ao editar pela revisão, Continuar retorna à conferência.

## Dados e equipe

- `patient_onboarding.health_context`: medicamentos, condições, alergias,
  cirurgias e família, cada um com estado e texto literal. O objetivo reutiliza
  `answer_goal`; os campos legados são preservados e só aparecem se preenchidos.
- Rascunho inicial guarda a etapa exata. `patient_onboarding_submissions` mantém
  o snapshot imutável, inclusive contexto de saúde, data e autoria.
- `patient_profile_context`: rascunho próprio de alimentação/fotos/exames,
  com versão otimista. `patient_profile_context_submissions`: snapshot imutável
  por seção após envio explícito. A equipe lê a última submissão de cada seção.
- Fotos/exames dessa sequência usam Storage privado e visibilidade `internal`.
  O médico vinculado recebe acesso após a submissão da seção. Arquivos enviados
  por outras superfícies com `shared` mantêm seu comportamento existente.
- `GET/PATCH/POST /api/v1/clinics/[tenantId]/profile-context`: leitura própria,
  gravação com versão e submissão com seção/consentimento. Não há escrita clínica
  automática, interpretação por IA ou orientação gerada pelo cadastro.
- A ficha médica mostra respostas originais e as seções efetivamente enviadas.
  A migration `20261010011422_patient_profile_context.sql` foi aplicada somente
  ao dev sintético em 09/10, após comparar o histórico local/remoto.

## Evidência e próxima execução

- [x] Wizard inicial percorrido no navegador local com fixture explícita e
  respostas de API interceptadas: início → dados → saúde → família → objetivo
  → revisão → edição → revisão → conclusão. Isto verifica interação e layout,
  não autenticação ou banco remoto.
- [x] Capturas agrupadas desktop/celular, incluindo alimentação, fotos, exames
  e aviso. Seções complementares a 390 px sem overflow horizontal observado.
- [x] TypeScript, lint e build local passaram; suíte completa com 459 testes
  passou. O helper/testes da contagem antiga de etapas foram retirados porque
  não têm mais consumidores.
- [x] PGlite verificou saúde no snapshot, rascunho privado, compartilhamento
  explícito, fotos privadas antes do envio, versões obsoletas, documento de outro
  paciente, outra clínica e vínculo revogado.
- [x] Preview do `ddedfc7` com login real paciente/médico: alimentação salva e
  retomada após recarga; três imagens sintéticas e um PDF fictício enviados;
  aviso avançou e desapareceu; ficha médica mostrou a versão compartilhada.
  O cadastro inicial da conta já havia sido enviado, portanto o wizard inicial
  completo ainda não foi percorrido com autenticação real nesta rodada.
- [x] No Preview posterior `7569dd5`, CI verde e sessões reais de teste:
  fotos internas ficaram fora da fila/contagem de exames e os últimos envios
  da Home paciente não as apresentaram como exames com revisão indisponível.
  A ficha médica continua mostrando as seções compartilhadas.
- [x] Em 09/10, uma conta sintética nova entrou pelo convite da clínica no
  domínio principal a 390 px. O rascunho de nascimento/medidas persistiu após
  “Salvar e sair”; medicamentos, alergias, condições, cirurgia, família e
  objetivo fictícios foram conferidos, editados e enviados. A conclusão animada
  levou a Hoje, que destacou alimentação e exibiu o comprovante do cadastro.
  O teste ocorreu antes das correções abaixo e não constitui aceite externo.
- [x] O percurso revelou que objetivo vazio mostrava “Tentar salvar novamente”
  embora fosse apenas validação, a conclusão dizia “da Instituto Vivance” e
  Hoje oferecia “Atualizar medidas” imediatamente após receber as medidas
  iniciais. A branch `codex/onboarding-novo-paciente-20261009` corrige essas
  mensagens e oculta só o lembrete **genérico** quando há medidas no cadastro
  enviado; um pedido explícito do médico permanece visível. Testes focados e
  TypeScript passaram localmente.
- [x] No [Preview do PR #97](https://instituto-vivance-i2p4jke7w-vtr-consulting.vercel.app)
  (`dpl_4nbHQib1f2yMmzBm6MjVKNJQrxdf`, `preview`, build aprovado), a conta
  sintética autenticada a 390 px viu a mensagem final corrigida, seguiu por
  “Ir para Hoje” e não recebeu o lembrete genérico duplicado. Alimentação
  continuou em destaque. O CI do commit `8df3786` passou. A validação de
  objetivo vazio ainda não foi repetida visualmente nesse Preview.
- [ ] Aceite de usabilidade com paciente/médico; não equivale a aceite clínico.

## Referências utilizadas

A separação entre contexto inicial e tarefas posteriores foi informada pela
[entrada do Form Health](https://help.formhealth.co/article/429-onboarding) e
pela [organização do aplicativo](https://help.formhealth.co/article/216-navigating-the-form-health-app),
adaptada ao produto existente. Para a explicação de medida de cintura, consultar
[o material do NHS/Salisbury](https://www.salisbury.nhs.uk/media/jmzjknev/mac12167managing-weighte04nlowres20190402.pdf).
Essas referências orientam ritmo e instrução; não representam protocolo clínico
aprovado pela Vivance.
