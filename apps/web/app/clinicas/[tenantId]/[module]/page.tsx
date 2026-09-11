import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AccessError, requireClinic } from "@/modules/identity/service";
import { InputError } from "@/lib/validation";
import { findStaffModule, selectedTab } from "@/modules/workspace/navigation";
import { ClinicShell } from "@/components/clinic-shell";
import {
  DevelopmentNotice,
  EmptyConversation,
  EmptyModule,
  FutureButton,
  ModuleTabs,
} from "@/components/module-ui";
import { EmptyCalendar } from "@/components/empty-calendar";
import { CheckInError, staffCheckIns } from "@/modules/check-ins/service";
import { CheckInWorkspace } from "@/components/check-in-workspace";
import { staffLongitudinal } from "@/modules/longitudinal/service";
import { StaffLongitudinalWorkspace } from "@/components/longitudinal-workspace";
import { staffDocuments } from "@/modules/documents/service";
import { StaffDocumentsWorkspace } from "@/components/documents-workspace";
export const dynamic = "force-dynamic";

export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string; module: string }>;
  searchParams: Promise<{
    aba?: string | string[];
    pagina?: string;
    paciente?: string;
  }>;
}) {
  const { tenantId, module: slug } = await params;
  const area = findStaffModule(slug);
  if (!area) notFound();
  const { clinic } = await requireClinic(tenantId).catch((error) => {
    if (error instanceof AccessError && error.status === 401) redirect("/");
    if (error instanceof AccessError) notFound();
    throw error;
  });
  if (slug === "acompanhamento") {
    if (clinic.role === "admin")
      return (
        <ClinicShell clinic={clinic} active="acompanhamento">
          <h1>Acompanhamento</h1>
          <section className="panel">
            <h2>Acesso clínico restrito</h2>
            <p>
              O perfil administrativo não acessa relatos, medidas ou revisões
              clínicas.
            </p>
          </section>
        </ClinicShell>
      );
    const query = await searchParams;
    const active = query.aba === "evolucao" ? "evolucao" : "check-ins";
    const base = `/clinicas/${tenantId}/acompanhamento`;
    const longitudinal =
      active === "evolucao"
        ? await staffLongitudinal(tenantId, query.paciente).catch((error) => {
            if (error instanceof CheckInError || error instanceof InputError)
              redirect(`${base}?aba=evolucao`);
            throw error;
          })
        : null;
    return (
      <ClinicShell clinic={clinic} active="acompanhamento">
        <div className="page-heading">
          <div>
            <h1>Acompanhamento</h1>
            <p>Relatos, medidas e publicações com data e origem.</p>
          </div>
        </div>
        <nav className="module-tabs" aria-label="Áreas do acompanhamento">
          <Link
            href={`${base}?aba=check-ins`}
            aria-current={active === "check-ins" ? "page" : undefined}
          >
            Check-ins
          </Link>
          <Link
            href={`${base}?aba=evolucao`}
            aria-current={active === "evolucao" ? "page" : undefined}
          >
            Evolução
          </Link>
        </nav>
        {longitudinal ? (
          <StaffLongitudinalWorkspace
            initial={longitudinal}
            base={base}
          />
        ) : (
          <CheckInWorkspace
            initial={await staffCheckIns(tenantId, query.pagina)}
          />
        )}
      </ClinicShell>
    );
  }
  if (slug === "documentos") {
    if (clinic.role === "admin")
      return (
        <ClinicShell clinic={clinic} active="documentos">
          <h1>Documentos</h1>
          <section className="panel">
            <h2>Acesso clínico restrito</h2>
            <p>
              O perfil administrativo não acessa arquivos de pacientes nem seus
              metadados clínicos.
            </p>
          </section>
        </ClinicShell>
      );
    const query = await searchParams;
    return (
      <ClinicShell clinic={clinic} active="documentos">
        <div className="page-heading">
          <div>
            <h1>Documentos</h1>
            <p>Exames e arquivos privados no contexto de cada paciente.</p>
          </div>
        </div>
        <StaffDocumentsWorkspace
          initial={await staffDocuments(tenantId, query.pagina)}
        />
      </ClinicShell>
    );
  }
  const active = selectedTab(area.tabs, (await searchParams).aba);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return (
    <ClinicShell clinic={clinic} active={area.slug}>
      <div className="page-heading">
        <div>
          <h1>{area.title}</h1>
          <p>{area.description}</p>
        </div>
        <FutureButton>{area.action}</FutureButton>
      </div>
      <DevelopmentNotice />
      <ModuleTabs
        tabs={area.tabs}
        active={active}
        base={`/clinicas/${tenantId}/${slug}`}
      />
      {slug === "agenda" && active === "Calendário" ? (
        <EmptyCalendar initialDate={date} />
      ) : slug === "mensagens" ? (
        <EmptyConversation />
      ) : (
        <section className="panel module-board" aria-label={active}>
          <div className="section-heading">
            <h2>{active}</h2>
            <span className="quiet-label">Integração pendente</span>
          </div>
          <div className="module-columns" aria-hidden="true">
            {area.columns.map((column) => (
              <span key={column}>{column}</span>
            ))}
          </div>
          <EmptyModule title={area.empty}>{area.detail}</EmptyModule>
        </section>
      )}
      {slug === "planos" && (
        <p className="module-footnote">
          Fluxo previsto: rascunho, revisão médica, aprovação e publicação.
          Alterações posteriores criam uma nova versão.
        </p>
      )}
      {slug === "ia" && (
        <p className="module-footnote">
          A IA poderá organizar informações e sugerir rascunhos. Não poderá
          diagnosticar, prescrever ou aprovar o cuidado de forma autônoma.
        </p>
      )}
    </ClinicShell>
  );
}
