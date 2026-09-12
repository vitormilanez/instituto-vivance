import "server-only";
import { pageNumber, tenantId } from "@/lib/validation";
import type { Database } from "@/lib/supabase/database.types";
import { requireClinic } from "@/modules/identity/service";

type ProcessingJobRow =
  Database["public"]["Tables"]["processing_jobs"]["Row"];

export class ProcessingError extends Error {}

export async function processingJobs(id: string, pageInput?: string) {
  const tenant = tenantId(id);
  const page = pageNumber(pageInput);
  const { client, clinic } = await requireClinic(tenant, ["doctor", "nurse"]);
  const { data, error } = await client
    .from("processing_jobs")
    .select(
      "id,job_type,status,attempt_count,max_attempts,available_at,last_started_at,completed_at,failed_at,created_at",
    )
    .eq("tenant_id", tenant)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 20, page * 20);
  if (error) throw new ProcessingError("Unable to load processing jobs");
  return {
    clinic,
    jobs: ((data ?? []) as Pick<
      ProcessingJobRow,
      | "id"
      | "job_type"
      | "status"
      | "attempt_count"
      | "max_attempts"
      | "available_at"
      | "last_started_at"
      | "completed_at"
      | "failed_at"
      | "created_at"
    >[]).slice(0, 20),
    page,
    hasNext: (data?.length ?? 0) > 20,
  };
}

export type ProcessingJobs = Awaited<ReturnType<typeof processingJobs>>;
