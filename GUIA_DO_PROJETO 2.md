Pode colar o texto abaixo como memória oficial do projeto:

# Memória do Projeto — Instituto Vivance

Atualizada em 31 de agosto de 2026.

## 1. Visão do produto

O Instituto Vivance é uma plataforma de cuidado longitudinal voltada inicialmente para emagrecimento e saúde do envelhecimento.

O produto deve acompanhar o paciente antes, durante e depois da consulta, centralizando informações que hoje ficam fragmentadas em mensagens, receitas, anotações, fotos, relatórios, agenda e diferentes aplicativos.

Estratégia de experiência:

- Paciente: web mobile-first.
- Médico: web desktop-first.
- Operação inicial: médico trabalhando sozinho.
- Futuro: produto configurável e escalável para outras clínicas.

## 2. Papel da inteligência artificial

A IA deve funcionar como copiloto do cuidado, reduzindo trabalho manual e organizando o contexto para o médico.

Usos planejados e prototipados:

- Pré-consulta conversacional por voz ou texto.
- Transcrição e síntese das respostas do paciente.
- Organização do objetivo principal da consulta.
- Resumo das últimas conversas.
- Criação de rascunhos de relatórios.
- Identificação de pacientes que precisam de atenção.
- Análise demonstrativa de fotos de refeições.
- Organização de notas e preparação do plano de cuidado.
- Relatórios semanais, quinzenais e mensais.
- Correlação futura entre peso, adesão, sono, passos e outros sinais.
- Camada futura de evidências médicas com fontes como PubMed, Cochrane e Conitec.

Limites definidos:

- A IA não diagnostica.
- Não prescreve ou emite receitas autonomamente.
- Não altera tratamento ou dosagem.
- Não substitui atendimento de urgência.
- Não decide conduta clínica.
- Toda sugestão clínica precisa de revisão e aprovação médica.
- Fotos não permitem determinar com precisão ingredientes, quantidades ou valor nutricional.

## 3. Protótipo construído

Foi criado um protótipo web interativo com troca entre as experiências de médico e paciente.

### Experiência do paciente

Foram construídas as áreas:

- Hoje.
- Plano.
- Diário.
- Evolução.
- Mensagens.
- Consultas.

Principais jornadas:

- Check-in diário.
- Plano de cuidado com ações simples.
- Pré-consulta conversacional, incluindo consentimento, perguntas, transcrição, revisão e envio ao Dr. Guilherme.
- Registro de refeições com foto demonstrativa.
- Análise visual assistida por IA.
- Três avaliações de 1 a 5 para contextualizar a refeição.
- Confirmação de que as respostas foram enviadas ao médico.
- Mensagens dentro do aplicativo.
- Consulta com sala de vídeo simulada.
- Histórico de consultas.
- Relatórios de evolução.
- Indicador moderno de “Quanto falta para meu objetivo?”, mostrando a redução progressiva do que ainda falta.
- Indicadores de peso, adesão, sono e passos.

### Experiência do médico

Foram construídas as áreas:

- Visão geral.
- Agenda.
- Pacientes.
- Mensagens.
- Relatórios.
- Ambiente de consulta.

Principais recursos:

- 22 pacientes ativos no cenário demonstrativo.
- 17 pacientes regulares.
- 5 pacientes com check-in atrasado.
- Ação para “dar um cutucão” nos pacientes atrasados.
- Cards clicáveis com consultas do dia, pacientes que precisam de atenção e relatórios pendentes.
- Agenda diária em formato de linha do tempo.
- Cinco consultas demonstrativas com horários e status.
- Clique no nome do paciente abre diretamente sua pré-consulta.
- Caixa de atenção organizada por exceção.
- Objetivo do paciente nas palavras dele.
- Síntese longitudinal do acompanhamento.
- Perfil do paciente com relatórios, receitas, insights e próximos passos.
- Dossiê assistido por IA com resumo, conversas sintetizadas, fotos e análises e linha do tempo.
- Preparação assistida da consulta com relatos, dados, revisões e hipóteses em camadas separadas.
- Lacunas e ausência de contradições mantidas explícitas, sem preenchimento automático.
- Perguntas sugeridas com fonte, cobertura e revisão item a item pelo médico.
- Justificativa obrigatória para perguntas descartadas, versionamento e auditoria por metadados.
- Pauta revisada reaproveitada no ambiente da consulta e fluxo manual preservado quando a IA não está autorizada.
- Teleconsulta demonstrativa com ciência específica separada, pausa, retomada e encerramento da assistência.
- Transcrição fictícia incremental e insights em tempo real com trecho, horário, cobertura e limite visíveis.
- Revisão de insights por “fixar” ou “descartar”, com justificativa obrigatória para descarte.
- Fechamento assistido que separa relatos, pontos a confirmar e hipóteses, com edição, rejeição, aprovação e versão.
- Handoff rastreável do fechamento aprovado para o plano, preservando fonte, versão e itens selecionados.
- Hipóteses e lacunas visíveis, mas bloqueadas para conversão automática em objetivo ou ação.
- Ações vinculadas nascem em branco e exigem redação, frequência e aprovação médica antes da publicação.
- Comparação da versão do plano com a anterior e prévia do conteúdo que a paciente verá.
- Rascunhos de relatório sujeitos à aprovação médica.
- Consulta com notas estruturadas.
- Copiloto para organizar notas.
- Compilação do plano de cuidado.
- Relatório e plano salvos inicialmente como rascunho.

Pacientes fictícios utilizados incluem Marina Costa, Ana Ribeiro, Paulo Mendes, Rafael Lima e Lúcia Barbosa.

## 4. PDFs e documentos demonstrativos

Foram criados PDFs mockados para enriquecer o prontuário demonstrativo:

- Primeira consulta.
- Plano de cuidado.
- Evolução quinzenal.

Esses documentos ficam em `output/pdf/` e não representam documentos clínicos reais.

## 5. Estado técnico atual

Projeto permanente:

`/Users/vitormilanez/Desktop/Codes/Instituto Vivance`

Tecnologias:

- React 19.
- Next.js 16.
- TypeScript.
- Tailwind CSS.
- Vinext/Vite.
- Estrutura preparada para hospedagem via Sites/Cloudflare.

Comandos:

```bash
npm ci
npm run dev
npm run build
```

Endereço local:

`http://localhost:3000`

Hospedagem vinculada:

`https://lume-saude-prototipo.vitormilanez.chatgpt.site/`

O endereço ainda utiliza o nome antigo no domínio, embora a marca atual seja Instituto Vivance. Em uma verificação anônima recente, o endereço respondeu com HTTP 401; portanto, o acesso deve ser revalidado antes de uma apresentação externa.

Git:

- Branch atual: `main`.
- Commit atual: `8fe9cf59b055615ea736cdbf734baf86a9b3ec70`.
- Mensagem: `Make doctor overview actionable`.

O código está documentado em [README.md](/Users/vitormilanez/Desktop/Codes/Instituto%20Vivance/README.md). As principais experiências estão em [doctor.tsx](/Users/vitormilanez/Desktop/Codes/Instituto%20Vivance/app/components/doctor.tsx) e [patient.tsx](/Users/vitormilanez/Desktop/Codes/Instituto%20Vivance/app/components/patient.tsx).

## 6. O que ainda é mockado

O protótipo possui dados fictícios e estado demonstrativo limitado à sessão do navegador (`sessionStorage`). Não há persistência clínica real.

Ainda não existem:

- Autenticação real.
- Banco de dados persistente.
- Separação entre clínicas.
- Upload real de fotos ou documentos.
- Dados reais de pacientes.
- Integração real com Google Meet.
- Captação, gravação ou transcrição real de áudio e vídeo.
- Insights clínicos em tempo real alimentados por um provedor de IA.
- Integração real com WhatsApp ou SMS.
- Prescrição digital válida.
- Integração com prontuários.
- Apple HealthKit ou Health Connect.
- Integração com relógios.
- Pagamentos.
- Base médica conectada.
- Operação 24 horas.
- Certificação como prontuário ou dispositivo médico.

## 7. Segurança, privacidade e LGPD

Dados de saúde são dados pessoais sensíveis.

Antes de qualquer piloto real, será necessário definir:

- Finalidade e base legal.
- Consentimentos.
- Perfis de acesso.
- Separação entre clínicas.
- Auditoria.
- Retenção e exclusão.
- Revogação de consentimento.
- Fornecedores e suboperadores.
- Resposta a incidentes.
- Política para uso de IA.
- Proibição de usar dados dos pacientes para treinamento sem autorização específica.

O desenvolvimento deve continuar usando dados fictícios até que essa estrutura esteja pronta.

## 8. Modelo de expansão

A direção futura é transformar o MVP validado na Vivance em um produto comercial para outras clínicas.

Elementos esperados para escala:

- Arquitetura multi-clínica.
- Protocolos configuráveis.
- Personalização de marca.
- Permissões por função.
- Indicadores e relatórios configuráveis.
- Integrações opcionais.
- Trilhas de auditoria.
- Biblioteca de procedimentos e serviços da clínica.
- Camada de evidências médicas rastreáveis.
- Modelo de assinatura ou participação comercial.
- Possível participação de Slompo na expansão, investidores e internacionalização.

A ideia de “renda passiva” foi usada como narrativa comercial de potencial recorrente, mas não deve ser apresentada como resultado garantido.

## 9. Proposta comercial

A proposta foi estruturada em duas fases.

### Fase 1 — MVP para o Instituto Vivance

- Valor total do MVP: R$ 30.000.
- Pagamento em 6 parcelas de R$ 5.000.
- Vencimento todo dia 20.
- A data da primeira parcela ainda deve ser preenchida.
- O parcelamento não representa mensalidade.
- As seis parcelas não definem prazo obrigatório de seis meses.
- O desenvolvimento será organizado por etapas e prioridades.
- Custos de nuvem, servidores, APIs e fornecedores são separados.
- Esses custos precisam ser apresentados e aprovados previamente.
- Referência de planejamento: até 15% do valor do MVP.
- Não há participação societária ou equity na Fase 1.

### Fase 2 — Expansão comercial

- Comercialização para outras clínicas e mercados.
- Intenção de participação comercial de 15% para a Contratada.
- Base de cálculo, prazo, responsabilidades e parceiros ainda precisam ser definidos.
- A Fase 2 só começa com contrato próprio.
- Não existe comissão atual nem obrigação automática de iniciar essa fase.

## 10. Documentos comerciais e jurídicos

Foram preparados:

- Proposta comercial profissional em Word e PDF.
- Mensagem comercial para o cliente.
- Versão da argumentação sem valores.
- Minuta detalhada do contrato.
- Contrato simplificado de sete páginas.
