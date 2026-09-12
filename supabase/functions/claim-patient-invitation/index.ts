import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const response = () => Response.json({ verificationRequested: true }, { status: 202, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
async function sha256(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function key(dictionaryName: string, legacyName: string) { const dictionary = Deno.env.get(dictionaryName); if (dictionary) try { const keys = JSON.parse(dictionary) as Record<string, unknown>; if (typeof keys.default === "string" && keys.default) return keys.default; } catch {} return Deno.env.get(legacyName) ?? ""; }
function redirectUrl() { const raw = Deno.env.get("PATIENT_INVITE_REDIRECT_URL")?.trim(); if (!raw) return null; try { const url = new URL(raw); return url.protocol === "https:" && url.pathname === "/primeiro-acesso" && !url.search && !url.hash ? url.toString() : null; } catch { return null; } }

Deno.serve(async (request: Request) => {
  if (request.method !== "POST" || !request.headers.get("content-type")?.startsWith("application/json")) return response();
  try {
    const raw = await request.text(); if (new TextEncoder().encode(raw).byteLength > 4096) return response();
    const body = JSON.parse(raw) as Record<string, unknown>;
    const token = typeof body.token === "string" && /^[A-Za-z0-9_-]{43}$/.test(body.token) ? body.token : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!token || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || Object.keys(body).some((name) => !["token", "email"].includes(name))) return response();
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const secret = key("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !secret) return response();
    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const claimed = await admin.from("patient_invitations").update({ recipient_email: email, token_hash: null, claimed_at: new Date().toISOString(), delivery_status: "requested", updated_at: new Date().toISOString() }).eq("token_hash", await sha256(token)).eq("channel", "whatsapp").eq("status", "pending").gt("expires_at", new Date().toISOString()).select("id").maybeSingle();
    if (claimed.error || !claimed.data) return response();
    let existing = false;
    for (let page = 1; page <= 5; page += 1) {
      const listed = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (listed.error) return response();
      if (listed.data.users.some((user) => user.email?.toLowerCase() === email)) { existing = true; break; }
      if (listed.data.users.length < 1000) break;
    }
    if (existing) await admin.from("patient_invitations").update({ delivery_status: "not_applicable" }).eq("id", claimed.data.id);
    else {
      const redirectTo = redirectUrl();
      if (!redirectTo || (await admin.auth.admin.inviteUserByEmail(email, { redirectTo })).error)
        await admin.from("patient_invitations").update({ delivery_status: "failed" }).eq("id", claimed.data.id);
    }
  } catch {}
  return response();
});
