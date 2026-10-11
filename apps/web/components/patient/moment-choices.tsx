"use client";

import Image from "next/image";
import { BatteryLow, BatteryMedium, BatteryFull, Zap, Bed, CloudMoon, Moon, MoonStar, Sun, Utensils, Check, type LucideIcon } from "lucide-react";
import { momentLabels, type ScaleMoment } from "@/modules/daily-check-ins/experience";

export type MomentArt = "energy-low" | "energy-high" | "sleep" | "hunger" | "bathroom" | "meal";

export function MomentArtwork({ name, className = "" }: { name: MomentArt; className?: string }) {
  return <Image className={`moment-art ${className}`} src={`/illustrations/daily-moments/${name}.png`} width={160} height={160} sizes="160px" alt="" aria-hidden="true" />;
}

const symbols: Record<ScaleMoment, LucideIcon[]> = {
  energy: [BatteryLow, BatteryLow, BatteryMedium, BatteryFull, Zap],
  sleep: [Bed, CloudMoon, Moon, MoonStar, Sun],
  hunger: [Utensils, Utensils, Utensils, Utensils, Utensils],
};

// Explicit activation (tap, Enter or Space) may continue to the next question.
// Focus and hover never choose a response. Every option has a literal label.
export function MomentScale({ topic, value, onChoose, disabled = false, advance = false }: {
  topic: ScaleMoment;
  value?: number;
  onChoose: (value: number) => void;
  disabled?: boolean;
  advance?: boolean;
}) {
  return (
    <div className="moment-scale" role="group" aria-label={`${{ energy: "Energia", sleep: "Sono", hunger: "Fome" }[topic]}: de 1 a 5`}>
      {momentLabels[topic].map((label, index) => {
        const number = index + 1;
        const Symbol = symbols[topic][index];
        return (
          <button type="button" key={number} aria-pressed={value === number} disabled={disabled}
            aria-label={`${number} de 5 — ${label}${advance ? ". Escolher e continuar" : ""}`}
            onClick={() => onChoose(number)}>
            <span className="moment-choice-picture" aria-hidden="true">
              {topic === "energy" && (number === 1 || number === 5)
                ? <MomentArtwork name={number === 1 ? "energy-low" : "energy-high"} />
                : <Symbol size={30} strokeWidth={1.7} />}
            </span>
            <strong>{number}</strong><span className="moment-choice-label">{label}</span>
            {value === number && <Check className="moment-choice-check" size={16} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
