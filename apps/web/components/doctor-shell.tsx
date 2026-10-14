import Link from "next/link";
import Image from "next/image";
import { Figtree } from "next/font/google";
import { Sun, Inbox, Users, CalendarDays, MessageCircle, Search, Bell, Video } from "lucide-react";
import type { ReactNode } from "react";
import { logout } from "@/app/actions";
import type { ClinicAccess } from "@/modules/identity/service";
import { navLabel, staffModules } from "@/modules/workspace/navigation";
import { DoctorDockMore, DoctorNavPending } from "./doctor-nav-pending";
import "@/app/doctor.css";
import "@/app/doctor-home.css";
import "@/app/doctor-patients.css";
import "@/app/doctor-review.css";
import "@/app/doctor-communications.css";
import "@/app/doctor-workspace.css";
const figtree = Figtree({ subsets: ["latin"], variable: "--font-doctor-figtree" });

export function DoctorIcon({ name }: { name: string }) {
  const Icon = ({ home: Sun, review: Inbox, patients: Users, agenda: CalendarDays, teleconsulta: Video, mensagens: MessageCircle, search: Search, bell: Bell }[name]) ?? Inbox;
  return <Icon aria-hidden="true" size={21} strokeWidth={1.7} />;
}

export function DoctorShell({ clinic, active, notificationCount, children, focusMode = false }: {
  clinic: ClinicAccess; active: string; notificationCount: number; children: ReactNode; focusMode?: boolean;
}) {
  const base = `/clinicas/${clinic.id}`;
  const primary = [
    { key: "home", label: "Hoje", href: base },
    { key: "patients", label: "Pacientes", href: `${base}/pacientes` },
    { key: "agenda", label: "Agenda", href: `${base}/agenda` },
    { key: "teleconsulta", label: "Teleconsulta", href: `${base}/teleconsulta` },
    { key: "mensagens", label: "Mensagens", href: `${base}/mensagens` },
  ];
  const secondary = [
    { key: "review", label: "Para revisar", href: `${base}/revisar` },
    { key: "add-patient", label: "Adicionar paciente", href: `${base}/pacientes#convidar-paciente` },
    ...staffModules.filter((module) => !["agenda", "mensagens"].includes(module.slug))
      .map((module) => ({ key: module.slug, label: navLabel(module), href: `${base}/${module.slug}` })),
    { key: "team", label: "Equipe de cuidado", href: `${base}/equipe` },
  ];
  const name = clinic.displayName || "Médico";
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
  return (
    <div className={`dv dv-modern dv-area-${active} ${focusMode ? "dv-focus-mode" : ""} ${figtree.variable}`}>
      <div className="dv-workspace">
        <header className="dv-topbar">
          <Link className="dv-brand" href={base} aria-label="Vivance — Hoje">
            <Image className="dv-mark" src="/brand/vivance-mark.png" alt="" width={40} height={40} />
            <span><strong>Vivance</strong><small>{clinic.name}</small></span>
          </Link>
          {focusMode && <span className="dv-focus-label">Modo atendimento</span>}
          <form action={`${base}/pacientes`} role="search" className="dv-global-search">
            <DoctorIcon name="search" />
            <label className="sr-only" htmlFor="doctor-patient-search">Buscar paciente por nome</label>
            <input id="doctor-patient-search" name="q" type="search" maxLength={80} placeholder="Buscar paciente por nome" />
            <button type="submit">Buscar</button>
          </form>
          <Link className="dv-notifications" href={`${base}/avisos`} aria-label={`Avisos${notificationCount ? `: ${notificationCount} não lidos` : ""}`}>
            <DoctorIcon name="bell" /><span>Avisos</span>
            {notificationCount > 0 && <b>{notificationCount > 99 ? "99+" : notificationCount}</b>}
          </Link>
          <div className="dv-profile"><span className="dv-avatar" aria-hidden="true">{initials}</span><span><strong>{name}</strong><small>Médico</small></span></div>
        </header>
        <main id="conteudo" className="workspace-main dv-main">{children}</main>
      </div>
      <nav className="dv-bottom-dock" aria-label="Área do médico">
        {primary.map((link) => <Link key={link.key} href={link.href} aria-label={link.label} aria-current={active === link.key ? "page" : undefined}>
          <DoctorIcon name={link.key} /><span className="dv-dock-label-full">{link.label}</span><span className="dv-dock-label-short" aria-hidden="true">{link.key === "teleconsulta" ? "Vídeo" : link.key === "mensagens" ? "Chat" : link.label}</span><DoctorNavPending />
        </Link>)}
        <DoctorDockMore active={secondary.some((link) => link.key === active)}>
          {secondary.map((link) => <Link key={link.key} href={link.href} aria-current={active === link.key ? "page" : undefined}>{link.label}<DoctorNavPending /></Link>)}
          <div className="dv-dock-account"><Link href="/clinicas">Minhas clínicas</Link><form action={logout}><button type="submit" data-leave-clinic>Sair</button></form></div>
        </DoctorDockMore>
      </nav>
    </div>
  );
}
