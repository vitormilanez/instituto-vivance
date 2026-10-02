# Virada 90 — publicação de 02/10/2026

Publicação solicitada pelo usuário após revisão local. A apresentação está disponível em [institutovivance.app/virada90/conhecer](https://institutovivance.app/virada90/conhecer), acessível pelo CTA final de [Virada 90](https://institutovivance.app/virada90).

## Artefato e verificação

| Evidência | Resultado observado |
| --- | --- |
| PR | [#74](https://github.com/vitormilanez/instituto-vivance/pull/74), mesclado em 02/10 às 19:50:35 UTC |
| Commit publicado | `5d6fe4c02fbd9bbb65d0a9b5abf4146b4c95c99d` |
| CI da main | [Release 37056735229](https://github.com/vitormilanez/instituto-vivance/actions/runs/37056735229), verificação aprovada: testes, lint, typecheck e build com Node 24 |
| Testes anteriores do mesmo código | 416 aprovados na branch do PR |
| Deployment promovido | `dpl_51T4TDH34NRadvymSWK3XbCBsm5x`, `gitSource.sha` igual ao commit publicado |
| URL técnica | `https://instituto-vivance-o2esqz3ym-vtr-consulting.vercel.app` |
| Destino confirmado | Projeto `instituto-vivance` da equipe `VTRCONSULTING`; conta CLI `vtrconsulting` |
| Build e execução | Build em 28,5 s; functions em `gru1` |
| Promoção | CLI confirmou sucesso; `inspect` de ambos os domínios resolveu o mesmo deployment |
| Configuração preservada | Root `apps/web`, Node 24, plano/build/recursos/segurança sem alteração; `autoAssignCustomDomains=false` |

O workflow terminou verde, mas as operações efetivas de migrations, Edge Functions e promoção automática foram **skipped** por ausência da configuração protegida do environment. Este lote não contém migrations nem mudanças clínicas. A promoção foi executada manualmente depois do CI, e o destino real foi verificado. Os commits posteriores exclusivamente documentais registram esta evidência; o SHA da aplicação publicada continua sendo o acima.

## Rotas e conteúdo servido

`/virada90`, `/virada90/conhecer`, `guided.css`, `guided.js` e as três imagens editoriais responderam **HTTP 200** e corresponderam byte a byte aos arquivos do commit publicado.

Três solicitações a `/login` no domínio principal deram HTTP 200, com TTFB de 0,953 s, 0,243 s e 0,269 s. Três solicitações ao domínio secundário deram HTTP 307 para `https://institutovivance.app/login`, com TTFB de 0,263 s, 0,038 s e 0,181 s. São amostras pontuais, não uma medição estatística de desempenho.

## Navegador público

- O CTA final da landing abriu a apresentação publicada.
- Os dez tópicos foram percorridos sem preencher escolhas; preços apareceram somente no tópico 10.
- As três imagens de avaliação, alimentação e manutenção carregaram.
- O seletor de temas e Voltar funcionaram. A escolha online permaneceu selecionada ao voltar.
- Objetivo e formato opcionais compuseram o href do WhatsApp `5518997551234`, com mensagem editável. Também foi conferido o href genérico sem escolhas.
- Nenhum erro apareceu na coleta de console desse percurso. A consulta pontual de runtime error logs não retornou linhas; isso não garante ausência de erro fora da janela consultada.
- Nenhuma mensagem foi enviada e nenhum pagamento foi executado.

[Captura de avaliação](production-assessment.png), [captura do tópico final](production-final.png) e [registro compacto do navegador](browser-checks.json).

As verificações responsivas de 320/390/1440 px e a revisão Impeccable anteriores permanecem em [evidências locais](../../../../apps/web/.impeccable/review/virada90-complete/evidence.md). Não houve teste em dispositivo físico nesta publicação. A validação da jornada comercial pública não constitui aceite clínico ou liberação do Gate P.

## Reversão e execução

Deployment anterior preservado: `dpl_Gz8nJKSKPbXswJLFML47aYGsGBXc` (`1803dd148106ac420b70f602381b44563eb0010e`), para reversão técnica se necessária.

A busca rápida do Asana por “Virada” em 02/10 não retornou tarefa correspondente. Direção, status e contrato foram atualizados no Git; nenhuma tarefa foi criada sem contexto.
