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
    const tokenHash = await sha256(token);
    const claimed = await admin.from("patient_invitations").update({ recipient_email: email, token_hash: null, claimed_at: new Date().toISOString(), delivery_status: "requested", updated_at: new Date().toISOString() }).eq("token_hash", tokenHash).eq("channel", "whatsapp").eq("status", "pending").gt("expires_at", new Date().toISOString()).select("id").maybeSingle();
    if (claimed.error || !claimed.data) return response();
    const claimedId = claimed.data.id;
    async function releaseClaim() {
      // Delivery/configuration failures must not consume the one-time WhatsApp
      // secret. The row guard prevents a delayed attempt from undoing a later,
      // successful claim.
      await admin.from("patient_invitations").update({
        recipient_email: null,
        token_hash: tokenHash,
        claimed_at: null,
        delivery_status: "failed",
        updated_at: new Date().toISOString(),
      }).eq("id", claimedId)
        .eq("recipient_email", email)
        .eq("status", "pending")
        .is("token_hash", null);
    }
    let existing = false;
    for (let page = 1; page <= 5; page += 1) {
      const listed = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (listed.error) {
        await releaseClaim();
        return response();
      }
      if (listed.data.users.some((user) => user.email?.toLowerCase() === email)) { existing = true; break; }
      if (listed.data.users.length < 1000) break;
    }
    if (existing) await admin.from("patient_invitations").update({ delivery_status: "not_applicable" }).eq("id", claimedId);
    else {
      const redirectTo = redirectUrl();
      if (!redirectTo) {
        await releaseClaim();
        return response();
      }
      const invitation = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
      if (invitation.error) {
        if (["email_exists", "user_already_exists"].includes(invitation.error.code ?? "")) {
          await admin.from("patient_invitations").update({ delivery_status: "not_applicable" }).eq("id", claimedId);
          return response();
        }
        await releaseClaim();
        return response();
      }
    }
  } catch {}
  return response();
});
