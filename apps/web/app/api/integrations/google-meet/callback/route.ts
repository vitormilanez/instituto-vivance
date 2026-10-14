import { completeMeetOAuth } from "@/modules/google-meet/service";
export async function GET(request: Request) {
  try {
    const tenant = await completeMeetOAuth(request);
    return new Response(null, { status: 303, headers: { Location: `/clinicas/${tenant}/teleconsulta?googleMeet=connected`, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch {
    // OAuth query includes an authorization code; never reflect or log it.
    return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conexão Google Meet — Vivance</title><body><main><h1>A conexão não foi concluída</h1><p>A autorização pode ter expirado ou sido cancelada. Abra sua clínica e tente conectar novamente em Teleconsulta.</p><p><a href="/clinicas">Voltar às minhas clínicas</a></p></main></body></html>`, { status: 409, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
  }
}
