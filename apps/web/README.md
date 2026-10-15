# Vivance Web

## Consulta assistida e histórico — 15/10/2026

Migrações 20261015185506, 20261015192136 e 20261015200227 adicionam bloqueio
de agenda e fluxo privado assistido. VIVANCE_AI_CONSULTATION_SUMMARY=on e a
credencial Anthropic de servidor habilitam o rascunho; sem ambos há fallback
extrativo identificado. GET da ficha não gera IA. Consentimento versionado
pertence ao paciente; médico revisa/corrige/rejeita, sem publicação automática.
Histórico mostra consultas assistidas do próprio médico com vínculo ativo,
limitadas a 20 recentes. Não inclui liberação clínica nem captura real validada.
Ver docs/ENTREGA_CONSULTA_INTEGRADA_2026-10-15.md.

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

Segredos e dados clínicos nunca devem ser gravados no repositório. A transcrição
gratuita pelo navegador exige início/autorização e revisão médica explícitos;
não grava áudio. Nativa do Meet preparada e desativada.
[Entrega e limites](../../docs/historico/entregas/WORKSPACE_E_TRANSCRICAO_2026-10-14.md).
