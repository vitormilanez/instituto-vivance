// Contratos da Home (/clinicas/[tenantId]) — direção A, o dia como eixo. Cada
// asserção liga uma regra de CSS ao elemento que a tela realmente renderiza, e
// guarda as regras duras: nada de cor de prioridade, alvo de 44px, contraste
// AA por token e nenhuma query de recebidos para quem não tem vínculo ativo.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const css = () => read("../app/globals.css");
const block = () => read("../components/consultation-block.tsx");
const day = () => read("../components/home-day.tsx");
const received = () => read("../components/received-since.tsx");
const homeRules = () => {
  const styles = css();
  return styles.slice(styles.indexOf("/* Home do médico — direção A"));
};

test("hierarquia: o dia é h1, a pessoa é h2, e o contexto usa abas com títulos", () => {
  assert.match(day(), /<h1>\{dayHeading\(data\.today\)\}<\/h1>/);
  assert.match(block(), /<h2 id=\{titleId\}>\{name\}<\/h2>/);
  assert.match(block(), /<ConsultationContextTabs/);
  assert.match(block(), /<h3>Cadastro inicial<\/h3>/);
  assert.match(block(), /currentAnswers \? "Pré-consulta desta consulta" : "Pré-consulta anterior"/);
  assert.match(received(), /<h3 id=\{headingId\}>Recebido desde a última consulta<\/h3>/);
  assert.match(css(), /\.home-received > h3,\s*\.home-context > h3 \{/);
});

test("o que chegou divide o mesmo contexto tabulado, sem seção duplicada", () => {
  const source = block();
  assert.match(source, /received=\{received \? <ReceivedSince/);
  assert.doesNotMatch(source, /doctor-consultation-received/);
  assert.doesNotMatch(source, /Contexto para esta consulta/);
});

test("o texto secundário usa o token AA, nunca o cinza antigo", () => {
  const rules = homeRules();
  assert.match(rules, /\.home-row-who span \{[^}]*color: var\(--context-muted\)/);
  assert.match(rules, /\.home-received-list time \{[^}]*color: var\(--context-muted\)/);
  assert.doesNotMatch(rules, /#60708a/);
  assert.match(css(), /--context-muted: #4c5d78;/);
});

test("todo alvo da Home tem 44px", () => {
  const rules = homeRules();
  for (const selector of [
    "\\.home-agenda-link",
    "\\.home-back",
    "\\.home-received-list a",
    "\\.home-received-more > summary",
    "\\.home-plain-list a",
    "\\.home-between-who a",
    "\\.home-draft a",
  ])
    assert.match(
      rules,
      new RegExp(`${selector} \\{[^}]*min-height: 44px;`),
      selector,
    );
  assert.match(rules, /\.home-row-link \{[^}]*min-height: 56px;/);
});

test("nenhuma cor ou palavra de prioridade na Home", () => {
  const sources = [block(), day(), received(), read("../modules/workspace/home-view.ts")].join("\n");
  assert.doesNotMatch(sources, /urgente|crítico|atenção|prioridade alta/i);
  assert.doesNotMatch(homeRules(), /--attention|#c0392b|#d93025|red\b/);
});

test("sem vínculo ativo não há contexto, nem recebidos, nem query de recebidos", () => {
  const service = read("../modules/workspace/today.ts");
  // Só pacientes com vínculo ativo entram no corte e, portanto, nas queries.
  assert.match(service, /\.filter\(\(link\) => link\.status === "active"\)/);
  assert.match(service, /receivedCutoffs\(id, activeIds\)/);
  assert.match(day(), /context=\{link\.status === "active" \? contextFor\(appointment\.id\) : null\}/);
  assert.match(block(), /\{linkCopy \? \(/);
});

test("cada bloco usa o contexto do próprio paciente, nunca o de outra linha", () => {
  const service = read("../modules/workspace/today.ts");
  assert.match(service, /\[item\.id, await patientCareContext\(id, item\.patient_id, \{\s*id: item\.id,\s*starts_at: item\.starts_at,\s*\}\)\] as const/);
  assert.match(day(), /const contextFor = \(appointmentId: string\) =>\s*data\.contexts\.get\(appointmentId\) \?\? null;/);
  assert.doesNotMatch(day(), /data\.context\b/);
});

test("falha de um tipo não derruba a Home nem vira número", () => {
  const service = read("../modules/workspace/received.ts");
  assert.match(service, /if \(result\.error\) \{\s*failed\.push\(kind\);\s*return;\s*\}/);
  assert.doesNotMatch(
    service.slice(service.indexOf("export async function receivedForPatients")),
    /throw new Error\("Unable to load received items"\)/,
  );
  const today = read("../modules/workspace/today.ts");
  assert.match(today, /failed: \[\.\.\.allReceivedKinds\]/);
});

test("toda query nova filtra clínica e profissional, além da RLS", () => {
  const service = read("../modules/workspace/received.ts");
  const links = service.slice(service.indexOf("export async function myCareLinks"));
  assert.match(links, /\.eq\("tenant_id", tenant\)/);
  assert.match(links, /\.eq\("professional_id", user\.id\)/);
  assert.match(links, /\.in\("status", \["active", "assigned"\]\)/);
});

test("aceitar o vínculo usa a confirmação explícita e não abre atendimento", () => {
  const accept = read("../components/care-link-accept.tsx");
  assert.match(accept, /Confirmo que sou responsável pelo cuidado de/);
  assert.match(accept, /disabled=\{busy \|\| !accepted\}/);
  assert.match(accept, /team\/relationships\/\$\{relationshipId\}/);
  assert.match(accept, /action: "accept"/);
  assert.doesNotMatch(accept, /encounters/);
});

test("consulta agendada que já terminou não oferece 'Preparar atendimento'", () => {
  const source = block();
  assert.match(source, /appointment\.status === "scheduled" &&\s*Date\.parse\(appointment\.ends_at\) > Date\.parse\(now\)/);
  assert.match(source, /Ver na agenda/);
});

test("o topo da próxima consulta mostra evolução e separa a resposta atual da anterior", () => {
  const source = block();
  const service = read("../modules/workspace/today.ts");
  assert.match(source, /<h3>Evolução registrada<\/h3>/);
  assert.match(source, /<ConsultationContextTabs/);
  assert.match(source, /\{contextTabs\}\s*\{otherContext\}/);
  assert.match(source, /currentAnswers \? "Pré-consulta desta consulta" : "Pré-consulta anterior"/);
  assert.match(source, /<h3>Cadastro inicial<\/h3>/);
  assert.match(source, /Aguardando resposta para esta consulta\./);
  assert.match(source, /Enviada em \{submittedDate\} pelo paciente/);
  assert.match(service, /select\("id,finalized_at,evolution"\)/);
  assert.match(service, /select\("request_id,answers"\)/);
  assert.match(service, /answers: answersFor\(previousPreparationRow\.id\)/);
  assert.match(source, /const shown = currentAnswers \?\? previousAnswers/);
  assert.match(read("../app/doctor-home.css"), /\.doctor-consultation-glance \{ display: grid;/);
});

test("a faixa fixa só existe no celular e não rouba o foco", () => {
  const rules = homeRules();
  assert.match(rules, /\.home-sticky \{ display: none; \}/);
  const sticky = read("../components/sticky-consultation.tsx");
  assert.match(sticky, /tabIndex=\{visible \? undefined : -1\}/);
  assert.match(sticky, /aria-hidden=\{visible \? undefined : true\}/);
});

test("a Home reserva espaço para o dock no breakpoint estreito", () => {
  const styles = css();
  // O item de auditoria sobre sobreposição a 320px segue pendente de medição
  // real: por aritmética de CSS o dock ocupa ~70px e a reserva é de 110px mais
  // a área segura. O contrato que este teste guarda é o da reserva existir.
  assert.match(
    styles,
    /\.workspace-main \{\s*padding-bottom: calc\(110px \+ env\(safe-area-inset-bottom\)\);/,
  );
});

test("abrir um item novo avisa o servidor sem segurar a navegação", () => {
  const link = read("../components/received-link.tsx");
  assert.match(link, /if \(!unseen\) return;/);
  assert.match(link, /keepalive: true/);
  assert.match(link, /received\/read/);
  assert.doesNotMatch(link, /preventDefault/);
  const route = read("../app/api/v1/clinics/[tenantId]/received/read/route.ts");
  assert.match(route, /if \(!sameOrigin\(request\)\)/);
  const service = read("../modules/workspace/received.ts");
  assert.match(service, /\.from\("patient_item_reads"\)[\s\S]*?\.eq\("user_id", user\.id\)/);
  assert.match(service, /row\.seen = seen \? seen\.has\(`\$\{row\.kind\}:\$\{row\.id\}`\) : null;/);
  assert.match(service, /client\.rpc\("mark_patient_item_read"/);
  // O ponto é navy (estrutura), não cor de alerta.
  assert.match(css(), /\.home-unseen-dot \{[^}]*background: var\(--navy\);/);
});
