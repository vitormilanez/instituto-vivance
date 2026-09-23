// Correções do relatório de UX de 22/09/2026 que não mudam fluxo.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { invitationDeliveryLabel } from "../modules/onboarding/invitation-delivery.ts";
import { navLabel, patientSections, staffModules } from "../modules/workspace/navigation.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("convite: cada canal diz a própria entrega, e a falha do e-mail não invalida o link", () => {
  const whatsapp = (deliveryStatus: string) =>
    invitationDeliveryLabel({ channel: "whatsapp", status: "pending", deliveryStatus });
  assert.equal(whatsapp("not_applicable"), "Link de WhatsApp ativo, ainda não aberto");
  assert.equal(
    whatsapp("failed"),
    "Link de WhatsApp ativo · o e-mail de criação de conta não foi enviado",
  );
  assert.match(whatsapp("requested") ?? "", /e-mail de criação de conta enviado/);
  assert.equal(
    invitationDeliveryLabel({ channel: "email", status: "pending", deliveryStatus: "failed" }),
    "O e-mail de convite não foi enviado",
  );
  // Convite que já não está pendente não fala de entrega.
  assert.equal(
    invitationDeliveryLabel({ channel: "whatsapp", status: "expired", deliveryStatus: "failed" }),
    null,
  );
  assert.doesNotMatch(read("../components/patient-invitation-list.tsx"), /Falha no envio do e-mail/);
});

test("áreas sem conteúdo dizem 'em breve' no menu e continuam alcançáveis", () => {
  const ia = staffModules.find((item) => item.slug === "ia")!;
  assert.equal(navLabel(ia), "Central da IA · em breve");
  const treatment = patientSections.find((item) => item.slug === "medicamentos")!;
  assert.equal(navLabel(treatment), "Tratamento · em breve");
  assert.equal(navLabel(staffModules.find((item) => item.slug === "agenda")!), "Agenda");
  assert.match(read("../components/clinic-shell.tsx"), /label: navLabel\(module\)/);
  assert.match(read("../components/patient-shell.tsx"), /\{navLabel\(sub\)\}/);
});

test("meu perfil não promete o que já existe", () => {
  const page = read("../app/clinicas/[tenantId]/meu-perfil/page.tsx");
  assert.doesNotMatch(page, /Mensagens\s+serão disponibilizadas/);
  assert.match(page, /use Conversas/);
});

test("a etapa do acolhimento não é dita só por cor", () => {
  const workspace = read("../components/onboarding-workspace.tsx");
  assert.match(workspace, /aria-current=\{index === progress - 1 \? "step" : undefined\}/);
  assert.match(workspace, /\(concluída\)/);
});

test("agenda no celular: alvos de 44px", () => {
  const css = read("../app/globals.css");
  const mobile = css.slice(css.indexOf("Agenda no celular: o calendário"));
  const block = mobile.slice(0, mobile.indexOf("\n}\n"));
  assert.doesNotMatch(block, /min-height: (36|40|42)px/);
  assert.match(block, /\.calendar-toolbar button \{ width: 44px; min-height: 44px;/);
  assert.match(block, /button\.calendar-day \{\s*height: 44px;\s*min-height: 44px;/);
});

test("o alerta de envio incerto anuncia só o texto, não os botões", () => {
  const messages = read("../components/messages-workspace.tsx");
  assert.doesNotMatch(messages, /className="conversation-recovery" role="alert"/);
  assert.match(messages, /<p role="alert">Não foi possível confirmar o envio\./);
});

test("documentos: filtro por paciente sem JS, e a paginação mantém o filtro", () => {
  const workspace = read("../components/documents-workspace.tsx");
  assert.match(workspace, /<form className="document-filter" method="get" action=\{base\}>/);
  assert.match(workspace, /name="paciente"/);
  assert.match(workspace, /pagina=\$\{initial\.page \+ 1\}\$\{filter\}/);
  const page = read("../app/clinicas/[tenantId]/[module]/page.tsx");
  // Paciente inválido ou sem vínculo volta para a lista completa, sem erro.
  assert.match(page, /error instanceof DocumentError \|\| error instanceof InputError/);
});
