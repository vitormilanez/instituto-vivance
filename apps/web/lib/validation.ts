export class InputError extends Error {}

export function patientSearch(value: string | null | undefined): string {
  if (value == null) return "";
  if (
    typeof value !== "string" ||
    value.length > 80 ||
    /[\x00-\x1f\x7f]/u.test(value)
  )
    throw new InputError("Use até 80 caracteres para buscar um paciente.");
  return value.trim().replace(/\s+/g, " ");
}

export function searchPattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

export function tenantId(value: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new InputError("Clínica inválida.");
  }
  return value;
}

export function patientInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Cadastro inválido.");
  const body = value as Record<string, unknown>;
  if (
    Object.keys(body).some(
      (key) => !["display_name", "birth_date"].includes(key),
    )
  ) {
    throw new InputError("O cadastro contém campos não permitidos.");
  }
  if (typeof body.display_name !== "string")
    throw new InputError("Informe o nome do paciente.");
  const name = body.display_name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 160 || /[\x00-\x1f\x7f]/u.test(name)) {
    throw new InputError("Informe um nome entre 2 e 160 caracteres.");
  }
  const birth =
    body.birth_date === "" || body.birth_date === undefined
      ? null
      : body.birth_date;
  if (
    birth !== null &&
    (typeof birth !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(birth) ||
      !Number.isFinite(Date.parse(birth)) ||
      new Date(birth).toISOString().slice(0, 10) !== birth ||
      birth < "1900-01-01" ||
      birth > new Date().toISOString().slice(0, 10))
  ) {
    throw new InputError("Informe uma data de nascimento válida.");
  }
  return { display_name: name, birth_date: birth as string | null };
}

export function pageNumber(value: string | null | undefined): number {
  if (!value) return 1;
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 10000)
    throw new InputError("Página inválida.");
  return Number(value);
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  const url = new URL(request.url);
  // Next's local URL uses the bind hostname (localhost), while the browser may
  // request 127.0.0.1. Host is the HTTP authority; do not trust X-Forwarded-Host.
  const authority = request.headers.get("host") ?? url.host;
  if (!/^[a-z0-9.\-:\[\]]+$/i.test(authority)) return false;
  try {
    return origin === new URL(`${url.protocol}//${authority}`).origin;
  } catch {
    return false;
  }
}
