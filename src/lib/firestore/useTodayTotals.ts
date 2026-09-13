import { useEffect, useState } from "react";
import { sumTotals, subscribeTodayMeals } from "./meals";
import type { MealTotals } from "./types";

const EMPTY_TOTALS: MealTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function useTodayTotals(uid: string | undefined): MealTotals {
  const [totals, setTotals] = useState<MealTotals>(EMPTY_TOTALS);

  useEffect(() => {
    if (!uid) {
      setTotals(EMPTY_TOTALS);
      return;
    }
    return subscribeTodayMeals(uid, (meals) => setTotals(sumTotals(meals)));
  }, [uid]);

  return totals;
}
