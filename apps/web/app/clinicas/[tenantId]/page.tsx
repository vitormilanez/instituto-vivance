import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listPatients } from "@/modules/patients/service";
import { AccessError } from "@/modules/identity/service";
import { InputError } from "@/lib/validation";
import { ClinicShell } from "@/components/clinic-shell";
import { TodayWorkspace } from "@/components/today-workspace";
import { todayWorkspace } from "@/modules/workspace/today";
export const dynamic = "force-dynamic";

// Ícones de traço 1.6 em 20x20, a mesma família da barra do celular.
const shortcutIcons: Record<string, string> = {
  pacientes:
    "M7.5 9a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM2.5 16.5c0-2.8 2.2-4.75 5-4.75s5 1.95 5 4.75M14 4.5v5M11.5 7h5",
  atendimento:
    "M7 4h6M6.5 4h7a.5.5 0 0 1 .5.5V16a.5.5 0 0 1-.5.5h-7A.5.5 0 0 1 6 16V4.5a.5.5 0 0 1 .5-.5ZM8.5 8h3M8.5 11h3",
  planos:
    "M5.5 3h6L15 6.5V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 5 17V3.5a.5.5 0 0 1 .5-.5ZM11 3v4h4",
  acompanhamento: "M3 14.5l4-4.5 3 2.5 4.5-6 2.5 2.5",
  documentos:
    "M3.5 5.5h4l1.5 2h7a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5Z",
  equipe:
    "M7.5 9a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM2.5 16.5c0-2.8 2.2-4.75 5-4.75s5 1.95 5 4.75M13 4a2.5 2.5 0 0 1 0 4.8M14.5 11.9c1.9.5 3 2.1 3 4.6",
};
function ShortcutIcon({ name }: { name: string }) {
  const d = shortcutIcons[name];
  if (!d) return null;
  return (
    <span className="more-tools-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" width="20" height="20">
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

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
  const today =
    context.clinic.role !== "admin" ? await todayWorkspace(tenantId) : null;
  const actions = [
    {
      title: "Pacientes",
      icon: "pacientes",
      text: "Busque e abra uma ficha.",
      href: `${base}/pacientes`,
    },
    {
      title: "Novo paciente",
      icon: "pacientes",
      text: "Comece pelo cadastro.",
      href: `${base}/pacientes#novo-paciente`,
    },
    {
      title: "Agenda",
      icon: "agenda",
      text: "Horários e compromissos da equipe.",
      href: `${base}/agenda`,
    },
    {
      title: "Atendimento",
      icon: "atendimento",
      text: "Registro e evolução das consultas.",
      href: `${base}/atendimentos`,
    },
    {
      title: "Planos de cuidado",
      icon: "planos",
      text: "Orientações revisadas e publicadas.",
      href: `${base}/planos`,
    },
    {
      title: "Acompanhamento",
      icon: "acompanhamento",
      text: "Check-ins e evolução entre consultas.",
      href: `${base}/acompanhamento`,
    },
    {
      title: "Documentos",
      icon: "documentos",
      text: "Arquivos e exames do paciente.",
      href: `${base}/documentos`,
    },
    {
      title: "Equipe de cuidado",
      icon: "equipe",
      text:
        context.clinic.role === "admin"
          ? "Gerencie acessos e vínculos."
          : "Revise suas responsabilidades.",
      href: `${base}/equipe`,
    },
  ];
  // O menu já leva a Pacientes, Agenda e Mensagens; os atalhos só repetem
  // o que está um nível abaixo.
  const primaryHrefs = new Set([
    `${base}/pacientes`,
    `${base}/agenda`,
    `${base}/mensagens`,
  ]);
  const shortcuts = (
    <section className="shortcuts-section" aria-labelledby="quick-actions">
      <h2 id="quick-actions">Atalhos</h2>
      <ul className="more-tools-list">
        {actions
          .filter((action) => !primaryHrefs.has(action.href))
          .map((action) => (
            <li key={action.title}>
              <Link className="more-tools-link" href={action.href}>
                <ShortcutIcon name={action.icon} />
                <strong>{action.title}</strong>
                <span>{action.text}</span>
              </Link>
            </li>
          ))}
      </ul>
    </section>
  );
  return (
    <ClinicShell clinic={context.clinic} active="home">
      {today ? (
        <TodayWorkspace base={base} data={today} shortcuts={shortcuts} />
      ) : (
        <>
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
              Médicos podem iniciar o registro em Atendimentos; o conteúdo
              clínico exige vínculo de cuidado ativo.
            </p>
          </section>
        </>
      )}
      {!today && (
        <section className="quick-actions-section" aria-labelledby="quick-actions-admin">
          <div className="quick-actions-heading">
            <h2 id="quick-actions-admin">Ações rápidas</h2>
            <p>Continue o cuidado pelo ponto certo, sem perder o contexto.</p>
          </div>
          <div className="quick-actions">
            {actions.map((action) => (
              <Link className="quick-action" href={action.href} key={action.title}>
                <strong>{action.title}</strong>
                <span>{action.text}</span>
                <span className="action-state">Abrir</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {!today && (
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
      )}
    </ClinicShell>
  );
}
