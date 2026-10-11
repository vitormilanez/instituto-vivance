// A data vem do dia da clínica, não do fuso do navegador.
export function widgetCalendar(today: string) {
  const date = new Date(`${today}T12:00:00Z`);
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  const format = (value: Date, options: Intl.DateTimeFormatOptions) =>
    value.toLocaleDateString("pt-BR", { ...options, timeZone: "UTC" });
  return {
    day: date.getUTCDate(),
    weekday: format(date, { weekday: "long" }),
    month: format(date, { month: "long", year: "numeric" }),
    days: Array.from({ length: 7 }, (_, index) => {
      const value = new Date(monday);
      value.setUTCDate(monday.getUTCDate() + index);
      const iso = value.toISOString().slice(0, 10);
      return { iso, day: value.getUTCDate(), label: format(value, { weekday: "short" }).replace(".", ""), current: iso === today };
    }),
  };
}
