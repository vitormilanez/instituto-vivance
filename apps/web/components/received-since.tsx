import type { ReceivedView } from "@/modules/workspace/home-view";
import {
  receivedFailureCopy,
  receivedWhen,
} from "@/modules/workspace/home-view";
import { RetryButton } from "@/components/retry-button";
import { ReceivedLink } from "@/components/received-link";

type Item = ReceivedView["visible"][number];

// Uma linha por item: o tipo e quando chegou. O alvo inteiro abre o registro
// original — nada de resumo no lugar da fonte, nem nome de arquivo cru. O autor
// não aparece: nesta versão é sempre o próprio paciente.
// "Novo" é estado de leitura desta pessoa, não prioridade: um ponto neutro e
// a palavra para leitor de tela. Quando não dá para saber, nada é marcado.
export function ReceivedRow({
  item,
  today,
  tenantId,
  label,
}: {
  item: Item | (Omit<Item, "label"> & { label?: string });
  today: string;
  tenantId: string;
  label: string;
}) {
  const unseen = item.seen === false;
  return (
    <li className={unseen ? "is-unseen" : undefined}>
      <ReceivedLink
        tenantId={tenantId}
        kind={item.kind}
        itemId={item.id}
        href={item.href}
        unseen={unseen}
      >
        <strong>
          {unseen ? <span className="home-unseen-dot" aria-hidden="true" /> : null}
          {label}
          {unseen ? <small className="sr-only"> (novo)</small> : null}
        </strong>
        <time dateTime={item.at}>{receivedWhen(item.at, today)}</time>
        <span className="home-received-open" aria-hidden="true">
          Abrir
        </span>
      </ReceivedLink>
    </li>
  );
}

// "Recebido desde a última consulta": o que o paciente enviou, na ordem de
// chegada. Cinco à vista, o resto atrás de "Ver todos (N)". Se um tipo falhou,
// os que carregaram continuam aqui e o que faltou é nomeado — sem total, para
// não parecer completo.
export function ReceivedSince({
  view,
  today,
  headingId,
  tenantId,
}: {
  view: ReceivedView;
  today: string;
  headingId: string;
  tenantId: string;
}) {
  return (
    <section className="home-received" aria-labelledby={headingId}>
      <h3 id={headingId}>Recebido desde a última consulta</h3>
      {view.visible.length ? (
        <ul className="home-received-list">
          {view.visible.map((item) => (
            <ReceivedRow key={`${item.kind}-${item.id}`} item={item} today={today} tenantId={tenantId} label={item.label} />
          ))}
        </ul>
      ) : null}
      {view.more.length ? (
        <details className="home-received-more">
          <summary>
            {view.total === null
              ? "Ver os demais"
              : `Ver todos (${view.total})`}
          </summary>
          <ul className="home-received-list">
            {view.more.map((item) => (
              <ReceivedRow key={`${item.kind}-${item.id}`} item={item} today={today} tenantId={tenantId} label={item.label} />
            ))}
          </ul>
        </details>
      ) : null}
      {view.empty ? <p className="home-received-empty">{view.empty}</p> : null}
      {view.failedLabels.length ? (
        <div className="home-received-error" role="status">
          <p>{receivedFailureCopy(view.failedLabels)}</p>
          <RetryButton />
        </div>
      ) : null}
    </section>
  );
}
