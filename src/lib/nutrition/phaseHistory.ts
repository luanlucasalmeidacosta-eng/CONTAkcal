import type { Phase, RecompIntent } from "./phase";
import { getWeekStartDate } from "./week";

export interface PhaseHistoryEntry {
  phase: Phase;
  /** Data ISO em que essa entrada começou a valer (troca de fase OU ajuste de estagnação). */
  startedAt: string;
  /** Presente quando a entrada também carrega o ajuste calórico em vigor (necessário pro relatório mensal). */
  adjustmentKcal?: number;
  recompIntent?: RecompIntent | null;
}

/** Entrada do histórico em vigor no início de um dado bloco semanal (spec 5.3 / 11.2). */
export function getGoalEntryForWeek(
  history: PhaseHistoryEntry[],
  weekIndex: number,
  protocolStartedAt: string,
): PhaseHistoryEntry {
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
  return current;
}

/** Qual fase estava em vigor no início de um dado bloco semanal. */
export function getPhaseForWeek(
  history: PhaseHistoryEntry[],
  weekIndex: number,
  protocolStartedAt: string,
): Phase {
  return getGoalEntryForWeek(history, weekIndex, protocolStartedAt).phase;
}
