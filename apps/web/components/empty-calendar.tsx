"use client";

import { useState } from "react";
import { EmptyModule } from "./module-ui";

export function EmptyCalendar({ initialDate }: { initialDate: string }) {
  const [month, setMonth] = useState(initialDate.slice(0, 7));
  const [selected, setSelected] = useState(initialDate);
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const title = first.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  function move(delta: number) {
    const next = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
    setMonth(next.toISOString().slice(0, 7));
    setSelected(next.toISOString().slice(0, 10));
  }
  return (
    <div className="calendar-workspace">
      <section className="calendar-month" aria-label="Calendário">
        <div className="calendar-toolbar">
          <button
            className="secondary"
            aria-label="Mês anterior"
            onClick={() => move(-1)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="m15 5-7 7 7 7" />
            </svg>
          </button>
          <h2 aria-live="polite">{title}</h2>
          <button
            className="secondary"
            aria-label="Próximo mês"
            onClick={() => move(1)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="m9 5 7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="calendar-grid">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
            <span className="calendar-weekday" key={day}>
              {day}
            </span>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, "0")}`;
            return (
              <button
                key={date}
                className="calendar-day"
                onClick={() => setSelected(date)}
                aria-pressed={selected === date}
                aria-label={new Date(`${date}T12:00:00Z`).toLocaleDateString(
                  "pt-BR",
                  { dateStyle: "full", timeZone: "UTC" },
                )}
                aria-current={date === initialDate ? "date" : undefined}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <button
          className="secondary calendar-today"
          onClick={() => {
            setMonth(initialDate.slice(0, 7));
            setSelected(initialDate);
          }}
        >
          Voltar para hoje
        </button>
      </section>
      <section className="calendar-schedule">
        <h2 aria-live="polite">
          {new Date(`${selected}T12:00:00Z`).toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "long",
            timeZone: "UTC",
          })}
        </h2>
        <EmptyModule title="Agendamento ainda indisponível">
          Você pode navegar pelo calendário. Os horários reais serão exibidos
          quando a agenda estiver conectada.
        </EmptyModule>
      </section>
    </div>
  );
}
