# Instituto VIVANCE

Plataforma de cuidado longitudinal supervisionado por profissionais de saúde.
A aplicação organiza contexto antes da consulta, acompanhamento, comunicação e
publicações ao paciente sem automatizar decisão clínica.

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

Validação completa:

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
