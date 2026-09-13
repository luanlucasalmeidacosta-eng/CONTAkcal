import type { WeighInType } from "@/lib/firestore/types";

export interface WeighInSampleForReminder {
  tipo: WeighInType;
  createdAt: Date;
}

/**
 * Ao entrar na primeira semana de um mês novo (semanas 5, 9, 13...), alerta
 * que a pesagem mensal é necessária pra recalibrar as metas e o
 * acompanhamento mês a mês — a menos que ela já tenha sido feita nesta
 * janela (a partir do início dessa semana).
 */
export function needsMonthlyWeighIn(
  weekIndex: number,
  weighIns: WeighInSampleForReminder[],
  weekStart: Date,
): boolean {
  const isFirstWeekOfNewMonth = weekIndex > 1 && (weekIndex - 1) % 4 === 0;
  if (!isFirstWeekOfNewMonth) return false;

  return !weighIns.some((w) => w.tipo === "mensal" && w.createdAt.getTime() >= weekStart.getTime());
}
