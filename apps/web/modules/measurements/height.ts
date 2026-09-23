// Altura é pedida em centímetros, mas muita gente escreve em metros (1,73).
// Um número entre 0 e 3 só pode ser metro: convertemos e avisamos. Fora da
// faixa plausível, pedimos para conferir e não enviamos o número.
export function heightInCentimeters(value: number | null): { value: number | null; note: string | null } {
  if (value === null) return { value: null, note: null };
  if (!Number.isFinite(value) || value <= 0)
    return { value: Number.NaN, note: "Use só algarismos, como 173." };
  if (value < 3) {
    const cm = Math.round(value * 100);
    return {
      value: cm,
      note: `Parece que você digitou em metros. Vamos salvar como ${cm} cm.`,
    };
  }
  if (value < 100 || value > 250)
    return { value: Number.NaN, note: "Confira o valor: a altura costuma ficar entre 100 e 250 cm." };
  return { value, note: null };
}
