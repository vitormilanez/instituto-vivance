import { InputError, tenantId } from "../../lib/validation.ts";

const mealTypes = ["breakfast", "lunch", "dinner", "snack", "other"] as const;

// A 2.000-character report may reach 8 KB as UTF-8 (accents and emoji), so the
// transport bound stays safely above the character limit instead of rejecting
// a valid report written in Portuguese.
export const patientMealMaxBodyBytes = 12_000;

function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Dados inválidos.");
  return value as Record<string, unknown>;
}

export function mealInput(value: unknown) {
  const body = object(value);
  if (Object.keys(body).some((key) => !["request_key", "meal_type", "eaten_at", "description"].includes(key)))
    throw new InputError("Registro de refeição inválido.");
  if (typeof body.meal_type !== "string" || !mealTypes.includes(body.meal_type as (typeof mealTypes)[number]))
    throw new InputError("Escolha o tipo de refeição.");
  if (typeof body.eaten_at !== "string" || Number.isNaN(Date.parse(body.eaten_at)))
    throw new InputError("Informe um horário válido.");
  if (typeof body.description !== "string")
    throw new InputError("Descreva sua refeição.");
  // The report is persisted exactly as sent. Only the emptiness test normalises
  // whitespace, and the 1–2.000 limit counts code points, like char_length.
  const description = body.description;
  if (
    description.trim().length < 1 ||
    [...description].length > 2000 ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(description)
  )
    throw new InputError("Descreva a refeição em até 2.000 caracteres.");
  return {
    requestKey: tenantId(String(body.request_key)),
    mealType: body.meal_type,
    eatenAt: new Date(body.eaten_at).toISOString(),
    description,
  };
}

export const mealTypeLabels: Record<(typeof mealTypes)[number], string> = {
  breakfast: "Café da manhã",
  lunch: "Almoço",
  dinner: "Jantar",
  snack: "Lanche",
  other: "Outro horário",
};
