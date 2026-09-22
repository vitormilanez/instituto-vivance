// O dia do médico como eixo: o cabeçalho, o agrupamento por horário e o estado
// de dia sem consultas. Puro — a tela só compõe o que já está decidido aqui.
//
// Nada neste módulo ordena por relevância, prioridade ou gravidade: a ordem é
// sempre o horário marcado, e o texto nunca sugere diagnóstico ou conduta.
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

// "Hoje, terça 22 · 6 consultas". O dia é o de São Paulo, como o resto da Home.
const weekdayDay = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  timeZone: "America/Sao_Paulo",
});

export function dayHeading(today: string): string {
  const label = weekdayDay.format(new Date(`${today}T12:00:00Z`));
  return `Hoje, ${label}`;
}

export function dayCountLabel(count: number): string {
  return `${count} consulta${count === 1 ? "" : "s"}`;
}

export function homeDayHeader(input: { today: string; count: number }): string {
  return `${dayHeading(input.today)} · ${dayCountLabel(input.count)}`;
}

// Um dia sem consultas é dito com todas as letras, e "Entre consultas" abre no
// lugar. Nunca um placeholder nem dado de exemplo.
export function emptyDayCopy(): string {
  return "Nenhuma consulta marcada para hoje.";
}

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
  return [input.patientName, appointmentClock(input.startsAt), receivedCountLabel(input.received)].join(" · ");
}
