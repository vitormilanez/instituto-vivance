# Instituto VIVANCE

Plataforma de cuidado longitudinal supervisionado por profissionais de saúde.
A aplicação organiza contexto antes da consulta, acompanhamento, comunicação e
publicações ao paciente sem automatizar decisão clínica.

## Comece aqui — próximo Codex

1. Trabalhe em **`/Users/vitormilanez/Desktop/Codes/vivance-atual`**, checkout
   principal desta organização, baseado na main remota `ebadaab8` de 07/10/2026.
   A documentação foi consolidada na branch `codex/docs-organization-20261008`.
2. Leia [AGENTS](AGENTS.md), [Estado atual](docs/STATUS_ATUAL.md) e
   [Direção e próxima entrega](docs/DIRECAO_E_SLICES.md). A aplicação está em `apps/web`.
3. Para continuar exames, use o checkout preservado
   `/Users/vitormilanez/Desktop/Codes/vivance-ia2-exams`, branch
   `codex/exames-consolidados-contrato-20261003`, PR #78, `1e4493a`.
   Leia o [handoff IA2](docs/IA2_EXAMES.md) antes de tocar no piloto.

`/Users/vitormilanez/Desktop/Codes/vivance-repo` permanece em uma main local
antiga (`5a64be9`) com alterações não commitadas; foi preservado, não é o ponto
de partida. Não atualizar, limpar ou usar seu status por suposição. Esses caminhos
são o mapa local de 08/10/2026; confirme sempre `git status`, remoto e SHA.

**Próxima entrega proposta:** fechar o ciclo de um exame solicitado, do pedido
ao recibo e acompanhamento após revisão. A [avaliação de UX e dados](docs/AVALIACAO_JORNADA.md)
propõe esse recorte C3 antes de ampliar IA2; aguarda validação do usuário.
O PR #78 permanece preservado. Resultados estruturados, Claude e aceite clínico
ainda não estão entregues. A recomendação não inicia implementação.

## Aplicação atual

- Código: [`apps/web`](apps/web/README.md)
- Banco e migrations: [`supabase`](supabase)
- Produção técnica: [institutovivance.app](https://institutovivance.app)
- Estado verificado e pendências: [`docs/STATUS_ATUAL.md`](docs/STATUS_ATUAL.md)
- Documentação: [`docs/README.md`](docs/README.md)

O código de referência está em `main`. Publicação técnica não significa
homologação clínica: dados reais permanecem bloqueados até o fechamento do
[Gate P](docs/GATE_P.md).

## Rodar a aplicação atual

Requer Node.js 24.

```bash
cd apps/web
npm ci
npm run dev
```

Durante a edição, execute verificações dirigidas à mudança conforme o
[método por slices](docs/RETOMADA_DESENVOLVIMENTO.md). No fechamento do slice
ou release, cumpra os checks exigidos pelo lote/CI:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Variáveis locais ficam em arquivos `.env*` ignorados pelo Git. Não registrar
tokens, senhas, chaves privadas ou dados clínicos no repositório.

## Estrutura relevante

- `apps/web/`: aplicação Next.js publicada pela Vercel.
- `supabase/`: migrations e Edge Functions.
- `docs/`: documentação ativa e critérios operacionais.
- `app/`, `db/`, `drizzle/`: protótipo anterior, ainda preservado como legado;
  não é publicado pela aplicação atual.

## Limites clínicos

- IA pode preparar e organizar; nunca diagnostica, prescreve, define urgência
  ou publica orientação autonomamente.
- Relato original, síntese, revisão, aprovação e publicação são estados
  distintos e rastreáveis.
- Aprovar não significa publicar; publicar não significa transferir para um
  prontuário externo.
- O sistema não substitui atendimento de urgência.
