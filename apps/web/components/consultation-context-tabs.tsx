"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

type TabId = "initial" | "preparation" | "received" | "prescriptions";

const baseTabs: { id: Exclude<TabId, "prescriptions">; label: string }[] = [
  { id: "initial", label: "Cadastro inicial" },
  { id: "preparation", label: "Pré-consulta" },
  { id: "received", label: "Recebido desde a última consulta" },
];

// As três áreas têm dados já carregados no servidor. Este limite de cliente só
// controla qual área fica visível; ele não infere nem altera o contexto clínico.
export function ConsultationContextTabs({
  initial,
  preparation,
  received,
  prescriptions,
}: {
  initial: ReactNode;
  preparation: ReactNode;
  received: ReactNode;
  prescriptions?: ReactNode;
}) {
  const [active, setActive] = useState<TabId>("initial");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const id = useId();
  const tabs = prescriptions
    ? [...baseTabs, { id: "prescriptions" as const, label: "Receitas" }]
    : baseTabs;
  const panels: Record<TabId, ReactNode> = { initial, preparation, received, prescriptions };

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!direction && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + direction + tabs.length) % tabs.length;
    setActive(tabs[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <section className="doctor-context-tabs" aria-label="Contexto da consulta">
      <div className="doctor-context-tablist" role="tablist" aria-label="Contexto da consulta">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(node) => { tabRefs.current[index] = node; }}
            id={`${id}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`${id}-panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${id}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${tab.id}`}
          hidden={active !== tab.id}
          tabIndex={0}
        >
          {panels[tab.id]}
        </div>
      ))}
    </section>
  );
}
