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
- Suite: 590/591 na primeira execução, único bloqueio era fronteira antiga que
  proibia adapters privados no servidor. Fronteira atualizada estritamente para
  dois adapters `server-only`, sessão/papel revalidados; três testes dessa fronteira
  passaram. Demais 590 testes não falharam. CI da entrega executará a suite completa.
- Build/tipos Webpack e lint passaram; um warning anterior no onboarding.
- Supabase dev sintético `oxuwrdjojsmgxoljqkuk` confirmado. Aplicadas somente
  `20261014192700`, `20261014202953`, `20261014205608`. Advisor security/error
  não apontou questões. Nenhuma Edge Function precisou de publicação.
- API local autenticada: salvar200, replay200/mesmo original, replay alterado409,
  revisão200, recarga200; paciente403 e nativa409. Fixture de texto explicitamente
  sintético preservada na consulta `5993b9f0-c43e-4178-a24c-b4c76350d182`, fonte
  `c9e55f08-6a01-47e8-a035-76f744a7681f`. Sem captura de áudio real.

## Publicação e recuperação

Em andamento; registrar PR, SHA integrado, CI/release, deployment e dois aliases
após confirmação. Artefato anterior conferido nesta rodada:
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
