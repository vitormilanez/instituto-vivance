import Link from "next/link";
import type { ReactNode } from "react";
import { Figtree } from "next/font/google";
import type { ClinicAccess } from "@/modules/identity/service";
import { patientTabFor, patientTabs } from "@/modules/workspace/navigation";
import { logout } from "@/app/actions";
import { identity } from "@/modules/identity/service";
import { ConnectionStatus } from "./patient/connection-status";
import { Icon, Mark } from "./patient/icons";
import { RegisterSheet, type RegisterItem } from "./patient/register-sheet";
import "@/app/patient.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

// O que o botão "Registrar" oferece, na ordem do dia a dia. O check-in, quando
// há um esperando a pessoa, vem primeiro e em destaque.
export function registerItems(base: string, checkInHref?: string | null): RegisterItem[] {
  return [
    ...(checkInHref
      ? [{ href: checkInHref, title: "Check-in de hoje", hint: "Cerca de 1 minuto", icon: "clip" as const, primary: true }]
      : []),
    { href: `${base}/peso`, title: "Peso e medidas", hint: "Um campo, um toque", icon: "scale" },
    { href: `${base}/refeicao`, title: "Refeição", hint: "Foto e, se quiser, uma descrição", icon: "food" },
    { href: `${base}/documentos#enviar-documento`, title: "Exame ou documento", hint: "Foto ou PDF", icon: "file" },
    { href: `${base}/receitas`, title: "Receita anterior", hint: "PDF, foto ou link da Memed", icon: "file" },
    { href: `${base}/conversas`, title: "Mensagem ao médico", hint: "Para dúvidas que podem esperar", icon: "chat" },
  ];
}

// A moldura da área do paciente. Abas: barra de título com o atalho de
// "Sentiu algo forte?", conteúdo e a barra inferior com o "Registrar" no meio
// (no computador, a navegação vira coluna lateral). Tarefas de tela cheia
// (registrar peso, refeição, sinais de alerta): só um "voltar" e o título.
export async function PatientShell({
  clinic,
  active,
  title,
  heading = "bar",
  backHref,
  checkInHref,
  children,
}: {
  clinic: ClinicAccess;
  active: string;
  title: string;
  heading?: "bar" | "page";
  backHref?: string;
  checkInHref?: string | null;
  children: ReactNode;
}) {
  const base = `/clinicas/${clinic.id}/meu-cuidado`;
  const tab = patientTabFor(active);
  const items = registerItems(base, checkInHref);
  const task = !tab;
  const { user } = await identity();

  return (
    <div className={`pv ${figtree.variable}${task ? " pv-is-task" : ""}`} data-pv-owner={user.id}>
      <div className="pv-frame">
        {!task && (
          <aside className="pv-side" aria-label="Menu do paciente">
            <div className="pv-side-brand">
              <Mark size={40} />
              <span>
                <strong>Instituto Vivance</strong>
                {clinic.name !== "Instituto Vivance" && <small>{clinic.name}</small>}
              </span>
            </div>
            <RegisterSheet items={items} variant="side" />
            <nav>
              {patientTabs.map((item) => (
                <Link
                  key={item.slug}
                  href={`${base}/${item.slug}`}
                  aria-current={tab === item.slug ? "page" : undefined}
                >
                  <Icon name={item.icon} size={22} />
                  {item.title}
                </Link>
              ))}
            </nav>
            <div className="pv-side-foot">
              <Link href={`/clinicas/${clinic.id}/meu-perfil`}>Meu perfil</Link>
              <form action={logout}>
                <button type="submit" data-leave-clinic>Sair da conta</button>
              </form>
            </div>
          </aside>
        )}
        <div className="pv-column">
        {task ? (
          <header className="pv-taskbar">
            {backHref === "" ? (
              <Mark />
            ) : (
              <Link className="pv-icon-button" href={backHref ?? `${base}/hoje`} aria-label="Voltar">
                <Icon name="x" />
              </Link>
            )}
            {heading === "bar" ? <h1>{title}</h1> : <span className="pv-topbar-title">{title}</span>}
          </header>
        ) : (
          <header className="pv-topbar">
            <Link className="pv-topbar-home" href={`${base}/hoje`} aria-label="Instituto Vivance — início">
              <Mark />
            </Link>
            {heading === "bar" ? <h1>{title}</h1> : <span className="pv-topbar-title">{title}</span>}
            <Link className="pv-alert-pill" href={`${base}/alerta`}>
              <span className="pv-alert-pill-icon"><Icon name="alert" size={18} /></span>
              Sentiu algo forte?
            </Link>
          </header>
        )}
          <ConnectionStatus owner={user.id} />
          <main id="conteudo" className="pv-main">
            {children}
          </main>
        </div>
      </div>
      {!task && (
        <nav className="pv-tabbar" aria-label="Navegação do paciente">
          {patientTabs.slice(0, 2).map((item) => (
            <Link key={item.slug} className="pv-tab" href={`${base}/${item.slug}`} aria-current={tab === item.slug ? "page" : undefined}>
              <Icon name={item.icon} />
              <span>{item.title}</span>
            </Link>
          ))}
          <RegisterSheet items={items} />
          {patientTabs.slice(2).map((item) => (
            <Link key={item.slug} className="pv-tab" href={`${base}/${item.slug}`} aria-current={tab === item.slug ? "page" : undefined}>
              <Icon name={item.icon} />
              <span>{item.title}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
