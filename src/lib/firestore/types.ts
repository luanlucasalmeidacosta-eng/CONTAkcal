import type { ActivityLevel, Sex } from "@/lib/nutrition/dri";
import type { Phase, RecompIntent } from "@/lib/nutrition/phase";

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
}
