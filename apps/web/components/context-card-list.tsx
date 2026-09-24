import type { patientCareContext } from "@/modules/workspace/today";
import {
  consultationContextCards,
  careRequestActionLabel,
  type ContextCard,
} from "@/modules/workspace/patient-context-cards";
import { CareRequestAction } from "@/components/care-request-action";

// Um card por tipo de informação, na mesma ordem em todas as telas. O link que
// abre o registro e o botão que pede a informação são alvos irmãos, nunca um
// dentro do outro: um navega, o outro cria uma pendência auditável.
export function ContextCardList({
  cards,
  base,
  patientId,
  compactRequests = false,
  homeView = false,
}: {
  cards: ContextCard[];
  base?: string;
  patientId?: string;
  compactRequests?: boolean;
  homeView?: boolean;
}) {
  const tenantId = base?.split("/")[2];
  return (
    <ul className={homeView ? "context-cards context-cards-home" : "context-cards"}>
      {cards.map((card) => (
        <li key={card.id} className={`context-card-${card.id}`}>
          <a
            className={card.pending ? "is-pending" : undefined}
            href={card.href}
            aria-label={homeView ? `${card.title}: ${card.state}. ${card.action}` : undefined}
          >
            <strong>{card.title}</strong>
            <span className="context-state">{card.state}</span>
            <span className="context-action">{card.action}</span>
          </a>
          {card.history ? (
            <a className="context-history" href={card.history.href}>
              {card.history.label}
            </a>
          ) : null}
          {card.request && tenantId && patientId ? (
            compactRequests ? (
              <details className="context-request-disclosure">
                <summary>
                  {homeView ? (
                    <>{card.request.requestedAt ? "Solicitado" : "Pedir"}<span className="sr-only"> {card.title}</span></>
                  ) : careRequestActionLabel(card.request.kind)}
                </summary>
                <CareRequestAction
                  tenantId={tenantId}
                  patientId={patientId}
                  kind={card.request.kind}
                  requestedAt={card.request.requestedAt}
                />
              </details>
            ) : (
              <CareRequestAction
                tenantId={tenantId}
                patientId={patientId}
                kind={card.request.kind}
                requestedAt={card.request.requestedAt}
              />
            )
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function contextCardsFrom(
  base: string,
  patientId: string,
  context: NonNullable<Awaited<ReturnType<typeof patientCareContext>>>,
  recordBase?: string,
) {
  const latest = context.publications[0] ?? null;
  return consultationContextCards({
    base,
    recordBase: recordBase ?? `${base}/pacientes/${patientId}`,
    canReviewPreparation: context.canReviewPreparation,
    preparation: context.preparation
      ? {
          id: context.preparation.id,
          status: context.preparation.status,
          submittedAt: context.preparation.submitted_at,
        }
      : null,
    nextAppointmentAt: context.preparationAppointmentAt,
    previousPreparation: context.previousPreparation
      ? {
          id: context.previousPreparation.id,
          submittedAt: context.previousPreparation.submitted_at,
        }
      : null,
    documents: {
      total: context.documents.total,
      latestAt: context.documents.latest_at,
    },
    measurements: {
      total: context.measurements.total,
      latestAt: context.measurements.latest_at,
    },
    intake: context.intake,
    encounter: context.encounter
      ? {
          id: context.encounter.id,
          finalizedAt: context.encounter.finalized_at,
        }
      : null,
    publication: latest
      ? {
          planId: latest.plan_id,
          revision: latest.revision,
          publishedAt: latest.published_at,
        }
      : null,
    requests: context.requests,
  });
}

export function PatientCareLinks({
  base,
  patientId,
  context,
  recordBase,
  compactRequests = false,
}: {
  base: string;
  patientId: string;
  context: NonNullable<Awaited<ReturnType<typeof patientCareContext>>>;
  recordBase?: string;
  compactRequests?: boolean;
}) {
  return (
    <ContextCardList
      cards={contextCardsFrom(base, patientId, context, recordBase)}
      compactRequests={compactRequests}
      base={base}
      patientId={patientId}
    />
  );
}
