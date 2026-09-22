import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  examByteLimit,
  examFileLabel,
  examFileProblem,
  examFileSize,
  examSelectionConsented,
  examSelectionLimit,
  examSelectionPhrase,
  examSelectionReady,
  examSelectionReducer,
  examSentPhrase,
  examStateLabel,
  initialExamSelection,
  maxExamBytes,
  maxExamFiles,
  type ExamSelectionState,
} from "../modules/onboarding/exam-selection.ts";

function exam(
  name: string,
  type = "application/pdf",
  size = 3,
  lastModified = 1,
) {
  return new File([new Uint8Array(size)], name, { type, lastModified });
}

const add = (state: ExamSelectionState, files: File[]) =>
  examSelectionReducer(state, { type: "add", files });

const names = (state: ExamSelectionState) =>
  state.items.map((item) => item.file.name);

test("cada arquivo é validado sozinho, com o motivo dele", () => {
  assert.equal(examFileProblem(exam("exame.pdf")), null);
  assert.equal(examFileProblem(exam("foto.jpg", "image/jpeg")), null);
  assert.equal(examFileProblem(exam("print.png", "image/png")), null);
  assert.equal(
    examFileProblem(exam("notas.txt", "text/plain")),
    "Formato não aceito. Envie PDF, JPG ou PNG.",
  );
  assert.equal(examFileProblem(exam("vazio.pdf", "application/pdf", 0)), "O arquivo está vazio.");
  assert.equal(
    examFileProblem(exam("grande.pdf", "application/pdf", maxExamBytes + 1)),
    `Cada arquivo deve ter até ${examByteLimit()}.`,
  );
});

test("um arquivo recusado não derruba os outros escolhidos", () => {
  const state = add(initialExamSelection(), [
    exam("primeiro.pdf"),
    exam("notas.txt", "text/plain"),
    exam("segundo.jpg", "image/jpeg", 4, 2),
  ]);
  assert.deepEqual(names(state), ["primeiro.pdf", "segundo.jpg"]);
  assert.deepEqual(state.rejected, [
    { name: "notas.txt", reason: "Formato não aceito. Envie PDF, JPG ou PNG." },
  ]);
});

test("seleciona vários exames, mantém os que já estavam e remove um sem perder os demais", () => {
  const first = add(initialExamSelection(), [exam("a.pdf"), exam("b.pdf", "application/pdf", 3, 2)]);
  const second = add(first, [exam("c.png", "image/png", 3, 3)]);
  assert.deepEqual(names(second), ["a.pdf", "b.pdf", "c.png"]);
  assert.equal(second.version, 2, "adicionar muda a versão da lista");

  const removed = examSelectionReducer(second, {
    type: "remove",
    key: second.items[1].key,
  });
  assert.deepEqual(names(removed), ["a.pdf", "c.png"]);
  assert.equal(removed.version, 3);
});

test("um arquivo que falhou é reenviado sozinho, sem repetir os que deram certo", () => {
  const selected = add(initialExamSelection(), [
    exam("a.pdf"),
    exam("b.pdf", "application/pdf", 3, 2),
    exam("c.pdf", "application/pdf", 3, 3),
  ]);
  const sending = examSelectionReducer(selected, {
    type: "sending",
    key: selected.items[1].key,
  });
  const failed = examSelectionReducer(sending, {
    type: "failed",
    key: selected.items[1].key,
    error: "O arquivo não foi recebido. Tente reenviar este arquivo.",
  });
  assert.equal(failed.items[1].state, "failed");
  assert.equal(examSelectionPhrase(failed), "1 arquivo precisa ser reenviado");
  // O envio em lote ignora o que falhou: só o reenvio daquele arquivo o inclui.
  assert.deepEqual(
    examSelectionReady(failed).map((item) => item.file.name),
    ["a.pdf", "c.pdf"],
  );
  assert.equal(failed.items[1].error, "O arquivo não foi recebido. Tente reenviar este arquivo.");

  const retried = examSelectionReducer(failed, {
    type: "retry",
    key: selected.items[1].key,
  });
  assert.equal(retried.items[1].state, "ready");
  assert.equal(retried.items[1].error, null);
  assert.equal(examSelectionPhrase(retried), "3 exames selecionados");
});

test("reenviar um arquivo já recebido não sobe os mesmos bytes outra vez", () => {
  const selected = add(initialExamSelection(), [exam("a.pdf")]);
  const key = selected.items[0].key;
  const sending = examSelectionReducer(selected, { type: "sending", key });
  const uploaded = examSelectionReducer(sending, {
    type: "uploaded",
    key,
    documentId: "documento-1",
  });
  const unlinked = examSelectionReducer(uploaded, {
    type: "failed",
    key,
    error:
      "O arquivo foi recebido, mas falta salvar sua associação ao cadastro. Tente novamente para concluir.",
  });
  // O id recebido sobrevive à falha: o reenvio conclui a associação em vez de
  // criar um segundo documento.
  assert.equal(unlinked.items[0].documentId, "documento-1");
  const retried = examSelectionReducer(unlinked, { type: "retry", key });
  assert.equal(retried.items[0].documentId, "documento-1");
  const sent = examSelectionReducer(retried, { type: "sent", key });
  assert.equal(sent.items[0].state, "sent");
  assert.deepEqual(sent.sent, ["documento-1"]);
});

test("um arquivo enviado não sai da lista nem por remoção", () => {
  const selected = add(initialExamSelection(), [exam("a.pdf"), exam("b.pdf", "application/pdf", 3, 2)]);
  const key = selected.items[0].key;
  const sent = examSelectionReducer(
    examSelectionReducer(
      examSelectionReducer(selected, { type: "sending", key }),
      { type: "uploaded", key, documentId: "documento-1" },
    ),
    { type: "sent", key },
  );
  const afterRemove = examSelectionReducer(sent, { type: "remove", key });
  assert.deepEqual(names(afterRemove), ["a.pdf", "b.pdf"]);
});

test("aceita até 50 arquivos por etapa e recusa o excedente com o motivo", () => {
  const fifty = Array.from({ length: maxExamFiles }, (_, index) =>
    exam(`exame-${index}.pdf`, "application/pdf", 3, index + 1),
  );
  const full = add(initialExamSelection(), fifty);
  assert.equal(full.items.length, maxExamFiles);
  assert.equal(examSelectionLimit(full), 0);

  const overflow = add(full, [exam("excedente.pdf", "application/pdf", 3, 99)]);
  assert.equal(overflow.items.length, maxExamFiles);
  assert.deepEqual(overflow.rejected, [
    { name: "excedente.pdf", reason: `Limite de ${maxExamFiles} exames nesta etapa.` },
  ]);
});

test("o limite desconta o que o rascunho já enviou", () => {
  const saved = initialExamSelection(["a", "b", "c"]);
  assert.equal(examSelectionLimit(saved), maxExamFiles - 3);
  const withSelection = add(saved, [exam("novo.pdf")]);
  assert.equal(examSelectionLimit(withSelection), maxExamFiles - 4);
  assert.equal(examSelectionPhrase(withSelection), "1 exame selecionado");
});

test("o consentimento vale para a lista selecionada e cai quando ela muda", () => {
  const selected = add(initialExamSelection(), [exam("a.pdf"), exam("b.pdf", "application/pdf", 3, 2)]);
  const consented = examSelectionReducer(selected, { type: "consent", consented: true });
  assert.equal(examSelectionConsented(consented), true);
  assert.equal(
    examSelectionConsented(examSelectionReducer(consented, { type: "consent", consented: false })),
    false,
  );
  // Adicionar ou remover exige nova confirmação.
  const added = add(consented, [exam("c.pdf", "application/pdf", 3, 3)]);
  assert.equal(examSelectionConsented(added), false);
  assert.equal(
    examSelectionConsented(
      examSelectionReducer(consented, { type: "remove", key: selected.items[0].key }),
    ),
    false,
  );
  // Reenviar o mesmo arquivo não é adicionar nem remover.
  const failed = examSelectionReducer(consented, {
    type: "sending",
    key: selected.items[0].key,
  });
  const withFailure = examSelectionReducer(failed, {
    type: "failed",
    key: selected.items[0].key,
    error: "O arquivo não foi recebido. Tente reenviar este arquivo.",
  });
  assert.equal(examSelectionConsented(withFailure), true);
});

test("o estado do conjunto é curto e factual nos dois números", () => {
  const empty = initialExamSelection();
  assert.equal(examSelectionPhrase(empty), "Nenhum exame enviado");
  assert.equal(examSentPhrase(0), "Nenhum exame enviado");

  assert.equal(examSelectionPhrase(add(empty, [exam("a.pdf")])), "1 exame selecionado");
  assert.equal(
    examSelectionPhrase(add(empty, [exam("a.pdf"), exam("b.pdf", "application/pdf", 3, 2)])),
    "2 exames selecionados",
  );
  assert.equal(examSelectionPhrase(initialExamSelection(["a"])), "1 exame enviado");
  assert.equal(examSelectionPhrase(initialExamSelection(["a", "b"])), "2 exames enviados");

  const twoFailed = add(empty, [exam("a.pdf"), exam("b.pdf", "application/pdf", 3, 2)]);
  const first = examSelectionReducer(twoFailed, { type: "failed", key: twoFailed.items[0].key, error: "x" });
  const both = examSelectionReducer(first, { type: "failed", key: twoFailed.items[1].key, error: "y" });
  assert.equal(examSelectionPhrase(both), "2 arquivos precisam ser reenviados");
});

test("nome original, tipo e tamanho são o que o paciente confere", () => {
  const item = add(initialExamSelection(), [exam("hemograma completo.pdf")]).items[0];
  assert.equal(item.file.name, "hemograma completo.pdf");
  assert.equal(examFileLabel(item), "PDF · 3 B");
  assert.equal(examFileSize(900), "900 B");
  assert.equal(examFileSize(2048), "2 KB");
  assert.equal(examFileSize(maxExamBytes), "5,0 MB");
  const image = add(initialExamSelection(), [exam("laudo.jpg", "image/jpeg", 1536, 2)]).items[0];
  assert.equal(examFileLabel(image), "JPG · 2 KB");
});

test("cada estado do arquivo tem um rótulo próprio", () => {
  assert.equal(examStateLabel("ready"), "Aguardando envio");
  assert.equal(examStateLabel("sending"), "Enviando…");
  assert.equal(examStateLabel("sent"), "Enviado");
  assert.equal(examStateLabel("failed"), "Falhou");
});

test("a tela lista os arquivos, reenvia um por vez e pede consentimento da lista", () => {
  const component = readFileSync(
    new URL("../components/onboarding-workspace.tsx", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  // Múltiplos arquivos, nos três formatos aceitos.
  assert.match(component, /type="file"/);
  assert.match(component, /\bmultiple\b/);
  assert.match(component, /accept="application\/pdf,image\/jpeg,image\/png"/);
  // A lista mostra o nome original e o rótulo do arquivo — nunca um id.
  assert.match(component, /<strong>\{item\.file\.name\}<\/strong>/);
  assert.match(component, /<span>\{examFileLabel\(item\)\}<\/span>/);
  // A chave da lista é a identidade local do arquivo, não o id do documento.
  assert.match(component, /<li key=\{item\.key\} data-state=\{item\.state\}>/);
  assert.doesNotMatch(component, /\{item\.documentId\}/);
  assert.doesNotMatch(component, /getAll\("files"\)/);
  // Remover um e reenviar apenas o que falhou.
  assert.match(component, /Reenviar este arquivo/);
  assert.match(component, /dispatch\(\{ type: "remove", key: item\.key \}\)/);
  // O consentimento nomeia a lista selecionada.
  assert.match(component, /Confirmo que selecionei \{ready\.length\} arquivo/);
  // Exames seguem opcionais.
  assert.match(component, /Pular por enquanto/);
  // Sem rolagem horizontal: nome longo quebra, item pode encolher, campo de
  // arquivo não passa da largura do container.
  assert.match(css, /\.onboarding-upload input\[type="file"\] \{[^}]*max-width: 100%;/);
  assert.match(css, /\.exam-selection > li \{[^}]*min-width: 0;/);
  assert.match(css, /\.exam-selection \.exam-file > strong \{[^}]*overflow-wrap: anywhere;/);
  assert.match(css, /@media \(max-width: 650px\) \{\s*\.exam-selection > li \{ grid-template-columns: minmax\(0, 1fr\); \}/);
});
