export interface PostMealFeedbackInput {
  proteinConsumed: number;
  proteinGoal: number;
  carbsConsumed: number;
  fatConsumed: number;
  /** Disponibilidade dinâmica de hoje (spec 5.2) menos o já consumido. */
  caloriesRemaining: number;
}

/** Feedback pós-refeição (spec 7.4) — reage só aos números, sem categorizar por tipo de refeição. */
export function buildPostMealFeedback(input: PostMealFeedbackInput): string {
  const proteinRemaining = input.proteinGoal - input.proteinConsumed;
  const proteinLine =
    proteinRemaining > 0
      ? `Faltam ${Math.round(proteinRemaining)}g de proteína hoje.`
      : `Meta de proteína batida! +${Math.round(-proteinRemaining)}g acima da meta.`;

  const caloriesLine =
    input.caloriesRemaining > 0
      ? `Ainda restam ${Math.round(input.caloriesRemaining)} kcal disponíveis hoje.`
      : `Você já ultrapassou as calorias disponíveis hoje.`;

  return `${proteinLine} Você consumiu ${Math.round(input.carbsConsumed)}g de carboidrato e ${Math.round(input.fatConsumed)}g de gordura hoje. ${caloriesLine}`;
}
