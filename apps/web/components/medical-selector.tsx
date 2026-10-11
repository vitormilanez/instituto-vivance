"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import "./medical-ui.css";

export type MedicalSelectionOption = {
  value: string;
  label: string;
  count?: number | null;
  href?: string;
  disabled?: boolean;
  tone?: "positive" | "negative" | "neutral";
};

export function MedicalSelector({ options, value, label, onChange, mode = "filter", id, className = "" }: {
  options: readonly MedicalSelectionOption[];
  value: string;
  label: string;
  onChange?: (value: string) => void;
  mode?: "filter" | "tabs" | "steps" | "navigation";
  id?: string;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (mode !== "tabs") return;
    const enabled = options.map((option, position) => ({ option, position })).filter(({ option }) => !option.disabled);
    if (!enabled.length) return;
    const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!direction && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const current = enabled.findIndex(({ position }) => position === index);
    const next = event.key === "Home" ? 0 : event.key === "End" ? enabled.length - 1 : (current + direction + enabled.length) % enabled.length;
    onChange?.(enabled[next].option.value);
    refs.current[enabled[next].position]?.focus();
  }
  const contents = (option: MedicalSelectionOption, index: number) => <>
    {mode === "steps" ? <strong className="medical-selector-count">{index + 1}</strong>
      : option.count !== undefined && <strong className="medical-selector-count">{option.count === null ? "—" : option.count}</strong>}
    <span>{option.label}</span>
  </>;
  return <div className={`medical-selector ${className}`} role={mode === "tabs" ? "tablist" : mode === "navigation" ? "navigation" : "group"} aria-label={label}>
    {options.map((option, index) => option.href && mode === "navigation" && !option.disabled
      ? <Link key={option.value} href={option.href} className="medical-selector-option" data-tone={option.tone} aria-current={option.value === value ? "page" : undefined}>{contents(option, index)}</Link>
      : <button key={option.value} ref={(node) => { refs.current[index] = node; }} type="button" className="medical-selector-option" data-tone={option.tone}
        id={id ? `${id}-tab-${option.value}` : undefined} role={mode === "tabs" ? "tab" : undefined}
        aria-selected={mode === "tabs" ? option.value === value : undefined} aria-pressed={mode === "filter" ? option.value === value : undefined}
        aria-current={mode === "steps" && option.value === value ? "step" : undefined}
        aria-controls={mode === "tabs" && id ? `${id}-panel-${option.value}` : undefined}
        tabIndex={mode === "tabs" && option.value !== value ? -1 : undefined} disabled={option.disabled}
        onClick={() => onChange?.(option.value)} onKeyDown={(event) => navigate(event, index)}>{contents(option, index)}</button>)}
  </div>;
}

export function MedicalTabs({ tabs, label, initialValue, className = "" }: {
  tabs: readonly (MedicalSelectionOption & { content: ReactNode })[];
  label: string;
  initialValue?: string;
  className?: string;
}) {
  const id = useId();
  const [active, setActive] = useState(initialValue ?? tabs[0]?.value ?? "");
  const selected = tabs.some((tab) => tab.value === active && !tab.disabled) ? active : tabs.find((tab) => !tab.disabled)?.value ?? "";
  return <section className={`medical-tabs ${className}`} aria-label={label}>
    <MedicalSelector options={tabs.map(({ value, label, count, disabled, tone }) => ({ value, label, count, disabled, tone }))} value={selected} label={label} onChange={setActive} mode="tabs" id={id} />
    {tabs.map((tab) => <div key={tab.value} className="medical-tab-panel" id={`${id}-panel-${tab.value}`} role="tabpanel" aria-labelledby={`${id}-tab-${tab.value}`} hidden={selected !== tab.value} tabIndex={0}>{tab.content}</div>)}
  </section>;
}
