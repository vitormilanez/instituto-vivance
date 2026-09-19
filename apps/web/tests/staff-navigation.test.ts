import assert from "node:assert/strict";
import test from "node:test";
import {
  staffActions,
  staffDockGroups,
  staffModules,
  staffPrimaryKeys,
  staffSecondaryGroups,
  staffShortcuts,
} from "../modules/workspace/navigation.ts";

const base = "/clinicas/clinica-1";

const secondaryKeys: string[] = staffSecondaryGroups.flatMap((group) => [
  ...group.keys,
]);
const dockKeys: string[] = staffDockGroups.flatMap((group) => [...group.keys]);

test("o destaque carrega o trabalho do dia, incluindo a conversa com o paciente", () => {
  assert.deepEqual(
    [...staffPrimaryKeys],
    ["home", "agenda", "patients", "mensagens"],
  );
});

test("nenhuma área aparece ao mesmo tempo em destaque e dentro de Mais", () => {
  for (const key of staffPrimaryKeys as readonly string[])
    assert.ok(
      !secondaryKeys.includes(key),
      `${key} está duplicado entre o destaque e os grupos`,
    );
  // E nenhum grupo repete uma área de outro grupo.
  assert.equal(new Set(secondaryKeys).size, secondaryKeys.length);
});

test("todo módulo da equipe continua alcançável pelo menu", () => {
  const reachable = new Set<string>([...staffPrimaryKeys, ...secondaryKeys]);
  for (const item of staffModules)
    assert.ok(reachable.has(item.slug), `${item.slug} ficou sem entrada no menu`);
});

test("avisos fica no cabeçalho no desktop e dentro de Mais no celular", () => {
  assert.ok(!secondaryKeys.includes("notifications"));
  assert.ok(!([...staffPrimaryKeys] as string[]).includes("notifications"));
  assert.ok(dockKeys.includes("notifications"));
});

test("a barra do celular mostra as mesmas famílias da sidebar", () => {
  assert.deepEqual(
    staffDockGroups.map((group) => group.label),
    staffSecondaryGroups.map((group) => group.label),
  );
  for (const key of secondaryKeys) assert.ok(dockKeys.includes(key));
});

test("acompanhamento abre o grupo Cuidado, fora do destaque", () => {
  const cuidado = staffSecondaryGroups.find(
    (group) => group.label === "Cuidado",
  );
  assert.equal(cuidado?.keys[0], "acompanhamento");
});

test("os atalhos do Hoje não repetem o que o menu já destaca", () => {
  const hrefs = staffShortcuts(base).map((action) => action.href);
  for (const href of [`${base}/pacientes`, `${base}/agenda`, `${base}/mensagens`])
    assert.ok(!hrefs.includes(href), `${href} repete o destaque do menu`);
  // O cadastro de um novo paciente continua a um toque, mesmo com
  // "Pacientes" fora da lista.
  assert.ok(hrefs.includes(`${base}/pacientes#novo-paciente`));
});

test("a visão do admin mantém as oito portas de entrada", () => {
  const actions = staffActions(base);
  assert.equal(actions.length, 8);
  assert.ok(actions.every((action) => action.href.startsWith(base)));
  assert.ok(actions.some((action) => action.title === "Equipe de cuidado"));
  assert.ok(actions.some((action) => action.title === "Acompanhamento"));
});

test("todo atalho tem ícone e texto de apoio", () => {
  for (const action of staffActions(base)) {
    assert.ok(action.icon.length > 0, `${action.title} sem ícone`);
    assert.ok(action.text.endsWith("."), `${action.title} sem texto de apoio`);
  }
});
