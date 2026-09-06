# Slice 5 — Central da IA compartilhada e versionada

Implementação local. Commit, push, PR e publicação do site continuam adiados a pedido do usuário.

## Entrega

- Política da clínica no D1: módulos, fontes, categorias de dados, capacidades e objetivo do feedback.
- Biblioteca editada como rascunho. Revisar a ficha ou trocar uma fonte não altera a versão vigente.
- Revisão de fonte cria uma nova ficha/versão, para atribuição explícita ao módulo. Políticas publicadas guardam a cópia integral das fontes usadas.
- Fluxo: salvar motivo e rascunho → comparar → aprovar como médico → publicar explicitamente.
- Cada edição invalida teste e aprovação anteriores. Publicar exige o teste da versão exata e a aprovação registrada no servidor.
- Histórico de versões com autoria, data, motivo, identificação SHA-256, fontes, comparação e aprovação.
- Controle de concorrência: edição ou publicação baseada em revisão antiga é rejeitada. O editor mantém o rascunho local para conferência; atualizar não o sobrescreve.
- Pausa por acompanhamento persistida e refletida para médico e paciente. Retomar não concede autorização ausente ou revogada.
- Autorização por usuário da clínica e vínculo: o papel de médico sozinho não concede acesso à Central.
- Síntese revisada passa a receber sua governança no servidor. Fonte, versão e hash enviados pelo navegador não são tratados como autoridade. Política alterada, módulo desligado ou paciente pausado impedem uma nova gravação governada. A condição é conferida novamente na gravação atômica.
- Versões anteriores da síntese continuam recuperáveis e não são reprocessadas automaticamente.

## Comparação antes de publicar

A suíte `policy-safety-v1` compara 5 módulos em 7 cenários sintéticos (35 combinações): dados revisados; exame não revisado; unidades incompatíveis; fonte original ausente; falta de autorização; pausa; dados de outro paciente.

A tela exibe antes/depois da elegibilidade, objetivo do feedback, diretriz e bloqueios. Regras específicas são respeitadas: ingestão pode organizar um documento ainda não revisado, mas não o torna dado confirmado; comparabilidade é exigida apenas nas tarefas que comparam valores.

**É uma simulação determinística de consistência de política. Não executa modelo de linguagem, não extrai exames, não lê o texto dos estudos e não valida qualidade clínica/científica.** Evidência e limitações são declaradas e revisadas pelo médico. A configuração inicial usa protocolos operacionais fictícios, não fontes clínicas aprovadas para produção.

## Dados e privacidade

- Dr. Guilherme e Marina permanecem no vínculo compartilhado já persistido.
- Os demais perfis ilustrativos da interface não se tornam vínculos ou autorizações por inferência.
- A autorização de Marina é explicitamente um registro fictício do cenário; não é comprovante de consentimento real.
- O endpoint do paciente retorna somente seu contexto e a configuração publicada, sem rascunho, comparação, aprovação, motivo de edição ou outros pacientes.
- A Central não importa configurações antigas do navegador. O armazenamento antigo não é apagado, mas não governa análises nem se sobrepõe ao D1.
- Fontes pertencem à clínica. Não cadastrar informações identificáveis de pacientes na biblioteca compartilhada.

## Persistência

Migração aditiva `0003_daily_exodus.sql`, aplicada somente no D1 local. Migrações anteriores preservadas.

Tabelas: `clinical_policy_members`, `clinical_policy_workspaces`, `clinical_policy_versions`, `clinical_patient_permissions`. Versões publicadas são inseridas em transação junto da troca da política vigente. Não há operação de edição/exclusão de versão publicada na API.

## Validação

Concluídos localmente: 35 testes automatizados, checagem TypeScript, lint de `app`, `db` e `tests`, e compilação pelo fluxo do Sites. Sem erros nessas verificações.

Testes automatizados cobrem recuperação de rascunho, fontes históricas imutáveis, aprovação vinculada ao teste, alterações concorrentes, publicação duplicada, bloqueios de fonte, limites não editáveis, isolamento entre usuários e escopo por paciente. Regressões da síntese cobrem governança derivada no servidor, pausa e política desatualizada.

Verificação HTTP local com sessões separadas: Central do médico 200; Central da paciente 403; contexto exclusivo de Marina 200, sem rascunho/aprovação; tentativa de alteração pela paciente 403; sem sessão 401; origem cruzada 403. Sessões criadas para teste encerradas. Nenhuma política foi publicada nesse teste local.

Revisão visual/interativa no navegador não foi realizada nesta etapa. Aceite manual pendente: criar revisão de fonte, modificar objetivo, salvar, testar, aprovar, publicar e conferir em segunda sessão; pausar Marina e verificar o estado no perfil da paciente.

## Próxima fronteira

Conectar um executor real aos módulos usando dados revisados do acompanhamento, contexto privado, fontes publicadas e o bloqueio no servidor. Hoje a síntese ainda é revisada manualmente sobre o cenário estruturado existente; os uploads não viram RAG/OCR automaticamente. Antes de uso clínico real: consentimento e governança reais, avaliação clínica, segurança, rastreabilidade do modelo e validação das fontes.
