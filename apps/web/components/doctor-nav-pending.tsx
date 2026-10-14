"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";

export function DoctorDockMore({ children, active }: { children: ReactNode; active: boolean }) {
  const pathname = usePathname();
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (details.current) details.current.open = false; }, [pathname]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (details.current && !details.current.contains(event.target as Node)) details.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && details.current?.open) {
        details.current.open = false;
        details.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, []);
  return <details ref={details} className="dv-dock-more" data-active={active || undefined}
    onClickCapture={(event) => {
      if (!event.defaultPrevented && (event.target as Element).closest("a[href]")) {
        if (details.current) details.current.open = false;
      }
    }}>
    <summary aria-label="Mais áreas e conta"><Ellipsis size={22} aria-hidden="true" /><span>Mais</span></summary>
    <div className="dv-dock-popover"><strong>Ferramentas de cuidado</strong><div className="dv-dock-links">{children}</div></div>
  </details>;
}

export function DoctorNavPending() {
  const { pending } = useLinkStatus();
  return <span className="dv-nav-pending" data-pending={pending || undefined} aria-hidden="true" />;
}

export function DoctorMobileTools({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (details.current) details.current.open = false;
  }, [pathname]);

  return (
    <details
      ref={details}
      className="dv-mobile-tools"
      onClickCapture={(event) => {
        // Existing draft guards run on document capture before this handler.
        if (!event.defaultPrevented && (event.target as Element).closest("a[href]")) {
          if (details.current) details.current.open = false;
        }
      }}
    >
      <summary>Menu</summary>
      <nav aria-label="Outras áreas">{children}</nav>
    </details>
  );
}
