# Instituto Vivance

Plataforma de cuidado longitudinal com decisão e publicação sob responsabilidade do médico. A aplicação Next.js está em [`apps/web`](apps/web/README.md); banco, migrations e Edge Functions estão em [`supabase`](supabase).

## Ponto de partida

O checkout Git consolidado é `/Users/vitormilanez/Desktop/Codes/vivance`. Confirme `git status`, branch, remoto e SHA antes de trabalhar. A pasta antiga `Instituto Vivance` é um protótipo estático; outros checkouts datados não são fonte de verdade. Leia [AGENTS](AGENTS.md), [direção](docs/DIRECAO_E_SLICES.md), [estado atual](docs/STATUS_ATUAL.md) e [checkpoints](docs/CHECKPOINTS_ENTREGAS.md). O [índice](docs/README.md) aponta aos contratos e evidências.

A frente atual organiza resultados de exames sintéticos em campos estruturados com arquivo, página e trecho verificáveis, revisão médica por item e leitura progressiva na ficha. Claude Haiku 5.5, com Sonnet 5.5 como fallback, foi testado localmente e no dev sintético na branch de trabalho; consulte o [handoff IA2](docs/IA2_EXAMES.md) para cobertura e limites. Preview, PR, publicação técnica e aceite clínico desta rodada seguem marcos separados.

## Rodar e verificar

Requer Node.js 24. Em `apps/web`, execute `npm ci` e `npm run dev`. Para o slice alterado, rode testes dirigidos; antes da integração, cumpra os checks exigidos pelo lote/CI: `npm test`, `npm run lint`, `npm run typecheck` e `npm run build`.

Segredos e credenciais locais ficam em arquivos `.env*` ignorados pelo Git. A [conta sintética permanente de QA](docs/CONTA_TESTE.md) tem local de credenciais e escopo registrados sem senha neste repositório.

## Limites

O projeto `instituto-vivance-dev` (`oxuwrdjojsmgxoljqkuk`) é o destino único temporário para testes sintéticos. O domínio público ainda usa esse ambiente; isso não torna o banco apto a dados reais. Antes de uso clínico, separar produção e cumprir o [Gate P](docs/GATE_P.md). IA pode extrair e organizar fatos com origem; não diagnostica, prescreve, determina urgência nem publica orientação sozinha. Aprovação médica e publicação ao paciente são ações distintas.
