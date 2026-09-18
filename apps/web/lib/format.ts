// pt-BR month and weekday names are lowercase. Headings and standalone
// date lines take sentence case ("Quarta-feira, 16 de setembro"), never
// the Title Case that `text-transform: capitalize` produces.
export const sentenceCase = (text: string) =>
  text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1);
