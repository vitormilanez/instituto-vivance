import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listPatients } from "@/modules/patients/service";
import { AccessError } from "@/modules/identity/service";
import { InputError, pageNumber, patientSearch } from "@/lib/validation";
import { ClinicShell } from "@/components/clinic-shell";
import { PatientInvitationForm } from "@/components/patient-invitation-form";
import { PatientInvitationList } from "@/components/patient-invitation-list";
import { listClinicPatientInvitations } from "@/modules/onboarding/service";
import { PatientForm } from "@/components/forms";
export const dynamic = "force-dynamic";

export default async function Patients({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { tenantId } = await params;
  const load = async () => {
    const query = await searchParams;
    const page = pageNumber(query.page),
      term = patientSearch(query.q);
    return { ...(await listPatients(tenantId, page, term)), page, term };
  };
  const context = await load().catch((error) => {
    if (error instanceof AccessError && error.status === 401) redirect("/");
    if (error instanceof AccessError || error instanceof InputError) notFound();
    throw error;
  });
  const canInvite =
    context.clinic.role === "admin" || context.clinic.role === "doctor";
  const invitationContext = canInvite
    ? await listClinicPatientInvitations(tenantId)
    : { doctors: [], invitations: [] };
  const doctors = invitationContext.doctors;
  const base = `/clinicas/${tenantId}/pacientes`;
  const pageHref = (page: number) =>
    `${base}?${new URLSearchParams({ q: context.term, page: String(page) })}`;
  return (
    <ClinicShell clinic={context.clinic} active="patients">
      <div className="page-heading">
        <div>
          <h1>Pacientes</h1>
          <p>Encontre um cadastro ou adicione uma pessoa à clínica.</p>
        </div>
        <Link
          className="button"
          href={canInvite ? "#convidar-paciente" : "#novo-paciente"}
        >
          {canInvite ? "Convidar paciente" : "Cadastrar paciente"}
        </Link>
      </div>
      <div className="grid patient-directory-grid">
        <section
          className="panel patient-directory-panel"
          aria-labelledby="patients-title"
        >
          <h2 id="patients-title">Cadastros da clínica</h2>
          <form action={base} className="search-form">
            <div>
              <label htmlFor="patient-search">Buscar por nome</label>
              <input
                id="patient-search"
                name="q"
                type="search"
                maxLength={80}
                defaultValue={context.term}
                placeholder="Digite o nome do paciente"
              />
            </div>
            <button type="submit">Buscar</button>
          </form>
          <p className="results-count" role="status">
            {context.count}{" "}
            {context.count === 1
              ? "cadastro encontrado"
              : "cadastros encontrados"}
            {context.term && (
              <>
                {" "}
                para “{context.term}” · <Link href={base}>Limpar busca</Link>
              </>
            )}
          </p>
          {context.patients.length === 0 ? (
            <div className="empty">
              <h3>
                {context.term
                  ? "Nenhum paciente encontrado"
                  : context.page > 1
                    ? "Nenhum cadastro nesta página"
                    : "Nenhum paciente cadastrado"}
              </h3>
              <p>
                {context.term
                  ? "Confira o nome ou tente buscar apenas parte dele."
                  : context.page > 1
                    ? "Volte para a página anterior."
                    : "Use o formulário de novo paciente para começar."}
              </p>
            </div>
          ) : (
            <ul className="list patient-list">
              {context.patients.map((p) => (
                <li key={p.id}>
                  <Link href={`${base}/${p.id}`}>
                    <span>
                      <strong>{p.display_name}</strong>
                      <small>
                        {p.birth_date
                          ? `Nascimento: ${p.birth_date.split("-").reverse().join("/")}`
                          : "Nascimento não informado"}
                      </small>
                    </span>
                    <span className="row-action">Ver ficha</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <nav className="pagination" aria-label="Paginação">
            {context.page > 1 ? (
              <Link href={pageHref(context.page - 1)}>Anterior</Link>
            ) : (
              <span />
            )}
            <small>Página {context.page}</small>
            {context.page * 25 < context.count ? (
              <Link href={pageHref(context.page + 1)}>Próxima</Link>
            ) : (
              <span />
            )}
          </nav>
        </section>
        <aside
          className="patient-directory-aside"
          aria-label="Acesso e cadastro de pacientes"
        >
          {canInvite && (
            <div id="convidar-paciente">
              <PatientInvitationForm
                tenantId={tenantId}
                role={context.clinic.role as "admin" | "doctor"}
                doctors={doctors}
              />
            </div>
          )}
          {canInvite && (
            <PatientInvitationList
              tenantId={tenantId}
              invitations={invitationContext.invitations}
            />
          )}
          <section className="panel" id="novo-paciente">
            <h2>Novo paciente</h2>
            <p>Informe os dados básicos para abrir a ficha.</p>
            <PatientForm tenantId={tenantId} />
          </section>
        </aside>
      </div>
    </ClinicShell>
  );
}
