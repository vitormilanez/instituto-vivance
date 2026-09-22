# Vivance Web

Aplicação Next.js publicada pela Vercel. Esta é a implementação atual do
Vivance; o protótipo existente na raiz do repositório não é importado por ela.

## Desenvolvimento

Requer Node.js 24.

```bash
npm ci
npm run dev
```

Verificação:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Os testes de banco usam PostgreSQL efêmero com fixtures sintéticas. Eles não
aplicam migrations nem inserem dados em um Supabase hospedado.

## Deploy

- Projeto Vercel: `instituto-vivance` no time `VTR CONSULTING`.
- Root Directory: `apps/web`.
- Node.js: 24.x.
- Domínio: [institutovivance.app](https://institutovivance.app).

O processo completo está em
[`docs/PIPELINE_PUBLICACAO.md`](../../docs/PIPELINE_PUBLICACAO.md). Não promover
um build que dependa de migration ainda não aplicada no ambiente de destino.

## Documentação

- [Estado atual](../../docs/STATUS_ATUAL.md)
- [Funcionalidades](../../docs/FUNCIONALIDADES.md)
- [Gate P](../../docs/GATE_P.md)
- [Sistema visual](DESIGN.md)

Segredos e dados clínicos nunca devem ser gravados no repositório. Áudio,
transcrição e IA clínica permanecem inativos; qualquer ativação futura exige
autorização específica e revisão humana explícita.
