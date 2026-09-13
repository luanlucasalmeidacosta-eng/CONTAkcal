const MS_PER_DAY = 24 * 60 * 60 * 1000;

function atMidnight(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface ProtocolWeekInfo {
  /** Índice global da semana, contínuo desde o onboarding, nunca reinicia (1-based). */
  weekIndex: number;
  /** Dia dentro do bloco semanal atual (1-7). */
  dayIndexInWeek: number;
  /** Meia-noite do dia 1 do bloco semanal atual. */
  weekStart: Date;
  /** Dias restantes no bloco, incluindo hoje. */
  daysRemainingInWeek: number;
}

/** Blocos semanais fixos de 7 dias corridos, contados desde a conclusão do onboarding (spec 5.1). */
export function getProtocolWeekInfo(protocolStartedAt: string, now: Date = new Date()): ProtocolWeekInfo {
  const start = atMidnight(new Date(protocolStartedAt));
  const today = atMidnight(now);

  const daysSinceStart = Math.max(0, Math.floor((today.getTime() - start.getTime()) / MS_PER_DAY));
  const weekIndex = Math.floor(daysSinceStart / 7) + 1;
  const dayIndexInWeek = (daysSinceStart % 7) + 1;
  const weekStart = new Date(start.getTime() + (weekIndex - 1) * 7 * MS_PER_DAY);
  const daysRemainingInWeek = 7 - dayIndexInWeek + 1;

  return { weekIndex, dayIndexInWeek, weekStart, daysRemainingInWeek };
}

/**
 * Disponibilidade dinâmica de hoje (spec 5.2):
 * (meta semanal − já consumido nos dias anteriores da semana) ÷ dias restantes (incluindo hoje).
 */
export function availableToday(
  weeklyGoal: number,
  consumedPreviousDays: number,
  daysRemainingInWeek: number,
): number {
  if (daysRemainingInWeek <= 0) return 0;
  return (weeklyGoal - consumedPreviousDays) / daysRemainingInWeek;
}
