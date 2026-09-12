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
  assert.match(workspace, /Seu texto foi mantido/);
  assert.match(workspace, /beforeunload/);
  assert.match(workspace, /Você tem uma mensagem não enviada/);
  assert.match(workspace, /document\.addEventListener\("click"/);
  assert.match(workspace, /setDraft\(""\)/);
  assert.match(workspace, /sendUncertain/);
  assert.match(workspace, /Atualize a conversa e confira o histórico/);
  assert.match(workspace, /Confira o histórico antes de tentar novamente/);
  assert.match(workspace, /Tentar novamente/);
  assert.match(workspace, /Mensagem confirmada no histórico/);
  assert.match(workspace, /previousSelectedKey/);
  assert.match(workspace, /crypto\.randomUUID/);
  assert.match(workspace, /"Idempotency-Key": requestKey\.current/);
  assert.match(workspace, /messages\/read/);
  assert.match(workspace, /conversation-unread/);
});

test("conversation makes the recipient, sender and return path explicit", () => {
  assert.match(workspace, /Voltar à ficha de/);
  assert.match(workspace, /Voltar ao meu cuidado/);
  assert.match(workspace, /Destinatário:/);
  assert.match(workspace, /Remetente:/);
});
