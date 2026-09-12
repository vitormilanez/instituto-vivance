import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(
  new URL("../components/messages-workspace.tsx", import.meta.url),
  "utf8",
);

test("conversation keeps a draft through a send failure and guards navigation", () => {
  assert.match(workspace, /const \[draft, setDraft\] = useState\(""\)/);
  assert.match(workspace, /value=\{draft\}/);
  assert.match(workspace, /Seu texto foi mantido; tente enviar novamente/);
  assert.match(workspace, /beforeunload/);
  assert.match(workspace, /Você tem uma mensagem não enviada/);
  assert.match(workspace, /onClick=\{confirmDraftNavigation\}/);
});

test("conversation makes the recipient, sender and return path explicit", () => {
  assert.match(workspace, /Voltar à ficha de/);
  assert.match(workspace, /Voltar ao meu cuidado/);
  assert.match(workspace, /Destinatário:/);
  assert.match(workspace, /Remetente:/);
});
