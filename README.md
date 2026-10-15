# Instituto Vivance

Plataforma de cuidado longitudinal supervisionado pelo médico. A aplicação atual
é [apps/web](apps/web/README.md); migrations e Edge Functions ficam em
[supabase](supabase). `app/`, `db/` e `drizzle/` na raiz são legado, não o deploy.

## Comece aqui

1. [Índice da documentação](docs/README.md).
2. [Estado atual](docs/STATUS_ATUAL.md): implementação, publicação e limites.
3. [Direção](docs/DIRECAO_E_SLICES.md) e [checkpoints](docs/CHECKPOINTS_ENTREGAS.md):
   decisões vigentes e pendências, sem misturar o histórico.
4. [AGENTS](AGENTS.md), [método por slices](docs/RETOMADA_DESENVOLVIMENTO.md) e
   [guia operacional](docs/GUIA_OPERACIONAL_CODEX.md) antes de atuar.

O workspace médico, o fluxo de exames com cota/revisão/resumo factual e a
transcrição manual do navegador estão publicados tecnicamente para testes
sintéticos. Google Meet está preparado, com conexão pessoal pendente e
transcrição nativa desligada. Consentimento direto do paciente e automação
pós-consulta ainda não estão implementados. Consulte os contratos no índice.

## Desenvolvimento

Node.js 24. Em `apps/web`: `npm ci`, `npm run dev`. Testes proporcionais ao
lote; antes de integrar código, cumprir os checks pertinentes de teste, lint,
tipos e build. Para documentação, conferir links, estados e `git diff --check`;
não executar E2E só por Markdown.

O checkout canônico é `/Users/vitormilanez/Desktop/Codes/vivance`. Confira
Git/branch/remoto antes de editar e preserve mudanças locais. Credenciais ficam
no [cofre local ignorado](CREDENCIAIS.md), nunca em commits.

## Limites

O domínio público usa temporariamente `instituto-vivance-dev`
(`oxuwrdjojsmgxoljqkuk`) exclusivamente para testes sintéticos. Publicação
técnica não autoriza dados reais: separar produção e cumprir o
[Gate P](docs/GATE_P.md). IA organiza fatos com fonte; não diagnostica,
prescreve, determina urgência ou publica orientação sozinha. Aprovar e publicar
são ações médicas distintas.
