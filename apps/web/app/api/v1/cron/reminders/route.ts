import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { supabaseConfig } from "@/lib/supabase/config";
import { reminderMessage } from "@/modules/reminders/model";

// Agendador dos lembretes (chamado a cada 15 minutos). Protegido por um
// segredo que só o agendador e o banco (como hash) conhecem. Não usa chave de
// serviço: o banco decide quem lembrar e registra o envio.
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 32) return null;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given) ? secret : null;
}

async function run(request: Request) {
  const secret = authorized(request);
  if (!secret) return Response.json({ error: "Não autorizado." }, { status: 401 });
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return Response.json({ error: "Notificações não configuradas." }, { status: 503 });
  webpush.setVapidDetails("https://institutovivance.app", publicKey, privateKey);
  const { url, key } = supabaseConfig();
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const due = await db.rpc("claim_due_reminders", { cron_secret: secret });
  if (due.error) return Response.json({ error: "Falha ao buscar lembretes." }, { status: 500 });
  let sent = 0;
  let dropped = 0;
  for (const row of (due.data ?? []) as { tenant_id: string; endpoint: string; p256dh: string; auth_secret: string }[]) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth_secret } },
        JSON.stringify({
          ...reminderMessage,
          url: `/clinicas/${row.tenant_id}/meu-cuidado/checkin`,
        }),
        { TTL: 4 * 3600, urgency: "normal" },
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.rpc("drop_push_subscription", { cron_secret: secret, push_endpoint: row.endpoint });
        dropped += 1;
      }
    }
  }
  return Response.json({ sent, dropped });
}

export const GET = run;
export const POST = run;
