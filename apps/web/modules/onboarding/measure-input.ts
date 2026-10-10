export type MeasureKey = "weightKg" | "heightCm" | "waistCm";
export function formatMeasure(value: number | null, key: MeasureKey): string {
  if (value === null) return "";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(key === "heightCm" ? value / 100 : value);
}
// UI uses metres for height; the data contract keeps centimetres.
export function parseMeasure(text: string, key: MeasureKey): number | null | undefined {
  if (!text.trim()) return null;
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(text.trim())) return undefined;
  const value = Number(text.trim().replace(",", "."));
  const min = key === "heightCm" ? 0.5 : 1;
  const max = key === "heightCm" ? 3 : key === "weightKg" ? 500 : 400;
  if (!Number.isFinite(value) || value < min || value > max) return undefined;
  return key === "heightCm" ? Math.round(value * 10000) / 100 : value;
}
