import type { ReceivedView } from "@/modules/workspace/home-view";
import {
  receivedFailureCopy,
  receivedWhen,
} from "@/modules/workspace/home-view";
import { RetryButton } from "@/components/retry-button";

type Item = ReceivedView["visible"][number];

// Uma linha por item: o tipo e quando chegou. O alvo inteiro abre o registro
// original — nada de resumo no lugar da fonte, nem nome de arquivo cru. O autor
// não aparece: nesta versão é sempre o próprio paciente.
function ReceivedRow({ item, today }: { item: Item; today: string }) {
  return (
    <li>
      <a href={item.href}>
        <strong>{item.label}</strong>
        <time dateTime={item.at}>{receivedWhen(item.at, today)}</time>
        <span className="home-received-open" aria-hidden="true">
          Abrir
        </span>
      </a>
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
}: {
  view: ReceivedView;
  today: string;
  headingId: string;
}) {
  return (
    <section className="home-received" aria-labelledby={headingId}>
      <h3 id={headingId}>Recebido desde a última consulta</h3>
      {view.visible.length ? (
        <ul className="home-received-list">
          {view.visible.map((item) => (
            <ReceivedRow key={`${item.kind}-${item.id}`} item={item} today={today} />
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
              <ReceivedRow key={`${item.kind}-${item.id}`} item={item} today={today} />
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
