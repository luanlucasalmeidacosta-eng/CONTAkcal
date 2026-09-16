import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calculateCarbGoal, calculateDerivedGoals, type ActivityLevel, type Sex } from "@/lib/nutrition/dri";
import { applyPhaseAdjustment, applyStagnationBump, type Phase, type RecompIntent } from "@/lib/nutrition/phase";
import type { PhaseHistoryEntry } from "@/lib/nutrition/phaseHistory";
import type { PhaseState, UserDoc } from "./types";

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
  name?: string;
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
  const now = new Date().toISOString();

  const update: Partial<UserDoc> = {
    protocolStartedAt: now,
    name: input.name ?? null,
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
      startedAt: now,
      adjustmentKcal: input.adjustmentKcal,
      recompIntent: input.recompIntent ?? null,
      weeksStagnant: 0,
      monthsStagnant: 0,
      globalWeekIndex: 1,
      phaseWeekIndex: 1,
    },
    phaseHistory: [
      { phase: input.phase, startedAt: now, adjustmentKcal: input.adjustmentKcal, recompIntent: input.recompIntent ?? null },
    ],
  };

  await setDoc(userRef(uid), update, { merge: true });
}

export interface ChangePhaseInput {
  phase: Phase;
  adjustmentKcal: number;
  recompIntent?: RecompIntent;
}

/** Troca de fase (spec 4.2 — sempre manual). Reinicia a numeração de semana da fase e o contador de estagnação. */
export async function changePhase(
  uid: string,
  maintenanceCalorieGoal: number,
  input: ChangePhaseInput,
  currentHistory: PhaseHistoryEntry[],
): Promise<void> {
  const dailyCalorieGoal = applyPhaseAdjustment(maintenanceCalorieGoal, input);
  const now = new Date().toISOString();

  await setDoc(
    userRef(uid),
    {
      dailyCalorieGoal,
      phaseState: {
        phase: input.phase,
        startedAt: now,
        adjustmentKcal: input.adjustmentKcal,
        recompIntent: input.recompIntent ?? null,
        weeksStagnant: 0,
        monthsStagnant: 0,
        globalWeekIndex: 1,
        phaseWeekIndex: 1,
      },
      phaseHistory: [
        ...currentHistory,
        { phase: input.phase, startedAt: now, adjustmentKcal: input.adjustmentKcal, recompIntent: input.recompIntent ?? null },
      ],
    },
    { merge: true },
  );
}

/**
 * Ajuste de ±100kcal por estagnação DENTRO da mesma fase (spec 4.1) —
 * diferente de `changePhase`: mantém a fase, `startedAt` e a numeração de
 * semana da fase (`phaseWeekIndex`/`globalWeekIndex`) intactos, só soma o
 * ajuste e zera os contadores de estagnação (a ação já foi tomada).
 */
export async function applyStagnationAdjustment(
  uid: string,
  maintenanceCalorieGoal: number,
  currentPhaseState: PhaseState,
  currentHistory: PhaseHistoryEntry[],
): Promise<void> {
  const adjustmentKcal = applyStagnationBump(currentPhaseState.adjustmentKcal);
  const dailyCalorieGoal = applyPhaseAdjustment(maintenanceCalorieGoal, {
    phase: currentPhaseState.phase,
    adjustmentKcal,
    recompIntent: currentPhaseState.recompIntent ?? undefined,
  });
  const now = new Date().toISOString();

  await setDoc(
    userRef(uid),
    {
      dailyCalorieGoal,
      phaseState: {
        ...currentPhaseState,
        adjustmentKcal,
        weeksStagnant: 0,
        monthsStagnant: 0,
      },
      phaseHistory: [
        ...currentHistory,
        {
          phase: currentPhaseState.phase,
          startedAt: now,
          adjustmentKcal,
          recompIntent: currentPhaseState.recompIntent ?? null,
        },
      ],
    },
    { merge: true },
  );
}

const RESETTABLE_SUBCOLLECTIONS = ["meals", "water_logs", "weigh_ins", "dishes", "aiUsage"];

async function clearSubcollection(uid: string, name: string): Promise<void> {
  const snap = await getDocs(collection(db, "users", uid, name));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

/**
 * Reset total do protocolo (spec: usuário pode recomeçar do zero). Apaga todo
 * o histórico (refeições, água, pesagens, pratos salvos, uso diário de IA) e
 * devolve o usuário para o onboarding, mantendo apenas uid/email/createdAt.
 */
export async function resetProtocol(uid: string, email: string | null): Promise<void> {
  await Promise.all(RESETTABLE_SUBCOLLECTIONS.map((name) => clearSubcollection(uid, name)));

  const resetDoc: UserDoc = {
    uid,
    email,
    createdAt: serverTimestamp(),
    onboardingCompleted: false,
  };
  await setDoc(userRef(uid), resetDoc);
}

export function deriveCarbGoal(user: UserDoc): number {
  if (!user.dailyCalorieGoal || !user.proteinGoal || !user.fatGoal) return 0;
  return calculateCarbGoal(user.dailyCalorieGoal, user.proteinGoal, user.fatGoal);
}
