import { describe, expect, it } from "vitest";
import { availableToday, getProtocolWeekInfo, getWeekStartDate } from "./week";

describe("getProtocolWeekInfo", () => {
  it("dia 1 da semana 1 no dia do onboarding", () => {
    const info = getProtocolWeekInfo("2026-01-01T10:00:00.000Z", new Date("2026-01-01T22:00:00.000Z"));
    expect(info.weekIndex).toBe(1);
    expect(info.dayIndexInWeek).toBe(1);
    expect(info.daysRemainingInWeek).toBe(7);
  });

  it("dia 7 da semana 1", () => {
    const info = getProtocolWeekInfo("2026-01-01T10:00:00.000Z", new Date("2026-01-07T08:00:00.000Z"));
    expect(info.weekIndex).toBe(1);
    expect(info.dayIndexInWeek).toBe(7);
    expect(info.daysRemainingInWeek).toBe(1);
  });

  it("dia 1 da semana 2 (reinicia após 7 dias)", () => {
    const info = getProtocolWeekInfo("2026-01-01T10:00:00.000Z", new Date("2026-01-08T08:00:00.000Z"));
    expect(info.weekIndex).toBe(2);
    expect(info.dayIndexInWeek).toBe(1);
    expect(info.daysRemainingInWeek).toBe(7);
  });
});

describe("getWeekStartDate", () => {
  it("semana 1 começa no dia do onboarding", () => {
    const start = getWeekStartDate("2026-01-01T10:00:00.000Z", 1);
    expect(start.toISOString().slice(0, 10)).toBe("2026-01-01");
  });

  it("semana 3 começa 14 dias depois do onboarding", () => {
    const start = getWeekStartDate("2026-01-01T10:00:00.000Z", 3);
    expect(start.toISOString().slice(0, 10)).toBe("2026-01-15");
  });
});

describe("availableToday", () => {
  it("distribui igualmente quando nada foi consumido ainda", () => {
    expect(availableToday(14000, 0, 7)).toBe(2000);
  });

  it("sobra de dias anteriores aumenta a disponibilidade dos próximos dias", () => {
    // consumiu 1800 no dia 1 (meta 2000/dia) -> sobram 12200 para 6 dias
    expect(availableToday(14000, 1800, 6)).toBeCloseTo(2033.33, 1);
  });

  it("retorna 0 se não há dias restantes", () => {
    expect(availableToday(14000, 14000, 0)).toBe(0);
  });
});
