---
version: 1
slug: "apps-web-components-encounter-editor-tsx"
primary_target: "apps/web/components/encounter-editor.tsx"
related_targets:
  - "apps/web/components/agenda.tsx"
  - "apps/web/app/globals.css"
---

# Registro manual de atendimento

- Escopo e modo: extensão operacional da aplicação autenticada, em modo Operate; editor individual de atendimento e sua entrada pela Agenda.
- Público e tarefa: médico responsável registra manualmente motivo e evolução, salva um rascunho e revisa o texto antes de finalizar. A identidade exibida vem do perfil existente e pode conter o e-mail como fallback; não inventar nome de médico.
- Direção: acompanhar o shell existente de `apps/web/DESIGN.md`, com azul-marinho, branco e Arial. Esta entrega não estabelece nova identidade visual nem novos tokens globais.
- Hierarquia: paciente, contexto do atendimento, médico e horário aparecem acima de um único painel de registro. O painel reúne os dois campos, o estado de salvamento e as ações; o histórico fica em painel separado abaixo.
- Campos: “Motivo da consulta” aceita até 2.000 caracteres; “Evolução e registro da consulta”, até 10.000. Rótulos e instruções permanecem visíveis. A entrada é manual.
- Ação principal: “Salvar rascunho” salva explicitamente o texto. Não há salvamento automático; alterações não salvas ficam indicadas, com aviso ao tentar sair pelos links ou fechar a aba. Durante a solicitação, o estado informa “Salvando…”. Sucesso e erro aparecem junto ao registro.
- Finalização: “Revisar e finalizar” é secundária e exige os dois campos preenchidos. Abre confirmação no próprio painel, explicando o bloqueio da versão final e oferecendo “Confirmar finalização” ou “Continuar revisando”. Finalizar não publica orientações para o paciente.
- Leitura: atendimento finalizado é somente leitura. Rascunho sem permissão de edição mostra o conteúdo e explica que somente o médico autor pode editá-lo. Retificações estão anunciadas como etapa futura.
- Histórico: versões preservadas aparecem abaixo do editor, recolhidas em itens expansíveis com versão, estado, horário, autoria e texto. São snapshots para leitura; quando aplicável, a interface informa o limite das 100 versões mais recentes.
- Responsividade: formulário em uma coluna, inclusive no celular; campos ocupam a largura disponível, ações acomodam o espaço e textos clínicos preservam quebras de linha sem causar transbordamento estrutural.
- Evidência de acabamento: disposição `ship` recebida do revisor, limitada ao editor e às capturas `.impeccable/review/encounter-desktop.png` (1440 px) e `.impeccable/review/encounter-mobile.png` (390 px), relativas à raiz do repositório. Essa revisão visual não representa validação clínica nem revisão de toda a aplicação.
- Ativos e decisões: nenhuma imagem raster integra esta superfície; comp e seed não se aplicam a esta extensão estreita. Nenhuma decisão visual pendente neste escopo.
