import { describe, expect, it } from "vitest";
import { needsMonthlyWeighIn } from "./weighInReminder";

const WEEK_START = new Date("2026-02-01T00:00:00");

describe("needsMonthlyWeighIn", () => {
  it("semana 1 nunca pede (é o próprio onboarding, não fim de mês)", () => {
    expect(needsMonthlyWeighIn(1, [], WEEK_START)).toBe(false);
  });

  it("semanas 2, 3, 4 não são início de mês novo", () => {
    expect(needsMonthlyWeighIn(2, [], WEEK_START)).toBe(false);
    expect(needsMonthlyWeighIn(3, [], WEEK_START)).toBe(false);
    expect(needsMonthlyWeighIn(4, [], WEEK_START)).toBe(false);
  });

  it("semana 5 (1ª semana do mês 2) pede pesagem mensal se não há uma registrada", () => {
    expect(needsMonthlyWeighIn(5, [], WEEK_START)).toBe(true);
  });

  it("semana 9 (1ª semana do mês 3) também pede", () => {
    expect(needsMonthlyWeighIn(9, [], WEEK_START)).toBe(true);
  });

  it("não pede se já existe pesagem mensal registrada nesta semana", () => {
    const weighIns = [{ tipo: "mensal" as const, createdAt: new Date("2026-02-01T10:00:00") }];
    expect(needsMonthlyWeighIn(5, weighIns, WEEK_START)).toBe(false);
  });

  it("uma pesagem semanal não conta — só a mensal satisfaz", () => {
    const weighIns = [{ tipo: "semanal" as const, createdAt: new Date("2026-02-01T10:00:00") }];
    expect(needsMonthlyWeighIn(5, weighIns, WEEK_START)).toBe(true);
  });

  it("uma pesagem mensal de uma semana anterior não satisfaz o mês novo", () => {
    const weighIns = [{ tipo: "mensal" as const, createdAt: new Date("2026-01-15T10:00:00") }];
    expect(needsMonthlyWeighIn(5, weighIns, WEEK_START)).toBe(true);
  });
});
