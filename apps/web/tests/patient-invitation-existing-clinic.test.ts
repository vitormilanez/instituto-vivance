import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

type Element = { type: unknown; props: Record<string, unknown> };

function renderInvitation(activePatientTenantIds: string[], reviewing?: string) {
  const source = readFileSync(new URL("../components/patient-invitations.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  let stateIndex = 0;
  const jsx = (type: unknown, props: Record<string, unknown>) => ({ type, props });
  const Link = () => null;
  const sandboxModule = { exports: {} as { PatientInvitations?: (props: unknown) => Element } };
  const dependencies: Record<string, unknown> = {
    "next/link": { default: Link },
    "next/navigation": { useRouter: () => ({ push: () => {}, refresh: () => {} }) },
    react: { useState: (initial: unknown) => [stateIndex++ === 0 ? reviewing : initial, () => {}] },
    "react/jsx-runtime": { jsx, jsxs: jsx },
  };
  runInNewContext(code, {
    module: sandboxModule,
    exports: sandboxModule.exports,
    require: (name: string) => dependencies[name],
  });
  assert.ok(sandboxModule.exports.PatientInvitations);
  const invitation = {
    id: "invitation-1",
    tenantId: "clinic-1",
    clinicName: "Vivance",
    displayName: "Paciente Teste",
    status: "pending",
    expiresAt: "2026-10-17T00:00:00Z",
    createdAt: "2026-10-10T00:00:00Z",
  };
  const tree = sandboxModule.exports.PatientInvitations({ invitations: [invitation], activePatientTenantIds });
  const nodes: Element[] = [];
  function visit(value: unknown) {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object" || !("props" in value)) return;
    const element = value as Element;
    nodes.push(element);
    visit(element.props.children);
  }
  visit(tree);
  return { nodes, Link };
}

test("an active patient in this clinic sees their existing care without an accept action", () => {
  const { nodes, Link } = renderInvitation(["clinic-1"], "invitation-1");
  assert.ok(nodes.some((node) => node.type === Link && node.props.href === "/clinicas/clinic-1/meu-cuidado/hoje"));
  assert.ok(nodes.some((node) => node.props.children === "Você já faz parte desta clínica como paciente."));
  assert.ok(!nodes.some((node) => node.type === "button"));
});

test("an invitation from another clinic still allows explicit acceptance", () => {
  const { nodes, Link } = renderInvitation(["another-clinic"], "invitation-1");
  assert.ok(nodes.some((node) => node.type === "button" && node.props.children === "Aceitar convite"));
  assert.ok(!nodes.some((node) => node.type === Link));
});
