# Workspace médico e transcrição gratuita — 14/10/2026

## Escopo autorizado

Publicar Hoje, ficha, Agenda, Pacientes, Mensagens e Teleconsulta no conceito
branco/azul e navegação inferior única. Usar transcrição gratuita pelo navegador,
iniciada pelo médico. Integração nativa do Meet preparada e desativada.

## Implementação e conferência

- Hoje operacional, indicadores com dados existentes e carrossel manual no dia
  vazio; revisão de texto/destinatários antes de envio interno. Ficha organizada.
- Agenda preservada, pacientes separados de convites, mensagens com contexto
  recolhível. Teleconsulta prepara a sala do agendamento e oferece texto no contexto.
- Reconhecimento `pt-BR` do navegador: microfone, ou aba+microfone no desktop
  compatível. Não grava arquivo de áudio nem identifica falantes. Pode perder
  trechos; médico confere fonte/ressalvas. No mobile a opção é o microfone.
- Consentimento explícito, original imutável, revisão separada, salvamento manual,
  replay idempotente e nenhuma publicação automática no prontuário/paciente.
- Nativa do Meet exige flag server-side explicitamente verdadeira; nenhum OAuth
  Google foi configurado ou autorizado. Artefatos automáticos de sala ficam OFF.
- Astra confirmou os fixes de OAuth/lote e cinco pontos do navegador: permissão
  documental SPA, cancelamento durante aquisição, retry congelado, Unicode/
  separadores e deadline total. Revisão visual final: `ship`, fix do dock resolvido.
- Mobile em 320px efetivos e desktop1422px: sem overflow horizontal, formulário,
  fonte original fictícia e revisão conferidos. Rótulos compactos Vídeo/Chat em
  <=400px mantêm os nomes completos para leitores de tela.
- Suite final no CI: **591/591**, lint, tipos e build passaram. O bloqueio inicial
  da fronteira antiga foi corrigido estritamente para dois adapters privados
  `server-only`, com sessão/papel revalidados; nenhum acesso privilegiado no cliente.
- Build/tipos Webpack e lint passaram; um warning anterior no onboarding.
- Supabase dev sintético `oxuwrdjojsmgxoljqkuk` confirmado. Aplicadas somente
  `20261014192700`, `20261014202953`, `20261014205608`. Advisor security/error
  não apontou questões. Nenhuma Edge Function precisou de publicação.
- API local autenticada: salvar200, replay200/mesmo original, replay alterado409,
  revisão200, recarga200; paciente403 e nativa409. Fixture de texto explicitamente
  sintético preservada na consulta `5993b9f0-c43e-4178-a24c-b4c76350d182`, fonte
  `c9e55f08-6a01-47e8-a035-76f744a7681f`. Sem captura de áudio real.

## Publicação e recuperação

[PR #137](https://github.com/vitormilanez/instituto-vivance/pull/137) integrado,
SHA de aplicação `a1d215329d83e6c23fb5938b1072cde36f80c358`.
CI da PR `38639786611` e release da main `38640198115` passaram. No release,
`verify` executou; aplicar banco/Edge e promover ficaram **skipped** por ausência
das configurações protegidas. Backend e domínio foram conferidos separadamente,
sem atribuir essas operações ao workflow.

O deployment Git inicial `dpl_2TVTzriz6j6iYcNjwUsizTcbeQMv` abriu as telas,
mas o endpoint privado de transcrição retornou503. A credencial exclusivamente
servidor `SUPABASE_SERVICE_ROLE_KEY` foi alinhada com o cofre do mesmo dev
sintético; a variável existente era compartilhada por Production/Preview e
continuou Secret. Nenhum valor foi exposto, nenhuma credencial Google adicionada.
Um novo deployment do mesmo SHA corrigiu o acesso. Como o segredo anterior
não pode ser relido, não se afirma qual era seu conteúdo ou erro interno.

Deployment final **`dpl_5g2yuAvA3yMAH2S8yzY4CFk9JDHD`**, target production/READY,
[`instituto-vivance-ieqefuh5n-vtr-consulting.vercel.app`](https://instituto-vivance-ieqefuh5n-vtr-consulting.vercel.app).
API Vercel confirmou `meta.githubCommitSha=a1d215329d83e6c23fb5938b1072cde36f80c358`.
Conta `vtrconsulting`, equipe `vtr-consulting`, projeto
`prj_ligeZuFRycRXA21u5rRzaLAORTrI`, Root Directory `apps/web`, Node24.x.
Os dois domínios oficiais resolveram para esse mesmo deployment após alinhamento:
principal três HTTP200/TTFB1,104/0,157/0,198s; secundário três307 para o principal,
TTFB0,054/0,042/0,033s. `x-vercel-id` gru1; política documental permite microfone
e captura de tela somente na própria origem, sem iniciar captura.

Percurso publicado autenticado: login real médico pela interface, Hoje → lista
de pacientes → ficha → Agenda → Mensagens → Teleconsulta, navegação inferior,
recarga e fonte/revisão salvas conferidos. Pacientes, ficha, Agenda, Mensagens e
Teleconsulta com `innerWidth=scrollWidth=320`; desktop também conferido.
Sem criação de sala, consulta, convite ou mudança de decisão clínica.

API publicada: salvar/replay/revisão/recarga200, replay com conteúdo alterado409,
paciente403 e nativa409; original preservado. Incentivo: preview/envio/replay200,
exatamente uma mensagem fictícia legível pela conta `vtrconsultingbr@gmail.com`,
única destinatária deste teste, e preview negado ao paciente403. Não houve
disparo para todos os pacientes nem envio por WhatsApp/e-mail. Fixture sintética
mantida na conversa, sem excluir ou modificar registros anteriores.

Artefato anterior conferido nesta rodada:
`dpl_Hy9NyrrXFPqVy7KUxYBc9Fkz1oo9`, URL técnica
`instituto-vivance-r6d882m81-vtr-consulting.vercel.app`, target production/READY.
Schema é aditivo e compatível com o frontend anterior.

Checkout de publicação isolado para preservar documentos de onboarding e cópias
locais `* 2.*` de outros trabalhos; credenciais, sessões e capturas autenticadas
permanecem locais e fora do commit. Capturas: `output/teleconsulta-meet-20261014/release/`
no checkout de trabalho. Não confundir a navegação reduzida com aparelho físico.

## Limites do aceite

Áudio real, qualidade/reconhecimento pelo fornecedor do navegador, chamada real
com os dois participantes e assinatura Google não foram testados. Chrome pode
enviar áudio ao serviço Google; disponibilidade depende do navegador e da rede.
O texto fictício testa persistência/revisão, não precisão de fala ou aceite clínico.
Entrega técnica sintética não fecha Gate P para dados reais.

[Contrato de transcrição/configuração](TELECONSULTA_GOOGLE_MEET.md).
