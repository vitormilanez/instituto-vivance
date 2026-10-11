// A local, non-sending preview. No account, invitation or token is created.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
const template = new URL("../../supabase/templates/invite.html", import.meta.url);
const html = await readFile(template, "utf8");
const server = createServer((request, response) => {
  const generic = request.url === "/generic";
  const rendered = html.replace(/\{\{ if [\s\S]*?\}\}([\s\S]*?)\{\{ else \}\}([\s\S]*?)\{\{ end \}\}/,
    (_match, patientContent, genericContent) => generic ? genericContent : patientContent)
    .replaceAll("{{ .ConfirmationURL }}", "#preview-sem-envio");
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  response.end(rendered);
});
server.listen(3044, "127.0.0.1", () => console.log("Prévia sem envio: http://127.0.0.1:3044 · fallback em /generic"));
