import { useEffect, useState } from "react";
import { getMonthForWeek, getWeeksForMonth, summarizePhasesByWeek } from "@/lib/nutrition/monthlyReport";
import { getPhaseForWeek, type PhaseHistoryEntry } from "@/lib/nutrition/phaseHistory";
import { getWeekStartDate } from "@/lib/nutrition/week";
import { getMealsInRange, sumTotals } from "./meals";
import type { MealTotals } from "./types";

export interface WeekSummary {
  weekIndex: number;
  totals: MealTotals;
}

export interface MonthlyReport {
  monthIndex: number;
  weeks: WeekSummary[];
  aggregateTotals: MealTotals;
  phaseSummary: string;
  loading: boolean;
  error: string | null;
}

const EMPTY_TOTALS: MealTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function useMonthlyReport(
  uid: string | undefined,
  protocolStartedAt: string | undefined,
  phaseHistory: PhaseHistoryEntry[] | undefined,
  monthIndex: number,
): MonthlyReport {
  const [weeks, setWeeks] = useState<WeekSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid || !protocolStartedAt) return;
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
            return { weekIndex, totals: sumTotals(meals) };
          }),
        );

        if (!cancelled) {
          setWeeks(results);
        }
      } catch {
        if (!cancelled) setError("Não foi possível carregar o relatório mensal.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [uid, protocolStartedAt, monthIndex]);

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

  const phaseSummary =
    phaseHistory && protocolStartedAt && weeks.length
      ? summarizePhasesByWeek(
          weeks.map((w) => ({
            weekIndex: w.weekIndex,
            phase: getPhaseForWeek(phaseHistory, w.weekIndex, protocolStartedAt),
          })),
        )
      : "";

  return { monthIndex, weeks, aggregateTotals, phaseSummary, loading, error };
}

export { getMonthForWeek };
