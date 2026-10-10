import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts } from "pdf-lib";

const defaultOutput = fileURLToPath(new URL("../../../work/ia2-synthetic-exam.pdf", import.meta.url));
const output = resolve(process.argv[2] ?? defaultOutput);
const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);

function addPage(title, lines) {
  const page = pdf.addPage([595, 842]);
  page.drawText("DEMONSTRACAO - DOCUMENTO INTEIRAMENTE FICTICIO", {
    x: 42, y: 795, size: 12, font,
  });
  page.drawText(title, { x: 42, y: 764, size: 11, font });
  lines.forEach((line, index) => {
    page.drawText(line, { x: 42, y: 738 - index * 22, size: 9, font });
  });
}

const panel = Array.from({ length: 22 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return `Marcador ficticio ${number}: resultado ${100 + index} unidade-demo; referencia do emissor: nao aplicavel.`;
});
addPage("Painel ilustrativo A", panel);
addPage("Painel ilustrativo A", panel.map((line, index) =>
  index === 10 ? line.replace("resultado 110", "resultado 111") : line));
addPage("Relato ilustrativo B - outro laudo", [
  "Texto narrativo ficticio, criado apenas para testar a separacao de paginas.",
  "Nenhuma conclusao, medida ou identidade desta pagina corresponde a um paciente.",
  "A revisao da equipe deve manter acesso ao documento original e a esta pagina.",
]);

await mkdir(dirname(output), { recursive: true });
await writeFile(output, await pdf.save());
process.stdout.write(`${output}\n`);
