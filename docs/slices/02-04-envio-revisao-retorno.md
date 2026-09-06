# Slices 2–4 — envio, revisão e retorno

Implementação local em 6 de setembro de 2026. Publicação e Git adiados por solicitação do usuário. Sem novos serviços de IA ou uso de dados reais.

## Fluxo entregue

1. Paciente: “Hoje → Enviar informação, áudio, foto ou documento”, ou “Meus exames → Enviar novo exame”. Aceita texto, PDF, JPG, PNG, MP3, WAV, áudio WebM e M4A, até 8 MB por arquivo. Envio tem prévia e confirmação explícita; erros preservam o texto.
2. O original é guardado em R2 privado, com metadados em D1. Antes da confirmação, o arquivo não fica disponível ao médico. Formato, tamanho, usuário, vínculo e consulta são conferidos no servidor. O download exige sessão e vínculo ativo; não existe URL pública do arquivo.
3. Médico: prontuário do paciente → “Envios para revisão”. Mostra origem, recebimento, original e lacunas, com espaço para revisão privada e rascunho de retorno. Nenhuma leitura automática é inventada.
4. “Salvar revisão privada” atualiza o estado recebido → revisado. “Publicar retorno à paciente” é outra ação e só fica disponível após salvar. O servidor também exige a sequência e a versão da revisão.
5. Paciente: “Meus envios e retornos” mostra recebido/revisado/publicado e somente o texto publicado. O retorno publicado é preservado; revisões internas nunca são enviadas na resposta da API ao perfil paciente.

Exames enviados nesse fluxo não recebem valores laboratoriais fictícios. A coleta permanece “não informada” quando ausente. A revisão manual do original sincroniza a fila e o histórico de exames, sem criar resultados. Exames de exemplo preexistentes continuam com valores fictícios e conferência campo a campo; correções não alteram valor bruto, referência ou página.

## Persistência e proteção de edição

- Cada acompanhamento tem revisão incremental. Um lote atômico grava estado e recibo da alteração.
- O recibo une ator, tentativa e impressão digital do conteúdo. Repetição, inclusive simultânea, recupera o mesmo resultado; outra edição concorrente não sobrescreve dados.
- Rascunhos de plano e revisão têm versão-base. Atualizações remotas não apagam o editor, e o médico precisa conferir a versão salva antes de continuar.
- Modelo, sementes e transições existentes foram separados dos componentes React para usar as mesmas regras nos serviços e nos testes.
- Nenhuma chave de API, novo modelo, execução paga ou diagnóstico autônomo foi acrescentado.

## Verificação e aceite pendente

Os 22 testes automatizados passaram usando os serviços e consultas reais com SQLite isolado; os bytes de arquivos são exercitados com armazenamento em memória. Incluem original intacto, segregação por vínculo, revisão privada, publicação explícita, confirmação/desmarcação de ações, idempotência e conflito. TypeScript, lint do código da aplicação/testes e compilação também passaram.

A API local foi verificada com sessões separadas de Marina e Dr. Guilherme. Um arquivo de teste de 95 bytes também percorreu o upload e download no R2 local: recebimento 201, download pela paciente 200 com bytes idênticos e acesso do médico 404 antes da confirmação. O arquivo técnico de teste não virou envio clínico e foi removido ao final, sem tocar em documentos do usuário. Isso não substitui validação visual ou upload ponta a ponta pelo navegador.

Antes de publicar, conferir manualmente em duas sessões:

- [ ] Enviar um PDF fictício, encontrar o mesmo original no prontuário e baixar o arquivo.
- [ ] Repetir para imagem, áudio e relato textual.
- [ ] Salvar uma revisão e confirmar que o rascunho não aparece à paciente; publicar e conferir o retorno.
- [ ] Editar o mesmo plano/revisão em duas janelas e conferir que o texto não é apagado após conflito.
- [ ] Sair, entrar, conferir estados e versão publicada; testar celular, teclado e falha de conexão.

## Limites e próximo slice

- Vínculo persistente provisionado: Marina–Dr. Guilherme. Os outros pacientes continuam cenários ilustrativos, sem autorização inferida a partir das telas.
- A Central da IA permanece configurador demonstrativo local. Slice 5 deve persistir políticas e fontes, comparar versões em casos fictícios e exigir publicação médica antes de aplicar a diretriz aos pacientes autorizados, sem misturar os dados individuais.
- Leitura automática de anexos, extração/OCR, transcrição, processamento em fila e avaliação clínica do modelo não fazem parte desta entrega.
- Anexos interrompidos após upload podem ficar privados e sem confirmação. Política de expiração, quotas por usuário, varredura de segurança, trilha de leitura e exclusão/retenção devem preceder uso com dados reais.
- Autenticação e credenciais continuam de demonstração. Preparação para produção exige revisão de segurança e privacidade, consentimento aplicável e validação médica. Não inserir dados reais neste ambiente.
- Esquema de documentos usa JSON por acompanhamento; paginação e retenção ficam para evolução posterior. O registro de acompanhamento não aciona notificações automáticas.
- Orientações de persistência da skill Sites levaram ao uso de D1/R2; a revisão React manteve regras de gravação no servidor e rascunhos locais sem publicar automaticamente.
