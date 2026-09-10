# VIVANCE — conexão e migração para Vercel + Supabase

Decisão registrada em 10/09/2026. Este documento distingue configuração aplicada de migração ainda pendente.

## Objetivo

Reaproveitar o produto atual, com APIs organizadas em módulos, banco real e nenhuma informação clínica simulada no ambiente de uso. Começar vazio e preencher apenas por cadastros autorizados. Fixtures são exclusivas dos testes automatizados, em banco isolado.

## Estado atual — primeira fatia implementada

- Aplicação Next.js nativa em `apps/web`, com dependências próprias fixadas e sem importação do protótipo da raiz. Marca e cores reaproveitadas; migração funcional incremental.
- Login Supabase, seleção de clínica, cadastro demográfico paginado e APIs versionadas por módulo implementados. Histórico de alterações transacional disponível para administrador.
- Schema de identidade/diretório aplicado apenas no Supabase de desenvolvimento. RLS, papéis, vínculos ativos e sessão não revogada são verificados no banco. Nenhuma clínica, usuário ou paciente foi inventado.
- 20 testes aprovados em PostgreSQL efêmero e validações de entrada/fronteira do runtime; tipos, lint e build nativo aprovados. Login e rejeição de credenciais inválidas verificados no navegador; APIs negam acesso anônimo.
- Vercel configurada para `apps/web`, sem incluir arquivos externos à raiz da aplicação. Publicações automáticas continuam desligadas; uma prévia manual protegida desta fatia pode ser usada para validação, sem promoção para produção.
- Primeiro administrador depende do e-mail confirmado pelo titular. Fluxo autenticado completo, convites/recuperação, jornadas clínicas e IA ainda pendentes; sem homologação para atendimento.
- Validação online pendente: a CLI Vercel 59.15.1 classificou os dois primeiros envios como Production, inclusive com `--target preview`. Ambos foram removidos, e a API confirmou zero deployments restantes. Nenhuma variável Supabase foi adicionada em Production. Não repetir o envio supondo que a flag seja suficiente; resolver o bootstrap do projeto antes da próxima publicação. Código preservado no Git permite recriar os builds removidos.
- [PR #11](https://github.com/vitormilanez/instituto-vivance/pull/11) aberto como rascunho; testes, lint, tipos e build também passaram no GitHub. [Revisão pontual solicitada ao Vercel Agent](https://github.com/vitormilanez/instituto-vivance/pull/11#issuecomment-5627137061); comentário enviado, mas execução e retorno ainda não confirmados. Revisões automáticas globais não foram ativadas.
- Verificador de segurança Supabase sem alertas. Performance informa apenas índices ainda não utilizados no banco vazio; mantidos por sustentarem consultas por clínica. [Explicação do aviso de índice não utilizado](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

Detalhes e execução: [README da aplicação](../apps/web/README.md).

## Configuração inicial — registro histórico da preparação

- Repositório existente: `vitormilanez/instituto-vivance`.
- Trabalho isolado: branch `codex/vercel-supabase-foundation`, criada do commit `b68c397`.
- Cloudflare e `main` preservados durante a preparação.
- Login da Vercel realizado pela CLI oficial; equipe `vtr-consulting` confirmada.
- Projeto `instituto-vivance` criado nessa equipe e vinculado à cópia local.
- Perfil de destino: Next.js, Node.js 24.x.
- Publicações de preview suspensas e comando de ignorar build configurado como `exit 0` enquanto o código depender do runtime anterior e de conteúdo simulado.
- Login GitHub e autorização do aplicativo concluídos pelo titular. Repositório `vitormilanez/instituto-vivance` conectado ao projeto da VTR Consulting e confirmado pela API (`link.org`, `link.repo`, `link.productionBranch = main`) e pelo link Repository no painel. Nenhum deploy foi criado.
- Supabase: titular autorizou a organização `vitormilanez's Org` (`laamvjzeoppcwvvvrnlf`). Projeto novo `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`) criado no plano Free, São Paulo (`sa-east-1`), com custo de criação confirmado de US$ 0/mês e estado `ACTIVE_HEALTHY`.
- Projeto Supabase antigo `rxnklgprwsrnfogkstjs` preservado, ainda inativo. O novo banco começou vazio: zero tabelas de negócio no schema `public`, zero usuários e zero buckets, verificados por consulta.
- URL e chave publicável moderna do projeto novo configuradas na Vercel apenas em Development e Preview, também disponíveis nos arquivos locais ignorados pelo Git. Nenhuma variável do Supabase foi adicionada em Production. Valores de Development conferidos após download oficial da Vercel.
- Endpoint de configuração de autenticação respondeu HTTP 200 com a chave publicável. A raiz REST de introspecção recusou essa chave com HTTP 401 (`Secret API key required`), como informa o próprio endpoint; nenhuma chave privilegiada foi adicionada para contornar essa restrição. A integração funcional do aplicativo ainda precisa ser implementada e testada.
- Nenhuma aplicação foi publicada e nenhum dado de paciente foi transferido nesta etapa.

Credenciais ficam somente no armazenamento local de autenticação, em `.env.local` ignorado pelo Git e nas variáveis do projeto. Não registrar tokens, senhas ou chaves neste documento.

## Arquitetura escolhida

Uma aplicação modular, um repositório e inicialmente uma publicação. Os módulos expõem APIs com contratos claros, mas suas regras não dependem de HTTP, componentes de tela ou da hospedagem. Separar serviço físico apenas quando houver necessidade medida.

| Módulo | Responsabilidade |
| --- | --- |
| Identidade e clínicas | Supabase Auth, associação usuário/clínica, papéis e autorização |
| Pacientes e profissionais | Cadastros reais e vínculos de cuidado |
| Atendimento | Consultas, check-ins, revisão e evolução |
| Documentos | Upload e leitura autorizada, metadados e storage privado |
| IA | Solicitações, transcrição, rascunhos, revisão, modelo/versão e consumo |
| Auditoria | Ações, acessos relevantes, autoria, clínica e rastreabilidade |

O Supabase fornece PostgreSQL, autenticação e armazenamento privado. Todas as entidades clínicas carregam a clínica de origem. O servidor valida o vínculo ativo do usuário e o acesso ao paciente. RLS reforça essa autorização. Chaves e relacionamentos devem impedir referências entre clínicas, inclusive nas gravações feitas pelo backend.

Histórico funcional é separado dos logs técnicos. Alterações importantes e seus eventos de auditoria são persistidos na mesma transação. Logs técnicos não recebem áudio, prontuário, senha ou corpo completo das solicitações. IDs de correlação conectam requisição, processamento e evento.

## Inventário que impede publicar o protótipo diretamente

1. `package.json` inicia e compila com Vinext/Wrangler.
2. `db/index.ts` importa `cloudflare:workers` e exige bindings D1/R2.
3. `db/schema.ts` e as migrações existentes usam SQLite; precisam de conversão para PostgreSQL.
4. `app/lib/auth.ts` cria contas de demonstração durante autenticação; `app/lib/messages.ts` também chama essa rotina.
5. `app/components/login-screen.tsx` oferece contas e senhas de demonstração.
6. `app/layout.tsx` monta provedores de estado de demonstração.
7. Rotas de paciente, consulta e serviços usam identificadores e consultas ao catálogo de demonstração.
8. Parte dos fluxos clínicos usa estado de navegador e conteúdo estático como fonte de informação.

Mudar apenas o comando de build, ocultar cards ou trocar nomes não resolve essas dependências. Funcionalidades ainda não conectadas devem mostrar indisponibilidade/estado vazio e não simular sucesso.

## Execução por entregas

### 1. Conexões e preparação

- Concluído: login GitHub e autorização do GitHub App oficial da Vercel.
- Concluído: vínculo do repositório `instituto-vivance`, verificado na API e no painel.
- Concluído: organização autorizada pelo titular e projeto Supabase Free criado em São Paulo, após confirmação de custo zero.
- Concluído: configuração Supabase em Development/Preview na Vercel, sem dados simulados no novo projeto e sem acesso de Production.
- Manter projeto antigo, Cloudflare e dados existentes preservados.

### 2. Identidade e base multi-tenant

- Preparar Next.js nativo sem dependência de Cloudflare no build de destino.
- Criar migrações PostgreSQL versionadas, clínicas e vínculos de usuário.
- Implementar Supabase Auth, sessão verificada no servidor e papéis médico/enfermagem/admin/paciente.
- Remover criação automática de contas e qualquer senha de demonstração.
- Configurar a primeira clínica e o administrador com informações fornecidas pelo titular, sem inventar usuários ou contatos.
- Verificar isolamento entre clínicas, usuário bloqueado, sessão inválida e acesso indevido a paciente.

### 3. Primeira jornada persistente

- Cadastro de paciente e vínculo ao profissional.
- Lista vazia até existir cadastro real; contadores calculados do banco.
- Check-in persistido, revisão do profissional e resposta aprovada visível ao paciente.
- Dados continuam corretos após recarregar a página ou acessar de outro dispositivo.
- Histórico de ações com usuário, clínica, entidade e data.
- Substituir fontes simuladas das telas reaproveitadas, sem replicar componentes inteiros por plataforma.

### 4. Documentos, áudios e IA

- Arquivos privados e upload direto autorizado para evitar transportar gravações grandes pela requisição da aplicação.
- Trabalho assíncrono com estado, tentativa, limite, idempotência e recuperação de falhas.
- Transcrição e rascunho vinculados ao paciente/consulta e protegidos pelo mesmo acesso.
- Fluxo: rascunho → revisão médica → aprovado → publicado/exportado → nova versão.
- Sem diagnóstico, prescrição, alteração de dose ou publicação autônoma pela IA.
- Registrar consentimento/autorização da gravação e definir retenção e recuperação dos arquivos.

### 5. Publicação verificada

- Build Next.js e testes das rotas críticas aprovados.
- Remover as fontes de demonstração do grafo de execução da nova aplicação.
- Verificar persistência e autorização na interface publicada, não somente HTTP 200.
- Habilitar previews para a branch validada e manter proteção de acesso.
- Remover o comando temporário `exit 0` somente ao habilitar os builds da versão migrada.
- Entrada com pacientes reais depende da revisão de acesso, recuperação de banco e arquivos e fluxo médico. Supabase Pro é a recomendação para operação; o Free é a decisão atual para desenvolvimento.
- Domínio e promoção para produção depois da validação. Nunca apontar previews para o banco clínico de produção.

## Limites de custo e portabilidade

Não contratar add-ons pagos, criar projeto pago ou transferir domínio nesta etapa. A equipe Vercel foi apresentada pelo titular como Pro Trial; o custo após o período de teste deve ser conferido no faturamento antes da operação. Supabase deve permanecer Free até nova decisão.

PostgreSQL, contratos de API e regras de negócio favorecem evolução. Auth, Storage e filas gerenciadas ficam atrás de integrações identificáveis. Migrar para a arquitetura AWS do Alfredo será uma adaptação planejada por módulo, não uma promessa de migração automática ou uma obrigação ao atingir um número arbitrário de pacientes.

## Evidência necessária para concluir

- Projeto Vercel associado à equipe correta e ao repositório correto.
- Supabase novo confirmado na organização escolhida, sem importação de exemplos.
- Nenhuma conta padrão disponível na aplicação.
- Primeira jornada demonstrada com cadastros autorizados e persistência real.
- Testes de negação de acesso e auditoria aprovados.
- Publicação acessível e verificada, com commit e ambiente identificados.

Conexão, branch e documento de planejamento não equivalem a migração ou homologação concluídas.

Painéis: [Vercel — Instituto Vivance](https://vercel.com/vtr-consulting/instituto-vivance) e [Supabase — desenvolvimento](https://supabase.com/dashboard/project/oxuwrdjojsmgxoljqkuk).
