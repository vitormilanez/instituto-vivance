import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listPatients } from "@/modules/patients/service";
import { AccessError } from "@/modules/identity/service";
import { InputError } from "@/lib/validation";
import { ClinicShell } from "@/components/clinic-shell";
export const dynamic = "force-dynamic";

export default async function Dashboard({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const context = await listPatients(tenantId).catch((error) => {
    if (error instanceof AccessError && error.status === 401) redirect("/");
    if (error instanceof AccessError || error instanceof InputError) notFound();
    throw error;
  });
  const base = `/clinicas/${tenantId}`;
  const actions = [
    {
      title: "Pacientes",
      text: "Busque e abra uma ficha.",
      href: `${base}/pacientes`,
    },
    {
      title: "Novo paciente",
      text: "Comece pelo cadastro.",
      href: `${base}/pacientes#novo-paciente`,
    },
    {
      title: "Agenda",
      text: "Horários e compromissos da equipe.",
      href: `${base}/agenda`,
    },
    {
      title: "Atendimento",
      text: "Registro e evolução das consultas.",
      href: `${base}/atendimentos`,
    },
    {
      title: "Planos de cuidado",
      text: "Orientações revisadas e publicadas.",
      href: `${base}/planos`,
      pending: true,
    },
    {
      title: "Acompanhamento",
      text: "Check-ins e evolução entre consultas.",
      href: `${base}/acompanhamento`,
      pending: true,
    },
    {
      title: "Documentos",
      text: "Arquivos e exames do paciente.",
      href: `${base}/documentos`,
      pending: true,
    },
    {
      title: "Equipe de cuidado",
      text:
        context.clinic.role === "admin"
          ? "Gerencie acessos e vínculos."
          : "Revise suas responsabilidades.",
      href: `${base}/equipe`,
    },
  ];
  return (
    <ClinicShell clinic={context.clinic} active="home">
      <div className="page-heading">
        <div>
          <h1>Visão geral</h1>
          <p>Organize os cadastros e o próximo passo do cuidado.</p>
        </div>
        <Link className="button" href={`${base}/pacientes#novo-paciente`}>
          Cadastrar paciente
        </Link>
      </div>
      <section className="directory-summary" aria-label="Resumo da clínica">
        <div>
          <strong>{context.count}</strong>
          <span>
            {context.count === 1
              ? "paciente cadastrado"
              : "pacientes cadastrados"}
          </span>
        </div>
        <p>
          Cadastre os pacientes e organize consultas e retornos na Agenda.
          Médicos podem iniciar o registro em Atendimentos; o conteúdo clínico
          exige vínculo de cuidado ativo.
        </p>
      </section>
      <section aria-labelledby="quick-actions">
        <h2 id="quick-actions">Ações rápidas</h2>
        <div className="quick-actions">
          {actions.map((action) =>
            action.href ? (
              <Link
                className="quick-action"
                href={action.href}
                key={action.title}
              >
                <strong>{action.title}</strong>
                <span>{action.text}</span>
                <span className="action-state">
                  {action.pending ? "Conhecer a área" : "Abrir"}
                </span>
              </Link>
            ) : (
              <div className="quick-action unavailable" key={action.title}>
                <strong>{action.title}</strong>
                <span>{action.text}</span>
                <span className="action-state">
                  Em breve
                </span>
              </div>
            ),
          )}
        </div>
      </section>
      <section className="panel" aria-labelledby="directory-title">
        <div className="section-heading">
          <h2 id="directory-title">Pacientes da clínica</h2>
          <Link href={`${base}/pacientes`}>Ver todos</Link>
        </div>
        {context.patients.length === 0 ? (
          <div className="empty">
            <h3>Seu primeiro paciente começa aqui</h3>
            <p>Cadastre nome e nascimento para abrir a ficha individual.</p>
            <Link
              className="button secondary"
              href={`${base}/pacientes#novo-paciente`}
            >
              Cadastrar primeiro paciente
            </Link>
          </div>
        ) : (
          <ul className="list patient-list">
            {context.patients.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link href={`${base}/pacientes/${p.id}`}>
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
      </section>
    </ClinicShell>
  );
}
