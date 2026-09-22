import assert from "node:assert/strict";
import test from "node:test";
import {
  appointmentClock,
  dayCountLabel,
  dayCounts,
  dayHeading,
  emptyDayCopy,
  groupByHour,
  homeDayHeader,
  nextConsultation,
  noCareLinkAction,
  noCareLinkCopy,
  noCareLinkRowLabel,
  receivedCountLabel,
  stickyLabel,
  type DayAppointment,
} from "../modules/workspace/home-day.ts";

const appointment = (
  id: string,
  startsAt: string,
  status = "scheduled",
): DayAppointment => ({
  id,
  patientId: `patient-${id}`,
  patientName: "Paciente",
  startsAt,
  endsAt: startsAt,
  status,
});

test("o cabeçalho diz o dia sem '-feira' e conta as consultas do dia", () => {
  // 22/09/2026 é uma terça-feira; sábado e domingo já vêm sem o sufixo.
  assert.equal(dayHeading("2026-09-22"), "Hoje, terça, 22");
  assert.equal(dayHeading("2026-09-26"), "Hoje, sábado, 26");
  assert.equal(dayCountLabel(0), "0 consultas");
  assert.equal(dayCountLabel(1), "1 consulta");
  assert.equal(
    homeDayHeader({ today: "2026-09-22", counts: { consultations: 5, cancelled: 0, noShow: 0 } }),
    "Hoje, terça, 22 · 5 consultas",
  );
});

test("cancelada e falta ficam fora do número principal e entram depois, se existirem", () => {
  const appointments = [
    appointment("a", "2026-09-22T12:00:00Z", "scheduled"),
    appointment("b", "2026-09-22T13:00:00Z", "in_progress"),
    appointment("c", "2026-09-22T14:00:00Z", "completed"),
    appointment("d", "2026-09-22T15:00:00Z", "cancelled"),
    appointment("e", "2026-09-22T16:00:00Z", "no_show"),
  ];
  const counts = dayCounts(appointments);
  assert.deepEqual(counts, { consultations: 3, cancelled: 1, noShow: 1 });
  assert.equal(
    homeDayHeader({ today: "2026-09-22", counts }),
    "Hoje, terça, 22 · 3 consultas · 1 cancelada · 1 falta",
  );
  // Sem cancelada nem falta, o cabeçalho não ganha sufixo nenhum.
  assert.equal(
    homeDayHeader({ today: "2026-09-22", counts: { consultations: 5, cancelled: 0, noShow: 0 } }),
    "Hoje, terça, 22 · 5 consultas",
  );
  assert.match(
    homeDayHeader({ today: "2026-09-22", counts: { consultations: 1, cancelled: 2, noShow: 0 } }),
    /· 1 consulta · 2 canceladas$/,
  );
});

test("a próxima consulta nunca é uma cancelada nem uma falta", () => {
  const list = [
    appointment("cancelled-cedo", "2026-09-22T11:00:00Z", "cancelled"),
    appointment("falta", "2026-09-22T11:30:00Z", "no_show"),
    appointment("real", "2026-09-22T12:00:00Z", "scheduled"),
  ];
  assert.equal(nextConsultation(list)?.id, "real");
  assert.equal(
    nextConsultation([appointment("so-cancelada", "2026-09-22T11:00:00Z", "cancelled")]),
    null,
  );
});

test("o dia sem consultas nomeia o que sobrou, sem placeholder", () => {
  assert.equal(emptyDayCopy(), "Nenhuma consulta hoje");
  assert.equal(
    emptyDayCopy({ consultations: 0, cancelled: 2, noShow: 0 }),
    "Nenhuma consulta hoje · 2 canceladas",
  );
  assert.equal(
    emptyDayCopy({ consultations: 0, cancelled: 1, noShow: 1 }),
    "Nenhuma consulta hoje · 1 cancelada · 1 falta",
  );
  for (const copy of [emptyDayCopy(), emptyDayCopy({ consultations: 0, cancelled: 2, noShow: 0 })])
    assert.doesNotMatch(copy, /exemplo|demonstra|em breve/i);
});

test("sem vínculo ativo a linha diz o fato, e não zero", () => {
  assert.equal(noCareLinkRowLabel, "Sem vínculo ativo");
  assert.equal(
    noCareLinkCopy,
    "Sem vínculo de cuidado ativo. O contexto aparece depois do aceite.",
  );
  assert.equal(noCareLinkAction, "Aceitar vínculo e trazer contexto");
  // Nenhuma cópia de vínculo pode soar como contagem.
  assert.doesNotMatch(noCareLinkRowLabel, /\d/);
});

test("a hora vem do fuso da clínica, não do texto ISO", () => {
  // 12:00Z é 09:00 em São Paulo; 01:00Z do dia 23 já é 22:00 do dia 22.
  assert.equal(appointmentClock("2026-09-22T12:00:00Z"), "09:00");
  assert.equal(appointmentClock("2026-09-23T01:00:00Z"), "22:00");
});

test("agrupa por horário preservando a ordem cronológica", () => {
  const groups = groupByHour([
    appointment("a", "2026-09-22T12:00:00Z"),
    appointment("b", "2026-09-22T13:00:00Z"),
    appointment("c", "2026-09-22T13:00:00Z"),
    appointment("d", "2026-09-22T14:00:00Z"),
  ]);
  assert.deepEqual(
    groups.map((group) => [group.clock, group.appointments.length]),
    [
      ["09:00", 1],
      ["10:00", 2],
      ["11:00", 1],
    ],
  );
  // Duas no mesmo horário ficam na ordem em que chegaram — nada reordena.
  assert.deepEqual(
    groups[1].appointments.map((item) => item.id),
    ["b", "c"],
  );
});

test("o contador fala do que foi recebido, sem juízo sobre o conteúdo", () => {
  assert.equal(receivedCountLabel(0), "0 recebidos");
  assert.equal(receivedCountLabel(1), "1 recebido");
  assert.equal(receivedCountLabel(30), "30 recebidos");
  const label = stickyLabel({
    patientName: "Maria",
    startsAt: "2026-09-22T12:00:00Z",
    received: 2,
  });
  assert.equal(label, "Maria · 09:00 · 2 recebidos");
  assert.doesNotMatch(label, /urgente|atenção|crítico|prioridade/i);
});
