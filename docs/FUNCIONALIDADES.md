# Funcionalidades atuais

Catálogo reconciliado com a `main` em 14/10/2026. Descreve implementação, não
licença de uso clínico nem aceite integral. Publicação/evidências e pendências
ficam no [estado atual](STATUS_ATUAL.md).

## Acesso, equipe e pacientes

- Supabase Auth, sessão segura, seleção de clínica e isolamento por tenant.
  Papéis vêm do banco; administrador técnico não ganha acesso clínico implícito.
- Convites/aceite, suspensão/reativação e vínculo de cuidado versionado/auditado.
  Conta confirmada e pendente de ativação têm mensagens diferentes.
- Lista/busca de pacientes como foco; convite/histórico/cadastro sem app em
  ações separadas. Arquivar convite não exclui paciente, conta ou prontuário.
- Cadastro inicial e perfil complementar preservam respostas literais, medidas,
  objetivos, consentimento de compartilhamento e submissões imutáveis.
  [Onboarding](ONBOARDING_PACIENTE.md).

## Workspace, Agenda e atendimento

- Hoje médico reúne consultas do dia, pacientes ativos, mensagens recebidas,
  check-ins atrasados e pendências com dados existentes, sem risco clínico automático.
- Navegação principal inferior única; contexto detalhado na ficha, não na Home.
- Dia vazio oferece Agenda e carrossel manual de incentivo. Envio interno
  exige preview/confirmação dos destinatários elegíveis, idempotência e vínculo.
- Agenda permite agendar/remarcar/cancelar/registrar falta, com conflito,
  versão otimista e auditoria.
- Atendimento inicia explicitamente, salva rascunho, retoma, finaliza e recebe
  adendos imutáveis. Autoria e vínculo continuam obrigatórios.
- Ficha reúne contexto, fontes, medidas, histórico, exames e ações locais.
  [Contrato da ficha](FICHA_PACIENTE.md).

## Cuidado e relatos

- Planos e relatórios versionados; aprovação médica separada da publicação,
  substituição/retirada com histórico e PDF privado identificado.
- Pré-consulta solicitada pelo profissional: cinco respostas ordenadas,
  rascunho parcial e envio explícito completo. Pedido e resposta mantêm vínculo.
- Check-in diário: Energia → Sono → Fome → Banheiro → recado opcional, com
  adicionais/habilitação médica preservados. Relato não vira recomendação automática.
- Alimentação aceita foto, texto ou ambos; texto opcional quando há foto,
  até 2.000 caracteres quando informado, preservado literalmente. Upload privado,
  idempotência e leitura por paciente/equipe autorizada.
- Evolução só usa medidas persistidas e atribuídas à fonte. Cadastro inicial
  não inventa nova medição; dado ausente não vira zero.

## Documentos e exames

- PDF/JPEG/PNG privados, validação binária/tamanho, download temporário e acesso por vínculo.
- Ciclos de **15 arquivos distintos por paciente/clínica**, deduplicação por conteúdo
  e pedido de mais envios. Somente médico responsável libera novo ciclo auditado.
- Fila/Cron independente de aba, leitura por página, extração factual estruturada,
  lotes/checkpoints e retomada sem repetir trabalho já persistido.
- Resultado literal, unidade, referência/data disponíveis e página/trecho/offset.
  Comparação com o próprio laudo exige compatibilidade e não é diagnóstico.
- Revisão versionada por item e conferência documental de identidade/cobertura/
  notas/exclusões. Fonte e histórico não são apagados.
- Resumo factual de exames sob solicitação, por snapshot/manifesto/cache;
  novo dado pode tornar versão antiga desatualizada, sem chamar IA ao abrir tela.
- Biblioteca clínica versionada e revisão/aprovação/publicação explícitas.
  Não há fonte automaticamente aprovada ou hipótese livre autorizada.
- [Pipeline IA2](IA2_EXAMES.md), [contrato completo](FLUXO_EXAMES_E_ANALISE_LONGITUDINAL.md)
  e [gates clínicos](PLANO_IA_CLINICA.md).

## Comunicação e teleconsulta

- Mensagens internas persistentes/paginadas e contexto recolhível; avisos por
  destinatário sem expor conteúdo clínico no resumo.
- WhatsApp do convite é compartilhamento manual de link; não é envio automatizado.
  SMTP de ativação é operação separada, sem garantia de caixa de entrada.
- Preferências/lembretes e infraestrutura de notificações não comprovam entrega
  de push/SMS nem canal de urgência.
- Meet abre externamente. Link manual continua disponível; integração individual
  Google e criação de sala do agendamento estão preparadas para conta autorizada.
- Transcrição gratuita do navegador é manual, original privado e revisão separados;
  não grava arquivo de áudio, não identifica falantes e pode perder fala remota.
- Nativa do Meet está preparada, mas desativada; conta Google ainda não conectada.
  [Contrato](TELECONSULTA_GOOGLE_MEET.md).

## Fora da entrega vigente

- Consentimento registrado diretamente pelo paciente antes da chamada,
  importação automática em background e resumo pós-call: **não implementados**.
- Briefing tem fallback determinístico e adapter opcional servidor; isso não
  equivale a análise clínica ou síntese longitudinal de todas as fontes.
- IA não diagnostica, prescreve, define urgência/dose/conduta ou publica sozinha.
- Prontuário oficial, integração clínica real e dados reais não estão liberados.
  Produção separada, operação/privacidade e [Gate P](GATE_P.md) continuam necessários.
