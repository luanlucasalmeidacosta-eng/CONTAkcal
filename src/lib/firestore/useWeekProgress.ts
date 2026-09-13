import { useEffect, useMemo, useState } from "react";
import { getProtocolWeekInfo, type ProtocolWeekInfo } from "@/lib/nutrition/week";
import { subscribeWeekMeals, sumTotals, type MealWithId } from "./meals";
import type { MealTotals } from "./types";

export interface WeekProgress {
  weekInfo: ProtocolWeekInfo;
  /** Refeições do bloco semanal atual, agrupadas por dia (1-7). */
  mealsByDay: Map<number, MealWithId[]>;
  /** Soma de todos os dias já passados da semana (exclui hoje) — usado na redistribuição dinâmica. */
  consumedPreviousDays: MealTotals;
  /** Soma da semana inteira até agora, incluindo hoje — usado na aba "Semana". */
  weekTotalsSoFar: MealTotals;
}

const EMPTY_TOTALS: MealTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

function dayIndexFor(date: Date, weekStart: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.floor((date.setHours(0, 0, 0, 0) - weekStart.getTime()) / msPerDay);
  return Math.min(Math.max(diff + 1, 1), 7);
}

export function useWeekProgress(uid: string | undefined, protocolStartedAt: string | undefined): WeekProgress {
  const [meals, setMeals] = useState<MealWithId[]>([]);
  const weekInfo = useMemo(
    () => getProtocolWeekInfo(protocolStartedAt ?? new Date().toISOString()),
    [protocolStartedAt],
  );

  useEffect(() => {
    if (!uid || !protocolStartedAt) {
      setMeals([]);
      return;
    }
    return subscribeWeekMeals(uid, weekInfo.weekStart, setMeals);
  }, [uid, protocolStartedAt, weekInfo.weekStart]);

  return useMemo(() => {
    const mealsByDay = new Map<number, MealWithId[]>();
    const previousDaysMeals: MealWithId[] = [];

    for (const meal of meals) {
      const createdAt = (meal.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date();
      const dayIndex = dayIndexFor(new Date(createdAt), weekInfo.weekStart);
      const bucket = mealsByDay.get(dayIndex) ?? [];
      bucket.push(meal);
      mealsByDay.set(dayIndex, bucket);
      if (dayIndex < weekInfo.dayIndexInWeek) previousDaysMeals.push(meal);
    }

    return {
      weekInfo,
      mealsByDay,
      consumedPreviousDays: previousDaysMeals.length ? sumTotals(previousDaysMeals) : EMPTY_TOTALS,
      weekTotalsSoFar: meals.length ? sumTotals(meals) : EMPTY_TOTALS,
    };
  }, [meals, weekInfo]);
}
