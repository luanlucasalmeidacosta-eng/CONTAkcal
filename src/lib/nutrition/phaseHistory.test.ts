import { describe, expect, it } from "vitest";
import { getPhaseForWeek, type PhaseHistoryEntry } from "./phaseHistory";
import { getWeekStartDate } from "./week";

const PROTOCOL_START = "2026-01-01T10:00:00.000Z";

describe("getPhaseForWeek", () => {
  it("sem trocas, todas as semanas usam a única fase do histórico", () => {
    const history: PhaseHistoryEntry[] = [{ phase: "bulking", startedAt: PROTOCOL_START }];
    expect(getPhaseForWeek(history, 1, PROTOCOL_START)).toBe("bulking");
    expect(getPhaseForWeek(history, 5, PROTOCOL_START)).toBe("bulking");
  });

  it("troca de fase na semana 3 reflete nas semanas seguintes", () => {
    const week3Start = getWeekStartDate(PROTOCOL_START, 3).toISOString();
    const history: PhaseHistoryEntry[] = [
      { phase: "bulking", startedAt: PROTOCOL_START },
      { phase: "cutting", startedAt: week3Start },
    ];
    expect(getPhaseForWeek(history, 1, PROTOCOL_START)).toBe("bulking");
    expect(getPhaseForWeek(history, 2, PROTOCOL_START)).toBe("bulking");
    expect(getPhaseForWeek(history, 3, PROTOCOL_START)).toBe("cutting");
    expect(getPhaseForWeek(history, 4, PROTOCOL_START)).toBe("cutting");
  });
});
