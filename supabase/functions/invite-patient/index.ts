import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const response = (body: unknown, status: number) => Response.json(body, { status, headers });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function configuredKey(dictionaryName: string, legacyName: string) {
  const dictionary = Deno.env.get(dictionaryName);
  if (dictionary) try {
    const keys = JSON.parse(dictionary) as Record<string, unknown>;
    if (typeof keys.default === "string" && keys.default) return keys.default;
  } catch {}
  return Deno.env.get(legacyName) ?? "";
}

function redirectUrl() {
  const configured = Deno.env.get("PATIENT_INVITE_REDIRECT_URL")?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" || url.pathname !== "/primeiro-acesso" || url.search || url.hash) return null;
    return url.toString();
  } catch { return null; }
}

function input(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["tenantId", "displayName", "channel", "email", "phone", "doctorId"].includes(key))) return null;
  const tenantId = typeof body.tenantId === "string" ? body.tenantId : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim().replace(/\s+/g, " ") : "";
  const doctorId = body.doctorId === undefined ? undefined : String(body.doctorId);
  if (!uuid.test(tenantId) || displayName.length < 2 || displayName.length > 160 || (doctorId && !uuid.test(doctorId))) return null;
  if (body.channel === "email") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!emailPattern.test(email) || email.length > 254 || body.phone !== undefined) return null;
    return { tenantId, displayName, channel: "email" as const, email, doctorId };
  }
  const phone = typeof body.phone === "string" ? body.phone.replace(/[^\d+]/g, "") : "";
  if (body.channel !== "whatsapp" || !/^\+[1-9]\d{7,14}$/.test(phone) || body.email !== undefined) return null;
  return { tenantId, displayName, channel: "whatsapp" as const, phone, doctorId };
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function opaqueToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

Deno.serve(async (request: Request) => {
  const requestId = crypto.randomUUID();
  if (request.method !== "POST") return response({ error: "Método não permitido." }, 405);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return response({ error: "Use JSON." }, 415);
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ") || authorization.length > 8192) return response({ error: "Entre novamente para continuar." }, 401);
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const publishable = configuredKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const secret = configuredKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !publishable || !secret) return response({ error: "O serviço de convites está indisponível.", requestId }, 503);
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 4096) return response({ error: "Solicitação muito grande." }, 413);
    let parsed: unknown; try { parsed = JSON.parse(raw); } catch { return response({ error: "Convite inválido." }, 400); }
    const values = input(parsed); if (!values) return response({ error: "Convite inválido." }, 400);
    const userClient = createClient(url, publishable, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const auth = await userClient.auth.getUser(authorization.slice(7));
    if (auth.error || !auth.data.user) return response({ error: "Entre novamente para continuar." }, 401);
    const membership = await userClient.from("memberships").select("role,status").eq("tenant_id", values.tenantId).eq("user_id", auth.data.user.id).maybeSingle();
    if (membership.error || !membership.data || membership.data.status !== "active" || !["admin", "doctor"].includes(membership.data.role)) return response({ error: "Você não pode enviar este convite." }, 403);
    let doctorId = auth.data.user.id;
    if (membership.data.role === "admin") {
      if (!values.doctorId) return response({ error: "Selecione um médico ativo." }, 400);
      const doctor = await userClient.from("memberships").select("user_id").eq("tenant_id", values.tenantId).eq("user_id", values.doctorId).eq("role", "doctor").eq("status", "active").maybeSingle();
      if (doctor.error || !doctor.data) return response({ error: "Selecione um médico ativo." }, 409);
      doctorId = doctor.data.user_id;
    }
    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = values.channel === "whatsapp" ? opaqueToken() : null;
    const inserted = await admin.from("patient_invitations").insert({
      tenant_id: values.tenantId, display_name: values.displayName,
      channel: values.channel, recipient_email: values.channel === "email" ? values.email : null,
      recipient_phone: values.channel === "whatsapp" ? values.phone : null,
      token_hash: token ? await sha256(token) : null, doctor_id: doctorId,
      invited_by: auth.data.user.id, delivery_status: values.channel === "email" ? "requested" : "not_applicable",
    }).select("id,tenant_id,display_name,channel,status,doctor_id,expires_at,created_at,delivery_status").single();
    if (inserted.error) {
      if (inserted.error.code === "23505") return response({ error: "Já existe um convite pendente para este paciente." }, 409);
      return response({ error: "Não foi possível criar o convite.", requestId }, 503);
    }
    let delivery = inserted.data.delivery_status as "requested" | "not_applicable" | "failed";
    if (values.channel === "email") {
      let existing = false;
      for (let page = 1; page <= 5; page += 1) {
        const listed = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (listed.error) { delivery = "failed"; break; }
        if (listed.data.users.some((user) => user.email?.toLowerCase() === values.email)) { existing = true; break; }
        if (listed.data.users.length < 1000) break;
      }
      if (existing) delivery = "not_applicable";
      else {
        const redirectTo = redirectUrl();
        if (!redirectTo) delivery = "failed";
        else if ((await admin.auth.admin.inviteUserByEmail(values.email, { redirectTo })).error) delivery = "failed";
      }
      if (delivery !== inserted.data.delivery_status) await admin.from("patient_invitations").update({ delivery_status: delivery, updated_at: new Date().toISOString() }).eq("id", inserted.data.id);
    }
    return response({ invitation: {
      id: inserted.data.id, tenantId: inserted.data.tenant_id, displayName: inserted.data.display_name,
      channel: inserted.data.channel, status: inserted.data.status, doctorId: inserted.data.doctor_id,
      expiresAt: inserted.data.expires_at, createdAt: inserted.data.created_at, delivery: { status: delivery },
    }, ...(token ? { shareUrl: `/convite#${token}` } : {}) }, 201);
  } catch { return response({ error: "Não foi possível concluir o convite.", requestId }, 503); }
});
