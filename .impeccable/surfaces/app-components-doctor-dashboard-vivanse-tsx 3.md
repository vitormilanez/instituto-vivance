---
version: 1
slug: "app-components-doctor-dashboard-vivanse-tsx"
primary_target: "app/components/doctor-dashboard-vivanse.tsx"
related_targets: ["app/components/doctor.tsx", "app/components/shared.tsx", "app/globals.css"]
---

# Painel principal do médico

- Escopo: primeira tela da área profissional; modo Operate.
- Público e trabalho: médico iniciando o dia, conferindo a próxima consulta e escolhendo o que revisar.
- Ordem principal: saudação curta, próxima consulta, consultas de hoje e pessoas que precisam de atenção.
- Direção: azul-marinho mais escuro, fundo claro quase plano e vidro somente nos menus e na barra superior.
- Marca: usar o logo oficial VIVANSE; dourado somente no logo.
- Ação principal: “Atender agora” sempre ligada à próxima pessoa na sala virtual.
- Momento memorável: a próxima consulta reúne pessoa, horário, situação da pré-consulta e ação em um único bloco calmo.
- IA: não é o tema visual da tela; aparece apenas quando houver um rascunho ou apoio concreto com fonte e revisão médica.
- Estados: consultas concluída, próxima, confirmada ou a confirmar; pré-consulta recebida ou pendente; lista de atenção vazia, carregando ou com conteúdo.
- Responsivo: menu lateral no computador; marca e menu horizontal no celular; próxima consulta antes das listas; sem rolagem horizontal estrutural.
- Segurança: todos os dados são exemplos; itens de atenção não representam urgência nem decisão clínica.
- Barra superior no computador: resumo compacto e clicável com acompanhados, check-ins em dia e itens para revisar. Usar uma única fonte demonstrativa para evitar números divergentes.
- Menu lateral no computador: abaixo de Relatórios, mostrar a próxima consulta com horário, pessoa, estado e um único atalho “Preparar consulta”. Não repetir uma segunda lista de alertas.
- Semântica da pré-consulta: pendente ou “revisar” em âmbar; recebida, revisada ou aprovada em azul; rejeitada ou com erro em rosa; ausente ou indisponível em cinza. Nunca depender apenas da cor.
- Fluxo de consulta: azul-marinho e azul são as cores estruturais. Verde não deve preencher grandes áreas; quando necessário, fica restrito a um estado positivo explícito.
- Troca de área: o cabeçalho deve permitir Médico ↔ Paciente nos dois sentidos. Como só Marina possui uma área de paciente neste protótipo, o atalho do médico deve dizer “Marina demo” para não sugerir que acompanha qualquer prontuário aberto. No computador, usar controle segmentado visível; no celular, priorizar um atalho textual de um toque e manter notificações e perfil disponíveis no menu.
- Cabeçalho persistente: o chrome médico reúne título da área, contexto da rota e próxima ação. No topo mostra o contexto completo; ao descer entra em modo foco sem alterar a altura reservada do documento. Ao subir, restaura o contexto.
- Tese de movimento: a passagem “contexto do dia → foco” preserva título e atendimento; contexto, perfil, carteira e ações secundárias saem primeiro. A navegação inferior acompanha o gesto: desaparece ao descer e volta ao subir. Usar transformações, transparência e recorte do fundo em `180ms`, com listener passivo limitado por `requestAnimationFrame` e alternativa sem transição para movimento reduzido.
- Navegação adaptativa: os cinco destinos ocupam uma barra flutuante de vidro no rodapé, em cinco colunas, sem rolagem lateral, com ícones compactos e rótulos legíveis. No computador, a barra fica centralizada e o rail lateral permanece reservado à próxima consulta e à saída.
- Encaixe dos blocos presos: abas, rail e painéis laterais devem acompanhar a altura atual do cabeçalho (`80 px` completo, `56 px` compacto) com a mesma curva de movimento, evitando sobreposição quando o contexto reaparece.
