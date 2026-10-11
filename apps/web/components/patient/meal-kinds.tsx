"use client";

import { Coffee, Sun, Moon, Sandwich, Utensils } from "lucide-react";

const kinds = [
  { value: "breakfast", label: "Café", icon: Coffee },
  { value: "lunch", label: "Almoço", icon: Sun },
  { value: "dinner", label: "Jantar", icon: Moon },
  { value: "snack", label: "Lanche", icon: Sandwich },
  { value: "other", label: "Outro", icon: Utensils },
] as const;

export function MealKinds({ value, defaultValue, onChange, disabled = false }: {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return <div className="moment-meal-kinds">
    {kinds.map(({ value: kind, label, icon: KindIcon }) => <label key={kind}>
      <input type="radio" name="meal_type" value={kind} disabled={disabled}
        {...(value === undefined ? { defaultChecked: kind === defaultValue } : { checked: kind === value })}
        onChange={() => onChange?.(kind)} aria-label={kind === "breakfast" ? "Café da manhã" : label} />
      <span><KindIcon size={22} aria-hidden="true" />{label}</span>
    </label>)}
  </div>;
}
