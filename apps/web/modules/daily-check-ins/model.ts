// Check-in diário: as perguntas, a validação do envio e o que a tela mostra.
// Tudo aqui é relato do paciente — nada interpreta as respostas.
import { InputError, tenantId } from "../../lib/validation.ts";

export const effectKeys = ["nausea", "queasy", "bowel", "heartburn", "headache", "tiredness"] as const;
export type EffectKey = (typeof effectKeys)[number];
export const effectLabels: Record<EffectKey, string> = {
  nausea: "Náusea",
  queasy: "Enjoo",
  bowel: "Intestino",
  heartburn: "Azia",
  headache: "Dor de cabeça",
  tiredness: "Cansaço",
};
export const intensities = ["mild", "moderate", "strong"] as const;
export type Intensity = (typeof intensities)[number];
export const intensityLabels: Record<Intensity, string> = {
  mild: "Leve",
  moderate: "Moderado",
  strong: "Forte",
};
export const intensityLetters: Record<Intensity, string> = { mild: "L", moderate: "M", strong: "F" };

export const feelingLabels = ["Muito mal", "Mal", "Mais ou menos", "Bem", "Muito bem"] as const;
export const adherenceLabels = { yes: "Sim", partial: "Em parte", no: "Não" } as const;
export const reasonLabels = {
  forgot: "Esqueci",
  side_effect: "Efeito colateral",
  no_medication: "Faltou o remédio",
  other: "Outro motivo",
} as const;
export const siteLabels = { abdomen: "Abdômen", thigh: "Coxa", arm: "Braço" } as const;
export const sideLabels = { left: "Esquerdo", right: "Direito" } as const;

export type CheckInAnswers = {
  weight_kg?: number;
  feeling?: number;
  effects?: Partial<Record<EffectKey, Intensity>>;
  no_effects?: boolean;
  hunger?: number;
  satiety?: number;
  energy?: number;
  sleep?: number;
  water_glasses?: number;
  adherence?: keyof typeof adherenceLabels;
  adherence_reason?: keyof typeof reasonLabels;
  application_on?: string;
  application_time?: string;
  application_site?: keyof typeof siteLabels;
  application_side?: keyof typeof sideLabels;
  note?: string;
};

// As etapas, na ordem da tela. A de aplicação só existe se o médico ativou.
export function checkInSteps(applicationEnabled: boolean) {
  return [
    "weight",
    "feeling",
    "effects",
    "hunger",
    "energy",
    "water",
    "adherence",
    ...(applicationEnabled ? ["application"] : []),
    "note",
  ] as const;
}

const scale = (value: unknown, label: string) => {
  if (value === undefined || value === null) return undefined;
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 5)
    throw new InputError(`${label}: escolha de 1 a 5.`);
  return value as number;
};
const oneOf = <T extends string>(value: unknown, options: readonly T[], label: string) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !options.includes(value as T)) throw new InputError(`${label}: opção inválida.`);
  return value as T;
};

const allowed = new Set([
  "weight_kg", "feeling", "effects", "no_effects", "hunger", "satiety", "energy", "sleep",
  "water_glasses", "adherence", "adherence_reason", "application_on", "application_time",
  "application_site", "application_side", "note",
]);

// Valida o envio antes do banco (que valida de novo). Resposta pulada é
// ausência, nunca zero.
export function dailyCheckInInput(value: unknown, today: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("Check-in inválido.");
  const body = value as Record<string, unknown>;
  const requestKey = tenantId(String(body.request_key ?? ""));
  const raw = body.answers;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new InputError("Check-in inválido.");
  const input = raw as Record<string, unknown>;
  if (Object.keys(body).some((key) => key !== "request_key" && key !== "answers") || Object.keys(input).some((key) => !allowed.has(key)))
    throw new InputError("Check-in inválido.");
  const answers: CheckInAnswers = {};
  if (input.weight_kg !== undefined && input.weight_kg !== null) {
    const weight = Number(input.weight_kg);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 500) throw new InputError("Peso: informe um valor entre 0 e 500 kg.");
    answers.weight_kg = Math.round(weight * 100) / 100;
  }
  for (const [key, label] of [["feeling", "Como se sente"], ["hunger", "Fome"], ["satiety", "Saciedade"], ["energy", "Energia"], ["sleep", "Sono"]] as const) {
    const parsed = scale(input[key], label);
    if (parsed !== undefined) answers[key] = parsed;
  }
  if (input.effects !== undefined && input.effects !== null) {
    if (typeof input.effects !== "object" || Array.isArray(input.effects)) throw new InputError("Efeitos inválidos.");
    const effects: Partial<Record<EffectKey, Intensity>> = {};
    for (const [key, level] of Object.entries(input.effects as Record<string, unknown>)) {
      if (!effectKeys.includes(key as EffectKey) || !intensities.includes(level as Intensity)) throw new InputError("Efeitos inválidos.");
      effects[key as EffectKey] = level as Intensity;
    }
    if (Object.keys(effects).length) answers.effects = effects;
  }
  if (input.no_effects === true) {
    if (answers.effects) throw new InputError("Marque os efeitos ou \"Nenhum hoje\", não os dois.");
    answers.no_effects = true;
  }
  if (input.water_glasses !== undefined && input.water_glasses !== null) {
    if (!Number.isInteger(input.water_glasses) || (input.water_glasses as number) < 0 || (input.water_glasses as number) > 30)
      throw new InputError("Água: de 0 a 30 copos.");
    answers.water_glasses = input.water_glasses as number;
  }
  const adherence = oneOf(input.adherence, Object.keys(adherenceLabels) as (keyof typeof adherenceLabels)[], "Tratamento");
  if (adherence) answers.adherence = adherence;
  const reason = oneOf(input.adherence_reason, Object.keys(reasonLabels) as (keyof typeof reasonLabels)[], "Motivo");
  if (reason) {
    if (adherence !== "partial" && adherence !== "no") throw new InputError("O motivo vale só quando o tratamento não foi seguido.");
    answers.adherence_reason = reason;
  }
  if (input.application_on !== undefined && input.application_on !== null) {
    if (typeof input.application_on !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.application_on) || input.application_on > today)
      throw new InputError("Aplicação: informe o dia de hoje ou anterior.");
    answers.application_on = input.application_on;
  }
  if (input.application_time !== undefined && input.application_time !== null) {
    if (typeof input.application_time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.application_time))
      throw new InputError("Aplicação: horário inválido.");
    answers.application_time = input.application_time;
  }
  const site = oneOf(input.application_site, Object.keys(siteLabels) as (keyof typeof siteLabels)[], "Local");
  if (site) answers.application_site = site;
  const side = oneOf(input.application_side, Object.keys(sideLabels) as (keyof typeof sideLabels)[], "Lado");
  if (side) answers.application_side = side;
  if (input.note !== undefined && input.note !== null && input.note !== "") {
    if (typeof input.note !== "string" || [...input.note].length > 2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(input.note))
      throw new InputError("Recado: até 2.000 caracteres.");
    if (input.note.trim()) answers.note = input.note;
  }
  return { requestKey, answers };
}

const addDays = (day: string, days: number) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// Há check-in esperando a pessoa? Diário: se não houve hoje. A cada 3 dias:
// se o último foi há 3 dias ou mais (ou nunca houve).
export function checkInDue(lastOn: string | null, frequencyDays: number, today: string) {
  if (!lastOn) return { due: true, nextOn: today };
  const nextOn = addDays(lastOn, frequencyDays);
  return { due: nextOn <= today, nextOn: nextOn <= today ? today : nextOn };
}

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" });
export function nextCheckInLabel(nextOn: string, today: string) {
  if (nextOn === today) return "hoje";
  if (nextOn === addDays(today, 1)) return "amanhã";
  const [, month, day] = nextOn.split("-");
  const name = weekday.format(new Date(`${nextOn}T12:00:00Z`)).replace("-feira", "");
  return `${name}, ${day}/${month}`;
}

type Row = { check_in_on: string; effects: Record<string, string> | null };

// Mapa dos últimos 14 dias: por efeito, a intensidade de cada dia. Dia sem
// check-in é diferente de dia com check-in sem aquele efeito.
export function effectsMap(rows: Row[], today: string, days = 14) {
  const dates = Array.from({ length: days }, (_, index) => addDays(today, index - days + 1));
  const byDay = new Map<string, Record<string, string>>();
  for (const row of rows) {
    const current = byDay.get(row.check_in_on) ?? {};
    // Vários check-ins no mesmo dia: vale a intensidade mais forte relatada.
    for (const [key, level] of Object.entries(row.effects ?? {})) {
      const order = intensities.indexOf(level as Intensity);
      if (order > intensities.indexOf(current[key] as Intensity)) current[key] = level;
    }
    byDay.set(row.check_in_on, current);
  }
  const marked = effectKeys.filter((key) => rows.some((row) => row.effects && key in row.effects));
  return {
    dates,
    checkInDays: dates.filter((day) => byDay.has(day)).length,
    rows: marked.map((key) => ({
      key,
      label: effectLabels[key],
      cells: dates.map((day) => {
        if (!byDay.has(day)) return { day, state: "none" as const };
        const level = byDay.get(day)![key] as Intensity | undefined;
        return level ? { day, state: level } : { day, state: "clear" as const };
      }),
    })),
  };
}

// O que foi enviado, em frases curtas, para a tela de conclusão e para a
// leitura do médico. Repete o relato, não interpreta.
export function checkInSummary(answers: CheckInAnswers) {
  const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
  const rows: { label: string; value: string }[] = [];
  if (answers.weight_kg !== undefined) rows.push({ label: "Peso", value: `${decimal.format(answers.weight_kg)} kg` });
  if (answers.feeling) rows.push({ label: "Como se sentiu", value: feelingLabels[answers.feeling - 1] });
  if (answers.no_effects) rows.push({ label: "Efeitos", value: "Nenhum" });
  else if (answers.effects && Object.keys(answers.effects).length)
    rows.push({
      label: "Efeitos",
      value: Object.entries(answers.effects)
        .map(([key, level]) => `${effectLabels[key as EffectKey]} (${intensityLabels[level as Intensity].toLowerCase()})`)
        .join(", "),
    });
  if (answers.hunger || answers.satiety)
    rows.push({ label: "Fome · saciedade", value: `${answers.hunger ?? "–"} · ${answers.satiety ?? "–"} de 5` });
  if (answers.energy || answers.sleep)
    rows.push({ label: "Energia · sono", value: `${answers.energy ?? "–"} · ${answers.sleep ?? "–"} de 5` });
  if (answers.water_glasses !== undefined)
    rows.push({ label: "Água", value: `${answers.water_glasses} ${answers.water_glasses === 1 ? "copo" : "copos"}` });
  if (answers.adherence)
    rows.push({
      label: "Tratamento",
      value: `${adherenceLabels[answers.adherence]}${answers.adherence_reason ? ` · ${reasonLabels[answers.adherence_reason].toLowerCase()}` : ""}`,
    });
  if (answers.application_site || answers.application_on)
    rows.push({
      label: "Aplicação",
      value: [
        answers.application_on ? answers.application_on.split("-").reverse().slice(0, 2).join("/") : null,
        answers.application_time ?? null,
        answers.application_site ? siteLabels[answers.application_site] : null,
        answers.application_side ? sideLabels[answers.application_side].toLowerCase() : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  if (answers.note) rows.push({ label: "Recado", value: answers.note });
  return rows;
}

// Marcou algum efeito como forte? A tela oferece o atalho estático de Sinais
// de alerta. Não é triagem: é só o caminho para quem precisa.
export function hasStrongEffect(answers: CheckInAnswers) {
  return Object.values(answers.effects ?? {}).includes("strong");
}
