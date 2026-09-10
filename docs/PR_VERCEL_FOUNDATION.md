## Resultado

Primeira fatia nativa Vercel/Supabase em `apps/web`, isolada do protótipo Cloudflare. Login real, seleção de clínica, cadastro demográfico e auditoria transacional. Sem contas padrão nem dados de demonstração no novo runtime.

## Verificação

- 20 testes aprovados: PostgreSQL efêmero com RLS, negação entre clínicas, sessão revogada, papéis, campos protegidos, auditoria atômica e fronteira sem dependências do protótipo.
- TypeScript, lint e build Next.js aprovados.
- Navegador local: login renderizado, credenciais inválidas recusadas, sem erros JavaScript ou rolagem horizontal móvel.
- APIs retornam 401 sem sessão; rotas e PDFs do protótipo não existem no novo app.
- Migração aplicada somente no Supabase de desenvolvimento; verificador de segurança sem alertas. Banco sem usuários/pacientes/clínicas.

## Limites

O primeiro acesso real e o fluxo autenticado completo dependem do e-mail confirmado pelo titular e do provisionamento seguro. Consultas, prontuário, documentos e IA ainda não foram migrados. A aprovação deste código não representa homologação clínica. Não fazer merge/promover para produção nesta etapa.

Configuração Vercel restrita à equipe VTR Consulting e ao projeto Instituto Vivance. Banco antigo e Cloudflare preservados. Migrações e testes sem segredos, credenciais locais ignoradas pelo Git.
