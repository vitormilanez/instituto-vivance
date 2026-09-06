# Slice 1 — acompanhamento consistente

Status em 6 de setembro de 2026: núcleo compartilhado implementado e verificado localmente. Sem commit, push ou publicação, conforme solicitado. Dados continuam fictícios. Aceite visual pendente.

## Entregue nesta parte

- Painel, prontuário e paciente usam os mesmos seletores de exames e revisão. Lembrete administrativo não determina mais se um exame foi recebido.
- Histórico do painel usa os registros do paciente, sem laboratório, valores ou estados paralelos fixos.
- Cabeçalho e visão geral do prontuário exibem a versão realmente publicada do plano. Um rascunho mais novo não se torna o plano vigente da paciente.
- Síntese revisada guarda texto completo, pontos selecionados, fontes, autor e versão em D1. Abrir novamente o acompanhamento recupera a última versão.
- Revisões são anexadas ao histórico. A versão de origem é conferida no banco para impedir sobrescrita concorrente; repetir a mesma tentativa não duplica a revisão.
- Falha de gravação não exibe sucesso nem apaga o editor. Recarregar para resolver um conflito preserva o texto local e apresenta a revisão remota para comparação.
- A síntese é uma nota privada de trabalho do médico responsável. Salvar não publica plano, não envia orientação e não altera uma decisão clínica.

## Limites explícitos e próximo passo

Exames, planos, check-ins, leituras médicas, confirmações de ações, fechamento aprovado da consulta e registros de acompanhamento agora usam D1 por vínculo e consulta. O navegador recupera esses registros ao entrar, retornar à janela, pedir atualização e a cada 15 segundos com a janela visível. Gravações são confirmadas pelo servidor antes de exibir sucesso.

O plano em “Meu cuidado” usa a versão publicada do mesmo acompanhamento do médico. Editar, aprovar e publicar são ações distintas. Rascunhos permanecem no editor até salvar; a versão de origem impede sobrescrita de outra sessão. Confirmações podem ser desmarcadas e não são herdadas por uma nova versão do plano.

O estado antigo dos navegadores não foi apagado nem importado automaticamente como registro médico. O banco começa com as sementes fictícias aprovadas do projeto; migração seletiva de edições legadas requer conferência. Pré-consulta em elaboração, alguns diários/medidas e preferências de interface ainda usam os fluxos demonstrativos anteriores. Esta entrega não torna todo o aplicativo persistente.

O banco atual possui o vínculo Marina–Dr. Guilherme. A nova síntese respeita os vínculos reais existentes em D1; não cria acessos a partir dos vínculos fictícios da interface. Outros pacientes precisam ter seu vínculo persistente provisionado para usar esse salvamento.

Fontes e configuração da Central da IA ainda pertencem ao motor demonstrativo. A síntese guarda o snapshot informado pelo protótipo; isso não equivale a validação científica ou motor de políticas clínicas no servidor. Conferir um exame registra revisão humana, não uma nova execução da IA. Uploads privados foram adicionados nos slices 2–4; OCR, transcrição e inferência por LLM não foram adicionados.

Revisões antigas que guardavam apenas impressão digital não têm texto recuperável. Elas não são apresentadas como conteúdo restaurado nem sobrescritas com texto inventado. O cache do navegador permanece apenas com metadados das novas sínteses; D1 é a fonte do texto salvo.

## Verificação

- Testes automatizados dos seletores e serviços de produção sobre SQLite isolado, usando todas as migrações. Cobrem isolamento, revisão/publicação, conflitos, tentativas repetidas, originais e arquivos privados; ver também `02-04-envio-revisao-retorno.md`.
- Verificação TypeScript sem emissão e compilação Vinext.
- API compartilhada no servidor local: sessão ausente → 401; médico e paciente vinculados → 200, com visões distintas; origem externa → 403; arquivo inexistente → 404. Páginas autenticadas → 200. As sessões criadas para o teste foram encerradas, sem alterar dados clínicos. A síntese privada continua vedada à paciente.
- Migrações `0001_dark_purple_man.sql` e `0002_volatile_supreme_intelligence.sql` geradas e aplicadas apenas ao D1 local; nenhuma tabela anterior foi removida.
- Sem teste visual nesta etapa. Validação manual pendente: salvar na interface, navegar, retornar, comparar duas edições e trocar pacientes.

## Critérios para fechar o slice 1

- [x] Eliminar os estados fixos conflitantes de exame e versão do plano identificados na auditoria.
- [x] Persistir e recuperar o conteúdo completo da síntese com isolamento e proteção de versão.
- [x] Persistir exames, planos e pendências do núcleo por vínculo/consulta, com autorização por ação.
- [x] Validar transições paciente → revisão médica → retorno publicado em testes isolados; verificar recuperação por sessões autenticadas independentes na API local.
- [ ] Validar a interface com os cenários de falha e conflito.

Os slices 2–4 foram avançados nesta mesma branch. Próximo núcleo de implementação: slice 5, Central da IA compartilhada, testável e versionada.
