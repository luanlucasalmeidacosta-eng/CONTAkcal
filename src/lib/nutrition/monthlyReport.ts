import { PHASE_LABELS, type Phase } from "./phase";

export function getMonthForWeek(globalWeekIndex: number): number {
  return Math.floor((globalWeekIndex - 1) / 4) + 1;
}

export function getWeeksForMonth(monthIndex: number): number[] {
  const firstWeek = (monthIndex - 1) * 4 + 1;
  return [firstWeek, firstWeek + 1, firstWeek + 2, firstWeek + 3];
}

export interface WeekPhase {
  weekIndex: number;
  phase: Phase;
}

export function summarizePhasesByWeek(weeks: WeekPhase[]): string {
  const counts = new Map<Phase, number>();
  for (const week of weeks) {
    counts.set(week.phase, (counts.get(week.phase) ?? 0) + 1);
  }

  if (counts.size <= 1) {
    return PHASE_LABELS[weeks[0].phase];
  }

  return [...counts.entries()]
    .map(([phase, count]) => `${count} semana${count > 1 ? "s" : ""} de ${PHASE_LABELS[phase]}`)
    .join(" + ");
}
