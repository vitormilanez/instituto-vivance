import "server-only";
import { DomainError, databaseFailure } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import { alertSignsFromInfo, type ClinicPatientInfoRow } from "@/modules/workspace/alert-signs";

export class ClinicInfoError extends DomainError {}
const failed: (code?: string) => never = databaseFailure({
  error: ClinicInfoError,
  denied: "Sua conta não tem acesso a esta clínica.",
  conflict: "Não foi possível salvar. Confira os dados.",
  conflictCodes: ["23503", "23505", "23514"],
  log: "Clinic patient info operation failed",
});
const missingTable = (code?: string) => code === "42P01" || code === "PGRST205";

const columns = "phone_display, phone_tel, phone_hours, alert_signs, alert_approved_name, alert_approved_on";

// O que a clínica mostra aos pacientes. Sem cadastro (ou migration ainda não
// aplicada): o conteúdo vazio, e a tela diz "em revisão".
export async function clinicPatientInfo(id: string, roles = ["admin", "doctor", "nurse", "patient"]) {
  const tenant = tenantId(id);
  const { client } = await requireClinic(tenant, roles);
  const result = await client.from("clinic_patient_info").select(columns).eq("tenant_id", tenant).maybeSingle();
  if (result.error) {
    if (missingTable(result.error.code)) return alertSignsFromInfo(null);
    failed(result.error.code);
  }
  return alertSignsFromInfo((result.data as ClinicPatientInfoRow | null) ?? null);
}
