# Produto

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Profissionais de saúde responsáveis por acompanhar pessoas em jornadas de emagrecimento e envelhecimento saudável.
- Pacientes convidados para registrar contexto, acompanhar um plano publicado e conversar com a equipe.

- Administradores do instituto responsáveis por cadastros, acessos e vínculos de cuidado, sem permissão clínica automática.

## Product Purpose

A VIVANCE organiza o cuidado ao longo do tempo: `coleta -> resumo -> revisão médica -> orientação -> acompanhamento`. O produto deve reduzir o tempo necessário para o profissional entender o contexto de uma pessoa, revisar as fontes e preparar a próxima conversa, mantendo todas as decisões clínicas sob responsabilidade humana.

O sucesso da área profissional é permitir que o médico identifique rapidamente quem está sendo acompanhado, o que mudou, o que precisa de revisão, quais fontes sustentam a informação e qual ação humana pode ser tomada em seguida.

## Positioning

O produto não tenta substituir o prontuário ou automatizar decisões médicas. Ele combina contexto antes da consulta, histórico, evolução e rascunhos rastreáveis em uma área de revisão na qual o material original permanece acessível.

## Operating Context

- Uso principal em desktop durante preparo, consulta e acompanhamento; tablet e mobile devem permitir leitura e ações essenciais.
- A aplicação reúne pré-consulta, check-ins, mensagens, documentos, planos, consultas e evolução. Funcionalidades ainda fora da `main` não devem ser apresentadas como disponíveis.
- O prontuário oficial e sistemas externos permanecem fora do produto atual. A publicação técnica ainda não autoriza dados clínicos reais.
- A experiência profissional deve priorizar exceções e itens para revisão, sem classificar risco ou urgência.

## Capabilities and Constraints

- A IA pode organizar fatos, resumir períodos, apontar lacunas e conflitos e sugerir perguntas para investigação.
- A IA nunca diagnostica, prescreve, recomenda medicamentos ou suplementos, altera doses, determina urgência, escolhe conduta ou publica orientação diretamente ao paciente.
- Conteúdo assistido segue `rascunho -> revisao medica -> aprovado -> publicado ou exportado -> nova versao`.
- Aprovar é diferente de publicar ou exportar. Exportar manualmente não significa sincronizar.
- Originais são preservados e ligados a resumos, revisões e versões derivadas.
- O fluxo manual permanece disponível quando a IA está indisponível ou não autorizada.
- Validações usam apenas dados sintéticos autorizados e não devem alegar integrações, retenção ou monitoramento que não existam.

## Brand Commitments

- Nome público: VIVANCE.
- Identidade: azul-marinho, branco, azul-claro em pontos de orientação e dourado restrito ao logo.
- Menus e barras podem usar transparência semelhante a vidro quando isso ajuda a separar navegação e conteúdo; o restante permanece claro e simples.
- A interface profissional deve parecer confiável, elegante e funcional; expressão visual não pode competir com tarefa, estado ou evidência.

## Evidência vigente

- O estado técnico e operacional está em `docs/STATUS_ATUAL.md`.
- O contrato funcional consolidado está em `docs/FUNCIONALIDADES.md`.
- O protótipo anterior em `app/` é apenas referência e não participa do deploy atual.
- Não há comprovação de prontuário oficial, integração clínica real, telemonitoramento contínuo ou liberação clínica do produto.

## Product Principles

1. A pessoa selecionada aparece antes da coorte e o contexto precede a ferramenta.
2. Toda síntese volta à fonte; nenhuma inferência substitui a evidência original.
3. A IA prepara e organiza, o profissional interpreta e decide.
4. Ausência, conflito e baixa completude são estados visíveis, nunca preenchidos artificialmente.
5. Rastreabilidade, privacidade e fluxo manual fazem parte da experiência, não de uma tela administrativa posterior.

## Accessibility & Inclusion

- A experiência deve funcionar por teclado, não depender apenas de cor ou hover e manter alvos de toque de pelo menos 44 px.
- Gráficos precisam de resumo textual ou tabela equivalente.
- A página deve permanecer utilizável a partir de 320 px, sem rolagem horizontal estrutural.
- Linguagem em português do Brasil, objetiva e sem alarmismo clínico.
