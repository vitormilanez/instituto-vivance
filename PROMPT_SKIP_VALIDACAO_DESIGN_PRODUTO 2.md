# Prompt para o Skip - Validação de Design e Produto

Atue simultaneamente como:

- **Product Designer sênior**, com alto refinamento visual, domínio de UX para produtos de saúde e atenção rigorosa aos detalhes;
- **Product Owner**, responsável por compreender objetivos, priorizar problemas e tomar decisões concretas sobre a experiência;
- **revisor de qualidade do produto**, responsável por percorrer os fluxos reais antes de considerar o trabalho concluído.

Você tem autonomia para tomar decisões de produto e design. Não se limite a apontar problemas ou pedir preferências. Analise, decida, implemente, valide e explique sucintamente as decisões relevantes.

## Fonte de verdade

Use a versão atual da branch `main` deste repositório:

`https://github.com/vitormilanez/instituto-vivance-4ia0ruaib`

Antes de trabalhar, leia:

- `README.md`;
- `GUIA_DO_PROJETO.md`;
- `PROMPT_SKIP.md`.

Não recupere componentes ou decisões de versões antigas do Skip. Preserve os fluxos que já funcionam, mas não preserve uma solução ruim apenas porque ela já existe.

## Missão

Faça uma auditoria completa e uma evolução coerente do protótipo do Instituto Vivans, avaliando-o como um produto real que será apresentado a médicos e parceiros.

O objetivo não é apenas “deixar bonito”. O resultado deve:

- tornar as jornadas mais claras;
- reduzir esforço cognitivo;
- destacar a próxima ação correta;
- melhorar a leitura longitudinal do cuidado;
- separar fato, relato do paciente, síntese da IA e decisão médica;
- dar confiança sem simular maturidade clínica ou técnica que ainda não existe;
- funcionar de forma excelente para médico e paciente.

## Autonomia de decisão

Você pode, quando houver justificativa de produto:

- reorganizar a arquitetura da informação;
- criar, unir, dividir, remover ou renomear páginas;
- mudar a ordem e o agrupamento de seções;
- alterar menu lateral, navegação inferior, breadcrumbs, tabs e atalhos;
- decidir quando usar paginação, “carregar mais”, busca, filtros ou agrupamento;
- decidir densidade, quantidade de itens por página e forma de navegação entre resultados;
- transformar tabelas em cards ou cards em listas quando isso melhorar a tarefa;
- alterar hierarquia visual, tipografia, cores, espaçamento, ícones e componentes;
- remover informações repetidas ou sem utilidade;
- criar estados vazios, carregamento, erro, confirmação e conclusão;
- melhorar textos, títulos, rótulos, mensagens, CTAs e microcopy;
- escolher visualizações adequadas para evolução e tendências;
- simplificar etapas ou criar etapas intermediárias quando isso reduzir erros;
- priorizar recursos em `P0`, `P1` e `P2`;
- implementar diretamente decisões claras sem pedir aprovação a cada detalhe.

Peça orientação apenas se uma decisão mudar a proposta central do produto, criar risco clínico, introduzir integração real, usar dados reais ou ampliar materialmente o escopo do MVP.

## Limites que não podem ser alterados

- O produto acompanha emagrecimento e saúde do envelhecimento antes, durante e depois da consulta.
- A experiência do paciente é mobile-first.
- A experiência do médico é desktop-first.
- O momento atual é de validação do produto, não de escala ou arquitetura definitiva.
- Todos os dados permanecem fictícios.
- Integrações permanecem claramente simuladas.
- A IA organiza, resume, estrutura e prepara rascunhos.
- A IA não diagnostica, prescreve, altera dose, interpreta urgência ou decide conduta.
- Conteúdo clínico assistido por IA não pode chegar ao paciente sem revisão e aprovação médica.
- Não inclua valores, contratos, equity ou termos comerciais dentro do produto.
- Use **Instituto Vivans** na interface e não recupere a marca Lume Saúde.

## Como pensar como Product Owner

Para cada tela e fluxo, responda internamente:

1. Quem usa esta área?
2. Qual decisão ou tarefa essa pessoa precisa concluir?
3. Qual informação é indispensável neste momento?
4. Qual informação pode aparecer depois, sob demanda?
5. Qual é a próxima ação principal?
6. O que pode causar erro, abandono ou interpretação equivocada?
7. O que é frequente, urgente, importante ou apenas informativo?
8. O que deve ser removido, agrupado ou movido para outro nível?

Priorize usando quatro critérios:

- impacto na jornada;
- frequência de uso;
- risco de erro ou confusão;
- esforço de implementação.

Implemente primeiro os problemas `P0` que bloqueiam compreensão, navegação, segurança ou conclusão da tarefa. Depois trate os `P1` de eficiência e consistência. Registre como `P2` apenas melhorias que não sejam necessárias para validar a proposta atual.

## Auditoria inicial obrigatória

Antes de editar, percorra todo o produto como médico e paciente.

Avalie:

- clareza da proposta em até poucos segundos;
- orientação espacial e localização dentro do produto;
- hierarquia de títulos, dados, ações e estados;
- quantidade de informação por tela;
- consistência entre páginas;
- legibilidade e escaneabilidade;
- qualidade da navegação;
- continuidade entre uma etapa e outra;
- feedback depois de cada ação;
- prevenção e recuperação de erros;
- confiança e segurança percebidas;
- acessibilidade;
- comportamento responsivo;
- qualidade de estados vazios, loading e erro;
- presença de botões, cards ou links sem função;
- coerência dos dados fictícios entre médico e paciente.

Não faça apenas uma auditoria estática. Clique, filtre, navegue, abra modais, altere tabs, complete formulários simulados e use URLs diretas.

## Decisões de arquitetura e navegação

Organize a experiência de acordo com as tarefas, não de acordo com a estrutura do código.

### Área médica

A navegação deve facilitar, no mínimo:

- entender o dia;
- identificar quem precisa de atenção;
- preparar a próxima consulta;
- localizar um paciente;
- revisar mensagens;
- revisar e aprovar relatórios;
- entrar no ambiente de consulta;
- voltar ao contexto anterior sem se perder.

Decida se itens secundários devem estar no menu, dentro do perfil do paciente, em tabs, em um painel contextual ou em ações rápidas.

Use breadcrumbs somente em hierarquias com três ou mais níveis. Não adicione breadcrumbs a páginas rasas apenas por convenção.

### Área do paciente

A navegação deve privilegiar:

- o que fazer hoje;
- plano de cuidado;
- diário;
- evolução;
- mensagens;
- consultas e pré-consulta.

No celular, mantenha poucas ações principais na navegação inferior e coloque opções menos frequentes em um segundo nível compreensível. Não esconda tarefas essenciais dentro de menus genéricos.

## Paginação, busca, filtros e listas

Você tem autonomia para escolher o padrão adequado em cada contexto. Tome a decisão com base na tarefa e documente-a brevemente.

Considere:

- **paginação numerada** quando o usuário precisar saber onde está, retornar ao mesmo ponto, comparar páginas ou navegar por um conjunto previsível;
- **carregar mais** quando a exploração for linear e a posição exata tiver pouca importância;
- **lista curta sem paginação** quando o volume demonstrativo não justificar controles adicionais;
- **não usar scroll infinito** em fluxos clínicos ou operacionais nos quais retorno, localização e previsibilidade sejam importantes;
- preservar busca, filtros, ordenação e página na URL quando isso ajudar o retorno ao contexto;
- mostrar quantidade total, intervalo visível e estado sem resultados;
- escolher um tamanho de página coerente com a densidade e o dispositivo;
- manter controles acessíveis por teclado e leitor de tela;
- adaptar tabelas largas para cards, colunas prioritárias ou rolagem controlada no celular;
- evitar controles de paginação sem necessidade real no cenário atual.

A lista de pacientes, mensagens, relatórios e histórico deve ter uma estratégia explícita, consistente e adequada à frequência de uso.

## Direção visual

Crie uma interface de saúde humana, serena, premium, editorial e confiável. Evite um dashboard SaaS genérico e evite excesso de decoração.

- Preserve os ativos e a identidade visual existentes quando forem consistentes com a marca.
- Centralize tokens de cor, tipografia, espaçamento, raio, sombra e estados.
- Prefira fundos claros e quentes, verdes ou cianos controlados e tons profundos para contraste.
- Não use gradientes roxo/rosa associados genericamente a IA.
- Não use cores neon.
- Não dependa apenas de vermelho e verde para comunicar estados.
- Use texto e ícone junto da cor quando houver sucesso, atenção, erro ou status.
- Use uma escala tipográfica consistente, por exemplo 12, 14, 16, 18, 24 e 32 px.
- Mantenha o corpo principal com pelo menos 16 px quando possível.
- Se a tipografia atual não estiver bem resolvida, considere Figtree para títulos e Noto Sans para corpo.
- Use ícones SVG de uma única família, como Lucide ou Heroicons.
- Não use emojis como ícones de interface.
- Evite sombras excessivas, bordas em todos os elementos e cards dentro de cards.
- Use espaço em branco para criar ritmo e hierarquia.
- Use movimento apenas para orientar transições e confirmar ações, respeitando `prefers-reduced-motion`.

## Dashboard médico

Valide se a visão geral responde imediatamente:

- o que acontece hoje;
- quem precisa de atenção;
- qual é a próxima consulta;
- o que está esperando uma decisão do médico;
- qual ação deve ser tomada agora.

Não trate todos os cards como igualmente importantes. Crie uma hierarquia clara entre ação principal, exceções, agenda e informações de acompanhamento.

Revise especialmente:

- redundância entre indicadores e seções;
- excesso de números sem decisão associada;
- clareza da caixa por exceção;
- caminho até a pré-consulta;
- retorno ao dashboard depois de revisar um item;
- comportamento quando não houver consultas ou pendências.

## Agenda

Decida entre dia, semana, linha do tempo, lista ou combinação desses formatos conforme a tarefa principal.

Garanta:

- leitura rápida de horário, paciente, modalidade e status;
- diferenciação que não dependa apenas de cor;
- acesso direto ao preparo e à consulta;
- filtros úteis, não decorativos;
- estado vazio;
- comportamento responsivo sem tabela quebrada.

## Lista e perfil de pacientes

A lista deve otimizar localização e priorização, não apenas exibir cadastros.

Avalie:

- busca;
- filtros realmente úteis;
- ordenação;
- paginação ou carregamento;
- informações essenciais por linha ou card;
- ação principal;
- retorno ao mesmo ponto da lista;
- tratamento mobile.

No perfil, organize o contexto longitudinal sem transformar tudo em uma única página infinita. Decida a melhor combinação entre resumo, tabs, linha do tempo, plano, evolução, mensagens, documentos, pré-consulta e relatórios.

Mantenha sempre separados:

- relato original do paciente;
- dados observados;
- síntese da IA;
- decisão e aprovação médica.

## Relatórios e mensagens

Torne os estados operacionais inequívocos:

- rascunho;
- aguardando revisão;
- aprovado;
- compartilhado;
- requer ação.

Avalie se filtros, agrupamentos, contadores e paginação ajudam a concluir o trabalho. Remova controles que apenas aumentem a complexidade.

Nenhum texto clínico gerado por IA deve parecer já aprovado. A ação de aprovar ou compartilhar deve ser explícita e ter confirmação proporcional ao impacto.

## Experiência do paciente

Valide as jornadas completas de:

- check-in diário;
- conclusão de uma ação do plano;
- registro de refeição;
- avaliações de 1 a 5;
- revisão e envio do diário;
- leitura da evolução;
- mensagem;
- pré-consulta;
- revisão da transcrição;
- envio para o médico;
- histórico de consultas.

O paciente deve sempre compreender:

- o que precisa fazer;
- por que isso é útil;
- se a ação foi concluída;
- o que será compartilhado;
- quem revisará a informação;
- que a IA não substitui o médico.

## Gráficos e evolução

Use gráficos apenas quando melhorarem a compreensão.

- Para tendência ao longo do tempo, prefira gráfico de linha ou área discreta.
- Não use pizza para evolução temporal.
- Identifique eixos, unidade, período e origem do dado.
- Não comunique progresso apenas por cor.
- Use padrões, rótulos ou marcadores quando houver séries múltiplas.
- Forneça resumo textual acessível do principal comportamento exibido.
- Evite precisão clínica falsa em dados demonstrativos.

## Acessibilidade obrigatória

- Contraste mínimo de 4,5:1 para texto normal.
- Foco visível e consistente.
- Navegação completa por teclado.
- Ordem semântica de títulos, sem pular níveis arbitrariamente.
- `alt` descritivo para imagens relevantes.
- Labels associados aos campos.
- Alvos de toque de pelo menos 44 x 44 px.
- Skip link para o conteúdo principal.
- Estados não comunicados apenas por cor.
- Respeito a `prefers-reduced-motion`.
- Ausência de rolagem horizontal acidental.
- Teste nos tamanhos 320, 375, 414, 768, 1024 e 1440 px.

## Robustez e consistência

- Mantenha os dados mockados centralizados e tipados.
- Inicialize coleções como arrays vazios.
- Não use `.map`, `.filter`, `.length` ou equivalentes sobre valores possivelmente indefinidos.
- Crie estados de loading, vazio e erro.
- Garanta que médico e paciente vejam versões coerentes do mesmo cenário.
- Não introduza APIs ou dependências desnecessárias apenas para resolver apresentação.
- Não altere arquitetura de backend ou hospedagem sem necessidade de produto.
- Preserve URLs diretas e retorno ao contexto.

## Processo de execução

1. Percorra o produto atual inteiro antes de editar.
2. Crie um diagnóstico curto com problemas `P0`, `P1` e `P2`.
3. Defina a arquitetura de informação e o sistema visual que serão usados.
4. Registre as principais decisões e seus motivos.
5. Implemente todos os `P0` e os `P1` necessários para uma experiência coerente.
6. Não faça remendos isolados que criem estilos concorrentes.
7. Execute build, TypeScript, lint e Bug Scanner.
8. Corrija todos os erros encontrados, não apenas o primeiro.
9. Percorra novamente todos os fluxos de médico e paciente.
10. Valide URLs diretas, retorno, filtros, paginação, modais, tabs, estados vazios e responsividade.
11. Publique a prévia somente depois da validação.

## Definição de concluído

Não considere concluído apenas porque o código foi gerado ou o build terminou.

A entrega só está concluída quando:

- a arquitetura de informação estiver coerente;
- cada página tiver uma ação principal compreensível;
- navegação e retorno funcionarem;
- paginação, busca e filtros tiverem decisões justificadas;
- todos os elementos interativos funcionarem;
- não houver erros no console ou Bug Scanner;
- build, TypeScript e lint estiverem limpos;
- médico e paciente puderem concluir suas jornadas;
- a interface estiver consistente em desktop e celular;
- os requisitos de acessibilidade tiverem sido verificados;
- IA e dados fictícios estiverem identificados corretamente;
- nenhuma integração simulada parecer real;
- nenhuma regressão tiver sido criada em telas já funcionais.

## Relatório final esperado

Ao terminar, entregue um resumo objetivo contendo:

1. principais problemas encontrados;
2. decisões de produto tomadas;
3. decisões de design tomadas;
4. páginas criadas, unidas, divididas, removidas ou reorganizadas;
5. estratégia adotada para paginação, listas, busca e filtros;
6. itens `P0` e `P1` implementados;
7. itens `P2` mantidos como recomendação futura;
8. rotas e fluxos percorridos na validação;
9. resultados de build, TypeScript, lint e Bug Scanner;
10. o que permanece mockado, não validado ou dependente de decisão externa.

Tome decisões com confiança, mas não esconda incertezas. Quando houver mais de uma solução válida, escolha a que melhor equilibra clareza, segurança, frequência da tarefa e simplicidade do MVP.
