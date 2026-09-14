"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PatientPublications } from "@/modules/care-plans/publication-service";
import { clinicalTime } from "./encounter-editor";
type Publication = PatientPublications["publications"][number];
function PublishedPlan({ publication: p }: { publication: Publication }) {
  const [receipt, setReceipt] = useState(
      p.care_plan_receipts[0]?.acknowledged_at ?? null,
    ),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const busy = useRef(false);
  async function acknowledge() {
    if (busy.current || receipt) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/clinics/${p.tenant_id}/published-plans/${p.id}/receipt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({ confirmed: true }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Não foi possível confirmar a leitura.");
      setReceipt(data.acknowledged_at);
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "TimeoutError"
          ? e.message
          : "A conexão demorou. Atualize as orientações e confira a confirmação.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <article
      id={`plano-${p.id}`}
      className="panel published-plan"
      aria-label={p.title}
    >
      <div className="section-heading">
        <div>
          <h2>{p.title}</h2>
          <p>
            Revisão {p.revision} · Publicada em {clinicalTime(p.published_at)}
          </p>
          <p>Médico responsável: {p.doctor_display_name}</p>
        </div>
      </div>
      <div className="plan-summary">
        {(
          [
            ["goals", "Objetivos"],
            ["actions", "O que fazer"],
            ["frequency", "Frequência"],
            ["period", "Período"],
          ] as const
        ).map(([key, label]) => (
          <section key={key}>
            <h3>{label}</h3>
            <p>{p[key]}</p>
          </section>
        ))}
        <section>
          <h3>Revisão prevista</h3>
          <p>{p.review_on.split("-").reverse().join("/")}</p>
        </section>
      </div>
      <div className="plan-approval">
        {error && <p role="alert">{error}</p>}
        {receipt ? (
          <p role="status">Leitura confirmada em {clinicalTime(receipt)}.</p>
        ) : (
          <button disabled={pending} onClick={() => void acknowledge()}>
            {pending ? "Registrando…" : "Li estas orientações"}
          </button>
        )}
        <p>
          Essa confirmação registra apenas sua leitura, não o cumprimento das
          orientações. Se tiver dúvidas, fale com a equipe pelos canais
          habituais da clínica.
        </p>
      </div>
    </article>
  );
}
export function PublishedPlans({ initial }: { initial: PatientPublications }) {
  const router = useRouter();
  const base = `/clinicas/${initial.clinic.id}/meu-cuidado/plano`;
  return (
    <>
      <div className="section-heading">
        <p>Somente orientações aprovadas e publicadas para você.</p>
        <button onClick={() => router.refresh()}>Atualizar orientações</button>
      </div>
      {initial.publications.length ? (
        initial.publications.map((p) => (
          <PublishedPlan
            key={`${p.id}:${p.care_plan_receipts[0]?.acknowledged_at ?? "unread"}`}
            publication={p}
          />
        ))
      ) : (
        <section className="panel empty">
          <h2>Nenhuma orientação publicada nesta página</h2>
          <p>
            Quando o médico publicar um plano para você, ele aparecerá aqui. Em
            caso de dúvidas, entre em contato com a equipe da clínica.
          </p>
        </section>
      )}
      <nav className="agenda-actions" aria-label="Páginas de orientações">
        {initial.page > 1 && (
          <Link href={`${base}?pagina=${initial.page - 1}`}>Anterior</Link>
        )}
        {initial.hasNext && (
          <Link href={`${base}?pagina=${initial.page + 1}`}>Próxima</Link>
        )}
      </nav>
    </>
  );
}
