import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { completeOnboarding } from "@/lib/firestore/users";
import { ActivityStep, AgeStep, HeightStep, SexStep, WeightStep } from "./PhysicalDataSteps";
import { AdjustmentStep, CalorieStep, PhaseStep, SummaryStep } from "./PhaseSteps";
import type { OnboardingData, StepId } from "./types";

function nextStepId(current: StepId, data: OnboardingData): StepId {
  switch (current) {
    case "weight":
      return "height";
    case "height":
      return "age";
    case "age":
      return "sex";
    case "sex":
      return "activity";
    case "activity":
      return "calorie";
    case "calorie":
      return "phase";
    case "phase":
      return data.phase === "manutencao" ? "summary" : "adjustment";
    case "adjustment":
      return "summary";
    case "summary":
      return "summary";
  }
}

function previousStepId(current: StepId, data: OnboardingData): StepId | null {
  switch (current) {
    case "weight":
      return null;
    case "height":
      return "weight";
    case "age":
      return "height";
    case "sex":
      return "age";
    case "activity":
      return "sex";
    case "calorie":
      return "activity";
    case "phase":
      return "calorie";
    case "adjustment":
      return "phase";
    case "summary":
      return data.phase === "manutencao" ? "phase" : "adjustment";
  }
}

export function OnboardingFlow() {
  const { firebaseUser } = useAuth();
  const [stepStack, setStepStack] = useState<StepId[]>(["weight"]);
  const [data, setData] = useState<OnboardingData>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStep = stepStack[stepStack.length - 1];

  function advance(patch: Partial<OnboardingData>) {
    setData((prev) => {
      const merged = { ...prev, ...patch };
      setStepStack((stack) => [...stack, nextStepId(currentStep, merged)]);
      return merged;
    });
  }

  function goBack() {
    const prevId = previousStepId(currentStep, data);
    if (!prevId) return;
    setStepStack((stack) => stack.slice(0, -1));
  }

  async function handleConfirm() {
    if (
      !firebaseUser ||
      !data.weightKg ||
      !data.heightCm ||
      !data.ageYears ||
      !data.sex ||
      !data.activityLevel ||
      !data.maintenanceCalorieGoal ||
      !data.phase
    ) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await completeOnboarding(firebaseUser.uid, {
        weightKg: data.weightKg,
        heightCm: data.heightCm,
        ageYears: data.ageYears,
        sex: data.sex,
        activityLevel: data.activityLevel,
        maintenanceCalorieGoal: data.maintenanceCalorieGoal,
        phase: data.phase,
        adjustmentKcal: data.adjustmentKcal ?? 0,
        recompIntent: data.recompIntent,
      });
    } catch (err) {
      console.error("completeOnboarding failed:", err);
      setError("Não foi possível salvar suas metas. Tente novamente.");
      setSubmitting(false);
    }
  }

  const stepProps = { data, advance, goBack };

  return (
    <AnimatePresence mode="wait">
      {currentStep === "weight" && <WeightStep key="weight" {...stepProps} />}
      {currentStep === "height" && <HeightStep key="height" {...stepProps} />}
      {currentStep === "age" && <AgeStep key="age" {...stepProps} />}
      {currentStep === "sex" && <SexStep key="sex" {...stepProps} />}
      {currentStep === "activity" && <ActivityStep key="activity" {...stepProps} />}
      {currentStep === "calorie" && <CalorieStep key="calorie" {...stepProps} />}
      {currentStep === "phase" && <PhaseStep key="phase" {...stepProps} />}
      {currentStep === "adjustment" && <AdjustmentStep key="adjustment" {...stepProps} />}
      {currentStep === "summary" && (
        <SummaryStep
          key="summary"
          {...stepProps}
          onConfirm={handleConfirm}
          submitting={submitting}
          error={error}
        />
      )}
    </AnimatePresence>
  );
}
