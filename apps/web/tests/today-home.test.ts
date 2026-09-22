// Contratos da Home (/clinicas/[tenantId]) que a auditoria de 22/09/2026
// aprovou corrigir. Cada asserção liga uma regra de CSS ao elemento que a tela
// realmente renderiza — o defeito original era justamente uma regra presa a um
// título que não existia mais.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const css = () =>
  readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const home = () =>
  readFileSync(
    new URL("../components/today-workspace.tsx", import.meta.url),
    "utf8",
  );

test("o título do bloco de contexto é o <h2> que a tela renderiza", () => {
  const component = home();
  const styles = css();
  // A tela promoveu o título a <h2> (par operacional do "Próxima consulta");
  // a regra precisa acompanhar, senão o bloco perde a própria hierarquia.
  assert.match(component, /<h2>Contexto para esta consulta<\/h2>/);
  assert.match(
    styles,
    /\.today-context > h2 \{ margin:0; font-size:15px; letter-spacing:-\.01em; color:#405c7e; \}/,
  );
  assert.doesNotMatch(styles, /\.today-context > h3/);
});

test("o texto secundário da linha do tempo passa em AA sobre a superfície suave", () => {
  const styles = css();
  // #60708a dava 4.45:1 sobre o --blue-soft da linha em destaque; o token dá
  // 5.98:1 ali e 6.68:1 sobre o branco.
  assert.match(
    styles,
    /\.today-timeline p \{ margin:2px 0 0; font-size:13px; color:var\(--context-muted\); \}/,
  );
  assert.doesNotMatch(styles, /\.today-timeline p \{[^}]*#60708a/);
  assert.match(styles, /--context-muted: #4c5d78;/);
});

test("os links do painel de pendências têm alvo de 44px", () => {
  const styles = css();
  const rule = styles.match(
    /\.today-attention li a,\s*\.today-attention-more \{([^}]*)\}/,
  );
  assert.ok(rule, "regra compartilhada dos links de pendências ausente");
  assert.match(rule[1], /display: inline-flex;/);
  assert.match(rule[1], /align-items: center;/);
  assert.match(rule[1], /min-height: 44px;/);
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
