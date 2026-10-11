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
[CI 38102475713](https://github.com/vitormilanez/instituto-vivance/actions/runs/38102475713)
passou no commit `528c0e0d728b8856b9f24f00cd070b24540a0b6d`. As verificações
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

O paciente permanente de QA entrou pela interface local e pelo Preview, manteve
sessão após recarga e recebeu 404 ao tentar abrir a ficha médica. No Preview,
o login abriu a rota de cuidado do paciente. Credenciais ficaram no arquivo
local ignorado, sem publicação em logs ou Git. A proteção Vercel foi acessada
com autenticação existente, sem alterar a configuração. A verificação médica
autenticada permanece pendente da sessão na janela de teste.

## Entrega para revisão

[PR #119](https://github.com/vitormilanez/instituto-vivance/pull/119), em draft.
[Preview](https://instituto-vivance-6i59r1ue9-vtr-consulting.vercel.app), deployment
`dpl_FD84t5t97712Pk9TcHsJq1yrKwsC`, READY após build. Conta `vtrconsulting`,
equipe `vtr-consulting`, projeto `instituto-vivance` /
`prj_ligeZuFRycRXA21u5rRzaLAORTrI` conferidos. O deploy foi solicitado com
`--target preview`; seu SHA é `63bcc2f3d21bb81f29cf3b3ad2621128dd6b5bd4`.
Os commits posteriores alteram testes/documentação, sem diferença no código
da aplicação. `/login` respondeu HTTP 200 com autenticação Vercel.

Asana: tarefas `1219378497566919` (UX) e `1219002739975041` (IA2–IA3)
atualizadas com a direção aprovada, PR/Preview e evidências, preservando o
histórico. Ambas permanecem abertas para os aceites pendentes.

Não houve migration, mudança de extração, reprocessamento ou gravação clínica.
Supabase temporário: `instituto-vivance-dev` / `oxuwrdjojsmgxoljqkuk`, apenas
testes sintéticos. PR/Preview, publicação técnica e aceite médico são marcos
separados; a publicação anterior #117 não valida esta interface.
