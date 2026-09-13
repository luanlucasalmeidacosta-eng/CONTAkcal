import type { Phase } from "./phase";
import { getWeekStartDate } from "./week";

export interface PhaseHistoryEntry {
  phase: Phase;
  /** Data ISO em que essa fase começou a valer. */
  startedAt: string;
}

/** Qual fase estava em vigor no início de um dado bloco semanal (spec 5.3 / 11.2). */
export function getPhaseForWeek(
  history: PhaseHistoryEntry[],
  weekIndex: number,
  protocolStartedAt: string,
): Phase {
  const weekStart = getWeekStartDate(protocolStartedAt, weekIndex).getTime();
  const sorted = [...history].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );

  let current = sorted[0];
  for (const entry of sorted) {
    if (new Date(entry.startedAt).getTime() <= weekStart) {
      current = entry;
    } else {
      break;
    }
  }
  return current.phase;
}
