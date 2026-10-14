import { InputError, tenantId } from "../../lib/validation.ts";
import { messageInput, messageRequestKey } from "./validation.ts";

export function outreachInput(input: unknown, key: string | null) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new InputError("Confira o envio coletivo.");
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some((field) => !["patient_ids", "content"].includes(field)) ||
    !Array.isArray(body.patient_ids) || body.patient_ids.length < 1 || body.patient_ids.length > 5 ||
    body.patient_ids.some((id) => typeof id !== "string")) throw new InputError("Confira os pacientes antes de enviar.");
  const patientIds = (body.patient_ids as string[]).map(tenantId);
  if (new Set(patientIds).size !== patientIds.length) throw new InputError("Não repita pacientes no envio.");
  const batchKey = messageRequestKey(key);
  const { content } = messageInput({ patient_id: patientIds[0], doctor_id: batchKey, content: body.content });
  return { patientIds, content, batchKey };
}
