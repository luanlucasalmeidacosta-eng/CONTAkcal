export interface WeighInSample {
  peso: number;
  tipo: "semanal" | "mensal";
  createdAt: Date;
}

export interface StagnationResult {
  weeksStagnant: number;
  monthsStagnant: number;
  isStagnant: boolean;
}

const WEIGHT_TOLERANCE_KG = 0.1;

/** Conta quantas leituras consecutivas mais recentes (mesmo tipo) não variaram de peso. */
function countTrailingNoVariation(samples: WeighInSample[]): number {
  if (samples.length < 2) return 0;
  let streak = 0;
  for (let i = samples.length - 1; i > 0; i--) {
    const diff = Math.abs(samples[i].peso - samples[i - 1].peso);
    if (diff <= WEIGHT_TOLERANCE_KG) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Lógica de estagnação adaptativa (spec 4.3): se há pesagem semanal, 2 semanas
 * sem variação = estagnação; senão, 1 mês sem variação (usando só a mensal).
 */
export function computeStagnation(weighIns: WeighInSample[]): StagnationResult {
  const sorted = [...weighIns].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const weekly = sorted.filter((w) => w.tipo === "semanal");
  const monthly = sorted.filter((w) => w.tipo === "mensal");

  const weeksStagnant = countTrailingNoVariation(weekly);
  const monthsStagnant = countTrailingNoVariation(monthly);

  const isStagnant = weekly.length > 0 ? weeksStagnant >= 2 : monthsStagnant >= 1;

  return { weeksStagnant, monthsStagnant, isStagnant };
}
