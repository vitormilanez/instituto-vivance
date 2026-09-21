"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

// On a wide screen there is room for every area, so "Mais" opens itself and
// its summary steps aside (CSS hides it at the same breakpoint). Narrower
// windows keep the four-choice sidebar with the group collapsed.
const WIDE = "(min-width: 1280px)";

export function ClinicNavMore({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // A person who collapses the group on a wide screen keeps it collapsed
  // until they change it back, even as the window is resized.
  const touched = useRef(false);
  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const sync = () => {
      if (!touched.current) setOpen(defaultOpen || query.matches);
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [defaultOpen]);
  return (
    <details
      className="workspace-nav-more"
      open={open}
      onToggle={(event) => {
        touched.current = true;
        setOpen(event.currentTarget.open);
      }}
    >
      <summary>Mais</summary>
      <div>{children}</div>
    </details>
  );
}
