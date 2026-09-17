import { describe, expect, it } from "vitest";
import { computeFastEnd, computeFastProgress, formatCountdown } from "./fasting";

describe("computeFastEnd", () => {
  it("soma a duração em horas ao horário de início", () => {
    const start = new Date("2026-09-17T20:00:00");
    const end = computeFastEnd(start, 16);
    expect(end.toISOString()).toBe(new Date("2026-09-18T12:00:00").toISOString());
  });
});

describe("computeFastProgress", () => {
  it("no início, elapsed é 0 e pct é 0", () => {
    const start = new Date("2026-09-17T20:00:00");
    const progress = computeFastProgress(start, 16, start);
    expect(progress.elapsedMs).toBe(0);
    expect(progress.pct).toBe(0);
    expect(progress.isDone).toBe(false);
  });

  it("na metade do jejum, pct é 0.5", () => {
    const start = new Date("2026-09-17T20:00:00");
    const now = new Date("2026-09-18T04:00:00");
    const progress = computeFastProgress(start, 16, now);
    expect(progress.pct).toBeCloseTo(0.5);
    expect(progress.remainingMs).toBe(8 * 60 * 60 * 1000);
  });

  it("depois do fim, isDone é true e pct não passa de 1", () => {
    const start = new Date("2026-09-17T20:00:00");
    const now = new Date("2026-09-18T15:00:00");
    const progress = computeFastProgress(start, 16, now);
    expect(progress.isDone).toBe(true);
    expect(progress.pct).toBe(1);
    expect(progress.remainingMs).toBe(0);
  });
});

describe("formatCountdown", () => {
  it("formata horas, minutos e segundos com zero à esquerda", () => {
    const ms = (5 * 60 * 60 + 23 * 60 + 7) * 1000;
    expect(formatCountdown(ms)).toBe("05:23:07");
  });

  it("trata negativos como zero", () => {
    expect(formatCountdown(-1000)).toBe("00:00:00");
  });
});
