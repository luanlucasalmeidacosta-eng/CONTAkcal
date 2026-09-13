import { describe, expect, it } from "vitest";
import { buildPostMealFeedback } from "./feedback";

describe("buildPostMealFeedback", () => {
  it("mostra quanto falta de proteína e as calorias restantes (spec 7.4)", () => {
    const text = buildPostMealFeedback({
      proteinConsumed: 92,
      proteinGoal: 170,
      carbsConsumed: 96,
      fatConsumed: 38,
      caloriesRemaining: 1150,
    });
    expect(text).toBe(
      "Faltam 78g de proteína hoje. Você consumiu 96g de carboidrato e 38g de gordura hoje. Ainda restam 1150 kcal disponíveis hoje.",
    );
  });

  it("comemora quando a proteína já bateu a meta", () => {
    const text = buildPostMealFeedback({
      proteinConsumed: 180,
      proteinGoal: 170,
      carbsConsumed: 96,
      fatConsumed: 38,
      caloriesRemaining: 500,
    });
    expect(text).toContain("Meta de proteína batida! +10g acima da meta.");
  });

  it("avisa quando as calorias disponíveis já foram ultrapassadas", () => {
    const text = buildPostMealFeedback({
      proteinConsumed: 50,
      proteinGoal: 170,
      carbsConsumed: 96,
      fatConsumed: 38,
      caloriesRemaining: -200,
    });
    expect(text).toContain("Você já ultrapassou as calorias disponíveis hoje.");
  });
});
