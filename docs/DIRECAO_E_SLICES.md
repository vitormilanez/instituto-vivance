# Direção do Vivance e próximos slices

**Publicação autorizada e conferida em 11/10, tarde:** #121 e #122 estão no
domínio principal. Colisão email/WhatsApp não deve consumir token nem apresentar
retry genérico; link revogado orienta recuperação pelo e-mail/novo convite.
Template médico pronto, mas aplicação Auth bloqueada pelo provedor padrão/free
tier: configurar SMTP exige decisão/credenciais próprias; não contratar nem
alterar plano automaticamente. PRs antigos substituídos não voltam ao produto;
Pulse e governança IA seguem os gates/documentação, sem publicação automática.

**Decisão de 11/10/2026 — convites:** diferenciar conta confirmada de cadastro
pendente de ativação. Ao convidar uma identidade não confirmada, solicitar
novo e-mail de ativação e informar claramente o resultado; somente conta
confirmada recebe orientação de entrar em Minhas clínicas sem novo e-mail.
O usuário autorizou excluir especificamente a conta antiga de
`vtrconsultingbr@gmail.com` para teste do zero. Limpeza conferida; implementação
e publicação têm estados separados no [status](STATUS_ATUAL.md). Não recriar
essa identidade antes do convite manual do usuário.

**Convite por e-mail (11/10):** preparar apresentação acolhedora em português,
com identidade Vivance, Dr. Guilherme Martins e CRM-SP 182364 informado pelo
usuário, sem CPF, dados clínicos ou promessas de resultado. Atribuição médica
somente para seu convite de paciente; outros usam fallback institucional.
Template e remetente SMTP são configurações distintas da publicação do código.

**Decisão vigente em 11/10/2026:** cuidado longitudinal supervisionado: convite → contexto inicial → preparação → consulta → registro médico → acompanhamento → retorno. O médico interpreta e decide. Relato literal, dado extraído, cálculo, revisão, aprovação e publicação têm origem e estados separados. O [status](STATUS_ATUAL.md) distingue implementação, teste e publicação.

## Prioridade de UX do paciente — 11/10

Pedido aprovado: check-in intuitivo e poucas escolhas, com desenhos expressivos,
também na alimentação. Implementado Energia → Sono → Fome → Banheiro → recado
opcional; dados adicionais recolhidos, aplicação condicionada à habilitação
médica. Alimentação aceita foto, texto ou ambos em escolhas diretas. Landing
e aplicativo compartilham apresentação, sem confundir exemplo com registro.
GPT-6 Astra fez revisão independente conforme escolha explícita do usuário;
Product Design, sem Impeccable. Escalas, armazenamento, fontes, histórico e
permissões existentes preservados, sem mudança de banco ou extração.
526 testes e percurso sintético paciente → persistência → médico passaram
localmente. Entrega em PR/Preview; publicação e aceites separados. Ver
[evidências](UX_CHECKIN_ALIMENTACAO_2026-10-11.md).

## Prioridade atual — validar qualidade e publicação médica (10/10)

Pedido vigente: exames extensos no formato PDF/foto devem preservar o texto por
página antes da extração. [PR #114](https://github.com/vitormilanez/instituto-vivance/pull/114)
publicado tecnicamente: formatação literal de PDF, validação de payload e
checkpoints por lote para evitar pagar novamente pelos concluídos. A verificação
remota revelou referências descartadas e duplicatas; o [PR #115](https://github.com/vitormilanez/instituto-vivance/pull/115)
corrigiu esses achados e também foi publicado. O [PR #117](https://github.com/vitormilanez/instituto-vivance/pull/117)
integrou e publicou tecnicamente a continuação entre leases, a retomada médica
de job esgotado e o destaque de valores acima/abaixo/dentro da referência do
próprio laudo. Haiku 5.5 inicial + Sonnet 5.5 seletivo; sem interpretação clínica.
A retomada do PDF reportado foi acionada pela sessão médica no domínio publicado;
o mesmo job/run concluiu a recuperação técnica com texto/original preservados,
65 itens e 13 checkpoints. A interface publicada mostrou 65 resultados para
conferir, sem estado de falha; a fonte de Eritrócitos abriu na página 1 com
valor/unidade/referência/data. **Qualidade e completude ainda exigem avaliação
médica**; as notas de qualidade sinalizam possíveis ausências.
Próxima entrega separada: aprovação médica e publicação explícita ao paciente.
Estado de publicação e evidência em [STATUS_ATUAL](STATUS_ATUAL.md);
contrato, limites e política econômica em [IA2_EXAMES](IA2_EXAMES.md).

## IA2 sintética publicada — próxima entrega separada

Os [PRs #106/#107](https://github.com/vitormilanez/instituto-vivance/pull/107) estabeleceram extração sintética com fonte e revisão por item; o [#109](https://github.com/vitormilanez/instituto-vivance/pull/109) integrou correções de unidade, referência e data. O [#110](https://github.com/vitormilanez/instituto-vivance/pull/110) integrou a deduplicação e foi publicado tecnicamente na aplicação `91970c0`, Edge v11 e deployment `dpl_DH5etxpExwKTLPDU5d6qj6LttkwU`, anteriores ao refinamento de UX #112. Consulte o [status](STATUS_ATUAL.md) para o frontend vigente. A migration `20261010220240` era a última nessa rodada histórica (68 no dev); o #114 aplicou `20261010234104` (69 no dev). A interface médica autenticada confirmou cinco medidas na run atual, histórico preservado e Glicose v5 após recarga. O isolamento do paciente foi testado em rodada anterior, sem novo teste no #110; não há aceite clínico.

A deduplicação .4 resolveu no piloto a representação de número/unidade juntos ou separados: a run .3 tinha dez itens de cinco resultados, enquanto a run .4 trouxe cinco itens em primeira tentativa do Cron. CI e release #110 passaram 504 testes; a verificação autenticada no domínio principal confirmou 25 resultados, 24 pendentes. A avaliação privada offline final fundamentou 81 itens com zero offsets inválidos, sem comprovar completude clínica. O HEAD documental pode diferir do SHA da aplicação por commits somente de documentação.

Após a recuperação operacional, validar com médico os resultados e fontes; então publicar explicitamente ao paciente somente fatos aprovados, com resumo enxuto e acesso ao original. Revisão de transcrição não equivale a aprovação/publicação. Ampliar o corpus de qualidade por tipo e medir estabilidade com gabarito médico antes de IA3/interpretação; a avaliação privada não é gabarito clínico.

## Sequência e dependências

| Frente | Decisão |
| --- | --- |
| Onboarding/convites | [PRs #103/#104](STATUS_ATUAL.md) publicados tecnicamente e jornada real testada; Vitor repetirá manualmente com convite novo. Usabilidade dele permanece pendente. QR coletivo exige contrato de aprovação médica; Google Sign-In exige OAuth real. |
| C2/C3 operacional | Validar continuidade paciente → pedido/resposta → revisão → recibo → consulta/retorno, inclusive outros papéis/vínculos e persistência. Código do PR #95 não fecha aceite operacional. Não forjar assinatura/conduta médica. |
| IA1 — governança | Decidir finalidade, fornecedor, dados permitidos, privacidade, rastreabilidade e revisão antes de ampliar além do piloto sintético. [PR #64](https://github.com/vitormilanez/instituto-vivance/pull/64) é rascunho, sem aprovação inferida. |
| IA2 — extração | #114/#115 estabeleceram texto/páginas, checkpoints e correção literal; #117 publicou tecnicamente continuação, retomada e referências no dev sintético. Recuperação técnica do PDF concluída; conferir qualidade/fontes com médico, depois entregar aprovação e publicação explícita ao paciente. Estabilidade geral e aceite médico seguem pendentes. |
| IA3–IA6 | Biblioteca aprovada/versionada, interpretação com evidência, verificação, validação médica e operação somente após gates do [plano de IA](PLANO_IA_CLINICA.md). |
| C1/Gate P | `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`) é destino temporário único para testes sintéticos. Separar produção e cumprir [Gate P](GATE_P.md) antes de dados reais; preservar registros de origem incerta. |

## Experiência médica

**Padronização UX integrada e publicada tecnicamente (10/10/2026):** aplicar, via Product
Design e sem Impeccable, a ordem cabeçalho de contexto → seletores retangulares
→ conteúdo nas superfícies médicas. Hoje usa quatro abas — Resumo, Exames e
documentos, Evolução, Solicitações — sem “Preparar”. Exames têm filtros
independentes de comparação com a referência do laudo e de estado da revisão;
o formulário de revisão aparece abaixo da linha factual. Cores servem à
comparação documentada, sem inferência clínica. Preservar URL, permissões por
papel/vínculo, paginação, formulários e rascunhos. Não criar banco ou funções
clínicas. [PR #119](https://github.com/vitormilanez/instituto-vivance/pull/119)
integrado à `main` no SHA `e05cb4c`; publicação técnica confirmada em
[institutovivance.app](https://institutovivance.app). Preview autenticado,
525 testes e release da `main` aprovados. Não houve migration ou Edge Function
neste lote; #117 e #118 permanecem históricos. A publicação não constitui
aceite médico. [Guia visual](../apps/web/DESIGN.md) e
[checkpoints](CHECKPOINTS_ENTREGAS.md).

Refinamento do Resumo: cards brancos/neutros no lugar do bloco azul contínuo;
objetivo e pendências em um terço e relatos em dois terços no desktop, com
fatos em grid; uma coluna no celular. Rótulos derivam da fonte. Tipos de
18/14/16/13 px para card/rótulo/conteúdo/fonte e espaços de 16/20/24 px.
Responsividade, teclado, preservação de edição e build final foram conferidos;
login real do paciente sintético passou localmente e no novo Preview.
Login médico real com Guilherme passou localmente e no novo Preview: sessão,
fonte/histórico, filtros, links diretos, voltar e edição preservados. O
enquadramento limita o Hoje a 1440 px, compacta contexto e faixas, e mantém
conteúdo em 16 px e alvos de 44 px. Cards começam em 262 px na composição
desktop de 1330×625; mobile 320 px sem corte horizontal. Aceite de usabilidade
desta UX permanece pendente após a publicação técnica. Links e SHA no
[status](STATUS_ATUAL.md) e [evidências](UX_MEDICA_PADRAO_2026-10-10.md).
Uma resposta API **simulada** para o valor 99 no limite
superior validou cor verde e preservação da fonte/histórico, sem mutação remota.

**Prioridade solicitada em 10/10, entregue pelo #112:** briefing da Home com
objetivo destacado, exames/revisão consolidados, originais recolhidos e peso
único compacto. Publicado tecnicamente em `7e3b849`, com revisão GPT-6 Sol Ultra
e sessão médica sintética conferida. Esse refinamento precedeu a próxima entrega
de publicação ao paciente; os gates e a ausência de interpretação clínica
permanecem. Aceite de usabilidade do médico pendente, tarefa Asana
`1219378497566919`; evidências nos [checkpoints](CHECKPOINTS_ENTREGAS.md).

Manter menu superior, lista de pacientes, Agenda e oito ações rápidas. Em Hoje, mostrar agenda e pendências operacionais; na ficha, identificação, objetivos, medidas, histórico informado, evolução e documentos com original. Ausência de dado não é zero e ausência de registro não prova baixa adesão. Mostrar rapidamente apenas o necessário, com detalhe progressivo; cada campo exige coleta/persistência real. Preservar identidade Vivance e o briefing já entregue. Consulta, aprovação e publicação não se confundem.

## Como escolher IA

Dados estruturados e regras determinísticas cobrem idade, IMC, unidades, variações, cronologia e estados. Modelo de linguagem só organiza informação autorizada quando isso agrega valor e passa avaliação de qualidade, custo, latência, privacidade e rastreabilidade. OCR entra quando texto embutido falha. RAG exige biblioteca clínica curada e vigente; MCP não substitui contrato de dados ou revisão médica. Não habilitar dados reais ou interpretação clínica por causa de um resultado sintético.

A frente comercial Virada 90 segue separada nos [documentos próprios](virada90/). Decisões novas devem atualizar direção, status e tarefa Asana após confronto com Git e ambiente.
