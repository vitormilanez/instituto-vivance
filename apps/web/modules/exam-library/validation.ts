import { InputError } from "../../lib/validation.ts";

export type ClinicalSourceInput = {
  title: string; url: string; version: string; excerpt: string; population: string;
  exclusions: string; validUntil: string | null;
  applicability: { analytes: string[]; units: string[]; referencePositions: string[];
    requiredContext: string[]; minAge?: number; maxAge?: number };
};

export function clinicalSourceInput(input: unknown): ClinicalSourceInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new InputError("Informe a fonte.");
  const body = input as Record<string, unknown>;
  const text = (field: string, min: number, max: number) => {
    const value = typeof body[field] === "string" ? body[field].trim() : "";
    if (value.length < min || value.length > max) throw new InputError("Confira os dados da fonte e o trecho original.");
    return value;
  };
  const url = text("url", 10, 1500);
  try { if (new URL(url).protocol !== "https:") throw new Error(); }
  catch { throw new InputError("Use um endereço HTTPS para a fonte original."); }
  if (!body.applicability || typeof body.applicability !== "object" || Array.isArray(body.applicability)) throw new InputError("Informe quando a fonte se aplica.");
  const raw = body.applicability as Record<string, unknown>;
  const list = (name: string, min: number, max: number) => {
    const values = raw[name];
    if (!Array.isArray(values) || values.length < min || values.length > max
      || values.some(value => typeof value !== "string" || !value.trim() || value.length > 200)) throw new InputError("Confira os exames, unidades e condições da fonte.");
    return [...new Set((values as string[]).map(value => value.trim()))];
  };
  const applicability: ClinicalSourceInput["applicability"] = {
    analytes: list("analytes", 1, 30), units: list("units", 1, 20),
    referencePositions: list("referencePositions", 1, 3), requiredContext: list("requiredContext", 0, 30),
  };
  if (applicability.referencePositions.some(value => !["above", "below", "within"].includes(value))) throw new InputError("Comparação com a referência inválida.");
  for (const field of ["minAge", "maxAge"] as const) {
    if (raw[field] === undefined || raw[field] === null) continue;
    if (typeof raw[field] !== "number" || !Number.isInteger(raw[field]) || raw[field] < 0 || raw[field] > 130) throw new InputError("Confira a faixa de idade.");
    applicability[field] = raw[field];
  }
  if (applicability.minAge !== undefined && applicability.maxAge !== undefined && applicability.minAge > applicability.maxAge) throw new InputError("A idade inicial deve ser menor que a final.");
  const validUntil = body.validUntil === null || body.validUntil === "" || body.validUntil === undefined ? null : text("validUntil", 10, 10);
  if (validUntil && (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil) || !Number.isFinite(Date.parse(validUntil)) || new Date(validUntil).toISOString().slice(0,10) !== validUntil)) throw new InputError("Data de revisão inválida.");
  return { title: text("title", 3, 200), url, version: text("version", 1, 100),
    excerpt: text("excerpt", 20, 6000), population: text("population", 3, 1000),
    exclusions: text("exclusions", 3, 1000), validUntil, applicability };
}
