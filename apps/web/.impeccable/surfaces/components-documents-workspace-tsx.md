---
version: 1
slug: "components-documents-workspace-tsx"
primary_target: "components/documents-workspace.tsx"
related_targets: ["app/globals.css"]
---

# Documentos — área profissional

- Escopo: lista de documentos na área do médico; modo Operate.
- Público e trabalho: profissional localiza um arquivo, confirma quando ficou disponível, vê o estado da revisão e abre o original antes de registrar uma revisão.
- Primeira leitura: uma grade compacta alinha título de exibição, data de disponibilização, revisão médica e ações; título é uma descrição fiel do cabeçalho quando disponível, sem substituir o nome original.
- Ações: “Abrir arquivo” dá acesso ao original; “Revisar” abre a revisão em linha somente por solicitação. A área aberta preserva e identifica o nome original do arquivo.
- Estados: revisão registrada, sem revisão registrada, histórico com mais de um registro, lista vazia e arquivo PDF ou imagem. Status descreve o registro de revisão, nunca interpreta resultado ou urgência.
- Responsivo: até 1050 px, os cabeçalhos da grade saem e os campos ganham rótulos; até 650 px, título, data, revisão e ações empilham sem rolagem horizontal estrutural. Alvos de ação têm pelo menos 44 px.
- Direção visual: superfície branca, borda discreta, canvas claro no cabeçalho e na revisão expandida; azul para ações e revisão já registrada, âmbar apenas para pendência de revisão.
- Limite: esta prévia local com dados fictícios não comprova publicação, sessão autenticada, aceite clínico nem interpretação de exames.
