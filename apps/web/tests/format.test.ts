import assert from "node:assert/strict";
import test from "node:test";
import { ageInYears, sentenceCase } from "../lib/format.ts";

test("sentence case capitaliza só a primeira letra da data em pt-BR", () => {
  assert.equal(sentenceCase("setembro de 2026"), "Setembro de 2026");
  assert.equal(
    sentenceCase("quarta-feira, 16 de setembro"),
    "Quarta-feira, 16 de setembro",
  );
  // Nada de Title Case: os nomes de mês e de dia seguem minúsculos.
  assert.ok(!sentenceCase("terça-feira, 15 de setembro").includes(" De "));
});

test("sentence case preserva texto já capitalizado e não quebra vazio", () => {
  assert.equal(sentenceCase("Agenda"), "Agenda");
  assert.equal(sentenceCase(""), "");
});

test("idade conta anos completos antes, no dia e depois do aniversário", () => {
  assert.equal(ageInYears("1985-03-15", "2026-03-14"), 40);
  assert.equal(ageInYears("1985-03-15", "2026-03-15"), 41);
  assert.equal(ageInYears("1985-03-15", "2026-09-19"), 41);
});

test("idade atravessa a virada do ano sem adiantar o aniversário", () => {
  assert.equal(ageInYears("2000-12-31", "2026-01-01"), 25);
  assert.equal(ageInYears("2000-01-01", "2026-01-01"), 26);
});
