import assert from "node:assert/strict";
import test from "node:test";
import { uploadPatientDocumentBatch } from "../modules/documents/batch.ts";

test("envia todos os exames em sequência e preserva sucesso parcial", async () => {
  const attempted: string[] = [];
  const results: { key: string; documentId: string | null; error: unknown }[] = [];
  const names = ["hemograma.pdf", "exame-corrompido.pdf", "imagem.png"];
  const files = names.map((name) => ({ key: name, file: new File(["conteúdo sintético"], name) }));
  const sent = await uploadPatientDocumentBatch(
    { tenantId: "clinica-1", patientId: "paciente-1", category: "exam", files },
    (result) => results.push(result),
    async ({ tenantId, patientId, file, category, visibility }) => {
      assert.equal(tenantId, "clinica-1");
      assert.equal(patientId, "paciente-1");
      assert.equal(category, "exam");
      assert.equal(visibility, "shared");
      attempted.push(file.name);
      if (file.name === names[1]) throw new Error("Falha no segundo arquivo");
      return { documentId: file.name };
    },
  );
  assert.equal(sent, 2);
  assert.deepEqual(attempted, names);
  assert.deepEqual(results.map((result) => [result.key, result.documentId, result.error instanceof Error]), [
    [names[0], names[0], false],
    [names[1], null, true],
    [names[2], names[2], false],
  ]);
});
