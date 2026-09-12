# Slice 7B.2 — Painel Hoje, Agenda e navegação coerentes

## Instrução para o Vercel Agent

Implemente somente este slice em uma branch isolada e abra uma PR pequena para revisão. Use como base o `HEAD` remoto de `codex/slice-7b1-patient-record`. No momento deste handoff, a branch inclui a base funcional `9423832` e o refinamento visual da PR #13, incorporado em `b082a70`.

- Branch sugerida: `vercel-agent/slice-7b2-dashboard-agenda`.
- Base da PR: `codex/slice-7b1-patient-record`.
- Não alterar, reabrir ou ampliar as PRs #11 e #12.
- Não fazer merge, não promover Production e não mudar alias/configuração da Vercel.
- Parar após abrir a PR e registrar as evidências verificáveis.

## VALOR DESTA ENTREGA

Dar ao médico uma entrada diária coerente: a mesma consulta deve aparecer como próxima no painel e na Agenda, levando ao paciente e ao atendimento corretos sem perder contexto.

## RESULTADO DEMONSTRÁVEL

Com dados sintéticos, o médico abre **Hoje**, identifica a consulta em andamento ou a próxima consulta, acessa a mesma ocorrência na **Agenda**, abre a ficha do mesmo paciente e retoma ou prepara o atendimento correto. O cabeçalho apresenta a quantidade real de avisos internos não lidos. As oito ações rápidas permanecem.

## POR QUE É NECESSÁRIA AGORA

Agenda, atendimento, ficha individual, check-ins e avisos já possuem persistência e regras de acesso. A lacuna atual é de composição: telas diferentes podem escolher ou apresentar o “próximo” item de maneiras distintas, alguns links perdem o paciente selecionado e o cabeçalho ainda não mostra o contador persistido de avisos.

## Estado de entrada confirmado

- O painel profissional usa `todayWorkspace` e `TodayWorkspace`.
- A Agenda usa os agendamentos persistidos e já aceita foco por `?data=AAAA-MM-DD#consulta-ID`.
- Atendimento em rascunho pode ser retomado pelo identificador existente.
- A ficha do Slice 7B.1 já mantém o paciente nas abas Visão geral, Linha do tempo, Documentos e Evolução.
- Avisos internos persistidos existem; leitura de aviso não significa leitura de mensagem nem adesão a plano.
- Oito ações rápidas são uma restrição explícita do produto.

## Escopo funcional obrigatório

### 1. Regra única para consulta em foco

Extrair uma regra pura e reutilizável para selecionar a consulta em foco, usada por **Hoje** e **Agenda**:

1. priorizar atendimento `in_progress` do profissional na data selecionada;
2. na ausência dele, escolher o primeiro `scheduled` ainda vigente, em ordem cronológica;
3. ignorar `completed`, `cancelled` e `no_show`;
4. nunca substituir silenciosamente uma consulta/paciente por outro registro quando um link antigo deixar de existir;
5. usar horário de Brasília conforme os utilitários já existentes, sem depender do fuso do dispositivo.

Não criar novo estado de Agenda. Em especial, não inventar `confirmada`, `a confirmar`, `na sala`, presença online ou tempo de espera.

### 2. Ações coerentes no painel

- Se houver atendimento em andamento com rascunho correspondente, mostrar **Retomar atendimento** e abrir esse atendimento.
- Se houver consulta agendada, mostrar **Preparar atendimento** e abrir a Agenda já posicionada na consulta, preservando data e ID.
- Se não houver próxima consulta, mostrar o vazio verdadeiro e oferecer **Organizar agenda**.
- Substituir a frase “Pré-consulta e IA ainda não conectadas” por orientação manual factual, sem promover funcionalidade inexistente. Texto sugerido: “Revise os registros disponíveis antes de iniciar.”
- O painel não inicia, finaliza ou publica atendimento/plano por navegação.

### 3. Contexto do mesmo paciente

- No painel, **Contexto do paciente** abre `/clinicas/{tenantId}/pacientes/{patientId}`.
- **Acompanhamento e exames** abre a aba `Documentos` da ficha desse mesmo paciente, reaproveitando o `recordBase` do 7B.1.
- Última consulta e plano publicado continuam usando seus registros reais e autorizados.
- Não carregar um paciente padrão quando o contexto estiver vazio, revogado ou indisponível.
- Não expor mensagens diretas à enfermagem nem conteúdo clínico ao administrador operacional.

### 4. Avisos reais no cabeçalho

Adicionar um resumo mínimo de avisos não lidos ao cabeçalho da clínica:

- contar somente `in_app_notifications` do usuário autenticado e da clínica atual com `read_at IS NULL`;
- mostrar o número junto ao link **Avisos** apenas quando for maior que zero;
- incluir nome acessível, por exemplo “3 avisos não lidos”;
- não consultar nem renderizar corpo clínico no cabeçalho;
- não chamar o contador de “mensagens não lidas”;
- respeitar RLS e a sessão atual; nunca usar chave privilegiada no navegador.

Preferir uma consulta de contagem limitada/servidor em vez de carregar a lista completa. Reutilizar `modules/notifications` e o `Header`; não duplicar uma segunda implementação de avisos.

### 5. Navegação e apresentação

- Preservar exatamente **oito ações rápidas**. Como Acompanhamento já está conectado, sua ação deve ser apresentada como disponível, sem “Conhecer a área”.
- Preservar a Agenda existente; não construir outro calendário ou lista paralela.
- Manter uma única ação principal na próxima consulta.
- Seguir `apps/web/DESIGN.md`: superfícies claras, bordas finas, raio de 16 px nos painéis, sem grande degradê, sem brilho e sem dourado fora do logo.
- Desktop: painel principal e coluna de atenção escaneáveis, com Agenda do dia abaixo.
- Até 1100 px: empilhar as regiões sem alterar a ordem da tarefa.
- Celular a partir de 320 px: próxima consulta primeiro, conteúdo em uma coluna, ações tocáveis com pelo menos 44 px e sem rolagem horizontal estrutural.
- Manter foco visível, ordem de teclado lógica e estado descrito por texto, não apenas por cor.

## Arquivos de referência prováveis

- `apps/web/app/clinicas/[tenantId]/page.tsx`
- `apps/web/components/today-workspace.tsx`
- `apps/web/modules/workspace/today.ts`
- `apps/web/components/agenda.tsx`
- `apps/web/modules/agenda/service.ts`
- `apps/web/components/clinic-shell.tsx`
- `apps/web/components/header.tsx`
- `apps/web/modules/notifications/service.ts`
- `apps/web/app/globals.css`
- `apps/web/DESIGN.md`

Estes caminhos orientam a investigação; alterar somente o conjunto mínimo necessário. Não fazer uma reescrita geral de estilos.

## Fora de escopo

- Migração, tabela, coluna, RPC ou política RLS nova.
- Áudio, vídeo, câmera, transcrição, OCR ou IA.
- Pré-consulta estruturada, anamnese, programa clínico, metas ou percentuais inventados.
- Alerta de risco, urgência automática, triagem ou promessa de tempo de resposta.
- Confirmação de consulta, presença online ou sala virtual.
- Mudança em autenticação, MFA, recuperação, retenção ou backup.
- Dados reais, Production, custo/plano da Vercel ou troca do alias de homologação.
- Alteração do Asana.

## Critérios de aceite — BDD

```gherkin
Funcionalidade: Consulta em foco coerente entre Hoje e Agenda

  Cenário: Atendimento em andamento tem prioridade
    Dado que o médico possui um atendimento em andamento e uma consulta futura no mesmo dia
    Quando ele abre Hoje e depois a Agenda
    Então as duas telas destacam o mesmo atendimento em andamento
    E a ação principal abre o rascunho correspondente

  Cenário: Próxima consulta agendada
    Dado que não existe atendimento em andamento
    E existe uma consulta agendada ainda vigente
    Quando o médico abre Hoje
    Então a primeira consulta futura em ordem cronológica é apresentada
    E Preparar atendimento abre a Agenda na mesma data e no mesmo ID

  Cenário: Estados terminais não viram próxima consulta
    Dado que há consultas concluídas, canceladas ou marcadas como falta
    Quando Hoje e Agenda calculam a consulta em foco
    Então nenhum desses registros é apresentado como próximo

  Cenário: Link antigo não troca o paciente silenciosamente
    Dado que o médico abre um link para uma consulta que deixou de estar disponível
    Quando a Agenda é carregada
    Então a Agenda mantém a data solicitada ou apresenta estado previsível
    E não destaca outro paciente como se fosse o destino original
```

```gherkin
Funcionalidade: Contexto preservado na jornada do médico

  Cenário: Painel abre a ficha correta
    Dado que a próxima consulta pertence ao paciente Marina
    Quando o médico abre Contexto do paciente
    Então a ficha de Marina é carregada
    E o paciente permanece Marina ao alternar as quatro abas

  Cenário: Painel abre documentos do mesmo paciente
    Dado que a próxima consulta pertence ao paciente Marina
    Quando o médico abre Acompanhamento e exames
    Então a aba Documentos da ficha de Marina é carregada
    E somente documentos autorizados de Marina são consultados

  Cenário: Vínculo revogado falha fechado
    Dado que o vínculo do médico com Marina foi revogado
    Quando ele abre diretamente um link preservado do painel
    Então nenhum dado clínico de Marina é exibido
    E nenhum outro paciente é usado como substituto
```

```gherkin
Funcionalidade: Contador de avisos internos

  Cenário: Exibir somente avisos não lidos do destinatário
    Dado que o médico tem dois avisos não lidos e um aviso já lido
    E outro usuário possui avisos na mesma clínica
    Quando o cabeçalho é exibido
    Então o contador mostra 2
    E não inclui avisos do outro usuário
    E o nome acessível informa “2 avisos não lidos”

  Cenário: Não confundir aviso com leitura da mensagem
    Dado que existe um aviso interno do tipo message
    Quando o aviso é marcado como lido
    Então o contador diminui
    E nenhuma mensagem é marcada como lida por consequência
```

```gherkin
Funcionalidade: Layout operacional preservado

  Cenário: Oito ações rápidas
    Quando o painel profissional é renderizado
    Então existem exatamente oito ações rápidas
    E Acompanhamento aparece como uma área disponível

  Cenário: Painel no celular
    Dado um viewport de 390 px
    Quando o médico abre Hoje
    Então a próxima consulta e sua ação aparecem antes das listas
    E não existe rolagem horizontal estrutural
    E os controles essenciais possuem alvo de pelo menos 44 px
```

## Dados sintéticos para validação

É permitido criar contas e registros exclusivamente no Supabase de desenvolvimento. Marcar os usuários com `raw_user_meta_data.test_marker = "slice-7b2"` e manter inventário dos IDs criados para limpeza ao encerrar o desenvolvimento.

Conjunto mínimo:

- um médico ativo;
- dois pacientes com vínculos ativos e registros distintos;
- um atendimento em andamento e uma consulta futura no mesmo dia;
- um atendimento em rascunho ligado à consulta em andamento;
- um check-in enviado aguardando revisão;
- dois avisos não lidos e um lido para o médico;
- um aviso pertencente a outro usuário para provar isolamento.

Não usar nomes, e-mails, arquivos ou informações clínicas reais. Não imprimir credenciais, tokens ou links de sessão nas evidências.

## Verificação obrigatória

Executar e registrar separadamente:

1. `git diff --check`;
2. testes focados para a regra compartilhada de consulta em foco, links com paciente, oito ações e contador de avisos;
3. `npm test` completo em `apps/web`;
4. `npm run lint`;
5. `npm run typecheck`;
6. `npm run build`;
7. navegador autenticado em desktop e 390 px;
8. ausência de erro de console/overlay;
9. fluxo pelo teclado nos links e na ação principal.

Na verificação visual, comprovar pelo menos:

- Hoje e Agenda apontam para o mesmo atendimento em andamento;
- o link de contexto mantém o paciente nas quatro abas;
- o contador de avisos muda após leitura sem alterar mensagens;
- vazios verdadeiros não recebem dados de outro paciente;
- oito ações rápidas permanecem;
- nenhum badge inventa risco, confirmação ou presença.

Testes e build não equivalem a homologação clínica. Se a Preview for solicitada depois, registrar deployment/commit exatos e repetir a jornada autenticada nela; não usar somente um `401` anônimo como evidência.

## Entrega esperada

- Uma PR pequena e revisável contra `codex/slice-7b1-patient-record`.
- Descrição da PR com valor, resultado demonstrável, arquivos alterados, BDD atendido, comandos executados e evidência de navegador.
- Preferir um commit funcional e, se necessário, um commit documental de evidências.
- Nenhuma mudança fora deste slice.
- Não fazer merge nem deploy automaticamente.

## Definição de concluído

O slice está pronto para avaliação quando a PR permite demonstrar, com dados sintéticos, que **Hoje → Agenda → ficha → atendimento** conserva a mesma consulta e o mesmo paciente, apresenta o contador correto de avisos e mantém as oito ações rápidas em desktop e celular, com todos os checks obrigatórios verdes.
