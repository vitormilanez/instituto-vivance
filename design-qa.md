# Conferência visual — tela do paciente na área médica

> Registro histórico do protótipo Cloudflare. Para a aplicação atual, consulte `apps/web` e os documentos de continuidade em `docs/`.

## Evidências

- Referência visual do sistema VIVANCE: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-dashboard-desktop-final3.png`
- Tela implementada no computador: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-patient-desktop.png`
- Tela na largura em uso: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-patient-user-884.png`
- Tela no celular: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-patient-mobile.png`
- Referência e implementação lado a lado: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-patient-design-system-comparison.png`
- Antes e depois lado a lado: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-patient-before-after.png`

## Medidas e estado

- Referência e implementação no computador: `1440 x 1024` px, área CSS `1440 x 1024`, densidade normalizada `1:1`.
- Largura observada no aplicativo: `884 x 863` px, área CSS `884 x 863`, densidade normalizada `1:1`.
- Celular: `375 x 812` px, área CSS `375 x 812`, densidade normalizada `1:1`.
- Estado: paciente fictícia Marina Costa, visão geral selecionada, consulta às 10:30, sono para revisar, blocos de aprofundamento fechados.
- A referência é o painel principal, não uma composição da mesma tela. A comparação avalia adoção do sistema visual — marca, menu, cores, tipografia, espaço, forma e densidade — e não igualdade de conteúdo.

## Findings

- Nenhuma diferença P0, P1 ou P2 permanece.
- Tipografia: Geist, pesos, tamanhos e quebras acompanham o painel VIVANCE. O nome da paciente, o ponto de atenção e os números têm hierarquia clara; os textos pequenos continuam legíveis.
- Espaço e estrutura: menu lateral, barra superior, largura de conteúdo, cantos e ritmo vertical seguem a referência. A tela passou de uma sequência longa de blocos para um resumo curto com aprofundamento opcional.
- Cores: azul-marinho, azul de ação, branco e azul-claro usam os mesmos valores do sistema. Âmbar aparece somente no estado que pede revisão. Não há grande área verde nem grande degradê.
- Imagens e marca: o logo oficial da VIVANCE permanece nítido, com transparência e sem caixa ou halo. Os ícones vêm de uma única biblioteca; não há desenho improvisado em HTML ou SVG.
- Texto: a interface usa “histórico”, “acompanhamento”, “o que merece atenção” e “apoio para preparar a consulta”. A IA não ocupa o nome da tela nem é apresentada como autora clínica.
- Responsivo: não houve rolagem lateral em `1440`, `884` ou `375` px. No celular, nome, contexto, estados e ação principal aparecem antes das abas; a aba seguinte fica parcialmente visível como indicação de rolagem.
- Acessibilidade: abas têm papéis e estados selecionados, controles principais têm pelo menos 44 px, foco visível usa azul de ação e estados não dependem apenas de cor.

## Comparação completa

- A composição lado a lado confirma o mesmo menu azul-marinho, barra superior clara, logo, ação principal escura, cartões claros e densidade controlada.
- O antes e depois confirma a remoção do grande bloco verde, a redução do comprimento inicial, a troca de cartões empilhados por grupos com divisores e a simplificação do primeiro contato com o histórico.
- Não foi necessário um recorte adicional: os elementos de maior precisão — logo, menu, cabeçalho, abas, ação principal, bloco de atenção e métricas — permanecem legíveis nas capturas `1440 x 1024`; a captura `375 x 812` funciona como comparação focada do topo no celular.

## Histórico da comparação

1. A primeira captura no celular mostrou o texto do ponto de atenção estreito porque o ícone mantinha uma coluna lateral durante todo o bloco. Classificação: P2 responsivo.
2. O bloco passou a empilhar o ícone em telas pequenas e manter a composição horizontal a partir do tamanho médio.
3. A captura final `vivanse-patient-mobile.png` confirmou título, explicação e ação com largura útil maior, sem rolagem lateral.
4. A varredura mecânica apontou uma borda lateral grossa em item da linha do tempo, duas cores fora da paleta e texto de 10 px. A borda foi reduzida ao padrão, as cores foram alinhadas à paleta e os textos passaram para a menor medida documentada.
5. A revisão independente pediu seis ajustes: navegação global compacta, botão de fontes inteiro no celular, registro da seed e da referência de qualidade, cartões sem desfoque, aviso em azul-marinho e rótulos do gráfico maiores.
6. O menu foi incluído na barra superior, o bloco de atenção foi compactado, o contrato foi registrado e as superfícies, aviso e gráfico foram alinhados ao sistema.
7. As três recapturas foram refeitas na rota de Marina Costa. A revisão final marcou os seis itens como resolvidos, sem regressão e com disposição `ship`.
8. As capturas finais confirmaram que não restaram diferenças P0, P1 ou P2.

## Ações testadas

- As quatro abas trocaram o conteúdo e atualizaram a referência da página.
- “Documentos” exibiu filtros, originais e estados de revisão.
- “Evolução” exibiu o gráfico e os períodos sem ultrapassar a largura.
- O menu de mais ações abriu e mostrou as ações previstas.
- O menu principal compacto abriu e mostrou Hoje, Agenda, Pacientes, Mensagens e Relatórios abaixo de 1024 px.
- “Ver resumo completo do acompanhamento” e “Abrir apoio para preparar a consulta” só montaram o conteúdo pesado quando abertos.
- Registros do navegador: nenhum erro ou aviso de execução; apenas mensagens normais do servidor de desenvolvimento.

## Open Questions

- Nenhuma questão bloqueia esta entrega. Integrações reais, permissões e registros legais continuam fora do mock.

## Implementation Checklist

- [x] Cabeçalho compacto do paciente.
- [x] Abas funcionais e acessíveis.
- [x] Ponto de atenção claro, sem aparência de urgência automática.
- [x] Métricas e contexto na primeira leitura.
- [x] Conteúdos profundos recolhidos e carregados sob demanda.
- [x] Computador, largura em uso e celular conferidos.
- [x] Lint dos arquivos alterados e build aprovados.

## Follow-up Polish

- P3 opcional: adicionar setas discretas aos blocos recolhidos para reforçar visualmente o estado aberto ou fechado.

final result: passed

---

# Conferência visual — cabeçalho recolhível e navegação inferior

## Evidências

- Barra inferior flutuante no celular: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-floating-bottom-navigation-mobile-2026-09-02.png`
- Barra inferior flutuante no computador: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-floating-bottom-navigation-desktop-2026-09-02.png`
- Barra inferior da paciente no celular: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-patient-floating-bottom-navigation-mobile-2026-09-02.png`
- Barra inferior da paciente no computador: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-patient-floating-bottom-navigation-desktop-2026-09-02.png`

## Comportamento validado

- No topo, o cabeçalho mostra título, contexto da rota, próxima ação, troca de área, notificações e perfil conforme o espaço disponível.
- Após `32 px` acumulados de rolagem para baixo e além de `96 px` da página, contexto, carteira, perfil e ações secundárias saem; título e “Atender” permanecem. A barra inferior desliza para fora da tela e fica indisponível para clique.
- Com `16 px` acumulados para cima ou retorno ao topo, o cabeçalho expande e a barra inferior reaparece.
- O cabeçalho preserva `80 px` no fluxo; o modo compacto usa recorte, movimento e transparência para chegar a `56 px` visuais sem alterar o fluxo do documento.
- O menu fica flutuante no rodapé, com `12 px` de respiro. Em `320 px`, ocupa `295 px`, usa cinco colunas, ícones de `15 px`, rótulos de `10 px` e não cria rolagem lateral.
- A superfície usa branco a `72%`, desfoque de `20 px` e saturação discreta para produzir vidro sem esconder o conteúdo.
- A área da paciente usa o mesmo comportamento com quatro destinos e uma única navegação: `295 px` em `320 px` e `600 px` em `1440 px`. O item “Meu cuidado” abriu `/paciente/pac-demo-001/cuidado` e permaneceu marcado como atual.
- O menu móvel mantém “Abrir área da Marina”, notificações e identificação do médico; aberto em `320 px`, permanece entre `x=48` e `x=304`.
- Nas rotas internas, o título e o botão voltar acompanham o contexto. `/medico/pacientes/pac-demo-001/mensagens` mantém “Mensagens” como item ativo.
- O menu lateral e os demais blocos presos acompanham suavemente a altura visível do cabeçalho, sem sobreposição: `80 px` expandido e `56 px` compacto.

## Medidas

- Sem rolagem lateral estrutural em `320`, `375`, `768`, `1024` e `1440` px.
- Celular: a altura do documento permaneceu em `1678 px` durante a troca de estado.
- Computador: a barra fica centralizada com largura máxima de `720 px`. Os blocos presos acompanham `top=80 px` expandido e `top=56 px` compacto.
- A transição usa `requestAnimationFrame`, listener passivo e `180ms`; com movimento reduzido, não há transição.

final result: passed

---

# Conferência visual — painel e pré-consulta do médico

## Evidências

- Referência enviada pelo usuário: `/var/folders/_0/xfp11_y96x18jcq9n9cl3d900000gn/T/TemporaryItems/NSIRD_screencaptureui_P3lh79/Captura de Tela 2026-09-02 às 00.25.31.png`
- Painel final no computador: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-doctor-dashboard-final-2026-09-02.png`
- Pré-consulta final no computador: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-doctor-consultation-blue-desktop-2026-09-02.png`
- Pré-consulta final no celular: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-doctor-consultation-mobile-2026-09-02.png`
- Painel final no celular: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-doctor-dashboard-mobile-2026-09-02.png`
- Troca Médico ↔ Paciente no celular: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-role-switch-mobile-2026-09-02.png`
- Troca Médico ↔ Paciente em `320` px: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-role-switch-mobile-320-2026-09-02.png`
- Retorno pela área da paciente no celular: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-role-switch-patient-mobile-2026-09-02.png`
- Antes e depois da pré-consulta: `/Users/vitormilanez/Desktop/Codes/Instituto Vivance/.impeccable/review/vivanse-consultation-before-after-2026-09-02.png`

## Medidas e estado

- Painel: área CSS de `1440 x 900` px, página no topo, dados demonstrativos e Marina Costa como próxima consulta.
- Pré-consulta: referência original em `3018 x 1762` px, equivalente a `1509 x 881` px em densidade 2x; implementação conferida em largura CSS de `1509` px.
- Celular: painel e pré-consulta conferidos em áreas CSS de `320 x 700` e `375 x 812` px, sem rolagem horizontal estrutural.

## Findings e correções

- P2: a pré-consulta mantinha grandes superfícies verdes e reforçava uma identidade diferente do restante do produto. Correção: estrutura em azul-marinho, seleção e foco em azul de ação, cartões de leitura em branco e azul-claro.
- P2: o topo tinha espaço sem função ao lado das notificações. Correção: resumo compacto e clicável com `22 acompanhados`, `17 check-ins em dia` e `5 para revisar`, usando a mesma fonte demonstrativa do resumo de pacientes.
- P2: o menu terminava sem contexto de trabalho. Correção: bloco “Próxima consulta” logo abaixo de Relatórios, com horário, pessoa, estado e atalho real para preparar a consulta.
- P1 encontrado na revisão independente: o estado do bloco lateral podia acompanhar o paciente aberto, embora o cartão mostrasse Marina. Correção: o estado agora consulta explicitamente a pessoa e a consulta do próprio cartão.
- P3: termos de implementação deixavam a teleconsulta com aparência de demonstração técnica. Correção: “Sala e consentimento”, “Apoio em tempo real”, “Pontos para o médico revisar” e “Demonstração”.
- P3: a varredura de acabamento encontrou sete tamanhos fora da escala tipográfica. Todos foram alinhados às medidas registradas no sistema visual.

## Resultado visual

- A leitura do painel começa por quem será atendido e pelo que precisa de atenção; a tecnologia não domina a tela.
- O azul-marinho aparece somente em navegação, ação principal e áreas decisivas. Verde não é mais usado como estrutura da pré-consulta.
- “Pré-consulta pendente” continua em âmbar porque pede revisão; estados recebidos, revisados ou aprovados usam azul. Rosa fica reservado a erro ou rejeição e cinza a indisponibilidade.
- O menu, a barra superior e o menu móvel preservam o efeito de vidro. Cartões clínicos continuam sólidos e claros.

## Ações testadas

- O resumo da carteira abre `/medico/pacientes`.
- A troca Médico → “Marina demo” abre `/paciente/pac-demo-001`; a volta Paciente → Médico abre `/medico`. O nome evita sugerir que o atalho acompanha qualquer prontuário aberto. Os dois sentidos foram testados no computador e no celular.
- Em `320`, `375` e `1440` px, o controle permanece acessível sem criar rolagem horizontal estrutural.
- Abaixo de `640` px, notificações e identificação do médico continuam disponíveis dentro do menu principal.
- “Preparar consulta” abre `/medico/pacientes/pac-demo-001/pre-consulta/enc-demo-002`.
- “Atender agora” abre a teleconsulta e mantém a etapa Consulta selecionada.
- A pré-consulta foi aberta e conferida também em `375 x 812` px; as etapas permanecem roláveis e o conteúdo se mantém dentro da tela.
- Painel, tela da paciente e teleconsulta não apresentaram rolagem lateral estrutural nas larguras testadas.
- Console do navegador: nenhum erro ou aviso.
- Lint dos arquivos alterados e build completo aprovados.

## Open Questions

- Os números `22/17/5` ainda são dados demonstrativos. Quando existir uma fonte real, devem ser calculados a partir da mesma regra usada na lista de pacientes.

final result: passed
