# Checkpoints das entregas

## Consulta integrada, ficha e agenda — 15/10/2026

- [x] PR143/main 5df63e0; 627 testes/CI, tipos/build e lint sem erros.
- [x] Três migrações aplicadas no dev sintético, sem seeds/roles/Vault; advisors sem erros.
- [x] Credencial Anthropic reutilizada na Vercel e flag de geração habilitada após autorização expressa.
- [x] Deployment production/READY, SHA e dois domínios conferidos; principal200 e secundário307.
- [x] Sessão médica: entrada direta, horários clicáveis, opções Agendar/Bloquear e histórico vazio na ficha.
- [ ] Geração na aplicação publicada, captura real das duas pontas, aceite clínico e Gate P.
- [ ] Meet pessoal conectado e criação real da sala conforme permissões do próprio médico.

[Evidências e limites](ENTREGA_CONSULTA_INTEGRADA_2026-10-15.md).

**14/10/2026.** Checklist corrente, sem repetir logs de cada release.
Estado e evidências em [STATUS_ATUAL](STATUS_ATUAL.md); versões anteriores e
marcos em [histórico](historico/EVOLUCAO_ATE_2026-10-14.md).

## Base técnica entregue

- [x] Workspace médico unificado: Hoje, ficha, Pacientes, Agenda, Mensagens e Teleconsulta.
- [x] Dia vazio com Agendar consulta e carrossel manual, revisão antes do envio.
- [x] Publicação PR137, CI591 testes/tipos/lint/build e verificação autenticada/mobile320 documentadas.
- [x] Exames: cota15, liberação auditada, deduplicação, conferência e histórico factual.
- [x] Resumo de exames por snapshot/cache, revisão/aprovação/publicação separadas e leitura QA pelo paciente.
- [x] Biblioteca clínica versionada implementada; sem aprovação automática de fontes.
- [x] Transcrição manual do navegador, original privado imutável e revisão separada.
- [x] Google API/cliente/escopos/servidor preparados para teste; nativa explicitamente OFF.
- [x] Configuração Google reconferida: médico 200/configurado, paciente 403, nativa 409; conta não conectada.
- [x] Documentação reconciliada: catálogo vigente, decisões atuais, histórico identificado e contratos preservados.

Registros: [workspace/Google](historico/entregas/WORKSPACE_E_TRANSCRICAO_2026-10-14.md)
e [exames](historico/entregas/EXAMES_2026-10-11.md). Testes sintéticos não são
aceite clínico; check técnico não encerra os gates abaixo.

## Consentimento e entrada — não implementado

- [ ] Implementar aceite/recusa/retirada pelo próprio paciente, por consulta e versão/finalidade.
- [ ] Mostrar estado médico curto e entrada simples; continuar sem transcrição após recusa.
- [ ] Revalidar consentimento/vínculo antes de buscar, processar e persistir artefatos.
- [ ] Validar recarga, acesso cruzado, retirada concorrente, link direto e terceiros.
- [ ] Não apresentar declaração do médico como assinatura do paciente.
- [ ] Publicar o slice somente após implementação e verificação proporcionais.

[Contrato e dependências](CONSENTIMENTO_E_POS_CONSULTA.md).

## Google e áudio real

- [ ] Concluir grant pessoal Google no mesmo navegador da sessão médica; não transferir cookies/códigos.
- [ ] Verificar licença/política/elegibilidade da conta antes de transcrição nativa.
- [ ] Exercitar chamada real com participantes de teste, sem inferir identidade ou completude.
- [ ] Avaliar reconhecimento real do navegador, captura remota e interrupções.
- [ ] Só ativar nativa com autorização específica, consentimento e teste correspondentes.
- [ ] Não publicar o app OAuth para o público geral por consequência desta preparação.

## Arquivo pós-consulta — não implementado

- [ ] Background com autorização estreita de job, não sessão expirada nem acesso privilegiado geral.
- [ ] Associar sala/sessão inequívocas, arquivo final completo e notas disponíveis; falha não salva prefixo.
- [ ] Guardar resumo e original privados, com origem/versão, lacunas e estado de revisão.
- [ ] Recusa/retirada e eventos/retries concorrentes não criam novos derivados indevidos.
- [ ] Não chamar outro fornecedor/LLM nem publicar prontuário/paciente implicitamente.

## Exames e validação clínica

- [ ] Avaliação médica de precisão/omissões, unidades, referências, datas e utilidade por tipo de laudo.
- [ ] Ampliar corpus e medir estabilidade/custo com gabarito; contagem de itens não mede qualidade.
- [ ] Curadoria/aprovação/retirada da biblioteca e limites de aplicabilidade.
- [ ] IA1/IA6 e demais gates do [plano clínico](PLANO_IA_CLINICA.md); nenhuma hipótese sem fonte.
- [ ] Aceite de usabilidade/qualidade do usuário e direção médica, separado do QA técnico.

## Operação e liberação

- [ ] C2/C3 com jornadas completas e outros papéis/vínculos, suspensão/revogação e persistência.
- [ ] Validar convite novo, ativação/aceite e entregabilidade externa; SMTP configurado não basta.
- [ ] Configuração protegida da pipeline de banco/Edge/promoção, se autorizada; não confundir com deploy Git nativo.
- [ ] Produção Supabase separada, backup/restauração e responsabilidades operacionais.
- [ ] Privacidade, retenção/exclusão, fornecedores e [Gate P](GATE_P.md) aceitos antes de dados reais.

Não fechar PRs históricos, reenviar mensagens, limpar registros ou ativar
captura só para marcar um item. Cada aceite precisa de evidência própria.
