import { describe, expect, it } from "vitest";
import { getGreeting } from "./greeting";

describe("getGreeting", () => {
  it("de manhã (5h-11h59) diz Bom dia", () => {
    expect(getGreeting(new Date("2026-01-01T08:00:00"))).toBe("Bom dia");
  });

  it("à tarde (12h-17h59) diz Boa tarde", () => {
    expect(getGreeting(new Date("2026-01-01T14:00:00"))).toBe("Boa tarde");
  });

  it("à noite (18h-4h59) diz Boa noite", () => {
    expect(getGreeting(new Date("2026-01-01T20:00:00"))).toBe("Boa noite");
    expect(getGreeting(new Date("2026-01-01T02:00:00"))).toBe("Boa noite");
  });
});
