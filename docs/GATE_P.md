# Gate P — entrada operacional

O Gate P separa software publicado de serviço clínico autorizado. Ele deve ser
concluído antes de inserir dados de saúde reais ou atender pacientes reais.

## Infraestrutura e dados

- Projeto Supabase de produção identificado e separado de desenvolvimento.
- Migrations conferidas antes e depois da aplicação; rollback compatível
  definido.
- Backups e restauração testados.
- Vercel, domínio e banco comprovadamente servindo o mesmo commit.
- Segredos apenas nos cofres autorizados, com acesso mínimo e rotação definida.

## Segurança e privacidade

- RLS, Storage, RPCs privilegiadas, exportações e logs revisados.
- MFA e recuperação de acesso da equipe definidos.
- Política de privacidade, consentimento, retenção e exclusão aprovados.
- Auditoria não contém texto clínico sensível desnecessário.
- Dados sintéticos usados na homologação e removidos de forma verificável.

## Operação clínica

- Jornadas autenticadas de administrador, médico, enfermagem e paciente
  executadas no ambiente de destino.
- Papéis, vínculos, suspensão e revogação validados ponta a ponta.
- Aprovação médica permanece separada da publicação ao paciente.
- Suporte, incidentes, canal de urgência e responsabilidades estão definidos.
- Titular e responsável clínico registraram aceite explícito.

## Evidência mínima de fechamento

- commit, migration e deployment identificados;
- testes automatizados aprovados;
- evidência autenticada dos fluxos críticos com dados sintéticos;
- registro dos riscos aceitos e pendências não bloqueantes;
- decisão explícita de liberar ou não liberar o uso real.

HTTP 200, deployment `READY`, build verde ou acesso anônimo bloqueado não fecham
este gate isoladamente.
