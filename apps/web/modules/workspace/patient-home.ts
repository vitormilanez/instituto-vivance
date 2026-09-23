// A Home do paciente, decidida aqui e só desenhada pela tela.
//
// Objetivo: colher a informação do paciente com o mínimo de atrito. A tela
// responde três perguntas, nesta ordem:
// 1. "O que eu faço agora?" — uma ação só, em destaque;
// 2. "O que mais a clínica espera de mim?" — o resto da fila, curto;
// 3. "Quero registrar algo" — atalhos diretos para os formulários.
// E confirma o que já foi enviado, para a pessoa saber que chegou.
//
// Linguagem simples e acolhedora; nada de urgência, risco ou cobrança.
import type { PatientTodayTask } from "./patient-today-tasks.ts";

export type PatientFocus = {
  kind: "consultation" | "task" | "clear";
  title: string;
  detail: string;
  action: string;
  href: string;
};

// A ação em destaque. Consulta em andamento vence tudo (a pessoa está na
// consulta agora). Depois, a primeira tarefa da fila, que já vem na ordem
// certa (pré-consulta obrigatória, pedido do médico, check-in…). Sem nada
// pendente, a tela diz isso com todas as letras e convida a registrar.
export function patientFocus(input: {
  base: string;
  consultationInProgress: boolean;
  tasks: PatientTodayTask[];
}): { focus: PatientFocus; rest: PatientTodayTask[] } {
  if (input.consultationInProgress)
    return {
      focus: {
        kind: "consultation",
        title: "Sua consulta está acontecendo agora",
        detail: "Veja o horário e as informações da consulta.",
        action: "Ver consulta",
        href: `${input.base}/consultas`,
      },
      rest: input.tasks,
    };
  const [first, ...rest] = input.tasks;
  if (first)
    return {
      focus: {
        kind: "task",
        title: first.title,
        detail: first.detail,
        action: first.action,
        href: first.href,
      },
      rest,
    };
  return {
    focus: {
      kind: "clear",
      title: "Tudo em dia por aqui",
      detail:
        "Não há nada pendente com você agora. Se quiser, registre como está a sua semana abaixo.",
      action: "Registrar peso",
      href: `${input.base}/peso`,
    },
    rest: [],
  };
}

export type QuickLog = {
  id: "measurements" | "meal" | "document" | "message";
  title: string;
  hint: string;
  href: string;
};

const shortDate = (isoDay: string) => isoDay.split("-").reverse().slice(0, 2).join("/");

// Número como a pessoa fala: sem zeros inúteis e com vírgula.
export function friendlyNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}

// Atalhos para registrar. Cada um abre o formulário certo, na âncora certa.
// O de medidas mostra o último valor, para a pessoa comparar sem abrir nada.
export function quickLogs(input: {
  base: string;
  doctorName: string | null;
  latestMeasurement: {
    measure_label: string;
    measure_value: number;
    measure_unit: string;
    reported_on: string;
  } | null;
}): QuickLog[] {
  const last = input.latestMeasurement;
  return [
    {
      id: "measurements",
      title: "Peso e medidas",
      hint: last
        ? `Último: ${last.measure_label.toLowerCase()} ${friendlyNumber(last.measure_value)} ${last.measure_unit} em ${shortDate(last.reported_on)}`
        : "Leva menos de um minuto",
      href: `${input.base}/peso`,
    },
    {
      id: "meal",
      title: "Refeição",
      hint: "O que você comeu, do seu jeito",
      href: `${input.base}/refeicao`,
    },
    {
      id: "document",
      title: "Exame ou documento",
      hint: "Foto ou PDF, direto do celular",
      href: `${input.base}/documentos#enviar-documento`,
    },
    {
      id: "message",
      title: "Mensagem ao médico",
      hint: "Para dúvidas que podem esperar a resposta",
      href: `${input.base}/conversas`,
    },
  ];
}

export type SentKind = "measurements" | "meal" | "document" | "checkin" | "daily" | "preparation" | "message";

export type SentItem = {
  kind: SentKind;
  // Agrupador: medidas enviadas juntas contam como um envio só.
  key: string;
  at: string;
  detail: string | null;
};

export const sentLabels: Record<SentKind, string> = {
  measurements: "Medidas",
  meal: "Refeição",
  document: "Exame ou documento",
  checkin: "Resposta ao check-in",
  daily: "Check-in",
  preparation: "Pré-consulta",
  message: "Mensagem",
};

export const sentLimit = 5;

// Os últimos envios, do mais recente para o mais antigo, sem repetir o mesmo
// envio (várias medidas de um formulário só viram uma linha).
export function recentSent(items: SentItem[]): SentItem[] {
  const seen = new Set<string>();
  return [...items]
    .sort((left, right) =>
      left.at !== right.at ? (left.at < right.at ? 1 : -1) : left.key < right.key ? 1 : -1,
    )
    .filter((item) => {
      const id = `${item.kind}:${item.key}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, sentLimit);
}

const dayMonth = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
});
const clock = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});
const isoDay = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function sentWhen(at: string, today: string): string {
  const instant = new Date(at);
  return isoDay.format(instant) === today
    ? `hoje, ${clock.format(instant)}`
    : dayMonth.format(instant);
}

// Saudação do topo da Home: a data por extenso curta e "Bom dia/Boa tarde/Boa
// noite" pela hora de Brasília.
const weekdayDate = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Sao_Paulo",
});
const hourOf = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  hour12: false,
  timeZone: "America/Sao_Paulo",
});

export function homeGreeting(now: Date, firstName: string | null) {
  const hour = Number(hourOf.format(now)) % 24;
  const hello = hour < 5 ? "Boa noite" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const date = weekdayDate.format(now).replace("-feira", "");
  return {
    date: date.charAt(0).toUpperCase() + date.slice(1),
    hello: firstName ? `${hello}, ${firstName}.` : `${hello}.`,
  };
}

const monthShort = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "America/Sao_Paulo" });
const dayNumber = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: "America/Sao_Paulo" });
const weekdayShort = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" });

// A consulta como a pessoa lê: selo com dia e mês e uma linha "Hoje, 20:34 –
// 21:04" (ou "Amanhã", ou o dia da semana, ou a data).
export function appointmentWhen(startsAt: string, endsAt: string, today: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const day = isoDay.format(start);
  const tomorrow = isoDay.format(new Date(new Date(`${today}T12:00:00-03:00`).getTime() + 86400000));
  const label =
    day === today
      ? "Hoje"
      : day === tomorrow
        ? "Amanhã"
        : (() => {
            const name = weekdayShort.format(start).replace("-feira", "");
            return `${name.charAt(0).toUpperCase()}${name.slice(1)}, ${dayMonth.format(start)}`;
          })();
  return {
    day: dayNumber.format(start),
    month: monthShort.format(start).replace(".", ""),
    line: `${label}, ${clock.format(start)} – ${clock.format(end)}`,
  };
}

// Confirmação que a Home mostra ao voltar de um registro (?enviado=peso).
// Só valores conhecidos: o texto nunca vem da URL.
const justSentLabels: Record<string, string> = {
  peso: "Peso enviado",
  medidas: "Medidas enviadas",
  refeicao: "Refeição enviada",
  lembrete: "Lembrete ativado",
};
export function justSentLabel(value: string | string[] | undefined): string | null {
  return typeof value === "string" && Object.hasOwn(justSentLabels, value)
    ? justSentLabels[value]
    : null;
}

// "AAAA-MM-DDTHH:MM" no horário de Brasília, para campos datetime-local.
const localParts = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Sao_Paulo",
});
export function clinicLocalDateTime(now: Date) {
  const parts = Object.fromEntries(localParts.formatToParts(now).map((part) => [part.type, part.value]));
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}

// "de hoje, às 20:34" / "de amanhã, às 10:00" / "de 28/09, às 10:00".
export function consultationLabel(startsAt: string, today: string) {
  const start = new Date(startsAt);
  const day = isoDay.format(start);
  const tomorrow = isoDay.format(new Date(new Date(`${today}T12:00:00-03:00`).getTime() + 86400000));
  const name = day === today ? "hoje" : day === tomorrow ? "amanhã" : dayMonth.format(start);
  return `de ${name}, às ${clock.format(start)}`;
}
