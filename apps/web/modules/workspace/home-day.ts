// O dia do médico como eixo: o cabeçalho, o agrupamento por horário, a contagem
// por status e o estado de dia sem consultas. Puro — a tela só compõe o que já
// está decidido aqui.
//
// Nada neste módulo ordena por relevância, prioridade ou gravidade: a ordem é
// sempre o horário marcado, e nenhum texto sugere diagnóstico, conduta, risco
// ou urgência. Cancelada e falta continuam no eixo, com o status escrito.
export type DayAppointment = {
  id: string;
  patientId: string;
  patientName: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

export const dayStatusLabels: Record<string, string> = {
  scheduled: "Agendado",
  in_progress: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Falta",
};

// Status que contam como consulta do dia. Cancelada e falta ficam de fora do
// número principal e aparecem como contagens próprias, só quando existem.
const consultationStatuses = ["scheduled", "in_progress", "completed"];

export type DayCounts = {
  consultations: number;
  cancelled: number;
  noShow: number;
};

export function dayCounts(appointments: DayAppointment[]): DayCounts {
  return {
    consultations: appointments.filter((item) =>
      consultationStatuses.includes(item.status),
    ).length,
    cancelled: appointments.filter((item) => item.status === "cancelled").length,
    noShow: appointments.filter((item) => item.status === "no_show").length,
  };
}

// A próxima consulta nunca é uma cancelada nem uma falta.
export function nextConsultation(
  appointments: DayAppointment[],
): DayAppointment | null {
  return (
    appointments.find((item) => consultationStatuses.includes(item.status)) ??
    null
  );
}

// "terça" e não "terça-feira": sábado e domingo já vêm sem o sufixo.
const weekday = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  timeZone: "America/Sao_Paulo",
});
const dayNumber = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  timeZone: "America/Sao_Paulo",
});

export function dayHeading(today: string): string {
  const at = new Date(`${today}T12:00:00Z`);
  return `Hoje, ${weekday.format(at).replace("-feira", "")}, ${dayNumber.format(at)}`;
}

export function dayCountLabel(count: number): string {
  return `${count} consulta${count === 1 ? "" : "s"}`;
}

// O número principal são as consultas que vão acontecer ou aconteceram.
// Cancelada e falta entram depois, e só se existirem: "· 1 cancelada · 1 falta".
function countParts(counts: DayCounts): string[] {
  const parts = [dayCountLabel(counts.consultations)];
  if (counts.cancelled)
    parts.push(`${counts.cancelled} cancelada${counts.cancelled === 1 ? "" : "s"}`);
  if (counts.noShow)
    parts.push(`${counts.noShow} falta${counts.noShow === 1 ? "" : "s"}`);
  return parts;
}

export function homeDayHeader(input: { today: string; counts: DayCounts }): string {
  return `${dayHeading(input.today)} · ${countParts(input.counts).join(" · ")}`;
}

// Um dia sem consultas é dito com todas as letras. Se só houver cancelada ou
// falta, elas continuam nomeadas — nunca um placeholder nem dado de exemplo.
export function emptyDayCopy(counts: DayCounts = { consultations: 0, cancelled: 0, noShow: 0 }): string {
  const parts = ["Nenhuma consulta hoje"];
  if (counts.cancelled)
    parts.push(`${counts.cancelled} cancelada${counts.cancelled === 1 ? "" : "s"}`);
  if (counts.noShow) parts.push(`${counts.noShow} falta${counts.noShow === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

// O que a linha recolhida mostra quando não há vínculo de cuidado ativo com o
// profissional logado: nem contagem, nem zero — o fato.
export const noCareLinkRowLabel = "Sem vínculo ativo";

export const noCareLinkCopy =
  "Sem vínculo de cuidado ativo. O contexto aparece depois do aceite.";

export const noCareLinkAction = "Aceitar vínculo e trazer contexto";

// A hora de cada linha, no fuso da clínica. `startsAt` é instante; a hora é
// derivada, nunca fatiada da string ISO.
const hourMinute = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function appointmentClock(startsAt: string): string {
  return hourMinute.format(new Date(startsAt));
}

// Agrupa por horário de início, preservando a ordem cronológica recebida. Duas
// consultas no mesmo horário ficam no mesmo grupo, na ordem em que vieram.
export function groupByHour(
  appointments: DayAppointment[],
): { clock: string; appointments: DayAppointment[] }[] {
  const groups: { clock: string; appointments: DayAppointment[] }[] = [];
  for (const appointment of appointments) {
    const clock = appointmentClock(appointment.startsAt);
    const last = groups.at(-1);
    if (last && last.clock === clock) last.appointments.push(appointment);
    else groups.push({ clock, appointments: [appointment] });
  }
  return groups;
}

// O contador da linha recolhida e da faixa fixa. É o que foi recebido, nunca
// "pendente", "urgente" ou qualquer juízo sobre o conteúdo.
export function receivedCountLabel(count: number): string {
  return `${count} recebido${count === 1 ? "" : "s"}`;
}

export function stickyLabel(input: {
  patientName: string;
  startsAt: string;
  received: number;
}): string {
  return [
    input.patientName,
    appointmentClock(input.startsAt),
    receivedCountLabel(input.received),
  ].join(" · ");
}

// A linha de contagem sob o título do dia: "5 consultas · 1 cancelada". Dia sem
// consultas usa a cópia do dia vazio, que nomeia canceladas e faltas.
export function dayCountsLine(counts: DayCounts): string {
  if (!counts.consultations) return emptyDayCopy(counts);
  return countParts(counts).join(" · ");
}
