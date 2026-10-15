# Check-in e alimentação — 11/10/2026

> Histórico: preserva o que foi observado nessa etapa, inclusive pendências depois
> superadas. Não define o estado atual. Consulte `docs/README.md`,
> `docs/STATUS_ATUAL.md` e o contrato vigente na raiz do repositório.

## Direção implementada

Energia → Sono → Fome → Banheiro → recado opcional. Cada resposta avança por
toque ou Enter/Espaço, com aviso antes da escolha. O percurso comum exige quatro
escolhas e um envio. Voltar, pular e editar pelo resumo preservam os outros
campos. Aplicação continua como etapa explícita quando habilitada pelo médico.
Peso, efeitos, água, tratamento, sentimento e saciedade ficam em **Mais sobre
meu dia**, sem perder o contrato existente. A escala permanece 1–5 para
compatibilidade; banheiro conserva Bom/Regular/Ruim. Fome não recebe juízo de
saúde. Cada resposta tem rótulo literal além do desenho.

Na alimentação, cinco opções diretas (incluindo Outro), uma foto, uma descrição
ou ambos. O formulário rápido oferece câmera/galeria, troca/remoção, horário
editável e um envio. Diário usa o mesmo vocabulário e aceita somente foto.
Não há estimativa nutricional nem avaliação automática. O menu e as oito ações
rápidas médicas permanecem nos percursos existentes.

A landing usa os mesmos seletores e ilustrações em exemplos locais. A conclusão
do exemplo não envia dados, e isso aparece na própria demonstração. A análise
futura por IA continua identificada como indisponível.

## Design e revisão

Product Design, sem Impeccable. Revisão independente com **GPT-6 Astra, high**,
conforme escolha do usuário pelo modelo mais potente. Seis ilustrações originais
geradas por ImageGen: energia esgotada/super-herói, sono, fome, banheiro e chef.
Prompts em [README das ilustrações](../../../apps/web/public/illustrations/daily-moments/README.md).

A revisão encontrou dois P2 anteriores nos campos adicionais, corrigidos:
motivo de tratamento oculto não acompanha adesão ausente/Sim; peso preenchido
inválido não desaparece silenciosamente. Ele impede envio, abre os adicionais e
recebe foco. Peso anterior e água intocada não viram respostas novas. Repetir
envio com o mesmo corpo conserva a chave; editar o corpo gera outra chave.
A revisão estática final confirmou as duas correções sem achado restante nelas.

## Validação local

- 526 testes passaram, build e typecheck passaram; lint sem erros, com um aviso
  anterior no onboarding. Checks completos em cópia limpa do commit `5249e56`,
  evitando duplicatas locais de sincronização, preservadas no checkout original.
- Chrome real via Playwright: 1440/900/390/320 px, sem overflow na landing,
  check-in e refeição. Opções da escala têm pelo menos 46,8 × 136 px na landing
  de 320 px e 53,6 × 139 px no paciente. Foco visível e nomes acessíveis.
- Login do paciente pela interface, Enter, voltar, edição pelo resumo, pular,
  preservação do recado e alerta de efeito forte. Peso abc/0/−2/501 bloqueia
  envio e recebe foco; motivo desmarcado é omitido. Falha 503 **simulada**
  preserva respostas; tentativa real seguinte retorna 201. Repetir a mesma
  requisição autenticada retorna o mesmo registro.
- Check-in real com marcador TESTE SINTÉTICO relido pelo recibo após recarga.
  Duas entradas de teste foram criadas durante ajuste do seletor do driver;
  a segunda é a evidência abaixo. Não houve limpeza de registros anteriores.
- Refeição textual com Outro e horário alterado persistiu após recarga.
  Diário registrou somente foto, sem descrição; erro de tipo de arquivo,
  prévia, remoção e download privado HTTP 200 foram conferidos.
- Guilherme entrou pela interface e manteve sessão após recarga; abriu as
  respostas originais do novo check-in e a refeição textual/sem descrição,
  com download da foto HTTP 200. Nenhuma interpretação ou orientação médica
  foi registrada. Zero erros de página nos percursos medidos.

Somente o projeto temporário sintético `instituto-vivance-dev`
(`oxuwrdjojsmgxoljqkuk`). Sem migration, Edge Function, banco, regras de
comparação laboratorial ou extração alterados. Outbox existente preservada;
recuperação offline real não foi repetida nesta rodada.

Identificadores de evidência sintética: check-in
`779c8896-d9ba-48b1-b5de-b9ba81f7750b`; chave do recibo
`de73afaa-6453-4e19-b3d2-4261fa9218b6`; refeição somente foto
`262f0ec4-d1b6-4818-8005-215d2f64e4ab`; documento
`a89b99a0-a631-4a40-972d-8334070e016a`.

## QA visual

Referência: captura do usuário de 11/10 às 09:43, com escala de energia no card
azul-marinho. Trata-se de redesenho aprovado, não de reprodução pixel a pixel.
O fluxo atual conserva marca e temas, acrescentando contexto da etapa e ações
literais. Inspeção direta das capturas finais em 390/320 px:

| Superfície | Critério e resultado |
|---|---|
| Tipografia | Geist existente; corpo 16 px, escolhas 12–13 px, títulos 22–26 px. Rótulos visíveis sem depender das figuras. |
| Espaçamento/enquadramento | Uma pergunta com resposta na primeira área visível; cards compactos, adicionais recolhidos; foto e texto não competem com um grande dropzone. |
| Cores | Navy no contexto/ação, seleção dourada suave, superfícies claras. Sem vermelho/verde para classificar fome ou alimentação. |
| Ativos | Mascote original coerente nas etapas; duas expressões na energia. Imagens decorativas, texto anuncia a resposta. |
| Conteúdo | Energia/Sono/Fome/Banheiro e recado; escolhas literais, horários editados explícitos, exemplos públicos sem envio. |

Capturas versionadas: [check-in](../../images/daily-moments/checkin-390.png),
[refeição](../../images/daily-moments/meal-390.png) e
[demonstração a 320 px](../../images/daily-moments/landing-320.png).
Evidências completas locais: `output/playwright/daily-moments/`, ignoradas no
Git, incluindo relatórios JSON, recibos e percurso médico. Credenciais e estados
de sessão são locais, ignorados e não acompanham o PR.

## Entrega

Branch `codex/checkin-alimentacao-intuitivos-20261011`; código `5249e56`.
[PR #121](https://github.com/vitormilanez/instituto-vivance/pull/121),
[Preview](https://instituto-vivance-lm6t8xa62-vtr-consulting.vercel.app)
`dpl_7MXE7ShG2QRd5NvCoV9hhiQpzVK1`, READY, target **preview**, build do código
`5249e56`. Conta `vtrconsulting`, equipe `vtr-consulting`, projeto
`instituto-vivance` / `prj_ligeZuFRycRXA21u5rRzaLAORTrI` conferidos.
Login real paciente e médico no Preview, sessão após recarga, superfícies em
1440/900/390/320 px sem overflow e zero erros de página; médico abriu os
originais salvos localmente no mesmo banco sintético, inclusive a foto privada.
Não repetimos esses envios no Preview. Proteção Vercel preservada.

Asana C3 `1219002740032970` registra esta implementação, evidências e limites,
permanecendo aberto para os aceites anteriores. Publicação técnica, aceite de
usabilidade e aceite clínico permanecem separados. Gate P e separação de
produção continuam abertos.
