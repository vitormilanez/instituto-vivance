import assert from "node:assert/strict";
import test from "node:test";
import {
  appointmentClock,
  dayCountLabel,
  dayHeading,
  emptyDayCopy,
  groupByHour,
  homeDayHeader,
  receivedCountLabel,
  stickyLabel,
  type DayAppointment,
} from "../modules/workspace/home-day.ts";

const appointment = (
  id: string,
  startsAt: string,
  patientName = "Paciente",
): DayAppointment => ({
  id,
  patientId: `patient-${id}`,
  patientName,
  startsAt,
  endsAt: startsAt,
  status: "scheduled",
});

test("o cabeçalho diz o dia da semana, o dia e quantas consultas", () => {
  // 22/09/2026 é uma terça-feira.
  assert.equal(dayHeading("2026-09-22"), "Hoje, terça-feira, 22");
  assert.equal(dayCountLabel(0), "0 consultas");
  assert.equal(dayCountLabel(1), "1 consulta");
  assert.equal(dayCountLabel(6), "6 consultas");
  assert.equal(
    homeDayHeader({ today: "2026-09-22", count: 6 }),
    "Hoje, terça-feira, 22 · 6 consultas",
  );
});

test("o dia sem consultas é dito claramente, sem placeholder", () => {
  assert.equal(emptyDayCopy(), "Nenhuma consulta marcada para hoje.");
  assert.doesNotMatch(emptyDayCopy(), /exemplo|demonstra|em breve/i);
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
