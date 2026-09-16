import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import { patientMeasurementInput } from "./validation";

export class MeasurementError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function failed(code?: string): never {
  if (code === "42501")
    throw new MeasurementError("Sua conta não está vinculada a esta ficha. Atualize a página.", 403);
  if (["23514", "23503"].includes(code ?? ""))
    throw new MeasurementError("As medidas não puderam ser registradas. Confira os valores e a data.", 422);
  throw new Error("Patient measurement operation failed");
}

export async function submitPatientMeasurements(id: string, input: unknown) {
  const tenant = tenantId(id);
  const value = patientMeasurementInput(input);
  const { client } = await requireClinic(tenant, ["patient"]);
  const result = await client.rpc("submit_patient_measurements", {
    target_tenant: tenant,
    weight_kg: value.weightKg,
    height_cm: value.heightCm,
    waist_cm: value.waistCm,
    measured_on: value.measuredOn,
    request_id: value.requestId,
    confirmed: true,
  });
  if (result.error) failed(result.error.code);
  return { count: result.data };
}

export async function patientMeasurementSummary(id: string) {
  const tenant = tenantId(id);
  const { client, user } = await requireClinic(tenant, ["patient"]);
  const account = await client
    .from("patient_accounts")
    .select("patient_id")
    .eq("tenant_id", tenant)
    .eq("user_id", user.id)
    .maybeSingle();
  if (account.error || !account.data) failed(account.error?.code);
  const measurement = await client
    .from("patient_measurements")
    .select("measure_label,measure_value,measure_unit,reported_on,submitted_at")
    .eq("tenant_id", tenant)
    .eq("patient_id", account.data.patient_id)
    .order("reported_on", { ascending: false })
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (measurement.error) failed(measurement.error.code);
  return measurement.data;
}
