"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Icon, type IconName } from "./icons";

export type RegisterItem = {
  href: string;
  title: string;
  hint: string;
  icon: IconName;
  primary?: boolean;
};

// O botão "Registrar" do meio da barra e a folha que ele abre. Registrar
// qualquer coisa fica a um toque, de qualquer aba.
export function RegisterSheet({
  items,
  variant = "tab",
}: {
  items: RegisterItem[];
  variant?: "tab" | "side";
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <>
      {variant === "tab" ? (
        <span className="pv-tab pv-tab-register">
          <button
            ref={trigger}
            type="button"
            className="pv-register-button"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Icon name="plus" size={28} />
            <span className="pv-visually-hidden">Registrar</span>
          </button>
          <span aria-hidden="true">Registrar</span>
        </span>
      ) : (
        <button
          ref={trigger}
          type="button"
          className="pv-side-register"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Icon name="plus" size={22} />
          Registrar
        </button>
      )}
      {open && (
        <div className="pv-sheet-backdrop" onClick={close}>
          <div
            ref={panel}
            className="pv-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pv-sheet-head">
              <h2 id={titleId}>O que quer registrar?</h2>
              <button type="button" className="pv-icon-button" aria-label="Fechar" onClick={close}>
                <Icon name="x" />
              </button>
            </div>
            <ul>
              {items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={() => setOpen(false)}>
                    <span className={`pv-sheet-icon${item.primary ? " is-primary" : ""}`}>
                      <Icon name={item.icon} size={22} />
                    </span>
                    <span className="pv-sheet-text">
                      <strong>{item.title}</strong>
                      <small>{item.hint}</small>
                    </span>
                    <Icon name="chevR" size={20} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
