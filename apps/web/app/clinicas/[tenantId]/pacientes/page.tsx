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
import { ageInYears } from "@/lib/format";
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
    `${base}?${new URLSearchParams({ q: context.term, page: String(page) })}`;
  const doctorView = context.clinic.role === "doctor";
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
          <Link
            className={
              doctorView
                ? "button dv-primary-action"
                : "button page-heading-jump"
            }
            href={canInvite ? "#convidar-paciente" : "#novo-paciente"}
          >
            {doctorView
              ? "Convidar paciente"
              : canInvite
                ? "Adicionar paciente"
                : "Cadastrar paciente"}
          </Link>
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
            <p
              className={
                doctorView ? "results-count dv-results-count" : "results-count"
              }
              role="status"
            >
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
              <ul
                className={
                  doctorView
                    ? "list patient-list dv-patient-list"
                    : "list patient-list"
                }
              >
                {context.patients.map((p) => (
                  <li key={p.id}>
                    <Link href={`${base}/${p.id}`}>
                      <span>
                        <strong>{p.display_name}</strong>
                        <small>
                          {p.birth_date
                            ? `${ageInYears(p.birth_date)} ${ageInYears(p.birth_date) === 1 ? "ano" : "anos"} · nascimento em ${p.birth_date.split("-").reverse().join("/")}`
                            : "Nascimento não informado"}
                        </small>
                        {p.onboardingSubmittedAt && (
                          <span className="badge appointment-status completed patient-row-badge">
                            Cadastro inicial enviado
                          </span>
                        )}
                        {p.intakeStatus && (
                          <span
                            className={`badge appointment-status ${p.intakeStatus === "completed" ? "completed" : "scheduled"} patient-row-badge`}
                          >
                            {p.intakeStatus === "completed"
                              ? "Acolhimento concluído"
                              : "Acolhimento pendente"}
                          </span>
                        )}
                      </span>
                      <span className="row-action">Abrir ficha</span>
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
            className={
              doctorView ? "dv-directory-aside" : "patient-directory-aside"
            }
            aria-label="Acesso e cadastro de pacientes"
          >
            {canInvite && (
              <div
                id="convidar-paciente"
                className={doctorView ? "dv-action-panel" : undefined}
              >
                <PatientInvitationForm
                  tenantId={tenantId}
                  role={context.clinic.role as "admin" | "doctor"}
                  doctors={doctors}
                />
              </div>
            )}
            {canInvite &&
              (doctorView ? (
                <details className="dv-disclosure">
                  <summary>Ver convites recentes</summary>
                  <PatientInvitationList
                    tenantId={tenantId}
                    invitations={invitationContext.invitations}
                  />
                </details>
              ) : (
                <PatientInvitationList
                  tenantId={tenantId}
                  invitations={invitationContext.invitations}
                />
              ))}
            {doctorView ? (
              <details className="panel dv-disclosure" id="novo-paciente">
                <summary>Cadastrar sem acesso ao app</summary>
                <p>
                  Registre apenas os dados básicos para abrir uma ficha sem
                  convite agora.
                </p>
                <PatientForm tenantId={tenantId} role={context.clinic.role} />
              </details>
            ) : (
              <section className="panel" id="novo-paciente">
                <h2>Ficha sem acesso ao app</h2>
                <p>
                  Para quem não vai usar o app agora. Você registra os dados
                  básicos por ela; depois, pela ficha, dá para enviar o convite.
                </p>
                <PatientForm tenantId={tenantId} role={context.clinic.role} />
              </section>
            )}
          </aside>
        </div>
      </div>
    </ClinicShell>
  );
}
