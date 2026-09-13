import type { ActivityLevel, Sex } from "@/lib/nutrition/dri";
import type { Phase, RecompIntent } from "@/lib/nutrition/phase";
import type { PhaseHistoryEntry } from "@/lib/nutrition/phaseHistory";

export interface PhaseState {
  phase: Phase;
  startedAt: string; // ISO date
  adjustmentKcal: number; // superávit/déficit em kcal, sempre positivo; 0 na manutenção
  recompIntent?: RecompIntent;
  weeksStagnant: number;
  monthsStagnant: number;
  globalWeekIndex: number;
  phaseWeekIndex: number;
}

export interface UserDoc {
  uid: string;
  email: string | null;
  createdAt: unknown;
  onboardingCompleted: boolean;
  /** Data de conclusão do onboarding — âncora fixa dos blocos semanais globais (nunca muda). */
  protocolStartedAt?: string;

  weightKg?: number;
  heightCm?: number;
  ageYears?: number;
  sex?: Sex;
  activityLevel?: ActivityLevel;

  maintenanceCalorieGoal?: number; // EER base (editável no onboarding)
  dailyCalorieGoal?: number; // calórica ajustada pela fase
  proteinGoal?: number;
  fatGoal?: number;
  waterGoal?: number;

  phaseState?: PhaseState;
  /** Histórico de trocas de fase — usado para reconstruir "qual fase valia em cada semana" nos relatórios mensais. */
  phaseHistory?: PhaseHistoryEntry[];
}

export interface MealItem {
  name: string;
  quantity: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealDoc {
  rawText: string;
  dishName?: string;
  items: MealItem[];
  totals: MealTotals;
  createdAt: unknown;
}

export interface StandardDishDoc {
  nome: string;
  variantes: { label: string; items: MealItem[] }[];
}

export interface WaterLogDoc {
  quantidadeMl: number;
  createdAt: unknown;
}

export type WeighInType = "semanal" | "mensal";

export interface WeighInDoc {
  peso: number;
  tipo: WeighInType;
  confirmadoJejumManha: boolean;
  createdAt: unknown;
}
