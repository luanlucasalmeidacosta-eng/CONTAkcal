import { describe, expect, it } from "vitest";
import { computeStagnation, type WeighInSample } from "./stagnation";

function sample(peso: number, tipo: "semanal" | "mensal", daysAgo: number): WeighInSample {
  return { peso, tipo, createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000) };
}

describe("computeStagnation", () => {
  it("sem pesagens, não é estagnado", () => {
    expect(computeStagnation([]).isStagnant).toBe(false);
  });

  it("2 semanais seguidas com mesmo peso -> estagnado", () => {
    const weighIns = [sample(80, "semanal", 21), sample(80, "semanal", 14), sample(80, "semanal", 7)];
    const result = computeStagnation(weighIns);
    expect(result.weeksStagnant).toBe(2);
    expect(result.isStagnant).toBe(true);
  });

  it("semanais com variação recente -> não estagnado", () => {
    const weighIns = [sample(80, "semanal", 21), sample(80, "semanal", 14), sample(78, "semanal", 7)];
    const result = computeStagnation(weighIns);
    expect(result.weeksStagnant).toBe(0);
    expect(result.isStagnant).toBe(false);
  });

  it("só mensal, 1 sem variação -> estagnado", () => {
    const weighIns = [sample(80, "mensal", 60), sample(80, "mensal", 30)];
    const result = computeStagnation(weighIns);
    expect(result.monthsStagnant).toBe(1);
    expect(result.isStagnant).toBe(true);
  });

  it("tolerância de 0.1kg ignora ruído de balança", () => {
    const weighIns = [sample(80.0, "semanal", 14), sample(80.05, "semanal", 7)];
    expect(computeStagnation(weighIns).weeksStagnant).toBe(1);
  });
});
