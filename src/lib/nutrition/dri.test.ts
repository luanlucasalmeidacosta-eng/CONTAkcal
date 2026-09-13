import { describe, expect, it } from "vitest";
import { calculateCarbGoal, calculateDerivedGoals, calculateEER } from "./dri";

describe("calculateEER", () => {
  it("calcula corretamente para homem sedentário", () => {
    // EER = 753.07 - (10.83*30) + (6.50*175) + (14.10*80)
    const result = calculateEER("masculino", "sedentario", 30, 175, 80);
    expect(result).toBe(Math.round(753.07 - 10.83 * 30 + 6.5 * 175 + 14.1 * 80));
  });

  it("calcula corretamente para mulher muito ativa", () => {
    const result = calculateEER("feminino", "muito_ativo", 25, 165, 60);
    expect(result).toBe(Math.round(511.83 - 7.01 * 25 + 9.07 * 165 + 12.56 * 60));
  });
});

describe("calculateDerivedGoals", () => {
  it("aplica 2g/kg proteína, 1g/kg gordura, 40ml/kg água", () => {
    expect(calculateDerivedGoals(80)).toEqual({
      proteinGrams: 160,
      fatGrams: 80,
      waterMl: 3200,
    });
  });
});

describe("calculateCarbGoal", () => {
  it("distribui o restante das calorias como carboidrato", () => {
    // 2000 kcal - (160g*4=640) - (80g*9=720) = 640 kcal -> 160g carbo
    expect(calculateCarbGoal(2000, 160, 80)).toBe(160);
  });

  it("nunca retorna carboidrato negativo", () => {
    expect(calculateCarbGoal(500, 160, 80)).toBe(0);
  });
});
