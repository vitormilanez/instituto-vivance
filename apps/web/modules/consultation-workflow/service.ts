import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
import {
  generateConsultationSummary,
  type ConsultationSummaryGeneration,
  type ConsultationSourceSegment,
} from "./generation.ts";
import type {
  ConsultationSummaryClaim,
  ConsultationWorkflowAction,
  ConsultationWorkflowState,
  ConsultationWorkflowView,
} from "./types.ts";
import { consultationWorkflowAction, validatedCorrectedSummary } from "./validation.ts";
import type { PatientConsultationHistory } from "./history.ts";

export class ConsultationWorkflowError extends DomainError {}

type WorkflowRpc = (
  operation: string,
  payload?: Record<string, unknown>,
) => Promise<ConsultationWorkflowState | ConsultationSummaryClaim>;

export type ConsultationSummaryGenerator = (
  segments: ConsultationSourceSegment[],
) => Promise<ConsultationSummaryGeneration>;

function workflowFailure(code?: string): never {
  if (code === "42501")
    throw new ConsultationWorkflowError("Seu acesso, sessão ou vínculo com esta consulta mudou. Atualize a página.", 403);
  if (["23514", "23505", "40001", "22007", "22P02"].includes(code ?? ""))
    throw new ConsultationWorkflowError("O consentimento ou o estado da consulta mudou. Atualize antes de tentar novamente.", 409);
  throw new ConsultationWorkflowError("O fluxo assistido da consulta ainda não está disponível.", 503);
}

async function context(tenantInput: string, appointmentInput: string) {
  const tenant = tenantId(tenantInput), appointment = tenantId(appointmentInput);
  const { client, user } = await requireClinic(tenant, ["doctor", "patient"]);
  const claims = await client.auth.getClaims();
  const session = claims.data?.claims.session_id;
  if (claims.error || typeof session !== "string")
    throw new ConsultationWorkflowError("Entre novamente para acessar esta consulta.", 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new ConsultationWorkflowError("O fluxo assistido da consulta ainda não está disponível.", 503);
  const service = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  const rpc: WorkflowRpc = async (operation, payload = {}) => {
    const { data, error } = await service.rpc("consultation_workflow_operation", {
      operation,
      target_tenant: tenant,
      actor_id: user.id,
      actor_session: session,
      target_appointment: appointment,
      payload,
    });
    if (error) workflowFailure(error.code);
    return data as ConsultationWorkflowState | ConsultationSummaryClaim;
  };
  return { rpc };
}

export async function processConsultationSummary(
  rpc: WorkflowRpc,
  generator: ConsultationSummaryGenerator = generateConsultationSummary,
): Promise<ConsultationWorkflowState> {
  const claimed = await rpc("summary_claim", {
    contractVersion: "consultation-summary-v1",
    generatorKey: "consultation-summary-20261015.1",
    leaseSeconds: 120,
  });
  if (!("claim" in claimed)) return claimed;
  const { claim } = claimed;
  try {
    const generated = await generator(claim.segments);
    const verifiedSummary = validatedCorrectedSummary(generated.summary, claim.segments);
    return await rpc("summary_complete", {
      jobId: claim.jobId,
      leaseToken: claim.leaseToken,
      sourceHash: claim.sourceHash,
      consentEventId: claim.consentEventId,
      consentVersion: claim.consentVersion,
      summary: verifiedSummary,
      metadata: generated.metadata,
    }) as ConsultationWorkflowState;
  } catch (error) {
    const errorCode = error instanceof DOMException && error.name === "TimeoutError"
      ? "timeout"
      : error instanceof Error && error.message.startsWith("invalid_")
        ? "invalid_output"
        : "generation_failed";
    try {
      return await rpc("summary_fail", {
        jobId: claim.jobId,
        leaseToken: claim.leaseToken,
        consentEventId: claim.consentEventId,
        errorCode,
      }) as ConsultationWorkflowState;
    } catch {
      // A concurrent withdrawal/reassignment intentionally wins the write race.
      throw error;
    }
  }
}

export async function getConsultationWorkflow(tenant: string, appointment: string) {
  const { rpc } = await context(tenant, appointment);
  return await rpc("list") as ConsultationWorkflowState;
}

export async function getPatientConsultationHistory(
  tenantInput: string,
  patientInput: string,
): Promise<PatientConsultationHistory> {
  const tenant = tenantId(tenantInput), patient = tenantId(patientInput);
  const { client, user } = await requireClinic(tenant, ["doctor"]);
  const claims = await client.auth.getClaims();
  const session = claims.data?.claims.session_id;
  if (claims.error || typeof session !== "string")
    throw new ConsultationWorkflowError("Entre novamente para acessar o histórico.", 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new ConsultationWorkflowError("O histórico assistido ainda não está disponível.", 503);
  const service = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  const { data, error } = await service.rpc("consultation_workflow_patient_history", {
    target_tenant: tenant,
    actor_id: user.id,
    actor_session: session,
    target_patient: patient,
  });
  if (error) workflowFailure(error.code);
  return data as PatientConsultationHistory;
}

export async function runConsultationWorkflowAction(
  tenant: string,
  appointment: string,
  body: unknown,
) {
  const action = consultationWorkflowAction(body);
  const { rpc } = await context(tenant, appointment);
  if (action.action === "process_summary") return processConsultationSummary(rpc);
  if (action.action === "review_summary" && action.payload.correctedSummary) {
    const current = await rpc("list") as ConsultationWorkflowState;
    if (current.role !== "doctor") workflowFailure("42501");
    action.payload.correctedSummary = validatedCorrectedSummary(
      action.payload.correctedSummary,
      current.capture.segments,
    ) as typeof action.payload.correctedSummary;
  }
  const state = await rpc(action.action, action.payload as Record<string, unknown>) as ConsultationWorkflowState;
  // Ending the assisted capture finalizes only the immutable source. Summary
  // generation is explicit here (never GET) and remains retryable separately.
  if (action.action === "end" && state.role === "doctor" && state.summary.status === "pending")
    return processConsultationSummary(rpc);
  return state;
}

export type { ConsultationWorkflowAction, ConsultationWorkflowState, ConsultationWorkflowView };
