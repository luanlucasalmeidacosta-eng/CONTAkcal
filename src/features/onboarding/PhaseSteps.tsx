import { useMemo, useState } from "react";
import { calculateCarbGoal, calculateDerivedGoals, calculateEER } from "@/lib/nutrition/dri";
import {
  PHASE_LABELS,
  QUICK_ADJUSTMENT_SUGGESTIONS,
  applyPhaseAdjustment,
  type Phase,
  type RecompIntent,
} from "@/lib/nutrition/phase";
import { ChoiceButton, NumberField, OnboardingShell, PrimaryButton } from "./OnboardingShell";
import type { StepProps } from "./types";

export function CalorieStep({ data, advance, goBack }: StepProps) {
  const estimated = useMemo(() => {
    if (!data.sex || !data.activityLevel || !data.ageYears || !data.heightCm || !data.weightKg) return 0;
    return calculateEER(data.sex, data.activityLevel, data.ageYears, data.heightCm, data.weightKg);
  }, [data.sex, data.activityLevel, data.ageYears, data.heightCm, data.weightKg]);

  const [value, setValue] = useState((data.maintenanceCalorieGoal ?? estimated).toString());
  const numeric = Number(value);
  const valid = value !== "" && numeric > 0;

  return (
    <OnboardingShell
      step={5}
      totalSteps={7}
      title="Sua calórica de manutenção"
      subtitle="Estimativa pela fórmula DRI 2023. Você pode ajustar o valor se quiser."
      onBack={goBack}
    >
      <NumberField value={value} onChange={setValue} unit="kcal/dia" />
      <PrimaryButton
        disabled={!valid}
        onClick={() => advance({ maintenanceCalorieGoal: numeric })}
      >
        Confirmar
      </PrimaryButton>
    </OnboardingShell>
  );
}

export function PhaseStep({ data, advance, goBack }: StepProps) {
  const phases: Phase[] = ["manutencao", "bulking", "cutting", "recomposicao"];

  return (
    <OnboardingShell step={6} totalSteps={7} title="Qual sua fase inicial?" onBack={goBack}>
      <div className="flex flex-col gap-3">
        {phases.map((phase) => (
          <ChoiceButton
            key={phase}
            selected={data.phase === phase}
            onClick={() => advance({ phase, adjustmentKcal: undefined, recompIntent: undefined })}
          >
            {PHASE_LABELS[phase]}
          </ChoiceButton>
        ))}
      </div>
    </OnboardingShell>
  );
}

export function AdjustmentStep({ data, advance, goBack }: StepProps) {
  const [custom, setCustom] = useState(data.adjustmentKcal?.toString() ?? "");
  const numeric = Number(custom);
  const valid = custom !== "" && numeric > 0;

  if (data.phase === "recomposicao") {
    const options: { id: RecompIntent; label: string }[] = [
      { id: "perder_gordura", label: "Perder gordura" },
      { id: "ganhar_massa", label: "Ganhar massa" },
    ];
    return (
      <OnboardingShell
        step={7}
        totalSteps={8}
        title="Seu foco agora é perder gordura ou ganhar massa?"
        onBack={goBack}
      >
        <div className="flex flex-col gap-3">
          {options.map((opt) => (
            <ChoiceButton
              key={opt.id}
              selected={data.recompIntent === opt.id}
              onClick={() => advance({ recompIntent: opt.id })}
            >
              {opt.label}
            </ChoiceButton>
          ))}
        </div>
      </OnboardingShell>
    );
  }

  const isBulking = data.phase === "bulking";

  return (
    <OnboardingShell
      step={7}
      totalSteps={8}
      title={isBulking ? "Escolha o superávit calórico" : "Escolha o déficit calórico"}
      subtitle="Sugestões rápidas, ou digite qualquer valor."
      onBack={goBack}
    >
      <div className="grid grid-cols-4 gap-2">
        {QUICK_ADJUSTMENT_SUGGESTIONS.map((kcal) => (
          <button
            key={kcal}
            type="button"
            onClick={() => setCustom(kcal.toString())}
            className={`tnum flex min-h-[52px] items-center justify-center rounded-xl border font-display text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-accent ${
              custom === kcal.toString()
                ? "border-accent bg-accent/10 text-accent"
                : "border-line bg-surface text-fg hover:border-accent/40"
            }`}
          >
            {kcal}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <NumberField value={custom} onChange={setCustom} unit="kcal" placeholder="valor customizado" />
      </div>
      <PrimaryButton
        disabled={!valid}
        onClick={() => advance({ adjustmentKcal: numeric })}
      >
        Continuar
      </PrimaryButton>
    </OnboardingShell>
  );
}

interface SummaryStepProps extends StepProps {
  onConfirm: () => Promise<void>;
  submitting: boolean;
  error: string | null;
}

export function SummaryStep({ data, goBack, onConfirm, submitting, error }: SummaryStepProps) {
  if (!data.weightKg || !data.maintenanceCalorieGoal || !data.phase) return null;

  const dailyCalorieGoal = applyPhaseAdjustment(data.maintenanceCalorieGoal, {
    phase: data.phase,
    adjustmentKcal: data.adjustmentKcal,
    recompIntent: data.recompIntent,
  });
  const { proteinGrams, fatGrams, waterMl } = calculateDerivedGoals(data.weightKg);
  const carbGrams = calculateCarbGoal(dailyCalorieGoal, proteinGrams, fatGrams);

  const rows = [
    { label: "Calorias", value: `${dailyCalorieGoal.toLocaleString("pt-BR")} kcal/dia` },
    { label: "Proteína", value: `${proteinGrams}g/dia` },
    { label: "Carboidrato", value: `${carbGrams}g/dia` },
    { label: "Gordura", value: `${fatGrams}g (meta semanal)` },
    { label: "Água", value: `${waterMl.toLocaleString("pt-BR")}ml/dia` },
  ];

  return (
    <OnboardingShell
      step={8}
      totalSteps={9}
      title="Suas metas estão prontas"
      subtitle={PHASE_LABELS[data.phase]}
      onBack={goBack}
    >
      <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-muted">{row.label}</span>
            <span className="tnum font-display text-sm font-semibold text-fg">{row.value}</span>
          </div>
        ))}
      </div>
      {error && <p className="mt-3 text-xs text-accent-soft">{error}</p>}
      <PrimaryButton disabled={submitting} onClick={onConfirm}>
        {submitting ? "Salvando…" : "Começar a usar o CONTAkcal"}
      </PrimaryButton>
    </OnboardingShell>
  );
}
