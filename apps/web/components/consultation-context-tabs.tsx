"use client";

import { useId, useState, type ReactNode } from "react";
import { MedicalSelector } from "@/components/medical-selector";

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
  const id = useId();
  const tabs = prescriptions
    ? [...baseTabs, { id: "prescriptions" as const, label: "Receitas" }]
    : baseTabs;
  const panels: Record<TabId, ReactNode> = { initial, preparation, received, prescriptions };

  return (
    <section className="doctor-context-tabs" aria-label="Contexto da consulta">
      <MedicalSelector mode="tabs" id={id} label="Contexto da consulta" options={tabs.map((tab) => ({ value: tab.id, label: tab.label }))} value={active} onChange={(value) => setActive(value as TabId)} />
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
