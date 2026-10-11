"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

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
