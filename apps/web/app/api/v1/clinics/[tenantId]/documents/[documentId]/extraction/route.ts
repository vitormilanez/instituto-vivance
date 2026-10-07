import { after } from "next/server";
import { apiError, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import { documentExtraction, enqueueDocumentText } from "@/modules/exams/service";
import { runOneSyntheticExamJob } from "@/modules/exams/worker";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ tenantId: string; documentId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { tenantId, documentId } = await params;
    const state = await documentExtraction(tenantId, documentId);
    if (state.job && (
      state.job.status === "pending" && new Date(state.job.available_at).getTime() <= Date.now()
      || state.job.status === "processing" && state.job.lease_expires_at
        && new Date(state.job.lease_expires_at).getTime() <= Date.now()
    ))
      after(() => runOneSyntheticExamJob(tenantId, documentId));
    return json(state);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  if (!sameOrigin(request))
    return json({ error: "Origem da solicitação não permitida." }, 403);
  try {
    const { tenantId, documentId } = await params;
    const queued = await enqueueDocumentText(tenantId, documentId);
    after(() => runOneSyntheticExamJob(tenantId, documentId));
    return json(queued, 202);
  } catch (error) {
    return apiError(error);
  }
}
