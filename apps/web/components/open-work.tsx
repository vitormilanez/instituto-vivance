import Link from "next/link";
import {
  openWorkLimit,
  openWorkSummary,
  type OpenWorkItem,
} from "@/modules/workspace/open-work-items";
import { receivedWhen } from "@/modules/workspace/home-view";
import { RetryButton } from "@/components/retry-button";

function Row({ item, today }: { item: OpenWorkItem; today: string }) {
  return (
    <li>
      <span>
        <strong>{item.patientName}</strong>
        <span>
          {item.state} · desde{" "}
          <time dateTime={item.since}>
            {receivedWhen(item.since, today).replace("Hoje", "hoje")}
          </time>
        </span>
      </span>
      <Link href={item.href}>{item.action}</Link>
    </li>
  );
}

// "Seu trabalho em aberto": o que só você conclui. Uma linha por item, com uma
// ação cada; o que espera há mais tempo vem primeiro. Sem cor, sem selo de
// urgência. Vazio, a seção não aparece; se não carregou, ela diz isso.
export function OpenWork({
  items,
  today,
}: {
  items: OpenWorkItem[] | null;
  today: string;
}) {
  if (items && !items.length) return null;
  const visible = items?.slice(0, openWorkLimit) ?? [];
  const more = items?.slice(openWorkLimit) ?? [];
  return (
    <section className="home-section home-work" aria-labelledby="home-work-title">
      <div className="home-section-head">
        <h2 id="home-work-title">Seu trabalho em aberto</h2>
        {items ? <span>{openWorkSummary(items.length)}</span> : null}
      </div>
      {items ? (
        <>
          <p className="home-section-note">
            O que espera há mais tempo aparece primeiro, sem classificação.
          </p>
          <ul className="home-plain-list">
            {visible.map((item) => (
              <Row key={`${item.kind}-${item.id}`} item={item} today={today} />
            ))}
          </ul>
          {more.length ? (
            <details className="home-received-more">
              <summary>Ver todos ({items.length})</summary>
              <ul className="home-plain-list">
                {more.map((item) => (
                  <Row key={`${item.kind}-${item.id}`} item={item} today={today} />
                ))}
              </ul>
            </details>
          ) : null}
        </>
      ) : (
        <div className="home-received-error" role="status">
          <p>Não foi possível carregar o trabalho em aberto.</p>
          <RetryButton />
        </div>
      )}
    </section>
  );
}
