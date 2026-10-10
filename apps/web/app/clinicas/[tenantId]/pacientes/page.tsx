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
import { patientBirthLabel } from "@/modules/patients/birth-date";
export const dynamic = "force-dynamic";

export default async function Patients({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{
    page?: string;
    q?: string;
    filtro?: string;
  }>;
}) {
  const { tenantId } = await params;
  const load = async () => {
    const query = await searchParams;
    const page = pageNumber(query.page),
      term = patientSearch(query.q);
    const filtro =
      query.filtro === "cadastro" ||
      query.filtro === "acolhimento-pendente" ||
      query.filtro === "acolhimento-concluido"
        ? query.filtro
        : "todos";
    return {
      ...(await listPatients(tenantId, page, term)),
      page,
      term,
      filtro,
    };
  };
  const context = await load().catch((error) => {
    if (error instanceof AccessError && error.status === 401)
      redirect("/login");
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
    `${base}?${new URLSearchParams({
      q: context.term,
      page: String(page),
      ...(context.filtro !== "todos" ? { filtro: context.filtro } : {}),
    })}`;
  const doctorView = context.clinic.role === "doctor";
  const filteredPatients = doctorView ? context.patients.filter((patient) => {
    if (context.filtro === "cadastro") return Boolean(patient.onboardingSubmittedAt);
    if (context.filtro === "acolhimento-pendente")
      return Boolean(patient.intakeStatus) && patient.intakeStatus !== "completed";
    if (context.filtro === "acolhimento-concluido")
      return patient.intakeStatus === "completed";
    return true;
  }) : context.patients;
  const filterHref = (filtro: string) => {
    const params = new URLSearchParams({ q: context.term, page: String(context.page) });
    if (filtro !== "todos") params.set("filtro", filtro);
    return `${base}?${params}`;
  };
  const displayedCount = doctorView ? filteredPatients.length : context.count;
  return (
    <ClinicShell clinic={context.clinic} active="patients">
      <div className={doctorView ? "dv-directory" : undefined}>
        <div className={doctorView ? "dv-directory-heading" : "page-heading"}>
          <div>
            <h1>Pacientes</h1>
            <p>
              {doctorView
                ? "Acompanhe os cadastros e abra a ficha certa para a próxima conversa."
                : "Encontre um cadastro ou adicione uma pessoa à clínica."}
            </p>
          </div>
          {!doctorView && (
            <Link
              className="button page-heading-jump"
              href={canInvite ? "#convidar-paciente" : "#novo-paciente"}
            >
              {canInvite ? "Adicionar paciente" : "Cadastrar paciente"}
            </Link>
          )}
        </div>
        <div
          className={
            doctorView ? "dv-directory-layout" : "grid patient-directory-grid"
          }
        >
          <section
            className={
              doctorView
                ? "panel dv-directory-panel"
                : "panel patient-directory-panel"
            }
            aria-labelledby="patients-title"
          >
            {doctorView && canInvite && (
              <div className="dv-invite-workspace" id="convidar-paciente">
                <PatientInvitationForm tenantId={tenantId} role="doctor" />
                <PatientInvitationList tenantId={tenantId} invitations={invitationContext.invitations} />
              </div>
            )}
            <div className={doctorView ? "dv-section-heading" : undefined}>
              <div>
                <h2 id="patients-title">Cadastros da clínica</h2>
                {doctorView && (
                  <p>Abra a ficha para consultar o contexto disponível.</p>
                )}
              </div>
              {doctorView && (
                <p className="dv-count">
                  {context.count}{" "}
                  {context.count === 1 ? "paciente" : "pacientes"}
                </p>
              )}
            </div>
            <form
              action={base}
              className={
                doctorView ? "search-form dv-search-form" : "search-form"
              }
            >
              {doctorView && context.filtro !== "todos" && (
                <input type="hidden" name="filtro" value={context.filtro} />
              )}
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
            {doctorView && (
              <nav
                className="dv-directory-filters"
                aria-label="Filtrar pacientes nesta página"
              >
                <span>Filtrar esta página</span>
                {[
                  ["todos", "Todos"],
                  ["cadastro", "Cadastro enviado"],
                  ["acolhimento-pendente", "Acolhimento pendente"],
                  ["acolhimento-concluido", "Acolhimento concluído"],
                ].map(([value, label]) => (
                  <Link
                    key={value}
                    href={filterHref(value)}
                    aria-current={context.filtro === value ? "page" : undefined}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            )}
            <p
              className={
                doctorView ? "results-count dv-results-count" : "results-count"
              }
              role="status"
            >
              {doctorView
                ? `${displayedCount} ${displayedCount === 1 ? "cadastro" : "cadastros"} nesta página`
                : `${displayedCount} ${displayedCount === 1 ? "cadastro encontrado" : "cadastros encontrados"}`}
              {context.term && (
                <>
                  {" "}
                  para “{context.term}” · <Link href={base}>Limpar busca</Link>
                </>
              )}
            </p>
            {filteredPatients.length === 0 ? (
              <div className="empty">
                <h3>
                  {doctorView && context.filtro !== "todos"
                    ? "Nenhum paciente neste filtro"
                    : context.term
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
                      : doctorView && canInvite ? "Os novos pacientes aparecem aqui depois de aceitar o convite. Adicione uma pessoa pelo formulário acima." : "Ajuste os filtros ou registre o primeiro paciente."}
                </p>
              </div>
            ) : (
              <>
                {doctorView && (
                  <div className="dv-directory-columns" aria-hidden="true">
                    <span>Paciente</span>
                    <span>Cadastro</span>
                    <span>Acolhimento</span>
                    <span />
                  </div>
                )}
              <ul
                className={
                  doctorView
                    ? "list patient-list dv-patient-list"
                    : "list patient-list"
                }
              >
                {filteredPatients.map((p) => (
                  <li key={p.id}>
                    <Link href={`${base}/${p.id}`}>
                      <span className={doctorView ? "dv-patient-identity" : undefined}>
                        {doctorView && (
                          <span className="patient-avatar" aria-hidden="true">
                            {p.display_name
                              .split(/\s+/)
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")
                              .toUpperCase()}
                          </span>
                        )}
                        <span>
                          <strong>{p.display_name}</strong>
                          <small>
                            {patientBirthLabel(p.birth_date, p.reportedBirthDate)}
                          </small>
                        </span>
                      </span>
                      {doctorView && (
                        <span className="dv-status-cell">
                          {p.onboardingSubmittedAt ? "Enviado" : "Não enviado"}
                        </span>
                      )}
                      {doctorView && (
                        <span className="dv-status-cell">
                          {p.intakeStatus === "completed"
                            ? "Concluído"
                            : p.intakeStatus
                              ? "Pendente"
                              : "Não iniciado"}
                        </span>
                      )}
                      {!doctorView && p.onboardingSubmittedAt && (
                        <span className="badge appointment-status completed patient-row-badge">
                          Cadastro inicial enviado
                        </span>
                      )}
                      {!doctorView && p.intakeStatus && (
                        <span
                          className={`badge appointment-status ${p.intakeStatus === "completed" ? "completed" : "scheduled"} patient-row-badge`}
                        >
                          {p.intakeStatus === "completed"
                            ? "Acolhimento concluído"
                            : "Acolhimento pendente"}
                        </span>
                      )}
                      <span className="row-action">Abrir ficha</span>
                    </Link>
                  </li>
                ))}
              </ul>
              </>
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
          {doctorView && (
            <aside className="dv-registration-aside" aria-label="Outras formas de cadastrar">
              <section className="dv-registration-guide">
                <h2>Um convite, um novo começo</h2>
                <p>A pessoa confirma seu acesso e preenche o perfil inicial. A ficha aparece aqui assim que ela aceita o convite.</p>
                <ol><li>Informe nome e contato.</li><li>Compartilhe o link ou envie por e-mail.</li><li>Acompanhe o aceite nesta lista.</li></ol>
              </section>
              <details className="dv-disclosure" id="novo-paciente">
                <summary>Cadastrar sem acesso ao app</summary>
                <p>Para quem prefere começar com ajuda da equipe. Você pode convidar depois, pela mesma ficha.</p>
                <PatientForm tenantId={tenantId} role={context.clinic.role} />
              </details>
            </aside>
          )}
          {!doctorView && <aside
            className={
              doctorView ? "dv-directory-aside" : "patient-directory-aside"
            }
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
                <h2>Ficha sem acesso ao app</h2>
                <p>
                  Para quem não vai usar o app agora. Você registra os dados
                  básicos por ela; depois, pela ficha, dá para enviar o convite.
                </p>
                <PatientForm tenantId={tenantId} role={context.clinic.role} />
            </section>
          </aside>}
        </div>
      </div>
    </ClinicShell>
  );
}
