"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

const views = {
  patients: "",
  invite: "#convidar-paciente",
  invitations: "#convites",
  register: "#novo-paciente",
} as const;
type View = keyof typeof views;
const viewFromHash = (hash: string): View =>
  (Object.keys(views) as View[]).find((view) => views[view] === hash) ?? "patients";
const getView = () => viewFromHash(window.location.hash);
const subscribe = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  window.addEventListener("popstate", notify);
  window.addEventListener("patient-directory-view", notify);
  return () => {
    window.removeEventListener("hashchange", notify);
    window.removeEventListener("popstate", notify);
    window.removeEventListener("patient-directory-view", notify);
  };
};

/** Keep panels mounted so switching tasks preserves search, drafts and results. */
export function PatientDirectoryWorkspace({ enabled, children, invitation, invitations, registration }: {
  enabled: boolean;
  children: ReactNode;
  invitation: ReactNode;
  invitations: ReactNode;
  registration: ReactNode;
}) {
  const view = useSyncExternalStore(subscribe, getView, () => "patients" as View);
  const root = useRef<HTMLDivElement>(null);

  function open(next: View) {
    const url = new URL(window.location.href);
    url.hash = views[next];
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
    window.dispatchEvent(new Event("patient-directory-view"));
    requestAnimationFrame(() => {
      root.current?.querySelector<HTMLElement>(`[data-directory-view="${next}"]`)?.focus({ preventScroll: true });
    });
  }

  useEffect(() => {
    if (!enabled) return;
    // Existing sidebar and home shortcuts keep their direct invitation links.
    const followShortcut = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search !== window.location.search) return;
      if (!(Object.values(views) as string[]).includes(url.hash)) return;
      event.preventDefault();
      link.closest("details.dv-mobile-tools")?.removeAttribute("open");
      open(viewFromHash(url.hash));
    };
    document.addEventListener("click", followShortcut, true);
    return () => document.removeEventListener("click", followShortcut, true);
  }, [enabled]);

  if (!enabled) return children;

  return <div className="dv-patients-workspace" ref={root}>
    <div className="dv-patients-toolbar">
      {view === "patients" ? <p>Busque um paciente e abra sua ficha.</p> :
        <button type="button" className="secondary" onClick={() => open("patients")}>Voltar para pacientes</button>}
      <div className="dv-patients-actions">
        {view !== "invitations" && <button type="button" className="secondary" onClick={() => open("invitations")}>Ver convites</button>}
        {view !== "invite" && <button type="button" onClick={() => open("invite")}>Convidar paciente</button>}
      </div>
    </div>
    <div data-directory-view="patients" tabIndex={-1} hidden={view !== "patients"} aria-label="Lista de pacientes">{children}</div>
    <div id="convidar-paciente" data-directory-view="invite" tabIndex={-1} hidden={view !== "invite"} aria-label="Convidar paciente">
      <div className="dv-invite-workspace">{invitation}</div>
      <div className="dv-patients-manual">
        <p>A pessoa aparecerá na lista de pacientes após aceitar o convite.</p>
        <button type="button" className="secondary" onClick={() => open("register")}>Cadastrar sem acesso ao app</button>
      </div>
    </div>
    <div id="convites" data-directory-view="invitations" tabIndex={-1} hidden={view !== "invitations"} aria-label="Histórico de convites">{invitations}</div>
    <div id="novo-paciente" data-directory-view="register" tabIndex={-1} hidden={view !== "register"} aria-label="Cadastro sem acesso ao app">
      <section className="panel dv-patients-registration">
        <h2>Cadastrar sem acesso ao app</h2>
        <p>Registre os dados básicos. Depois, você poderá enviar um convite pela própria ficha.</p>
        {registration}
      </section>
    </div>
  </div>;
}
