// pt-BR month and weekday names are lowercase. Headings and standalone
// date lines take sentence case ("Quarta-feira, 16 de setembro"), never
// the Title Case that `text-transform: capitalize` produces.
export const sentenceCase = (text: string) =>
  text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1);

// A data de hoje no calendário da clínica (Brasília), em AAAA-MM-DD.
export const clinicToday = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

// Idade em anos completos. A data de referência entra por parâmetro para o
// cálculo ser testável e não depender do relógio da máquina.
export function ageInYears(birthDate: string, today = clinicToday()) {
  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const [year, month, day] = today.split("-").map(Number);
  const beforeBirthday =
    month < birthMonth || (month === birthMonth && day < birthDay);
  return year - birthYear - (beforeBirthday ? 1 : 0);
}
