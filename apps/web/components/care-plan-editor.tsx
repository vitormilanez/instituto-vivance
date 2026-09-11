"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanDetail } from "@/modules/care-plans/service";
import { planFields, type PlanContent } from "@/modules/care-plans/validation";
import { clinicalTime } from "./encounter-editor";
export const planLabels: Record<string, string> = {
  draft: "Rascunho",
  in_review: "Em revisão médica",
  approved: "Aprovado · interno",
};
function contentOf(p: PlanContent): PlanContent {
  return {
    title: p.title,
    goals: p.goals,
    actions: p.actions,
    frequency: p.frequency,
    period: p.period,
    review_on: p.review_on,
  };
}
export function CreateCarePlan({
  tenantId,
  patientId,
  encounterId,
}: {
  tenantId: string;
  patientId: string;
  encounterId: string | null;
}) {
  const router = useRouter(),
    busy = useRef(false);
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function create() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/clinics/${tenantId}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          patient_id: patientId,
          encounter_id: encounterId,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Não foi possível criar o plano.");
      router.push(`/clinicas/${tenantId}/planos/${data.id}`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Falha de conexão. Confira a lista de planos antes de tentar novamente.",
      );
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <>
      {error && <p role="alert">{error}</p>}
      <button disabled={pending} onClick={create}>
        {pending ? "Criando…" : "Criar rascunho interno"}
      </button>
    </>
  );
}
export function CarePlanEditor({ initial }: { initial: PlanDetail }) {
  const [detail, setDetail] = useState(initial),
    [content, setContent] = useState(() => contentOf(initial.plan));
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const busy = useRef(false),
    p = detail.plan,
    base = `/clinicas/${p.tenant_id}/planos/${p.id}`;
  const dirty = JSON.stringify(content) !== JSON.stringify(contentOf(p));
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => e.preventDefault();
    const click = (e: MouseEvent) => {
      if (
        (e.target as Element)?.closest("a[href], [data-leave-clinic]") &&
        !window.confirm("Há alterações não salvas. Sair sem salvar?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
  async function save(status: "draft" | "in_review" | "approved") {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/v1/clinics/${p.tenant_id}/plans/${p.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({ ...content, status, version: p.version }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Não foi possível salvar.");
      const next = result as PlanDetail;
      setDetail(next);
      setContent(contentOf(next.plan));
      setConfirmed(false);
      setNotice(
        status === "approved"
          ? "Revisão aprovada. O plano continua interno e não foi publicado ao paciente."
          : status === "in_review"
            ? "Confira o conteúdo salvo antes de aprovar."
            : p.status === "approved"
              ? "Nova revisão privada criada. A versão aprovada permanece no histórico."
              : "Rascunho salvo. Você pode sair e continuar depois.",
      );
    } catch (e) {
      setError(
        (e instanceof Error && e.name === "TimeoutError"
          ? "A conexão demorou mais que o esperado. Confira a versão salva antes de tentar novamente."
          : e instanceof Error
            ? e.message
            : "Falha ao salvar.") + " Seu texto permanece nesta tela.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <>
      <Link className="back-link" href={`/clinicas/${p.tenant_id}/planos`}>
        Voltar aos planos
      </Link>
      <header className="clinical-patient-header">
        <span className="patient-avatar patient-avatar-xl" aria-hidden="true">
          {p.patients?.display_name.slice(0, 2).toUpperCase()}
        </span>
        <div className="clinical-patient-title">
          <h1>{p.patients?.display_name ?? "Paciente"}</h1>
          <p>Plano de cuidado · Médico: {p.doctor_display_name}</p>
          <p>
            Revisão {p.revision} · {planLabels[p.status]}
          </p>
        </div>
      </header>
      <dl className="encounter-context-strip">
        <div>
          <dt>Visibilidade</dt>
          <dd>Somente equipe vinculada</dd>
        </div>
        <div>
          <dt>Último salvamento</dt>
          <dd>{clinicalTime(p.updated_at)}</dd>
        </div>
        <div>
          <dt>Origem</dt>
          <dd>
            {p.encounter_id ? (
              <Link
                href={`/clinicas/${p.tenant_id}/atendimentos/${p.encounter_id}`}
              >
                Ver atendimento
              </Link>
            ) : (
              "Acompanhamento do paciente"
            )}
          </dd>
        </div>
      </dl>
      <section className="panel encounter-record" aria-label="Plano de cuidado">
        <div className="section-heading encounter-record-heading">
          <div>
            <h2>
              {p.status === "draft"
                ? "Construir o plano"
                : p.status === "in_review"
                  ? "Revisar o plano"
                  : "Plano aprovado"}
            </h2>
            <p>
              Aprovar registra a decisão médica. A publicação ao paciente será
              uma etapa separada.
            </p>
          </div>
          <span role="status" className="record-save-state">
            {pending
              ? "Salvando…"
              : dirty
                ? "Alterações não salvas"
                : `Salvamento ${p.version}`}
          </span>
        </div>
        {error && (
          <p role="alert">
            {error}{" "}
            <a href={base} target="_blank" rel="noreferrer">
              Consultar versão salva em outra aba
            </a>
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {p.status === "draft" && detail.canEdit ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save("draft");
            }}
          >
            <fieldset disabled={pending} className="plan-fields">
              <legend className="sr-only">Conteúdo do plano</legend>
              {planFields.map(([key, label, max]) => (
                <label className="field" key={key}>
                  {label}
                  {key === "title" ? (
                    <input
                      name={key}
                      value={content[key]}
                      maxLength={max}
                      onChange={(e) =>
                        setContent({ ...content, [key]: e.target.value })
                      }
                    />
                  ) : (
                    <textarea
                      name={key}
                      value={content[key]}
                      maxLength={max}
                      rows={key === "actions" ? 6 : 3}
                      onChange={(e) =>
                        setContent({ ...content, [key]: e.target.value })
                      }
                    />
                  )}
                </label>
              ))}
              <label className="field">
                Data de revisão
                <input
                  type="date"
                  name="review_on"
                  value={content.review_on ?? ""}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      review_on: e.target.value || null,
                    })
                  }
                />
              </label>
            </fieldset>
            <div className="agenda-actions">
              <button disabled={pending} type="submit">
                Salvar rascunho
              </button>
              <button
                disabled={pending}
                type="button"
                onClick={() => void save("in_review")}
              >
                Salvar e revisar
              </button>
            </div>
          </form>
        ) : (
          <div className="plan-summary">
            {planFields.map(([key, label]) => (
              <section key={key}>
                <h3>{label}</h3>
                <p>{content[key] || "Não preenchido"}</p>
              </section>
            ))}
            <section>
              <h3>Data de revisão</h3>
              <p>
                {content.review_on?.split("-").reverse().join("/") ??
                  "Não definida"}
              </p>
            </section>
          </div>
        )}
        {detail.canEdit && p.status === "in_review" && (
          <div className="plan-approval">
            <label>
              <input
                type="checkbox"
                checked={confirmed}
                disabled={pending}
                onChange={(e) => setConfirmed(e.target.checked)}
              />{" "}
              Revisei os campos e confirmo minha aprovação médica desta revisão.
            </label>
            <div className="agenda-actions">
              <button
                disabled={pending || !confirmed}
                onClick={() => void save("approved")}
              >
                Aprovar revisão {p.revision}
              </button>
              <button disabled={pending} onClick={() => void save("draft")}>
                Voltar ao rascunho
              </button>
            </div>
          </div>
        )}
        {detail.canEdit && p.status === "approved" && (
          <div className="plan-approval">
            <p>
              Esta revisão não pode ser editada. Uma nova revisão começa como
              rascunho privado.
            </p>
            <button disabled={pending} onClick={() => void save("draft")}>
              Criar nova revisão
            </button>
          </div>
        )}
        {!detail.canEdit && (
          <p>
            Leitura para equipe vinculada. Somente o médico autor pode editar e
            aprovar.
          </p>
        )}
      </section>
      <section className="panel clinical-history-panel">
        <div className="section-heading">
          <div>
            <h2>Histórico preservado</h2>
            <p>Salvamentos e decisões médicas, com autoria e data.</p>
          </div>
        </div>
        {detail.versions.map((v) => (
          <details key={v.id} className="plan-history">
            <summary>
              Revisão {v.revision} · {planLabels[v.status]} · Salvamento{" "}
              {v.version} · {clinicalTime(v.created_at)}
            </summary>
            <p>Médico autor: {p.doctor_display_name}</p>
            <div className="plan-summary">
              {planFields.map(([key, label]) => (
                <section key={key}>
                  <h3>{label}</h3>
                  <p>{v[key] || "Não preenchido"}</p>
                </section>
              ))}
              <section>
                <h3>Data de revisão</h3>
                <p>
                  {v.review_on?.split("-").reverse().join("/") ??
                    "Não definida"}
                </p>
              </section>
            </div>
          </details>
        ))}
        <nav className="agenda-actions" aria-label="Páginas do histórico">
          {detail.page > 1 && (
            <Link href={`${base}?pagina=${detail.page - 1}`}>
              Mais recentes
            </Link>
          )}
          {detail.hasNext && (
            <Link href={`${base}?pagina=${detail.page + 1}`}>Mais antigos</Link>
          )}
        </nav>
      </section>
    </>
  );
}
