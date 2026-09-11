import { InputError, tenantId } from "../../lib/validation.ts";

function object(value: unknown, message: string) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError(message);
  return value as Record<string, unknown>;
}

function exactKeys(body: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(body).some((key) => !allowed.includes(key)))
    throw new InputError("Há campos não permitidos nesta solicitação.");
}

function version(value: unknown) {
  if (!Number.isSafeInteger(value) || (value as number) < 1)
    throw new InputError("Atualize a página antes de tentar novamente.");
  return value as number;
}

export function teamInvitationInput(value: unknown) {
  const body = object(value, "Convite inválido.");
  exactKeys(body, ["email", "display_name", "role"]);
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const display_name =
    typeof body.display_name === "string"
      ? body.display_name.trim().replace(/\s+/g, " ")
      : "";
  if (
    email.length < 3 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )
    throw new InputError("Informe um e-mail válido.");
  if (display_name.length < 2 || display_name.length > 120)
    throw new InputError("Informe um nome de 2 a 120 caracteres.");
  if (body.role !== "doctor" && body.role !== "nurse")
    throw new InputError("Selecione médico ou enfermagem.");
  return { email, display_name, role: body.role };
}

export function membershipAcceptanceInput(value: unknown) {
  const body = object(value, "Aceite inválido.");
  exactKeys(body, ["version"]);
  return { version: version(body.version) };
}

export function membershipManagementInput(value: unknown) {
  const body = object(value, "Alteração de acesso inválida.");
  exactKeys(body, ["version", "action"]);
  if (body.action !== "suspend" && body.action !== "reactivate")
    throw new InputError("Ação de acesso inválida.");
  return { version: version(body.version), action: body.action };
}

export function careAssignmentInput(value: unknown) {
  const body = object(value, "Atribuição inválida.");
  exactKeys(body, ["patient_id", "professional_id"]);
  if (
    typeof body.patient_id !== "string" ||
    typeof body.professional_id !== "string"
  )
    throw new InputError("Selecione paciente e profissional.");
  return {
    patient_id: tenantId(body.patient_id),
    professional_id: tenantId(body.professional_id),
  };
}

export function careRelationshipChangeInput(value: unknown) {
  const body = object(value, "Alteração de vínculo inválida.");
  exactKeys(body, ["version", "action"]);
  if (
    body.action !== "accept" &&
    body.action !== "revoke" &&
    body.action !== "reassign"
  )
    throw new InputError("Ação de vínculo inválida.");
  return { version: version(body.version), action: body.action };
}
