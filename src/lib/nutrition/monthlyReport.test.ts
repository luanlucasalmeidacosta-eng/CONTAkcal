import { describe, expect, it } from "vitest";
import { getMonthForWeek, getWeeksForMonth, summarizePhasesByWeek } from "./monthlyReport";

describe("getMonthForWeek", () => {
  it("semana 1 pertence ao mês 1", () => {
    expect(getMonthForWeek(1)).toBe(1);
  });

  it("semana 4 ainda pertence ao mês 1 (bloco 1-4)", () => {
    expect(getMonthForWeek(4)).toBe(1);
  });

  it("semana 5 já pertence ao mês 2 (bloco 5-8)", () => {
    expect(getMonthForWeek(5)).toBe(2);
  });
});

describe("getWeeksForMonth", () => {
  it("mês 1 contém as semanas 1-4", () => {
    expect(getWeeksForMonth(1)).toEqual([1, 2, 3, 4]);
  });

  it("mês 2 contém as semanas 5-8", () => {
    expect(getWeeksForMonth(2)).toEqual([5, 6, 7, 8]);
  });
});

describe("summarizePhasesByWeek", () => {
  it("mês inteiro na mesma fase retorna só o nome da fase", () => {
    const weeks = [
      { weekIndex: 1, phase: "bulking" as const },
      { weekIndex: 2, phase: "bulking" as const },
    ];
    expect(summarizePhasesByWeek(weeks)).toBe("Bulking");
  });

  it("mês com fases misturadas detalha a divisão (exemplo da spec)", () => {
    const weeks = [
      { weekIndex: 1, phase: "bulking" as const },
      { weekIndex: 2, phase: "bulking" as const },
      { weekIndex: 3, phase: "bulking" as const },
      { weekIndex: 4, phase: "cutting" as const },
    ];
    expect(summarizePhasesByWeek(weeks)).toBe("3 semanas de Bulking + 1 semana de Cutting");
  });
});
