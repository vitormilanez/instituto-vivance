# Padronização da experiência médica — 10/10/2026

Direção aprovada: contexto no topo, retângulos de seleção, conteúdo abaixo.
Product Design e revisão independente orientaram esta entrega. O padrão visual
de convites foi aplicado aos componentes existentes, preservando a identidade
Vivance, menu, oito ações rápidas e contratos clínicos.

## Escopo implementado

- Cabeçalho e seletor compartilhados distinguem navegação, filtros, abas e
  etapas. Contagem ausente não vira zero; abas locais mantêm painéis montados.
- Hoje inicia no Resumo e oferece Exames e documentos, Evolução e Solicitações.
  “Preparar atendimento” foi removido. Ficha, mensagem, rascunho e Agenda continuam.
- Objetivo e pendências ficam ao lado dos relatos no desktop; no celular,
  uma coluna. Cards brancos, rótulos derivados da fonte, conteúdo literal e
  fontes preservadas. Títulos 18 px, rótulos 14 px, conteúdo 16 px, fontes 13 px;
  espaços recorrentes de 16, 20 e 24 px. Fatos usam uma grade compacta.
- Pacientes, convites, ficha, acompanhamento, revisão, Agenda, teleconsulta,
  atendimento e receitas usam os seletores comuns. Planos, preparo, documentos,
  mensagens e relatórios reutilizam cabeçalhos e apresentação conforme suas
  seções funcionais. Filtros de cadastros identificam o alcance nesta página.
- Exames: Todos, Fora, Dentro e Sem comparação; acima/abaixo refinam Fora,
  revisão é um select secundário. Verde significa dentro da referência literal,
  vermelho acima/abaixo, cinza indisponível; texto/ícone acompanham a cor.
  Conferência humana permanece independente. Fonte e formulário aparecem abaixo
  da linha, em duas colunas internas no desktop e uma até 900 px.

## Evidência local

Node 24.19.0; 525 testes passaram. Lint sem erros, com um aviso anterior em
`onboarding-workspace.tsx`; typecheck e build final passaram. O
[CI 38105274475](https://github.com/vitormilanez/instituto-vivance/actions/runs/38105274475)
passou no commit `5445083c4205a3e7b7ef6061399620b61ab4237c`. As verificações
existentes de Agenda e etapas foram ajustadas para conferir o padrão aprovado.

Playwright verificou componentes reais na composição exclusiva de desenvolvimento
`/refinamentos-preview`, com fixtures explícitas. Hoje, exames, Agenda, convites,
documentos e mensagens foram conferidos em 1440, 900, 390 e 320 px sem rolagem
horizontal da página. Seletores conservam altura uniforme; controles dos exames
e Agenda têm pelo menos 44 px de altura. Calendário mantém largura flexível das
células. Capturas locais ignoradas: `output/playwright/medical-standardization/`.

Teclado Home/End alterna as abas e mantém foco. Mensagem em edição sobrevive à
troca de aba; correção em exame sobrevive à troca de resultado/filtro. Os cenários
de comparação incluem acima, abaixo, dentro e ausência de referência/narrativa.
Um teste com **resposta HTTP simulada** corrigiu 108 para 99 no limite superior:
o resultado passou a verde, mantendo o trecho de origem 108 e a revisão no
histórico. Esse cenário não comprova uma nova gravação remota. Limites e revisões
são cobertos pelos testes existentes do classificador, que não foi alterado.

O paciente permanente de QA entrou pela interface local e pelo novo Preview,
manteve sessão após recarga e recebeu 404 ao tentar abrir a ficha médica. No
novo Preview, a API de extração retornou 403 com essa sessão de paciente.
O login abriu a rota de cuidado do paciente. Credenciais ficaram no arquivo
local ignorado, sem publicação em logs ou Git. A proteção Vercel foi acessada
com autenticação existente, sem alterar a configuração.

Guilherme, conta médica de teste autorizada, entrou pela interface local e pelo
novo Preview, manteve sessão após recarga e abriu ficha, extração e original
com HTTP 200. O link direto da Glicose abriu fonte e histórico de cinco
revisões, mantendo 92 mg/dL. Todos os itens foram expandidos por controles da
interface: filtros mostraram 4 fora, 30 dentro e 108 sem comparação, total 142.
O formulário manteve o valor 99 em edição ao alternar filtros; nenhuma
correção foi enviada e recarregar manteve 92. Navegação Documentos → Evolução
e voltar preservou a seção na URL. Captura e JSON locais ignorados:
`doctor-preview-documents.png` e `doctor-auth-preview-result.json`.

## Refinamento de enquadramento

A captura do usuário mostrou contexto/ações e faixa ocupando altura excessiva.
O contexto agora combina os metadados, sem margens cumulativas, e a faixa
mostra rótulo/contagem horizontal. Etapas continuam numeradas. O Hoje limita
a largura a 1440 px. Seletor tem mínimo de 56 px sem contagem e 60 px com
contagem, podendo crescer uniformemente para texto extenso. Título/modo do
Resumo compartilham linha quando cabe; gutters de 24 px e cards de 16 px.

Composição sintética real dos componentes, sem autenticação: em 1330×625,
cabeçalho e ações ocupam 144 px, faixa 62 px com bordas e cards começam em
262 px a partir do briefing (cerca de 386 px na captura recebida). Em
390/320 px, cards começam em 482/528 px, sem corte horizontal. No celular,
nome/metadados usam a largura disponível, avatar decorativo oculto, controle
de expansão 44×44 px e ações preservadas. A tela ainda exige rolagem para os
relatos, ponto residual de densidade registrado pela revisão independente.
Essas medidas são da composição de QA, não da conta médica autenticada.

Revisão independente final sem impedimento nas capturas desktop e 320 px.
Agenda, convites, documentos, mensagens e exames foram novamente conferidos
em 320 px sem overflow; seletores têm alturas uniformes e rótulos alinhados.
Agenda usa toda a linha na terceira opção (56 px alto); envio de mensagem
44 px alto. Corrigida regra legada da Agenda que atingia botões aninhados.
Home/End continuam movendo foco e seleção no Hoje. Evidências locais ignoradas:
`framing-today-{1330,390,320}.png`, `framing-measures.json` e
`framing-final-agenda-320.png` em `output/playwright/medical-standardization/`.

## Preview e publicação técnica

[PR #119](https://github.com/vitormilanez/instituto-vivance/pull/119), integrado à
`main` no commit `e05cb4cafa20c3a5b43899fdfae1b7bf4310a17c`.
[Preview](https://instituto-vivance-pq76f1h6n-vtr-consulting.vercel.app), deployment
`dpl_5jWLNZWFSXczYnfadtbUoGha9jkV`, READY após build. Conta `vtrconsulting`,
equipe `vtr-consulting`, projeto `instituto-vivance` /
`prj_ligeZuFRycRXA21u5rRzaLAORTrI` conferidos. O deploy foi solicitado com
`--target preview`; seu SHA é `5445083c4205a3e7b7ef6061399620b61ab4237c`.
Os commits posteriores no PR alteraram documentação, sem diferença no código
da aplicação. `/login` respondeu HTTP 200 com autenticação Vercel.

O [release da main](https://github.com/vitormilanez/instituto-vivance/actions/runs/38105844754)
aprovou `verify`; migração, Edge e promoção automáticas foram ignoradas por
configuração. O PR não alterou `supabase/`. Vercel criou o deployment
[`dpl_4ckHiqrEM1NdXqaf6cUFTigvHt2X`](https://instituto-vivance-ihi2psj0e-vtr-consulting.vercel.app),
`READY`/`production`, do SHA integrado. A promoção manual atualizou
`targets.production`. O [domínio principal](https://institutovivance.app) e
o [secundário](https://instituto-vivance.vercel.app) resolveram para esse
mesmo ID. O principal respondeu `/login` três vezes com HTTP 200 e TTFB
0,102–0,155 s; o secundário retornou 307 para o principal. Deployment
anterior conhecido: `dpl_692H3GxaZpMVK7tCczcnBD9FT31N`, SHA `2454345`.

No domínio público, Guilherme entrou pela interface, manteve sessão após
recarga e abriu Home, ficha, extração e original com HTTP 200. Link direto
Glicose abriu 92 mg/dL e cinco revisões; com todos os itens expandidos,
142 = 4 fora + 30 dentro + 108 sem comparação. Edição 99 sobreviveu à troca
de filtros sem envio; recarga manteve 92. Documentos → Evolução → voltar
preservou a URL. Paciente QA percorreu `/clinicas` e chegou a Meu cuidado,
manteve sessão, recebeu 404 na ficha médica e 403 na API de extração.
Credenciais e estados de navegador permanecem em arquivos locais ignorados.
Evidências sintéticas locais: `doctor-auth-production-public-result.json`,
`patient-auth-production-public-result.json` e
`doctor-production-public-documents.png` em
`output/playwright/medical-standardization/`.

Asana: tarefas `1219378497566919` (UX) e `1219002739975041` (IA2–IA3)
atualizadas com a direção aprovada, Preview, publicação técnica e evidências, preservando o
histórico. Ambas permanecem abertas para os aceites pendentes.

Não houve migration, mudança de extração, reprocessamento ou gravação clínica.
Supabase temporário: `instituto-vivance-dev` / `oxuwrdjojsmgxoljqkuk`, apenas
testes sintéticos. PR/Preview, publicação técnica e aceite médico são marcos
separados; #117 é histórico e #119 é a interface publicada nesta rodada.
