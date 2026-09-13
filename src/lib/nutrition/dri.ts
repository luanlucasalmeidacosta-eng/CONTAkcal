export type Sex = "masculino" | "feminino";
export type ActivityLevel = "sedentario" | "pouco_ativo" | "ativo" | "muito_ativo";

interface EerCoefficients {
  constant: number;
  age: number;
  height: number;
  weight: number;
}

const MALE_COEFFICIENTS: Record<ActivityLevel, EerCoefficients> = {
  sedentario: { constant: 753.07, age: -10.83, height: 6.5, weight: 14.1 },
  pouco_ativo: { constant: 581.47, age: -10.83, height: 8.3, weight: 14.94 },
  ativo: { constant: 1004.82, age: -10.83, height: 6.52, weight: 15.91 },
  muito_ativo: { constant: -517.88, age: -10.83, height: 15.61, weight: 19.11 },
};

const FEMALE_COEFFICIENTS: Record<ActivityLevel, EerCoefficients> = {
  sedentario: { constant: 584.9, age: -7.01, height: 5.72, weight: 11.71 },
  pouco_ativo: { constant: 575.77, age: -7.01, height: 6.6, weight: 12.14 },
  ativo: { constant: 710.25, age: -7.01, height: 6.54, weight: 12.34 },
  muito_ativo: { constant: 511.83, age: -7.01, height: 9.07, weight: 12.56 },
};

/**
 * EER (Estimated Energy Requirement) via DRI 2023, adultos 19+.
 * Fonte: National Academies of Sciences, Engineering, and Medicine (2023).
 */
export function calculateEER(
  sex: Sex,
  activity: ActivityLevel,
  ageYears: number,
  heightCm: number,
  weightKg: number,
): number {
  const table = sex === "masculino" ? MALE_COEFFICIENTS : FEMALE_COEFFICIENTS;
  const c = table[activity];
  const eer = c.constant + c.age * ageYears + c.height * heightCm + c.weight * weightKg;
  return Math.round(eer);
}

export interface DerivedGoals {
  proteinGrams: number;
  fatGrams: number;
  waterMl: number;
}

/** Metas derivadas do peso corporal (spec seção 3.3) — recalculadas a cada pesagem. */
export function calculateDerivedGoals(weightKg: number): DerivedGoals {
  return {
    proteinGrams: Math.round(weightKg * 2),
    fatGrams: Math.round(weightKg * 1),
    waterMl: Math.round(weightKg * 40),
  };
}

/** Carboidrato = restante das calorias da fase após descontar proteína e gordura em kcal. */
export function calculateCarbGoal(phaseCalories: number, proteinGrams: number, fatGrams: number): number {
  const proteinKcal = proteinGrams * 4;
  const fatKcal = fatGrams * 9;
  const carbKcal = Math.max(phaseCalories - proteinKcal - fatKcal, 0);
  return Math.round(carbKcal / 4);
}
