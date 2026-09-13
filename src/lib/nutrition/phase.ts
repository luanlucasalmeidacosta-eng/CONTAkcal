export type Phase = "manutencao" | "bulking" | "cutting" | "recomposicao";
export type RecompIntent = "perder_gordura" | "ganhar_massa";

export const RECOMP_ADJUSTMENT_KCAL = 100;
export const STAGNATION_ADJUSTMENT_KCAL = 100;
export const QUICK_ADJUSTMENT_SUGGESTIONS = [200, 250, 300, 350] as const;

export interface PhaseAdjustmentInput {
  phase: Phase;
  /** kcal de superávit (bulking) ou déficit (cutting), sempre um valor positivo escolhido no onboarding. */
  adjustmentKcal?: number;
  recompIntent?: RecompIntent;
}

/** Calórica ajustada pela fase (spec seção 3.1.6 / 4.1). Retorna o delta aplicado (pode ser negativo). */
export function resolvePhaseDeltaKcal(input: PhaseAdjustmentInput): number {
  switch (input.phase) {
    case "manutencao":
      return 0;
    case "bulking":
      return input.adjustmentKcal ?? 0;
    case "cutting":
      return -(input.adjustmentKcal ?? 0);
    case "recomposicao":
      return input.recompIntent === "ganhar_massa" ? RECOMP_ADJUSTMENT_KCAL : -RECOMP_ADJUSTMENT_KCAL;
  }
}

export function applyPhaseAdjustment(baseCalories: number, input: PhaseAdjustmentInput): number {
  return Math.round(baseCalories + resolvePhaseDeltaKcal(input));
}

/**
 * Ajuste de estagnação dentro da MESMA fase (spec 4.1) — só faz sentido para
 * Bulking/Cutting. Nos dois casos o "adjustmentKcal" (sempre positivo) só
 * cresce; quem aplica o sinal certo (+ ou −) é `resolvePhaseDeltaKcal`.
 */
export function applyStagnationBump(currentAdjustmentKcal: number): number {
  return currentAdjustmentKcal + STAGNATION_ADJUSTMENT_KCAL;
}

export const PHASE_LABELS: Record<Phase, string> = {
  manutencao: "Manutenção",
  bulking: "Bulking",
  cutting: "Cutting",
  recomposicao: "Recomposição Corporal",
};
