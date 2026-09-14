import { createHash, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ACCOUNT = "vivance-asana-oauth";
const CLIENT_SECRET_SERVICE = "com.vivance.asana.client-secret";
const REFRESH_TOKEN_SERVICE = "com.vivance.asana.refresh-token";
const PENDING_AUTH_SERVICE = "com.vivance.asana.pending-auth";
const PERSONAL_ACCESS_TOKEN_SERVICE = "com.vivance.asana.personal-access-token";
const CLIENT_ID = "1218186697086336";
const PROJECT_GID = "1218186424803872";
const REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob";
const FULL_PERMISSIONS = true;
const SCOPES = ["projects:read", "tasks:read", "tasks:write", "workspaces:read"];
const ASANA_API = "https://app.asana.com/api/1.0";

const wikiNotes = `# Wiki de onboarding — VIVANCE

## O que é o projeto
VIVANCE é um protótipo de cuidado longitudinal para acompanhamento de emagrecimento e envelhecimento saudável. A proposta é reunir, antes, durante e depois da consulta, informações que normalmente ficam dispersas entre mensagens, documentos, fotos, receitas, agenda e relatos.

O produto tem duas jornadas que se comunicam, mas não se confundem:
- **Paciente:** experiência web mobile-first, simples e acolhedora para registrar contexto, acompanhar plano, medidas, refeições, mensagens e evolução.
- **Médico:** experiência web desktop-first para organizar fontes, preparar consulta, revisar rascunhos, aprovar conteúdo clínico e acompanhar exceções.

## Princípios de produto e segurança clínica
- Todo o conteúdo e todas as pessoas do protótipo são fictícios.
- A IA organiza informações, identifica lacunas e prepara rascunhos; ela **não** diagnostica, prescreve, altera dose, decide conduta ou substitui o atendimento de urgência.
- Qualquer conteúdo clínico só pode chegar à paciente depois de revisão e aprovação explícita do médico.
- O dado original é preservado. Um resumo assistido nunca sobrescreve a fonte, a autoria, a versão ou a decisão humana.
- A paciente vê apenas aquilo que foi aprovado e publicado para ela.
- O fluxo manual deve continuar possível quando a IA não estiver autorizada ou indisponível.

## Fluxo de referência
Pré-consulta por texto ou voz → fonte original preservada → organização assistida em rascunho → revisão médica → plano aprovado → publicação explícita para a paciente.

## Estado atual do protótipo
- Frontend navegável, interativo e baseado em estado de sessão; não há prontuário, autenticação, banco de dados ou integração clínica real.
- Principais experiências: paciente (Hoje, cuidado, conversas e evolução) e médico (visão geral, agenda, pacientes, mensagens, relatórios e consulta demonstrativa).
- Check-ins, fotos de refeições, medidas, planos, documentos e teleconsulta são representações demonstrativas e usam apenas dados fictícios.
- Não usar este ambiente para dados reais de pacientes, decisões clínicas, prescrições, documentos válidos ou atendimento de urgência.

## Repositório e ambiente local
- **Repositório local:** /Users/vitormilanez/Desktop/Codes/Instituto Vivance
- **Tecnologias:** React 19, Next.js 16, TypeScript, Tailwind CSS e Vinext/Vite.
- **Pré-requisito:** Node.js 22.13 ou superior.
- **Instalação:** npm ci
- **Executar:** npm run dev
- **Validar build:** npm run build
- **Preview local:** http://localhost:3000
- **Rotas principais:** /medico e /paciente/pac-demo-001

Antes de compartilhar uma URL remota, confirmar o repositório Git remoto, permissões e estado do deploy. O protótipo não deve ser apresentado como sistema clínico em produção.

## Chaves, credenciais e acessos
- Nunca colocar tokens, segredos de cliente, chaves de API, códigos OAuth, dados de pacientes ou senhas em commits, descrições de tarefas, comentários, screenshots ou conversas.
- O conector local da Asana usa OAuth. O segredo do cliente e o token de renovação ficam guardados apenas no **Chaves do macOS** deste computador, fora do repositório.
- Comandos disponíveis para o conector local: npm run asana:status e npm run asana:backlog. A autorização inicial é feita com npm run asana:authorize e npm run asana:complete.
- Para ambiente de equipe ou produção, migrar os segredos para um cofre de segredos, com acesso por função, rotação, revogação e trilha de auditoria.
- Se uma credencial for exposta, revogar/rotacionar antes de continuar. Não copiar o valor para esta Wiki.

## Onde acompanhar o trabalho
- **Backlog:** problemas a serem entendidos, decididos ou priorizados.
- **Read For Dev / Development / Testing / Done:** fluxo de entrega e validação.
- Esta Wiki é o ponto de entrada do time; atualizar quando uma decisão de produto, infraestrutura, integração ou segurança mudar.

## Próximo marco
Fechar o roteiro de validação do protótipo, desenhar a arquitetura alvo, decidir integrações por prioridade, estimar custos de IA com observabilidade e definir os pré-requisitos de um piloto controlado.`;

const backlog = [
  {
    name: "Wiki — VIVANCE: produto, escopo e repositório",
    notes: wikiNotes,
  },
  {
    name: "Fechamento do protótipo e roteiro de validação",
    notes: `## Por que existe
Transformar o protótipo navegável em uma ferramenta de validação de produto coerente, para descobrir se as jornadas realmente ajudam paciente e médico antes de investir em integrações ou dados reais.

## Objetivo
Definir uma versão demonstrável do cuidado longitudinal que deixe claras as ações prioritárias, os limites clínicos e a comunicação entre as duas jornadas.

## Entregáveis
- Roteiro de demonstração ponta a ponta: paciente → fonte original → rascunho assistido → revisão médica → publicação aprovada.
- Estados essenciais: acompanhamento preenchido, informações pendentes, check-in atrasado, orientação nova e conteúdo não publicado.
- Lista de cenários fictícios consistentes para paciente e médico, sem reutilização de dados entre pessoas.
- Guia curto de teste moderado com médico e pacientes: tarefa, pergunta, evidência esperada e decisão a tomar.
- Registro das decisões, dúvidas e itens que não devem avançar para o piloto.

## Limites
Não introduzir dados reais, prescrição digital, integração com prontuário, triagem automática ou recomendação clínica autônoma. Este trabalho valida experiência e entendimento, não eficácia clínica.

## Critério de conclusão
Uma pessoa consegue demonstrar os fluxos principais sem explicações paralelas; os estados e limites ficam compreensíveis; e existe uma lista priorizada de decisões de produto baseada nas sessões de validação.`,
  },
  {
    name: "Desenho da infraestrutura alvo",
    notes: `## Por que existe
O protótipo usa estado de sessão e dados fictícios. Antes de qualquer piloto real, precisamos de uma arquitetura que preserve contexto longitudinal sem tratar o produto como prontuário ou liberar dados sensíveis sem controles.

## Objetivo
Produzir uma arquitetura de referência para a próxima fase, com fronteiras claras entre experiência web, serviços de aplicação, dados, arquivos, IA, auditoria e integrações externas.

## Escopo do desenho
- Ambientes de desenvolvimento, homologação e produção.
- Identidade, autenticação e permissões por clínica, profissional, paciente e operação.
- Banco transacional, armazenamento de documentos/fotos, retenção e exclusão.
- Eventos, trilha de auditoria, versionamento e proveniência de fontes, rascunhos e aprovações.
- Camada de IA com revisão humana, limites de dados enviados e observabilidade.
- Notificações, filas, tratamento de falhas e continuidade do fluxo manual.
- Estratégia de backup, recuperação, monitoramento e resposta a incidentes.

## Decisões que a arquitetura deve responder
Quais dados são clínicos, operacionais ou analíticos? Quem pode ler, editar, aprovar e publicar? Como separar clínicas? Como registrar consentimento e revogação? Onde uma integração externa começa e termina?

## Fora de escopo
Não implementar a infraestrutura nesta tarefa nem escolher fornecedor sem comparar custo, maturidade, LGPD e operação.

## Critério de conclusão
Diagrama de contexto e fluxo de dados, matriz de acessos, riscos principais, decisões abertas e uma recomendação técnica faseada que possa ser revisada por produto, segurança, jurídico e médico responsável.`,
  },
  {
    name: "Mapeamento de integrações prioritárias",
    notes: `## Por que existe
O valor do VIVANCE depende de se conectar ao trabalho real da clínica, mas integrações precoces podem ampliar risco, custo e complexidade antes de comprovar valor.

## Objetivo
Criar uma matriz objetiva de integrações, definindo quais problemas cada uma resolve, qual dado movimenta, quem aprova o uso e em que fase ela deve entrar.

## Candidatas a avaliar
- Prontuário/agenda da clínica (incluindo Feegow como hipótese, não como integração assumida).
- Videoconsulta e agenda.
- Mensageria e notificações (e-mail, WhatsApp, SMS ou push).
- Documentos, receitas e pedidos de exame.
- Fotos, anexos e armazenamento seguro.
- Apple HealthKit, Health Connect e dispositivos vestíveis.
- Camada de evidências médicas (PubMed, Cochrane e Conitec).

## Critérios de priorização
Valor para paciente e médico; risco clínico e regulatório; consentimento e minimização de dados; maturidade da API; custo; esforço de manutenção; continuidade sem integração; e evidência de que a clínica realmente usará o fluxo.

## Entregáveis
- Matriz MVP / pós-piloto / não agora com justificativa.
- Fluxo de dados e responsabilidade para cada integração prioritária.
- Dependências, riscos e prova de conceito mínima quando fizer sentido.
- Decisão explícita sobre o que continua manual no piloto.

## Critério de conclusão
As integrações do próximo ciclo estão ordenadas por valor e risco, com nenhuma integração clínica tratada como pronta sem validação técnica, contratual, de privacidade e operacional.`,
  },
  {
    name: "Estimativa de custos de IA e observabilidade",
    notes: `## Por que existe
IA pode reduzir trabalho de organização, mas só é sustentável se o custo, a qualidade, as falhas e a revisão humana forem visíveis desde o início.

## Objetivo
Definir como medir e controlar o uso de IA no VIVANCE antes de um piloto, sem enviar dados reais enquanto a governança ainda não estiver pronta.

## Cenários a modelar
- Organização de check-ins e pré-consultas por texto.
- Transcrição de voz e resumo assistido.
- Apoio demonstrativo à leitura de fotos de refeições, sempre com limites explícitos.
- Preparação de consulta, relatórios e busca de evidências.

## Entregáveis
- Planilha de cenários de volume: piloto, clínica inicial e expansão, separando entrada, saída, áudio, imagem, armazenamento e tráfego.
- Orçamento por fluxo, teto de gasto, alertas e regra de interrupção segura.
- Métricas de qualidade: aceitação/edição/rejeição pelo médico, tempo poupado, falhas, latência e custo por ação concluída.
- Modelo de logs sem copiar conteúdo clínico desnecessário, com IDs de rastreio, versão do modelo e origem do rascunho.
- Política de revisão humana e de fallback manual quando a IA falhar ou não for autorizada.

## Limites
Não usar custo estimado como autorização para automatizar decisão clínica. A IA permanece assistiva; nenhum resultado vira orientação, prescrição, diagnóstico ou alteração de tratamento sem revisão humana.

## Critério de conclusão
Existem cenários de custo compreensíveis, limites operacionais e sinais observáveis de qualidade/falha que permitem decidir se cada uso de IA merece avançar para piloto.`,
  },
  {
    name: "Privacidade, LGPD e governança clínica",
    notes: `## Por que existe
O VIVANCE lida com informações de saúde, que são dados pessoais sensíveis. Privacidade e governança precisam ser parte do produto antes de dados reais, não uma correção posterior.

## Objetivo
Levantar os requisitos de LGPD, segurança e governança clínica que habilitam um piloto responsável, com fronteiras claras de responsabilidade e decisão.

## Frentes de trabalho
- Finalidade, base legal, consentimentos específicos e revogação.
- Minimização de dados, retenção, exclusão, exportação e direitos dos titulares.
- Papéis de controlador, operador e suboperadores; contratos e fornecedores.
- Autenticação, autorização por função, separação entre clínicas e auditoria de acessos.
- Criptografia, backups, incidentes, segurança de documentos/fotos e gestão de chaves.
- Política de uso de IA: quais dados podem ser enviados, para qual finalidade, com qual revisão e por quanto tempo.
- Governança clínica: autoria, versionamento, aprovação médica, publicação ao paciente e limites de uso.

## Entregáveis
- Mapa de dados e ciclo de vida.
- Lista de decisões, lacunas e responsáveis por validação (jurídico, privacidade, segurança e médico responsável).
- Requisitos mínimos de produto e arquitetura para piloto.
- Política inicial de comunicação de limites e de suporte ao paciente.

## Critério de conclusão
O time sabe o que não pode colocar em produção ainda, quais pré-requisitos são obrigatórios para dados reais e quais decisões exigem validação formal antes do piloto.`,
  },
  {
    name: "Plano de piloto e critérios de sucesso",
    notes: `## Por que existe
O piloto deve validar utilidade e operação em escala pequena, sem confundir aprendizado de produto com lançamento clínico ou expansão comercial.

## Objetivo
Desenhar um piloto controlado que teste as hipóteses mais importantes do VIVANCE com critérios de entrada, acompanhamento, interrupção e avanço claros.

## O que precisa ser decidido
- Público, quantidade de participantes, clínica responsável e duração.
- Quais fluxos entram no piloto e quais permanecem manuais.
- Treinamento de paciente, médico e operação.
- Suporte, tempos de resposta, escalonamento humano e como comunicar limites.
- Consentimentos, dados permitidos, acesso, auditoria e critérios de segurança.
- Métricas de valor: entendimento do paciente, adesão autorrelatada, redução de trabalho manual, qualidade da preparação da consulta e satisfação do médico.
- Critérios de parada e de avanço, incluindo falhas de segurança, qualidade ou operação.

## Entregáveis
- Termo de escopo do piloto e roteiro operacional.
- Checklist de pré-requisitos de privacidade, segurança e governança clínica.
- Plano de coleta de feedback e revisão semanal de evidências.
- Painel mínimo de métricas e decisão de continuidade.

## Limites
O piloto não autoriza monitoramento de urgência, decisão automática, prescrição autônoma, expansão para outras clínicas ou uso secundário dos dados sem nova aprovação.

## Critério de conclusão
Existe acordo explícito sobre quem participa, o que é medido, quem responde por cada situação e quais evidências permitem seguir, pausar ou redesenhar o produto.`,
  },
];

function usage() {
  console.log("Use: npm run asana:authorize | npm run asana:complete | npm run asana:status | npm run asana:backlog");
}

async function keychainGet(service) {
  try {
    const { stdout } = await execFileAsync("security", [
      "find-generic-password",
      "-a",
      ACCOUNT,
      "-s",
      service,
      "-w",
    ]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function keychainSet(service, value) {
  await execFileAsync("security", [
    "add-generic-password",
    "-U",
    "-a",
    ACCOUNT,
    "-s",
    service,
    "-w",
    value,
  ]);
}

async function keychainDelete(service) {
  try {
    await execFileAsync("security", [
      "delete-generic-password",
      "-a",
      ACCOUNT,
      "-s",
      service,
    ]);
  } catch {
    // A missing key is already the desired state.
  }
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function createChallenge(verifier) {
  return createHash("sha256").update(verifier).digest("base64url");
}

function authorizationUrl({ state, verifier }) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    state,
    code_challenge: createChallenge(verifier),
    code_challenge_method: "S256",
  });
  // Asana rejects explicit granular scopes when the app is configured for full permissions.
  if (!FULL_PERMISSIONS) params.set("scope", SCOPES.join(" "));
  return `https://app.asana.com/-/oauth_authorize?${params}`;
}

async function authorize() {
  if (!(await keychainGet(CLIENT_SECRET_SERVICE))) {
    throw new Error("O segredo do cliente não está disponível no Chaves do macOS.");
  }

  const pending = {
    state: base64Url(randomBytes(24)),
    verifier: base64Url(randomBytes(48)),
    createdAt: new Date().toISOString(),
  };
  await keychainSet(PENDING_AUTH_SERVICE, JSON.stringify(pending));
  console.log(authorizationUrl(pending));
}

async function clipboardText() {
  const { stdout } = await execFileAsync("pbpaste");
  return stdout.trim();
}

async function complete() {
  const pendingRaw = await keychainGet(PENDING_AUTH_SERVICE);
  if (!pendingRaw) {
    throw new Error("Nenhuma autorização pendente. Execute npm run asana:authorize primeiro.");
  }
  const pending = JSON.parse(pendingRaw);
  const code = process.env.ASANA_AUTHORIZATION_CODE?.trim() || (await clipboardText());
  if (!code) {
    throw new Error("Copie o código de autorização da Asana e execute este comando novamente.");
  }

  const clientSecret = await keychainGet(CLIENT_SECRET_SERVICE);
  const response = await fetch("https://app.asana.com/-/oauth_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: pending.verifier,
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.refresh_token) {
    throw new Error(`A autorização não foi concluída: ${payload.error ?? response.status}`);
  }

  await keychainSet(REFRESH_TOKEN_SERVICE, payload.refresh_token);
  await keychainDelete(PENDING_AUTH_SERVICE);
  console.log("Integração Asana conectada. O token de renovação está guardado no Chaves do macOS.");
}

async function accessToken() {
  const personalAccessToken = await keychainGet(PERSONAL_ACCESS_TOKEN_SERVICE);
  if (personalAccessToken) return personalAccessToken;

  const refreshToken = await keychainGet(REFRESH_TOKEN_SERVICE);
  const clientSecret = await keychainGet(CLIENT_SECRET_SERVICE);
  if (!refreshToken || !clientSecret) {
    throw new Error("A integração ainda não foi autorizada. Guarde um PAT no Chaves do macOS ou execute npm run asana:authorize e depois npm run asana:complete.");
  }

  const response = await fetch("https://app.asana.com/-/oauth_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: clientSecret,
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(`Não foi possível renovar o acesso: ${payload.error ?? response.status}`);
  }
  if (payload.refresh_token) {
    await keychainSet(REFRESH_TOKEN_SERVICE, payload.refresh_token);
  }
  return payload.access_token;
}

async function asana(path, options = {}) {
  const token = await accessToken();
  const response = await fetch(`${ASANA_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.errors?.map((item) => item.message).join("; ") ?? `Asana respondeu ${response.status}`);
  }
  return payload.data;
}

async function seedBacklog() {
  const project = await asana(`/projects/${PROJECT_GID}?opt_fields=name`);
  const sections = await asana(`/projects/${PROJECT_GID}/sections?opt_fields=name`);
  const backlogSection = sections.find((section) => section.name === "Backlog");
  if (!backlogSection) {
    throw new Error(`A seção Backlog não foi encontrada no projeto ${project.name}.`);
  }

  const existing = await asana(`/projects/${PROJECT_GID}/tasks?opt_fields=name,notes&limit=100`);
  const existingByName = new Map(existing.map((task) => [task.name, task]));
  let createdCount = 0;
  let updatedCount = 0;

  for (const task of backlog) {
    const current = existingByName.get(task.name);
    if (current) {
      if (current.notes !== task.notes) {
        await asana(`/tasks/${current.gid}`, {
          method: "PUT",
          body: JSON.stringify({ data: { notes: task.notes } }),
        });
        updatedCount += 1;
      }
      continue;
    }

    const created = await asana("/tasks", {
      method: "POST",
      body: JSON.stringify({ data: { ...task, projects: [PROJECT_GID] } }),
    });
    await asana(`/sections/${backlogSection.gid}/addTask`, {
      method: "POST",
      body: JSON.stringify({ data: { task: created.gid } }),
    });
    createdCount += 1;
  }

  if (!createdCount && !updatedCount) {
    console.log("O Backlog já está atualizado.");
    return;
  }
  console.log(`Backlog sincronizado em ${project.name}: ${createdCount} criadas, ${updatedCount} atualizadas.`);
}

async function status() {
  const [personalAccessToken, clientSecret, refreshToken] = await Promise.all([
    keychainGet(PERSONAL_ACCESS_TOKEN_SERVICE),
    keychainGet(CLIENT_SECRET_SERVICE),
    keychainGet(REFRESH_TOKEN_SERVICE),
  ]);
  if (personalAccessToken) {
    console.log("Integração conectada por token pessoal guardado no Chaves do macOS.");
    return;
  }
  if (!clientSecret) {
    throw new Error("Nenhum token pessoal ou segredo OAuth está guardado no Chaves do macOS.");
  }
  console.log(refreshToken ? "Integração conectada e pronta para renovar o acesso." : "Aplicativo configurado; falta concluir a autorização OAuth.");
}

const command = process.argv[2];
try {
  if (command === "authorize") await authorize();
  else if (command === "complete") await complete();
  else if (command === "seed-backlog") await seedBacklog();
  else if (command === "status") await status();
  else usage();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
