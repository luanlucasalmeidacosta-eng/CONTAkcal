import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calculateCarbGoal, calculateDerivedGoals, type ActivityLevel, type Sex } from "@/lib/nutrition/dri";
import { applyPhaseAdjustment, type Phase, type RecompIntent } from "@/lib/nutrition/phase";
import type { UserDoc } from "./types";

function userRef(uid: string) {
  return doc(db, "users", uid);
}

export async function ensureUserDoc(uid: string, email: string | null): Promise<UserDoc> {
  const ref = userRef(uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data() as UserDoc;
  }

  const newUser: UserDoc = {
    uid,
    email,
    createdAt: serverTimestamp(),
    onboardingCompleted: false,
  };
  await setDoc(ref, newUser);
  return newUser;
}

export function subscribeToUserDoc(uid: string, callback: (user: UserDoc | null) => void) {
  return onSnapshot(userRef(uid), (snap) => {
    callback(snap.exists() ? (snap.data() as UserDoc) : null);
  });
}

export interface OnboardingInput {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  maintenanceCalorieGoal: number; // valor do EER, possivelmente editado pelo usuário
  phase: Phase;
  adjustmentKcal: number;
  recompIntent?: RecompIntent;
}

/** Calcula todas as metas derivadas e persiste o resultado final do onboarding. */
export async function completeOnboarding(uid: string, input: OnboardingInput): Promise<void> {
  const dailyCalorieGoal = applyPhaseAdjustment(input.maintenanceCalorieGoal, {
    phase: input.phase,
    adjustmentKcal: input.adjustmentKcal,
    recompIntent: input.recompIntent,
  });

  const { proteinGrams, fatGrams, waterMl } = calculateDerivedGoals(input.weightKg);

  const update: Partial<UserDoc> = {
    protocolStartedAt: new Date().toISOString(),
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    ageYears: input.ageYears,
    sex: input.sex,
    activityLevel: input.activityLevel,
    maintenanceCalorieGoal: input.maintenanceCalorieGoal,
    dailyCalorieGoal,
    proteinGoal: proteinGrams,
    fatGoal: fatGrams,
    waterGoal: waterMl,
    onboardingCompleted: true,
    phaseState: {
      phase: input.phase,
      startedAt: new Date().toISOString(),
      adjustmentKcal: input.adjustmentKcal,
      recompIntent: input.recompIntent,
      weeksStagnant: 0,
      monthsStagnant: 0,
      globalWeekIndex: 1,
      phaseWeekIndex: 1,
    },
  };

  await setDoc(userRef(uid), update, { merge: true });
}

export function deriveCarbGoal(user: UserDoc): number {
  if (!user.dailyCalorieGoal || !user.proteinGoal || !user.fatGoal) return 0;
  return calculateCarbGoal(user.dailyCalorieGoal, user.proteinGoal, user.fatGoal);
}
