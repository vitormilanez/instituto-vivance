# Consentimento do paciente e arquivo pós-consulta

Contrato proposto a partir do pedido de 14/10/2026. **Não implementado nem
ativado.** A preparação técnica do Google não entrega este fluxo; o estado
executável está em [Teleconsulta/Google](TELECONSULTA_GOOGLE_MEET.md).

## Pedido de 14/10 — consentimento antes da entrada e arquivo pós-consulta

**Estado: fluxo proposto para confirmação; não implementado nem ativado.**
O usuário pediu enviar o consentimento ao paciente antes de entrar na chamada,
simplificar a operação médica e guardar resumo e transcrição juntos após a reunião.
Esta definição usa o Meet nativo como direção principal; não contrata plano,
inicia captura, dispara mensagem ou habilita fornecedor de IA. A preparação
OAuth do [contrato Google](TELECONSULTA_GOOGLE_MEET.md) é uma etapa técnica
separada, não implementação desta jornada.

### Jornada pretendida

- **Paciente:** aviso no aplicativo vinculado ao agendamento, disponível antes
  da consulta e retomado ao tocar em Entrar. Página autenticada explica finalidade,
  Google/Vivance, armazenamento e acesso; transcrição/armazenamento e resumo por
  IA são escolhas explícitas, sem opções pré-marcadas. Recusar não cancela a
  consulta: oferece **Continuar sem transcrição**. Aviso externo, caso o canal
  seja autorizado/configurado, contém somente orientação genérica e link seguro;
  não envia dados clínicos nem termos sensíveis a destinatários não verificados.
- **Médico:** uma conexão Google inicial; em cada consulta, estado curto
  **Autorizado**, **Aguardando resposta** ou **Sem transcrição**, junto de
  **Entrar na consulta**. A captura só pode ser solicitada pelo Vivance com aceite
  vigente. Um passo adicional no Meet, se exigido pelo provedor, deve aparecer
  honestamente; não prometer controle remoto de início/parada sem teste.
- **Pós-consulta:** quando os artefatos finais estiverem disponíveis no Google,
  importação em segundo plano e um bloco na mesma consulta/ficha com
  **Resumo da consulta** e **Transcrição original**. Estados independentes:
  aguardando provedor, processando, disponível, falha recuperável e indisponível.
  O fim da chamada não significa que os arquivos já estejam prontos.
- **Resumo:** preferir as smart notes do próprio Google quando o plano,
  consentimento e permissões permitirem, evitando uma segunda geração paga.
  Preservar a origem e marcar **Gerado por IA — aguardando revisão médica**.
  Não substituir o texto completo, inferir conduta ou preencher/publicar o
  prontuário automaticamente. Sem notas disponíveis, mostrar resumo pendente
  ou permitir registro manual; outro provedor de IA exige decisão própria.
- **Acesso e continuidade:** original e resumo privados para o médico autorizado,
  vinculados a clínica/paciente/agendamento e localizáveis na ficha e no histórico
  da consulta. Compartilhamento ao paciente é ação médica separada. A identidade
  branca/azul e os componentes existentes são preservados, inclusive em 320 px.

### Contratos que a implementação precisa cumprir

1. Consentimento pelo próprio paciente autenticado: finalidade, decisões,
   versão/texto apresentado, horário do servidor e agendamento; evidência
   append-only. Checkbox preenchido pelo médico não substitui esse registro.
   Falta de resposta não é aceite; nova finalidade/versão exige nova decisão.
2. Recusa/retirada bloqueia novos trabalhos de captura/importação/síntese no
   Vivance. Revalidar antes de buscar a fonte, processar e confirmar a escrita;
   cancelar jobs concorrentes por versão de consentimento. Não prometer apagar
   registros existentes ou interromper o Google remotamente sem política/capacidade
   confirmadas. Retenção, retirada e direitos sobre registros ficam no Gate P.
3. Página de entrada não controla links diretos do Meet nem ações manuais do
   organizador fora do Vivance. Não declarar bloqueio de captura no provedor só
   porque há bloqueio no app. Participantes adicionais exigem tratamento próprio;
   o primeiro slice automático não deve presumir consentimento de terceiros.
4. O adapter atual exige sessão médica viva. Background precisa de autorização
   específica e estreita de job, não de sessão expirada, remoção desse controle
   ou leitura privilegiada geral. Revalidar vínculo ativo, médico responsável,
   conexão Google, consentimento e consulta a cada execução.
5. Associar exatamente a sala e sessão corretas; ambiguidade não importa dados
   de outra consulta. Paginação/lote final atômicos, deduplicação por fonte/hash
   e cache por clínica/consulta/fonte/modelo/versões. Não chamar IA ao abrir página.
   Preservar intervalos e lacunas: importar todo o texto disponibilizado não
   comprova que todas as falas da reunião foram captadas.
6. Artefatos e eventos do Google são sinais de disponibilidade, não comandos
   confiáveis para acesso clínico: validar remetente/evento, reconsultar o provedor
   e reautorizar antes da persistência. Eventos repetidos e retries não duplicam.
   Não criar Pub/Sub, novas permissões ou serviços pagos sem configuração aprovada.

### Estado conferido e próximos passos

Vercel `vtr-consulting/instituto-vivance`, Production, recebeu a configuração
Google de teste em 14/10; transcrição nativa explicitamente desligada. Grant da
conta e licença continuam pendentes; não repetir a pergunta de licença nem
presumir elegibilidade. Código atual
salva transcrição de navegador manual e importação nativa preparada; não possui
este aceite registrado pelo paciente, resumo nativo ou sincronização automática.

Primeiro slice recomendado: consentimento paciente → entrada da mesma consulta
→ estado médico → recusa/retirada persistidas e conferidas. Segundo: background
Google + texto final e notas na consulta, depois de definir/configurar a conta,
permissões mínimas de leitura dos artefatos/Docs e mecanismo de eventos ou fila.
Não apresentar URL do Google como se o conteúdo já estivesse guardado no Vivance.

Aceites dirigidos: papéis/vínculos e acesso cruzado; aceite/recusa/retirada após
recarga; corrida entre retirada e job; artefato atrasado/incompleto; reenvio sem
duplicar; fonte preservada e resumo privado. Avaliação de conteúdo clínico e uso
de dados reais permanecem separados. Nesta rodada só houve definição/revisão;
não rodar aplicação/E2E apenas pela atualização documental.

Revisão crítica Astra identificou os pontos acima (link direto, revogação,
autorização background, completude e finalidade/retenção). As referências oficiais
consultadas em 14/10 confirmam artefatos distintos e eventos de arquivo gerado:
[artefatos e smart notes](https://developers.google.com/workspace/meet/api/guides/artifacts),
[eventos do Meet](https://developers.google.com/workspace/events/guides/events-meet).
Não equivalem a uma chamada real com a conta médica conectada.
