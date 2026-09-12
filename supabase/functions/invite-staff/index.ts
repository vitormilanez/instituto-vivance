import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

function inviteRedirect() {
  const configured = Deno.env.get("TEAM_INVITE_REDIRECT_URL")?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (
      url.protocol !== "https:" ||
      url.pathname !== "/primeiro-acesso" ||
      url.search ||
      url.hash
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

function configuredKey(dictionaryName: string, legacyName: string) {
  const dictionary = Deno.env.get(dictionaryName);
  if (dictionary) {
    try {
      const keys = JSON.parse(dictionary) as Record<string, unknown>;
      if (typeof keys.default === "string" && keys.default) return keys.default;
    } catch {
      // Fall through to the legacy hosted key while the project migrates keys.
    }
  }
  return Deno.env.get(legacyName) ?? "";
}

function response(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function validInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (
    Object.keys(body).some(
      (key) =>
        !["tenant_id", "email", "display_name", "role"].includes(key),
    )
  )
    return null;
  const tenant_id = typeof body.tenant_id === "string" ? body.tenant_id : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const display_name =
    typeof body.display_name === "string"
      ? body.display_name.trim().replace(/\s+/g, " ")
      : "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      tenant_id,
    ) ||
    email.length < 3 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    display_name.length < 2 ||
    display_name.length > 120 ||
    (body.role !== "doctor" && body.role !== "nurse")
  )
    return null;
  return { tenant_id, email, display_name, role: body.role };
}

Deno.serve(async (request: Request) => {
  const requestId = crypto.randomUUID();
  if (request.method !== "POST")
    return response({ error: "Método não permitido." }, 405);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return response({ error: "Use JSON." }, 415);
  const redirectTo = inviteRedirect();
  if (!redirectTo)
    return response(
      { error: "O serviço de convites está indisponível.", requestId },
      503,
    );
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ") || authorization.length > 8192)
    return response({ error: "Entre novamente para continuar." }, 401);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 4096)
    return response({ error: "Solicitação muito grande." }, 413);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey = configuredKey(
    "SUPABASE_PUBLISHABLE_KEYS",
    "SUPABASE_ANON_KEY",
  );
  const secretKey = configuredKey(
    "SUPABASE_SECRET_KEYS",
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  if (!url || !publishableKey || !secretKey)
    return response(
      { error: "O serviço de convites está indisponível.", requestId },
      503,
    );

  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 4096)
      return response({ error: "Solicitação muito grande." }, 413);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return response({ error: "Convite inválido." }, 400);
    }
    const values = validInput(parsed);
    if (!values) return response({ error: "Convite inválido." }, 400);

    const userClient = createClient(url, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authorization.slice("Bearer ".length);
    const { data: auth, error: authError } = await userClient.auth.getUser(token);
    if (authError || !auth.user)
      return response({ error: "Entre novamente para continuar." }, 401);
    const adminMembership = await userClient
      .from("memberships")
      .select("user_id")
      .eq("tenant_id", values.tenant_id)
      .eq("user_id", auth.user.id)
      .eq("role", "admin")
      .eq("status", "active")
      .maybeSingle();
    if (adminMembership.error || !adminMembership.data)
      return response({ error: "Você não pode enviar este convite." }, 403);

    const adminClient = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let invitedUser: { id: string } | undefined;
    for (let page = 1; page <= 5 && !invitedUser; page += 1) {
      const listed = await adminClient.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (listed.error)
        return response(
          { error: "Não foi possível verificar a conta.", requestId },
          503,
        );
      invitedUser = listed.data.users.find(
        (user) => user.email?.toLowerCase() === values.email,
      );
      if (listed.data.users.length < 1000) break;
      if (page === 5)
        return response(
          { error: "Não foi possível verificar a conta.", requestId },
          503,
        );
    }

    if (!invitedUser) {
      const invited = await adminClient.auth.admin.inviteUserByEmail(
        values.email,
        { redirectTo },
      );
      if (invited.error || !invited.data.user)
        return response(
          { error: "Não foi possível enviar o convite.", requestId },
          invited.error?.status === 429 ? 429 : 503,
        );
      invitedUser = invited.data.user;
    }

    const membership = await userClient.from("memberships").insert({
      tenant_id: values.tenant_id,
      user_id: invitedUser.id,
      role: values.role,
      status: "invited",
      display_name: values.display_name,
    });
    if (membership.error) {
      if (membership.error.code === "23505")
        return response(
          { error: "Esta pessoa já pertence à equipe desta clínica." },
          409,
        );
      if (membership.error.code === "42501")
        return response({ error: "Você não pode enviar este convite." }, 403);
      return response(
        {
          error:
            "A conta foi preservada, mas o acesso não foi criado. Tente novamente.",
          requestId,
        },
        503,
      );
    }
    return response({ invited: true }, 201);
  } catch {
    return response(
      { error: "Não foi possível concluir o convite.", requestId },
      503,
    );
  }
});
