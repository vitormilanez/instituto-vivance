import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import { DomainError } from "@/lib/errors";
import type { OutreachPreview, OutreachResult } from "./outreach";
import { outreachInput } from "./outreach-validation";
import { outreachRecipientKey } from "./outreach-key";

type Client = Awaited<ReturnType<typeof requireClinic>>["client"];
// Generated DB types are refreshed after deployment. Never use privileged keys.
function outreachRpc(client: Client) {
  return client as unknown as { rpc(name: string, values: Record<string, unknown>): PromiseLike<{
    data: unknown; error: { code?: string } | null;
  }> };
}
const unavailable = "O envio coletivo ainda não está disponível neste ambiente. Você pode preparar o texto e tentar novamente depois.";
const missingContract = (code?: string) => code === "PGRST202" || code === "42883";

export async function outreachPreview(id: string): Promise<OutreachPreview> {
  const tenant = tenantId(id);
  const { client, user } = await requireClinic(tenant, ["doctor"]);
  const result = await outreachRpc(client).rpc("preview_doctor_outreach", { target_tenant: tenant });
  if (missingContract(result.error?.code)) return { doctorId: user.id, recipients: [], canSend: false, reason: unavailable };
  if (result.error?.code === "42501") throw new DomainError("Seu acesso mudou. Atualize a página.", 403);
  if (result.error?.code === "P1000") throw new DomainError("A lista é grande demais para um envio coletivo. Use as conversas individuais.", 409);
  if (result.error) throw new Error("Unable to preview outreach");
  const recipients = result.data as OutreachPreview["recipients"];
  if (!Array.isArray(recipients)) throw new Error("Invalid outreach preview");
  return { doctorId: user.id, canSend: true,
    recipients,
  };
}

export async function sendOutreachBatch(id: string, input: unknown, key: string | null) {
  const tenant = tenantId(id);
  const values = outreachInput(input, key);
  const { client } = await requireClinic(tenant, ["doctor"]);
  const results: OutreachResult[] = [];
  for (const patientId of values.patientIds) {
    const result = await outreachRpc(client).rpc("send_doctor_outreach_message", {
      target_tenant: tenant, target_patient: patientId, message_text: values.content,
      request_key: outreachRecipientKey(values.batchKey, patientId),
    });
    const receipts = result.data as Record<string, string>[] | null;
    if (result.error || !receipts?.[0]?.message_id) {
      if (missingContract(result.error?.code)) throw new DomainError(unavailable, 409);
      const denied = result.error?.code === "42501";
      const conflict = ["23505", "23514"].includes(result.error?.code ?? "");
      results.push({ patientId, status: "failed", retryable: !denied && !conflict,
        error: denied ? "Vínculo ou acesso ao aplicativo não está ativo." : conflict ? "Este envio mudou. Não reutilize a confirmação para outro texto." : result.error?.code === "P0060" ? "Limite de envio atingido. Aguarde um minuto para tentar novamente." : "Não foi possível confirmar o envio. Tente novamente com o mesmo rascunho.",
      });
    } else results.push({ patientId, status: "sent" });
  }
  return { results };
}
