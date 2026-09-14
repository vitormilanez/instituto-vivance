# Instituto VIVANCE

**Aplicação atual:** a versão Vercel/Supabase está em [apps/web](apps/web/README.md) e publicada em [institutovivance.app](https://institutovivance.app). O código de referência está em `main`. A publicação técnica não autoriza o uso de dados clínicos reais antes da conclusão do Gate P.

O restante deste documento descreve o protótipo Cloudflare preservado como referência histórica; suas funcionalidades não devem ser confundidas com a aplicação atual.

Protótipo de uma plataforma de cuidado contínuo para emagrecimento e envelhecimento saudável. O produto organiza a jornada antes, durante e depois da consulta, reduz a fragmentação das informações e usa IA para preparar contexto, estruturar acompanhamentos e destacar situações que merecem revisão do médico.

Protótipo histórico: https://lume-saude-prototipo.vitormilanez.chatgpt.site

## Experiências do produto

### Paciente — mobile-first

- visão diária alimentada pelo plano publicado e check-in guiado;
- dois cenários de validação: acompanhamento preenchido e preparação ainda pendente;
- navegação principal reduzida a Hoje, Meu cuidado, Conversas e Evolução;
- hub Meu cuidado para acessar plano alimentar, medicamentos, receitas, retorno e histórico de check-ins;
- plano de cuidado publicado pelo médico em ações simples, com confirmação opcional de leitura;
- evolução com medidas autorrelatadas, origem e data preservadas, além de fotos simuladas no protocolo combinado;
- conversa direta com a equipe no mock, sem resposta clínica automática;
- check-in a cada três dias por voz simulada ou texto, com revisão antes do envio;
- relato original e rascunho organizado pela IA exibidos e armazenados separadamente;
- medidas, plano alimentar, medicamentos, receitas, fotos condicionais e retorno em uma jornada única;

### Médico — desktop-first

- agenda e preparo de consultas;
- caixa de atenção organizada por exceção;
- briefing longitudinal do paciente;
- consulta com notas estruturadas e sala de vídeo simulada;
- plano de cuidado versionado: rascunho, aprovação médica e publicação separada para a paciente;
- mensagens e relatórios revisáveis;
- recebimento do objetivo e dos relatos originais da pré-consulta, separados do rascunho assistido.
- workspace médico com edição, rejeição justificada, aprovação restrita ao preparo e histórico de versões.
- navegação por URLs reais para agenda, dossiê, pré-consulta e consulta, com contexto sintético de paciente e atendimento.
- histórico longitudinal rastreável no protótipo por paciente, com filtros, autoria, origem, identificador, versão, estado de revisão e limites explícitos.
- resumo orientado à ação que apresenta pendência, evidência e próximo passo humano antes do histórico extenso.
- configuração demonstrativa de cadência, leitura humana de check-in e contato manual diante de ausência de registro.
- conversa contextual compartilhada com a paciente e auditada sem copiar o conteúdo da mensagem.

## Estado atual

O projeto é um protótipo interativo com dados fictícios. Usuários, sessões, o vínculo de cuidado e a conversa entre Dr. Guilherme e Marina são persistidos em Cloudflare D1, com senha derivada por PBKDF2, cookie de sessão `HttpOnly` e separação de rotas por perfil. A pré-consulta, suas versões de revisão, os planos versionados, check-ins, leituras humanas, cadências, contatos manuais, diário, confirmações de ações e auditoria de transições ainda permanecem na `sessionStorage` somente durante a sessão do navegador. O dossiê longitudinal combina eventos sintéticos com as fontes e transições criadas na sessão, sempre isolado pela combinação de paciente e consulta. Ainda não existem uploads reais, notificações externas, integrações externas ou dados clínicos reais.

As integrações de Google Meet, relógios, prescrições e análise de refeições são demonstrações de produto. Nenhuma delas se conecta atualmente a serviços externos. Áudio, transcrição e envio de fotos são simulados no mock; não há captura, upload ou armazenamento real desses arquivos.

## IA e segurança clínica

- A IA organiza informações e sugere estruturas; não diagnostica nem decide conduta.
- O médico continua responsável por revisar e aprovar qualquer conteúdo clínico.
- Conteúdo gerado não deve ser enviado automaticamente ao paciente.
- A pré-consulta registra ciência, começa com campos vazios e permite revisar o relato antes do envio.
- A assistência de IA é opcional e sua recusa não impede o fluxo manual.
- Aprovar a revisão da pré-consulta valida somente o preparo médico; não publica plano nem sincroniza prontuário.
- O plano só chega à visão da paciente após rascunho, aprovação médica e publicação explícita; cada nova publicação preserva a versão anterior.
- Publicação e transferência para prontuário são fluxos diferentes: este protótipo não envia dados ao Feegow nem a qualquer serviço externo.
- A auditoria exibida no dossiê registra somente transições e ciência na sessão demonstrativa; não substitui trilha de auditoria de prontuário, autenticação ou evidência legal.
- Check-ins e confirmações de ações são autorrelatos para organizar a próxima conversa; não são triagem, alerta de urgência, diagnóstico ou confirmação de resultado clínico.
- A cadência e a ausência de registros geram somente estados operacionais demonstrativos; qualquer contato continua humano e nenhuma notificação real é enviada.
- Mensagens são vinculadas ao contexto e ficam apenas na sessão; o canal não é monitorado continuamente e não substitui urgência.
- Uma implementação real de áudio e transcrição exigirá autorização específica, política de retenção e controles de acesso.
- Relatos do paciente devem permanecer separados de inferências ou sínteses da IA.
- O aplicativo não substitui atendimento de urgência.
- Antes de usar dados reais, serão necessários controles de acesso, auditoria, consentimento, retenção de dados e adequação à LGPD.

## Como rodar localmente

Requisito: Node.js 22.13 ou superior.

~~~bash
npm ci
npm run dev
~~~

Acesse http://localhost:3000. A raiz abre a tela de login e encaminha cada conta para sua área autorizada.

Contas demonstrativas:

- Dr. Guilherme: usuário `dr.guilherme`, senha `Vivans@2026`;
- Marina: usuário `marina`, senha `Vivans@2026`.

Rotas principais do protótipo:

- `http://localhost:3000/medico`
- `http://localhost:3000/medico/pacientes/pac-demo-001`
- `http://localhost:3000/medico/pacientes/pac-demo-001/mensagens`
- `http://localhost:3000/medico/pacientes/pac-demo-001/pre-consulta/enc-demo-002`
- `http://localhost:3000/medico/pacientes/pac-demo-001/consultas/enc-demo-002`
- `http://localhost:3000/paciente/pac-demo-001`
- `http://localhost:3000/paciente/pac-demo-006`
- `http://localhost:3000/paciente/pac-demo-001/cuidado`
- `http://localhost:3000/paciente/pac-demo-001/conversas`
- `http://localhost:3000/paciente/pac-demo-001/plano`

Para validar a versão de produção:

~~~bash
npm run build
~~~

## Próximos marcos

1. Validar as jornadas e prioridades com o médico especialista.
2. Definir limites clínicos, consentimentos, retenção e auditoria.
3. Expandir a persistência durável para os demais dados clínicos e preparar a separação entre clínicas.
4. Integrar agenda, videoconferência, mensagens e documentos.
5. Avaliar integrações de Apple Health, Health Connect e fabricantes de relógios.
6. Criar uma camada de conhecimento médico com fontes rastreáveis e avaliações de qualidade.
7. Projetar métricas de adesão, alertas e relatórios configuráveis por clínica.
8. Conduzir um piloto pequeno com dados controlados antes de qualquer escala.

O plano de extração seletiva do protótipo Skip está documentado em [`PLANO_APROVEITAMENTO_SKIP.md`](./PLANO_APROVEITAMENTO_SKIP.md).


## Administração local

A área `/admin` gerencia pacientes, médicos, administradores, vínculos, acesso e dados do instituto. O cadastro pode ser preparado com acesso bloqueado e liberado depois. Não há envio automático de convite ou senha.

Depois das migrações locais, execute `npm run admin:local`. A conta demonstrativa é `admin.vivans`, com senha `VivansLocal@2026`. O script aceita `VIVANS_ADMIN_USERNAME` e `VIVANS_ADMIN_PASSWORD`; usa apenas o banco **local** e preserva contas existentes. Ele não faz parte do login, do build ou da publicação.

- O vínculo pode começar pela ficha do paciente ou pela ficha do médico, inclusive com seleção de vários pacientes.
- Há um médico responsável ativo por paciente. Transferências e encerramentos exigem motivo e são gravados de forma atômica, com controle de edição concorrente.
- Cada transferência abre uma nova conversa e um acompanhamento vazio. Os registros anteriores ficam preservados no vínculo anterior, sem compartilhamento automático. A consulta desses registros encerrados não faz parte desta entrega.
- Novos pacientes entram com dados próprios, podem enviar informações e conversar; o médico responsável encontra seus pacientes e pode revisar e publicar retornos.
- O Admin não recebe permissões clínicas. Bloquear uma conta ou redefinir sua senha encerra as sessões; bloquear um médico exige resolver os vínculos ativos primeiro.
- O histórico registra autoria, data, origem/destino e motivo dos vínculos. Senhas, mensagens e conteúdo clínico não são copiados para o histórico administrativo.
- Cadastros, acessos, vínculos e configurações são persistidos em D1. O ambiente continua destinado a validação com dados fictícios.
