import type { ActivityLevel, Sex } from "@/lib/nutrition/dri";
import type { Phase, RecompIntent } from "@/lib/nutrition/phase";

export type StepId =
  | "name"
  | "weight"
  | "height"
  | "age"
  | "sex"
  | "activity"
  | "calorie"
  | "phase"
  | "adjustment"
  | "summary";

export interface OnboardingData {
  name?: string;
  weightKg?: number;
  heightCm?: number;
  ageYears?: number;
  sex?: Sex;
  activityLevel?: ActivityLevel;
  maintenanceCalorieGoal?: number;
  phase?: Phase;
  adjustmentKcal?: number;
  recompIntent?: RecompIntent;
}

export interface StepProps {
  data: OnboardingData;
  /** Aplica o patch e avança para o próximo step, decidido a partir dos dados já mesclados. */
  advance: (patch: Partial<OnboardingData>) => void;
  goBack: () => void;
}
