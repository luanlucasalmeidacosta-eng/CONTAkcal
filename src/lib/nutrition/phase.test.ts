import { describe, expect, it } from "vitest";
import { applyPhaseAdjustment, applyStagnationBump } from "./phase";

describe("applyPhaseAdjustment", () => {
  it("manutenção não altera a calórica-base", () => {
    expect(applyPhaseAdjustment(2000, { phase: "manutencao" })).toBe(2000);
  });

  it("bulking soma o superávit escolhido", () => {
    expect(applyPhaseAdjustment(2000, { phase: "bulking", adjustmentKcal: 300 })).toBe(2300);
  });

  it("cutting subtrai o déficit escolhido", () => {
    expect(applyPhaseAdjustment(2000, { phase: "cutting", adjustmentKcal: 250 })).toBe(1750);
  });

  it("recomposição aplica -100kcal para perder gordura", () => {
    expect(
      applyPhaseAdjustment(2000, { phase: "recomposicao", recompIntent: "perder_gordura" }),
    ).toBe(1900);
  });

  it("recomposição aplica +100kcal para ganhar massa", () => {
    expect(
      applyPhaseAdjustment(2000, { phase: "recomposicao", recompIntent: "ganhar_massa" }),
    ).toBe(2100);
  });
});

describe("applyStagnationBump", () => {
  it("soma 100kcal ao adjustmentKcal atual", () => {
    expect(applyStagnationBump(300)).toBe(400);
  });

  it("funciona a partir de qualquer valor base", () => {
    expect(applyStagnationBump(250)).toBe(350);
  });
});
