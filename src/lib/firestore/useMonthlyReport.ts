import { useEffect, useState } from "react";
import { calculateCarbGoal } from "@/lib/nutrition/dri";
import { getMonthForWeek, getWeeksForMonth, summarizePhasesByWeek } from "@/lib/nutrition/monthlyReport";
import { applyPhaseAdjustment } from "@/lib/nutrition/phase";
import { getGoalEntryForWeek, type PhaseHistoryEntry } from "@/lib/nutrition/phaseHistory";
import { getWeekStartDate } from "@/lib/nutrition/week";
import { getMealsInRange, sumTotals } from "./meals";
import type { MealTotals } from "./types";

export interface WeekSummary {
  weekIndex: number;
  totals: MealTotals;
  /** Meta calórica que valia NAQUELA semana (histórica, não a atual). */
  calorieGoal: number;
  /** Meta de carboidrato derivada da meta calórica histórica dessa semana. */
  carbGoal: number;
}

export interface MonthlyReport {
  monthIndex: number;
  weeks: WeekSummary[];
  aggregateTotals: MealTotals;
  aggregateCalorieGoal: number;
  aggregateCarbGoal: number;
  phaseSummary: string;
  loading: boolean;
  error: string | null;
}

const EMPTY_TOTALS: MealTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export interface MonthlyReportGoalInputs {
  maintenanceCalorieGoal?: number;
  proteinGoal?: number;
  fatGoal?: number;
}

export function useMonthlyReport(
  uid: string | undefined,
  protocolStartedAt: string | undefined,
  phaseHistory: PhaseHistoryEntry[] | undefined,
  goalInputs: MonthlyReportGoalInputs,
  monthIndex: number,
): MonthlyReport {
  const [weeks, setWeeks] = useState<WeekSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { maintenanceCalorieGoal, proteinGoal, fatGoal } = goalInputs;

  useEffect(() => {
    if (!uid || !protocolStartedAt || !phaseHistory || !maintenanceCalorieGoal || !proteinGoal || !fatGoal) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const now = new Date();
        const candidateWeeks = getWeeksForMonth(monthIndex);
        const startedWeeks = candidateWeeks.filter(
          (weekIndex) => getWeekStartDate(protocolStartedAt!, weekIndex) <= now,
        );

        const results = await Promise.all(
          startedWeeks.map(async (weekIndex) => {
            const weekStart = getWeekStartDate(protocolStartedAt!, weekIndex);
            const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
            const meals = await getMealsInRange(uid!, weekStart, weekEnd);

            const goalEntry = getGoalEntryForWeek(phaseHistory!, weekIndex, protocolStartedAt!);
            const calorieGoal = applyPhaseAdjustment(maintenanceCalorieGoal!, {
              phase: goalEntry.phase,
              adjustmentKcal: goalEntry.adjustmentKcal,
              recompIntent: goalEntry.recompIntent ?? undefined,
            });
            const carbGoal = calculateCarbGoal(calorieGoal, proteinGoal!, fatGoal!);

            return { weekIndex, totals: sumTotals(meals), calorieGoal, carbGoal };
          }),
        );

        if (!cancelled) {
          setWeeks(results);
        }
      } catch (err) {
        console.error("useMonthlyReport failed:", err);
        if (!cancelled) setError("Não foi possível carregar o relatório mensal.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [uid, protocolStartedAt, phaseHistory, maintenanceCalorieGoal, proteinGoal, fatGoal, monthIndex]);

  const aggregateTotals = weeks.length
    ? weeks.reduce(
        (acc, w) => ({
          kcal: acc.kcal + w.totals.kcal,
          protein: acc.protein + w.totals.protein,
          carbs: acc.carbs + w.totals.carbs,
          fat: acc.fat + w.totals.fat,
        }),
        { ...EMPTY_TOTALS },
      )
    : EMPTY_TOTALS;

  const aggregateCalorieGoal = weeks.reduce((acc, w) => acc + w.calorieGoal, 0);
  const aggregateCarbGoal = weeks.reduce((acc, w) => acc + w.carbGoal, 0);

  const phaseSummary =
    phaseHistory && protocolStartedAt && weeks.length
      ? summarizePhasesByWeek(
          weeks.map((w) => ({
            weekIndex: w.weekIndex,
            phase: getGoalEntryForWeek(phaseHistory, w.weekIndex, protocolStartedAt).phase,
          })),
        )
      : "";

  return {
    monthIndex,
    weeks,
    aggregateTotals,
    aggregateCalorieGoal,
    aggregateCarbGoal,
    phaseSummary,
    loading,
    error,
  };
}

export { getMonthForWeek };
