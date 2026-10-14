# Hoje, paciente e mensagens de incentivo — 14/10/2026

## Fechamento técnico publicado

PR137/application SHA `a1d2153`: Hoje, ficha, Agenda, Pacientes e Mensagens
publicados junto à Teleconsulta; 591 testes/CI e conferência móvel no domínio.
Migration de outreach aplicada no dev sintético antes do frontend. Preview,
envio e replay deram200; uma única mensagem fictícia legível pela conta
`vtrconsultingbr@gmail.com`, sem duplicar e sem enviar a outros pacientes.
Teste de recebimento com sessão real/RLS via API, não disparo integral pela UI.
Aceite do usuário e Gate P permanecem separados.
[Evidências, limites e recuperação](ENTREGA_WORKSPACE_E_TRANSCRICAO_2026-10-14.md).

## Histórico — escopo implementado localmente

Branch `codex/hoje-paciente-navegacao`, base `95b69ba`. Não publicado.
Preservadas as alterações anteriores do onboarding técnico para Alfredo.

- Hoje prioriza consultas do dia, identificação da próxima consulta realmente
  futura e acesso ao paciente. O briefing clínico saiu da página principal.
- Fundo branco e azul existente; uma navegação inferior. Os oito destinos
  anteriores continuam acessíveis, parte deles em Mais, sem outra grade gigante.
- Indicadores reais: vínculos ativos agora (sem curva histórica inventada),
  mensagens recebidas em sete dias e check-ins solicitados com prazo vencido.
  Dados indisponíveis não viram zero. Check-ins não são classificados por risco.
- Ficha médica reúne objetivo com origem, registros recebidos, documentos,
  peso real e solicitações. IA de exames, fontes, conferência e publicação
  permanecem nos fluxos próprios, sem nova interpretação clínica.
- Dia sem consultas mostra Agendar consulta (abre a Agenda) e três mensagens
  de incentivo em carrossel manual, editáveis, sem autoplay.
- Animações curtas e redução de movimento respeitada. Correções responsivas
  incluem a tabela de documentos, pesquisa móvel e nomes técnicos de arquivos.
- Pendências documentais desconsideram duplicatas, como a ficha do paciente.

## Extensão visual — Agenda, Pacientes e Mensagens

Pedido subsequente aplicado na mesma branch, sem publicação:

- Agenda branca, calendário compacto, seletor Dia/Semana/Retornos leve,
  identificação e ações juntas ao horário. Ícones Lucide existentes.
- Pacientes com título visível, lista como conteúdo principal, filtros discretos,
  convite em fluxo próprio. Estado vazio de filtro orienta voltar a Todos.
- Mensagens com busca local por nome (ignora acentos), conversa em destaque e
  contexto do paciente recolhível. Ficha mantém abas secundárias mais leves.
- Impeccable orientou agrupamento e consistência; Product Design comparou com a
  Hoje aprovada. Não adicionadas animações decorativas ou gráficos fictícios.
- Verificação local com sessão médica: filtro vazio/retorno, abrir convite/voltar,
  Semana/Dia, abrir/fechar formulário sem salvar, Agenda→ficha, busca sem resultado
  e limpar busca em Mensagens, expansão do contexto. Nenhum envio executado.
- Larguras CSS320 e1440 nas três áreas; Agenda semanal900 também sem overflow
  global. Rolagem horizontal da semana permanece interna. Corrigido alinhamento
  Anterior/Hoje/Próximo no celular. Console observado sem erros.
- 27/27 testes focados de Agenda/Mensagens/navegação, lint dos4TSX, tipos e build
  Webpack passaram no espelho já utilizado. Log `ui-modern-build.log` no mesmo
  diretório temporário. Turbopack não aceita o symlink de dependências do espelho;
  não confundir essa limitação com falha da aplicação. Ajustes finais apenas de
  texto/CSS reconferidos no navegador e lint, sem repetir build integral.
- Teste de diálogo de descarte de rascunho inconclusivo na automação; guarda
  preexistente não alterada. Não declarar envio/paginação como testados nesta rodada.
- Asana: busca dirigida “Vivance Agenda” sem correspondência; nenhuma tarefa de
  outro escopo alterada. Capturas e avaliação em [design-qa](../design-qa.md).

## Contrato de envio coletivo

Mensagens internas do aplicativo, não WhatsApp/e-mail. O médico vê o texto e a
lista completa e confirma antes de enviar. Destinatários: seus próprios pacientes
com vínculo ativo, conta confirmada e acesso ativo na mesma clínica. Sem acesso
ativo, não há envio silencioso por outro canal.

Migração `20261014192700_doctor_supportive_outreach.sql` aplicada no dev sintético
na publicação final de14/10 (na preparação inicial abaixo era somente local).
RPCs validam sessão, papel médico, vínculo e destinatário a cada envio. Lotes de
cinco; limite de 60 mensagens/minuto; chaves idempotentes por destinatário.
Falhas parciais mantêm os sucessos e permitem tentar apenas o restante. O
andamento fica na sessão desta aba, separado por clínica e médico; não persistir
credenciais. Navegação/saída protege rascunho e envio em andamento.

Sem o contrato remoto, a interface informa indisponibilidade e não libera envio.
Na preparação inicial não houve disparo. No fechamento remoto houve somente
o envio QA dirigido documentado acima; não disparo para a lista completa.

## Evidências e limites

- Revisão independente Astra delimitada a estados honestos e ao contrato de
  disparo. Corrigidos objetivo aguardando resposta, ausência versus falha de
  dados, identificação de envios e guarda de saída pelo formulário de logout.
- Testes focados de dashboard/navegação, regras de objetivo e outreach passaram;
  outreach inclui testes SQL locais de permissões, elegibilidade e idempotência.
- Suite em espelho temporário limpo: 567/567. No checkout original, arquivos
  anteriores duplicados ` 2.sql` quebram o bootstrap por coluna já existente.
  Foram excluídos apenas da cópia de validação; originais preservados.
- Tipos e build final passaram em Node24.19.0/Next16.3.4. Lint completo sem
  erros, um aviso anterior em onboarding-workspace.tsx217. Logs no espelho
  `/tmp/vivance-verify-03yjdFAs`: `full-suite.log`, `typecheck-final.log`,
  `build-final.log`, `lint.log`. Dashboard final reconferido:3/3.
- Login real pela interface local com médico de teste; Hoje → paciente → fonte
  do exame, Agenda e Mensagens. Sem criação de agendamentos ou mudança clínica.
- Comparação visual com protótipos aprovados e telas em desktop/320 px;
  detalhes em [design-qa](../design-qa.md). Não é aceite clínico.

## Histórico — gate antes da publicação

Antes de liberar: confirmar projeto/ambiente vivos, aplicar a migração no dev
sintético autorizado, validar envio e recebimento com destinatários sintéticos
explicitamente selecionados, publicar pelo fluxo do repositório e conferir o
domínio autenticado. Não inferir entrega remota dos testes SQL locais.
Gate P, separação de produção e aceite clínico continuam pendentes.

Asana: busca direcionada por tarefa “Vivance Hoje” não encontrou correspondência.
Nenhuma tarefa nova ou atualização em item de outro escopo foi feita.
