# Administração local

Modo: Operate. A área herda o azul-marinho, as superfícies claras, Geist e os alvos de 44 px do produto existente.

## Fluxo aprovado

Admin cadastra médico/paciente, prepara ou libera o acesso e cria o vínculo por qualquer uma das fichas. A ficha do médico permite seleção em lote. Um paciente tem no máximo um médico responsável ativo.

## Comportamentos

- Cadastro: nome, usuário, senha inicial, contato opcional e registro profissional para médico. O perfil permanece fixo após criação.
- Vínculo: motivo obrigatório, sem duplicata, transferência explícita e concorrência protegida. Um lote inválido não produz alterações parciais.
- Acesso: bloqueio encerra sessões; médico com vínculo ativo não pode ser bloqueado; o próprio Admin não pode se bloquear.
- Histórico: autoria, data, paciente, origem/destino e motivo. Nenhum conteúdo clínico ou credencial é incluído.
- Transferência: registros anteriores preservados; conversa e ciclo novos vazios. Sem interface de recuperação de vínculos encerrados nesta etapa.
- Cadastros novos usam as áreas autenticadas e os serviços de envio, revisão e conversa existentes. A jornada clínica demonstrativa avançada continua restrita ao vínculo original de demonstração.

## Validação

Testes de serviço com SQLite executam as consultas de produção e todas as migrações. Incluem criação pelos dois caminhos, login, lote atômico, transferência, isolamento entre perfis, bloqueio e preservação de sessões na migração. Validação local adicional percorreu as rotas administrativas, cadastro de paciente, vínculo pela ficha do médico, conversa entre os perfis, bloqueio/reliberação e perda de acesso do médico anterior. Resultado: 42 testes aprovados; compilação, checagem de tipos e análise estática do aplicativo aprovadas; ficha sem rolagem horizontal em 320 px; última execução do navegador sem erros. A revisão Impeccable confirmou resolvidos os ajustes de contraste, foco e apresentação de falhas.

## Fora do escopo

Publicação, financeiro, vários médicos simultâneos, convites automáticos, importação de pacientes, edição clínica pelo Admin e migração automática de conteúdo entre profissionais.

## Padrão de interface construído

As listas combinam busca, filtros, identidade, vínculo, situação do acesso e abertura da ficha. A ficha reúne cadastro, responsável ou pacientes vinculados, controle de acesso e histórico. Transferência e encerramento apresentam consequência explícita e motivo obrigatório. Os estados vazios orientam o próximo passo; salvamento desabilita ações; sucesso e erro têm mensagens textuais, com foco no erro.

Os controles principais mantêm alvos de 44 px e foco visível. No desktop, a navegação é lateral e os formulários usam duas colunas; até 720 px, a navegação passa a ser horizontal rolável e o conteúdo fica em uma coluna. A área preserva o sistema compartilhado de azul-marinho, superfícies claras, Geist e painéis de borda discreta.
