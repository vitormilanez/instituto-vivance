import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { requestPatientCare } from "@/modules/care-requests/service";
import { careRequestMaxBodyBytes } from "@/modules/care-requests/validation";

type Context = {
  params: Promise<{ tenantId: string; patientId: string }>;
};

// Pedir é ato do médico com vínculo ativo, com efeito auditável e mensagem para
// o paciente. A chave idempotente vem do cliente, então repetir a mesma
// tentativa devolve o mesmo pedido em vez de abrir uma segunda pendência.
export async function POST(request: Request, { params }: Context) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Use JSON." }, 415);
  try {
    const { tenantId, patientId } = await params;
    return json(
      {
        request: await requestPatientCare(
          tenantId,
          patientId,
          await boundedJson(request, careRequestMaxBodyBytes),
        ),
      },
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
