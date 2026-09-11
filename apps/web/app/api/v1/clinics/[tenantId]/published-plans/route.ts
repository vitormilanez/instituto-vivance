import { patientPublications } from "@/modules/care-plans/publication-service";
import { apiError, json } from "@/lib/api";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    return json(
      await patientPublications(
        (await params).tenantId,
        new URL(request.url).searchParams.get("page") ?? undefined,
      ),
    );
  } catch (e) {
    return apiError(e);
  }
}
